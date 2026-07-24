
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

// BIBLIOTECAS E CONFIGURAÇÕES GERAIS
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// BANCO DE DADOS: AUTO-SEED PREENCHIMENTO AUTOMÁTICO 
async function popularBancoAutomatico() {
    try {
        const db = mongoose.connection.db;
        
        console.log("⚙️ Verificando estrutura do banco de dados no MongoDB Atlas...");
        
        const dadosIniciais = {
            servicos: {
                "Banho Padrão": { 
                    icone: "🛁", 
                    desc: "Banho completo com shampoo hipoalergênico, condicionador e secagem profissional.", 
                    P: { v: 50, t: 40 }, 
                    M: { v: 65, t: 50 }, 
                    G: { v: 80, t: 60 } 
                },
                "Banho & Tosa Relaxante": { 
                    icone: "✂️", 
                    desc: "Banho completo, hidratação profunda e tosa estilizada na tesoura.", 
                    P: { v: 80, t: 60 }, 
                    M: { v: 100, t: 80 }, 
                    G: { v: 130, t: 100 } 
                },
                "Tosa Higiênica": { 
                    icone: "🐾", 
                    desc: "Limpeza focada nas patinhas, barriga e região íntima para maior conforto.", 
                    P: { v: 30, t: 20 }, 
                    M: { v: 40, t: 30 }, 
                    G: { v: 50, t: 40 } 
                },
                "Spa Pet Personale": { 
                    icone: "🫧", 
                    desc: "Sessão de relaxamento com massagem, aromaterapia e banho de ofurô.", 
                    P: { v: 120, t: 60 }, 
                    M: { v: 150, t: 80 }, 
                    G: { v: 180, t: 100 } 
                }
            },
            galeria: [
                "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&q=80",
                "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&q=80",
                "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80",
                "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=500&q=80"
            ]
        };

        await db.collection('dados').deleteMany({});
        await db.collection('dados').insertOne(dadosIniciais);

        console.log("✨ Banco de dados sincronizado e 100% compatível com o site!");
        
    } catch (e) {
        console.error("❌ Erro no auto-seed do banco:", e);
    }
}

// CONEXÃO COM MONGODB ATLAS
const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error("❌ ERRO: MONGODB_URI não encontrada no arquivo .env");
    process.exit(1);
}

mongoose.connect(uri)
    .then(() => {
        console.log("✅ Conectado ao MongoDB Atlas com sucesso!");
        popularBancoAutomatico();
    })
    .catch((err) => {
        console.error("❌ Erro ao conectar ao MongoDB:", err);
    });

// ROTAS PRINCIPAIS DO SITE (API)
app.get('/dados-site', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const dados = await db.collection('dados').findOne({});
        if (!dados) {
            return res.status(404).json({ erro: "Dados não encontrados no banco." });
        }
        res.json(dados);
    } catch (e) {
        console.error("Erro na rota /dados-site:", e);
        res.status(500).json({ erro: "Erro interno do servidor" });
    }
});

app.get('/agenda', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const agendamentos = await db.collection('agendamentos').find({}).toArray();
        res.json({
            lojaAberta: true,
            ocupados: agendamentos || []
        });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao buscar agenda" });
    }
});

app.post('/gerar-os', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const novoAgendamento = {
            ...req.body,
            status: 'Confirmado',
            horarioISO: `${req.body.data}T${req.body.hora}:00-03:00`,
            horarioFmt: `${req.body.data.split('-').reverse().join('/')} às ${req.body.hora}`,
            tempoMin: 60,
            criadoEm: new Date()
        };
        await db.collection('agendamentos').insertOne(novoAgendamento);
        res.json({ statusAgendamento: "Confirmado", tempoTotal: 60 });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao criar agendamento" });
    }
});

app.post('/admin/login', (req, res) => {
    const { senha } = req.body;
    if (senha === "demo123" || senha === process.env.ADMIN_PASSWORD) {
        res.json({ token: "token-simulado-portfolio-12345" });
    } else {
        res.status(401).json({ erro: "Senha incorreta" });
    }
});

app.get('/admin/notificacoes', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const agendamentos = await db.collection('agendamentos').find({}).toArray();
        res.json({
            lojaAberta: true,
            agendamentos: agendamentos || []
        });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao buscar notificações admin" });
    }
});

// INICIALIZAÇÃO DO SERVIDOR
app.listen(PORT, () => {
    console.log("\n==================================================");
    console.log("🛡️  SISTEMA RODANDO EM MODO SANDBOX (PORTFÓLIO)");
    console.log("👉 WhatsApp: Modo Simulação (Sem envios reais)");
    console.log("👉 Painel Admin: Senha de teste \"demo123\" liberada");
    console.log("==================================================");
    console.log(`🚀 Servidor Operando na Porta ${PORT}\n`);
});
