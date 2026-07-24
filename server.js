const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); 
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const MODO_SANDBOX = process.env.MODO_SANDBOX === 'true';

if (MODO_SANDBOX) {
    console.log('\n==================================================');
    console.log('🛡️  SISTEMA RODANDO EM MODO SANDBOX (PORTFÓLIO)');
    console.log('👉 WhatsApp: Modo Simulação (Sem envios reais)');
    console.log('👉 Painel Admin: Senha de teste "demo123" liberada');
    console.log('==================================================\n');
}

// ==========================================================
// SCHEMAS E MODELOS DO MONGOOSE
// ==========================================================
const agendamentoSchema = new mongoose.Schema({
    id: String, tutor: String, pet: String, raca: String, celular: String,
    email: String, porte: String, obs: String, dataISO: String, horarioISO: String,
    horarioFmt: String, tempoMin: Number, status: String,
    saidaFmt: { type: String, default: null }, servicos: [String],
    descTosa: String, enfeite: String, perfume: String, arquivado: { type: Boolean, default: false }
});

const servicosGaleriaSchema = new mongoose.Schema({
    servicos: { type: Object, default: {} },
    galeriaFotos: { type: Array, default: [] }
});

const configAdminSchema = new mongoose.Schema({
    senha: { type: String, default: "1234" },
    telefoneRecuperacao: { type: String, default: "11999999999" },
    emailRecuperacao: { type: String, default: process.env.EMAIL_LOJA }
});

const controleLojaSchema = new mongoose.Schema({
    abertaAgora: { type: Boolean, default: true },
    diasEspeciaisAprovados: { type: Object, default: {} }
});

const Agendamento = mongoose.model('Agendamento', agendamentoSchema);
const ServicoGaleria = mongoose.model('ServicoGaleria', servicosGaleriaSchema);
const ConfigAdmin = mongoose.model('ConfigAdmin', configAdminSchema);
const ControleLoja = mongoose.model('ControleLoja', controleLojaSchema);

// ==========================================================
// PONTE DE MIGRAÇÃO AUTOMÁTICA (JSON -> MONGODB ATLAS)
// ==========================================================
async function migrarDadosDoJsonParaNuvem() {
    try {
        const dbPath = path.join(__dirname, 'database.json');
        if (!fs.existsSync(dbPath)) return;
        
        const locais = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        let sg = await ServicoGaleria.findOne();
        const nuvemVazia = !sg || (sg.galeriaFotos.length === 0 && Object.keys(sg.servicos || {}).length === 0);
        
        if (nuvemVazia && locais) {
            await ServicoGaleria.deleteMany({});
            await ServicoGaleria.create({ servicos: locais.servicos || {}, galeriaFotos: locais.galeriaFotos || [] });
            console.log('☁️ [MIGRAÇÃO] Sucesso: Serviços e Galeria copiados para a Nuvem!');
        }

        const qtdAgenda = await Agendamento.countDocuments();
        if (qtdAgenda === 0 && locais && locais.agenda && locais.agenda.length > 0) {
            await Agendamento.insertMany(locais.agenda);
            console.log(`☁️ [MIGRAÇÃO] Sucesso: ${locais.agenda.length} agendamentos copiados para a Nuvem!`);
        }

        let cfg = await ConfigAdmin.findOne();
        if (!cfg) {
            await ConfigAdmin.create({ 
                senha: (locais && locais.configAdmin && locais.configAdmin.senha) ? locais.configAdmin.senha : (process.env.SENHA_ADMIN_INICIAL || "1234"), 
                telefoneRecuperacao: (locais && locais.configAdmin && locais.configAdmin.telefoneRecuperacao) ? locais.configAdmin.telefoneRecuperacao : (process.env.TELEFONE_RECUPERACAO || "11999999999"),
                emailRecuperacao: (locais && locais.configAdmin && locais.configAdmin.emailRecuperacao) ? locais.configAdmin.emailRecuperacao : (process.env.EMAIL_LOJA || "salaopetpersonale@gmail.com") 
            });
            console.log('☁️ [MIGRAÇÃO] Sucesso: Configurações sincronizadas na Nuvem!');
        }
    } catch (erro) {
        console.error('⚠️ Aviso ao tentar importar dados do database.json:', erro.message);
    }
}

// ==========================================================
// CONEXÃO COM MONGODB ATLAS
// ==========================================================
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Conectado ao MongoDB Atlas com sucesso!');
    await migrarDadosDoJsonParaNuvem();
  })
  .catch((erro) => console.error('❌ Erro ao conectar ao MongoDB:', erro));

app.use(cors());
app.use(express.json());

process.on('uncaughtException', function (err) { console.error("Erro fatal capturado:", err); });

async function getControleLoja() {
    let ctrl = await ControleLoja.findOne();
    if (!ctrl) ctrl = await ControleLoja.create({ abertaAgora: true, diasEspeciaisAprovados: {} });
    return ctrl;
}

async function getServicosGaleria() {
    let sg = await ServicoGaleria.findOne();
    if (!sg) sg = await ServicoGaleria.create({ servicos: {}, galeriaFotos: [] });
    return sg;
}

async function getConfigAdmin() {
    let cfg = await ConfigAdmin.findOne();
    if (!cfg) {
        cfg = await ConfigAdmin.create({ 
            senha: process.env.SENHA_ADMIN_INICIAL || "1234", 
            telefoneRecuperacao: process.env.TELEFONE_RECUPERACAO || "11999999999",
            emailRecuperacao: process.env.EMAIL_LOJA || "salaopetpersonale@gmail.com" 
        });
    }
    return cfg;
}

// ==========================================================
// REGRAS DE NEGÓCIO E FUNÇÕES DO SISTEMA
// ==========================================================
function getBrasiliaDate() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function limparTextoBackend(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>?/gm, '').trim();
}

async function temConflitoAgenda(novoInicioISO, tempoSessaoMin) {
    const incNovo = new Date(novoInicioISO).getTime();
    const fimNovo = incNovo + (tempoSessaoMin * 60000);
    const agendamentosAtivos = await Agendamento.find({
        status: { $in: ['Confirmado', 'Aguardando Aprovação'] }, arquivado: false
    });
    return agendamentosAtivos.some(a => {
        const incExt = new Date(a.horarioISO).getTime();
        const fimExt = incExt + (a.tempoMin * 60000);
        return (incNovo < fimExt && fimNovo > incExt);
    });
}

async function definirStatusAgendamento(dataIsoStr) {
    const d = new Date(dataIsoStr);
    const dataYYYYMMDD = d.toISOString().split('T')[0];
    const isDomingo = d.getDay() === 0;
    const controleLoja = await getControleLoja();

    if (!controleLoja.abertaAgora) return "Pendente Remarcação Luana";
    if (isDomingo && controleLoja.diasEspeciaisAprovados[dataYYYYMMDD] === 'Fechado') return "Pendente Remarcação Luana";
    if (isDomingo && controleLoja.diasEspeciaisAprovados[dataYYYYMMDD] !== 'Aberto') return "Aguardando Aprovação";
    return "Confirmado";
}

// ==========================================================
// E-MAIL E WHATSAPP BLINDADOS PARA SANDBOX
// ==========================================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_LOJA, pass: process.env.SENHA_EMAIL_APP }
});

function enviarOSPorEmail(agendamento) {
    try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            let pdfData = Buffer.concat(buffers);
            
            // No Modo Sandbox, envia SOMENTE para o e-mail da loja para não fazer spam
            const destinatarios = MODO_SANDBOX ? process.env.EMAIL_LOJA : `${agendamento.email}, ${process.env.EMAIL_LOJA}`;

            const mailOptions = {
                from: process.env.EMAIL_LOJA,
                to: destinatarios,
                subject: `[${MODO_SANDBOX ? 'DEMO ' : ''}] Ordem de Serviço - Pet Personalè (${agendamento.pet})`,
                text: `Olá ${agendamento.tutor}, sua Ordem de Serviço foi gerada.\n\nStatus: ${agendamento.status}`,
                attachments: [{ filename: `OS-${agendamento.pet}.pdf`, content: pdfData }]
            };
            transporter.sendMail(mailOptions)
                .then(info => console.log(`📧 OS enviada por E-mail (${MODO_SANDBOX ? 'Modo Seguro/Demo' : 'Real'}): ${info.accepted}`))
                .catch(err => console.error(`❌ ERRO NO E-MAIL: ${err.message}`));
        });

        doc.fontSize(20).fillColor('#0056b3').text('PETPERSONALÈ - Ordem de Serviço', { align: 'center' }).moveDown();
        doc.fontSize(12).fillColor('black');
        doc.text(`Tutor: ${agendamento.tutor} | Celular: ${agendamento.celular}`);
        doc.text(`Paciente PET: ${agendamento.pet} | Raça: ${agendamento.raca} | Porte: ${agendamento.porte}`);
        doc.text(`Data/Hora: ${agendamento.horarioFmt}`);
        doc.moveDown().text(`Observações de Saúde: ${agendamento.obs || 'Nenhuma'}`);
        doc.text(`Enfeite: ${agendamento.enfeite} | Perfume: ${agendamento.perfume}`);
        doc.moveDown().text('Serviços Contratados:', { underline: true });
        agendamento.servicos.forEach(s => {
            let textoAdd = (s === 'Tosa Específica' && agendamento.descTosa) ? ` (${agendamento.descTosa})` : '';
            doc.text(`- ${s}${textoAdd}`);
        });
        doc.moveDown().fontSize(14).text(`Tempo Estimado: ${agendamento.tempoMin} minutos`, { bold: true });
        doc.end();
    } catch (err) { console.error("Erro ao gerar PDF da OS", err); }
}

const zapClient = new Client({ authStrategy: new LocalAuth() });

if (!MODO_SANDBOX) {
    zapClient.on('qr', (qr) => {
        console.log('\n==================================================');
        console.log('⚠️ ESCANEIE O QR CODE COM O WHATSAPP DA LOJA');
        console.log('==================================================\n');
        qrcode.generate(qr, { small: true });
    });
    zapClient.on('ready', () => console.log('✅ Robô do WhatsApp conectado!'));
    zapClient.initialize();
}

async function enviarWhatsApp(numeroTutor, mensagem) {
    if (MODO_SANDBOX) {
        console.log('\n--------------------------------------------------');
        console.log(`📱 [MODO SANDBOX] Simulação de WhatsApp para: ${numeroTutor}`);
        console.log(`💬 Conteúdo: "${mensagem}"`);
        console.log('--------------------------------------------------\n');
        return;
    }
    try {
        const chatId = `55${numeroTutor}@c.us`;
        await zapClient.sendMessage(chatId, mensagem);
        console.log(`📱 WhatsApp enviado com sucesso para ${numeroTutor}`);
    } catch (erro) { console.error(`❌ Erro ao enviar WhatsApp para ${numeroTutor}:`, erro); }
}

// ==========================================================
// ROTAS DO SITE (CLIENTE)
// ==========================================================
app.get('/dados-site', async (req, res) => {
    try {
        const dados = await getServicosGaleria();
        res.json({ servicos: dados.servicos, galeria: dados.galeriaFotos });
    } catch (erro) { res.status(500).json({ erro: "Erro ao carregar dados." }); }
});

app.get('/agenda', async (req, res) => {
    try {
        const agenda = await Agendamento.find({ arquivado: false });
        const controleLoja = await getControleLoja();
        const ocupados = agenda.map(a => ({
            horarioISO: a.horarioISO, horarioFmt: a.horarioFmt, pet: limparTextoBackend(a.pet),
            tempoMin: a.tempoMin, status: a.status
        }));
        res.json({ ocupados, lojaAberta: controleLoja.abertaAgora });
    } catch (erro) { res.status(500).json({ erro: "Erro ao carregar agenda." }); }
});

app.post('/gerar-os', async (req, res) => {
    try {
        const tutor = limparTextoBackend(req.body.tutor);
        const pet = limparTextoBackend(req.body.pet);
        const raca = limparTextoBackend(req.body.raca);
        const celular = limparTextoBackend(req.body.celular);
        const porte = limparTextoBackend(req.body.porte);
        const data = limparTextoBackend(req.body.data);
        const hora = limparTextoBackend(req.body.hora);
        const email = limparTextoBackend(req.body.email);
        const obs = limparTextoBackend(req.body.obs);
        const servicos = req.body.servicos || [];
        const descTosa = limparTextoBackend(req.body.descTosa);

        if (!tutor || !pet || !raca || !celular || !email || !porte || !data || !hora) {
            return res.status(400).json({ erro: "Campos obrigatórios em branco." });
        }

        const horarioISO = `${data}T${hora}:00-03:00`;
        const dataObj = new Date(horarioISO);
        if (dataObj < getBrasiliaDate()) return res.status(400).json({ erro: "Data no passado não permitida." });

        let tempoTotal = 0;
        const dadosSG = await getServicosGaleria();
        servicos.forEach(s => { if (dadosSG.servicos[s] && dadosSG.servicos[s][porte]) tempoTotal += dadosSG.servicos[s][porte].t; });

        if (await temConflitoAgenda(horarioISO, tempoTotal)) {
            return res.status(400).json({ erro: "Horário Indisponível! Sobreposição na agenda." });
        }

        const statusDefinido = await definirStatusAgendamento(horarioISO);

        const novoAgendamento = await Agendamento.create({
            id: `OS-${Date.now()}`, tutor, pet, raca, celular, email, porte, obs, dataISO: data,
            horarioISO, horarioFmt: `${dataObj.toLocaleDateString('pt-BR')} às ${dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            tempoMin: tempoTotal, status: statusDefinido, saidaFmt: null, servicos, descTosa,
            enfeite: limparTextoBackend(req.body.enfeite), perfume: limparTextoBackend(req.body.perfume)
        });
        
        enviarOSPorEmail(novoAgendamento);
        enviarWhatsApp(novoAgendamento.celular, `Olá, ${novoAgendamento.tutor}! 🐾\nSeu agendamento para o(a) *${novoAgendamento.pet}* foi recebido com sucesso!\n\n📅 Data/Hora: ${novoAgendamento.horarioFmt}\n🛁 Serviços: ${novoAgendamento.servicos.join(', ')}\n\nLembrando que nossa tolerância de atraso é de 15 minutos. Te esperamos!`);

        res.json({ sucesso: true, tempoTotal, statusAgendamento: statusDefinido });
    } catch (erro) {
        console.error("Erro ao gerar OS:", erro);
        res.status(500).json({ erro: "Erro ao salvar agendamento." });
    }
});

app.post('/gerar-pacote', async (req, res) => {
    try {
        const tutor = limparTextoBackend(req.body.tutor);
        const pet = limparTextoBackend(req.body.pet);
        const raca = limparTextoBackend(req.body.raca);
        const celular = limparTextoBackend(req.body.celular);
        const porte = limparTextoBackend(req.body.porte);
        const email = limparTextoBackend(req.body.email);
        const obs = limparTextoBackend(req.body.obs);
        const tipoPacote = limparTextoBackend(req.body.tipoPacote);
        const diasMarcados = req.body.diasMarcados || [];
        const servicos = req.body.servicos || [];
        const agora = getBrasiliaDate();

        if (!tutor || !pet || !raca || !celular || !email || !porte) return res.status(400).json({ erro: "Campos obrigatórios em branco." });
        const dadosSG = await getServicosGaleria();

        for (let i = 0; i < diasMarcados.length; i++) {
            let tSessao = 0;
            if (tipoPacote === 'personalizado') {
                servicos.forEach(s => { if (dadosSG.servicos[s] && dadosSG.servicos[s][porte]) tSessao += dadosSG.servicos[s][porte].t; });
            } else {
                tSessao = dadosSG.servicos["Banho Padrão"][porte].t;
                if (i === 0 && new Date(diasMarcados[i]).getDay() !== 0) tSessao += dadosSG.servicos["Tosa Higiênica"][porte].t;
            }
            if (await temConflitoAgenda(diasMarcados[i], tSessao)) {
                return res.status(400).json({ erro: `Conflito! O dia ${new Date(diasMarcados[i]).toLocaleDateString('pt-BR')} possui sobreposição de horários.` });
            }
        }

        for (let index = 0; index < diasMarcados.length; index++) {
            const d = diasMarcados[index];
            const dataLimpa = limparTextoBackend(d);
            const dObj = new Date(dataLimpa);
            if (dObj < agora) continue;

            const statusDefinido = await definirStatusAgendamento(dataLimpa);
            let tempoSessao = 0; let servicosDia = [];

            if (tipoPacote === 'personalizado') {
                servicos.forEach(s => {
                    if (dadosSG.servicos[s] && dadosSG.servicos[s][porte]) {
                        tempoSessao += dadosSG.servicos[s][porte].t;
                        servicosDia.push(s);
                    }
                });
            } else {
                tempoSessao = dadosSG.servicos["Banho Padrão"][porte].t;
                servicosDia.push("Banho Padrão");
                if (index === 0 && dObj.getDay() !== 0) {
                    tempoSessao += dadosSG.servicos["Tosa Higiênica"][porte].t;
                    servicosDia.push("Tosa Higiênica");
                }
            }

            const novoAgendamento = await Agendamento.create({
                id: `PCT-${Date.now()}-${index}`, tutor, pet, raca, celular, email, porte, obs, dataISO: dataLimpa.split('T')[0],
                horarioISO: dataLimpa, horarioFmt: `${dObj.toLocaleDateString('pt-BR')} às ${dObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                tempoMin: tempoSessao, status: statusDefinido, saidaFmt: null, servicos: servicosDia,
                enfeite: limparTextoBackend(req.body.enfeite), perfume: limparTextoBackend(req.body.perfume),
                descTosa: limparTextoBackend(req.body.descTosa)
            });

            enviarOSPorEmail(novoAgendamento);
            enviarWhatsApp(novoAgendamento.celular, `Olá, ${novoAgendamento.tutor}! 🐾 A sessão do seu pacote para o(a) *${novoAgendamento.pet}* em ${novoAgendamento.horarioFmt} foi registrada com sucesso!`);
        }
        res.json({ sucesso: true });
    } catch (erro) {
        console.error("Erro ao gerar pacote:", erro);
        res.status(500).json({ erro: "Erro ao salvar o pacote." });
    }
});

// ==========================================================
// AUTENTICAÇÃO E ADMINISTRAÇÃO 🔒
// ==========================================================
const TOKEN_SECRETO = process.env.TOKEN_SECRETO_SESSAO || "token_secreto_padrao";

app.post('/admin/login', async (req, res) => {
    try {
        const config = await getConfigAdmin();
        const senhaDigitada = req.body.senha ? req.body.senha.trim() : "";
        
        // No Modo Sandbox, aceita a senha do banco OU a senha de testes "demo123"
        const senhaValida = (MODO_SANDBOX && senhaDigitada === "demo123") || (senhaDigitada === config.senha);
        
        if (senhaValida) {
            res.json({ sucesso: true, token: TOKEN_SECRETO });
        } else {
            res.status(401).json({ erro: "Acesso Negado. Senha incorreta." });
        }
    } catch (erro) { res.status(500).json({ erro: "Erro interno no login." }); }
});

app.post('/admin/recuperar-senha', async (req, res) => {
    try {
        if (MODO_SANDBOX) {
            return res.json({ sucesso: true, mensagem: "🔒 [MODO DEMO]: No ambiente de demonstração, utilize a senha padrão: demo123" });
        }
        const config = await getConfigAdmin();
        const novaSenhaTemporaria = "Pet" + Math.floor(1000 + Math.random() * 9000);
        config.senha = novaSenhaTemporaria;
        await config.save();

        const msgRecuperacao = `🔐 Segurança Pet Personalè:\nSua nova senha de acesso provisória é: *${novaSenhaTemporaria}*`;
        enviarWhatsApp(config.telefoneRecuperacao, msgRecuperacao);
        transporter.sendMail({ from: process.env.EMAIL_LOJA, to: config.emailRecuperacao, subject: `Recuperação de Senha`, text: msgRecuperacao });
        res.json({ sucesso: true, mensagem: "Uma nova senha foi enviada para o seu WhatsApp e E-mail de confiança!" });
    } catch (erro) { res.status(500).json({ erro: "Erro ao processar recuperação." }); }
});

function verificarTokenAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.split(' ')[1] === TOKEN_SECRETO) next();
    else res.status(403).json({ erro: "Sessão expirada ou inválida." });
}

app.get('/admin/notificacoes', verificarTokenAdmin, async (req, res) => {
    try {
        const agendamentos = await Agendamento.find({ arquivado: false });
        const controleLoja = await getControleLoja();
        res.json({ agendamentos, lojaAberta: controleLoja.abertaAgora });
    } catch (erro) { res.status(500).json({ erro: "Erro ao carregar notificações." }); }
});

app.post('/admin/exportar-relatorio', verificarTokenAdmin, async (req, res) => {
    try {
        const config = await getConfigAdmin();
        const senhaDigitada = req.body.senha ? req.body.senha.trim() : "";
        const senhaValida = (MODO_SANDBOX && senhaDigitada === "demo123") || (senhaDigitada === config.senha);
        
        if (!senhaValida) return res.status(403).json({ erro: "Senha Mestra Incorreta." });
        
        const dados = await Agendamento.find({ arquivado: false });
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            let pdfData = Buffer.concat(buffers);
            transporter.sendMail({
                from: process.env.EMAIL_LOJA, to: config.emailRecuperacao, subject: `Relatório de Fechamento - Pet Personalè`,
                text: `Segue o relatório completo em anexo.`, attachments: [{ filename: `Relatorio_Fechamento.pdf`, content: pdfData }]
            });
        });

        doc.fontSize(18).text('PET PERSONALÈ - Relatório de Fechamento', { align: 'center' }).moveDown();
        dados.forEach(a => doc.fontSize(10).text(`Tutor: ${a.tutor} | Pet: ${a.pet} | Data: ${a.horarioFmt} | Status: ${a.status}\nServiços: ${a.servicos.join(', ')}\n`));
        doc.end();

        if (!MODO_SANDBOX) {
            await Agendamento.updateMany({ arquivado: false }, { $set: { status: 'Arquivado', arquivado: true } });
        }
        res.json({ sucesso: true, mensagem: `✅ Relatório em PDF gerado e enviado! ${MODO_SANDBOX ? '(Modo Demo: A agenda não foi esvaziada para testes)' : ''}` });
    } catch (err) { res.status(500).json({ erro: "Erro ao gerar PDF." }); }
});

app.post('/admin/toggle-loja', verificarTokenAdmin, async (req, res) => {
    try {
        const controleLoja = await getControleLoja();
        controleLoja.abertaAgora = !controleLoja.abertaAgora;
        if (!controleLoja.abertaAgora && !MODO_SANDBOX) {
            await Agendamento.updateMany(
                { horarioISO: { $gt: new Date().toISOString() }, status: 'Confirmado', arquivado: false },
                { $set: { status: 'Pendente Remarcação Luana' } }
            );
        }
        await controleLoja.save();
        res.json({ sucesso: true, lojaAberta: controleLoja.abertaAgora, mensagem: controleLoja.abertaAgora ? "🟢 Loja Reaberta." : "🔴 Loja Fechada." });
    } catch (erro) { res.status(500).json({ erro: "Erro ao alterar estado da loja." }); }
});

app.post('/admin/aprovar-agendamento', verificarTokenAdmin, async (req, res) => {
    try {
        const agendamento = await Agendamento.findOne({ id: req.body.id });
        if (!agendamento) return res.status(404).json({ erro: "Não encontrado." });

        if (req.body.acao === 'Aprovar') {
            const controleLoja = await getControleLoja();
            controleLoja.diasEspeciaisAprovados = { ...controleLoja.diasEspeciaisAprovados, [agendamento.dataISO]: 'Aberto' };
            await controleLoja.save();

            agendamento.status = 'Confirmado';
            await agendamento.save();
            enviarOSPorEmail(agendamento);
            res.json({ mensagem: "✅ Aprovado e nova via OS enviada." });
        } else {
            await Agendamento.deleteOne({ id: req.body.id });
            res.json({ mensagem: "❌ Cancelado." });
        }
    } catch (erro) { res.status(500).json({ erro: "Erro ao processar aprovação." }); }
});

app.post('/admin/remarcar-manual', verificarTokenAdmin, async (req, res) => {
    try {
        const { id, data, hora } = req.body;
        const agendamento = await Agendamento.findOne({ id });
        if (!agendamento) return res.status(404).json({ erro: "Não encontrado." });

        const horarioISO = `${data}T${hora}:00-03:00`;
        if (await temConflitoAgenda(horarioISO, agendamento.tempoMin)) return res.status(400).json({ erro: "Sobreposição de horário!" });

        const dObj = new Date(horarioISO);
        agendamento.dataISO = data; agendamento.horarioISO = horarioISO;
        agendamento.horarioFmt = `${dObj.toLocaleDateString('pt-BR')} às ${dObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        agendamento.status = 'Confirmado';
        await agendamento.save();
        enviarOSPorEmail(agendamento);
        res.json({ mensagem: `✅ Remarcado para ${agendamento.horarioFmt}! Nova OS reenviada.` });
    } catch (erro) { res.status(500).json({ erro: "Erro na remarcação manual." }); }
});

app.post('/admin/concluir-pet', verificarTokenAdmin, async (req, res) => {
    try {
        const agendamento = await Agendamento.findOne({ id: req.body.id });
        if (!agendamento) return res.status(404).json({ erro: "Não encontrado." });

        agendamento.status = 'Concluído';
        agendamento.saidaFmt = getBrasiliaDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        await agendamento.save();

        const textoMensagem = `Olá, ${agendamento.tutor}! 🐾 O dia de beleza do(a) *${agendamento.pet}* foi finalizado! Horário de saída: ${agendamento.saidaFmt}`;
        enviarWhatsApp(agendamento.celular, textoMensagem);
        res.json({ sucesso: true, mensagem: `✅ PET FINALIZADO ÀS ${agendamento.saidaFmt}!` });
    } catch (erro) { res.status(500).json({ erro: "Erro ao concluir pet." }); }
});

app.post('/admin/salvar-site', verificarTokenAdmin, async (req, res) => {
    try {
        const dadosSG = await getServicosGaleria();
        if (req.body.servicos) dadosSG.servicos = req.body.servicos;
        if (req.body.galeriaFotos) dadosSG.galeriaFotos = req.body.galeriaFotos;
        await dadosSG.save();

        if (req.body.novaSenha && req.body.novaSenha.trim() !== "") {
            if (MODO_SANDBOX && req.body.novaSenha.trim() === "demo123") {
                // Em modo demo, ignora alteração se tentarem por a própria senha demo
            } else {
                const config = await getConfigAdmin();
                config.senha = req.body.novaSenha.trim();
                await config.save();
                console.log("🔐 Senha da especialista atualizada na nuvem!");
            }
        } 
        res.json({ sucesso: true, mensagem: "✅ Dados do site atualizados na nuvem!" });
    } catch (erro) { res.status(500).json({ erro: "Erro ao salvar dados do site." }); }
});

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(3000, () => console.log('🚀 Servidor Operando na Porta 3000'));