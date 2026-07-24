
// BANCO DE DADOS DINÂMICO E CONFIG GERAIS
let dbServicos = [];
let dbFotos = [];
let luanaToken = null;

async function carregarDadosSite() {
    try {
        console.log("⏳ Buscando dados do servidor...");
        const res = await fetch('/dados-site');
        
        if (!res.ok) {
            throw new Error(`Erro na resposta do servidor: ${res.status}`);
        }

        const dados = await res.json();
        console.log("✅ Dados carregados com sucesso:", dados);

        // BLINDAGEM DA GALERIA DE FOTOS
        dbFotos = dados.galeria || [];
        const galeriaContainer = document.querySelector('.galeria-grid');
        if (galeriaContainer) {
            if (dbFotos.length === 0) {
                galeriaContainer.innerHTML = '<p style="text-align:center; width:100%; color:#666;">Nenhuma foto na galeria no momento.</p>';
            } else {
                galeriaContainer.innerHTML = dbFotos.map(url => `<img src="${url}" class="foto-insta" alt="Pet Personalè">`).join('');
            }
        }

        // BLINDAGEM DOS SERVIÇOS
        const servicosObj = dados.servicos || {};
        dbServicos = Object.keys(servicosObj).map(nome => ({
            id: nome,
            icone: servicosObj[nome].icone || '🐾',
            desc: servicosObj[nome].desc || '',
            P: servicosObj[nome].P || { v: 0, t: 0 },
            M: servicosObj[nome].M || { v: 0, t: 0 },
            G: servicosObj[nome].G || { v: 0, t: 0 }
        }));

        selecionarPorteExibicao('P');
        atualizarValoresServicosOS();
        atualizarInterfacePacotes();
    } catch (e) {
        console.error("❌ Erro ao carregar banco de dados:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    popularDatasDropdown();
    carregarDadosSite();
    carregarMuralDoServidor();
    atualizarPlaceholdersAleatorios();
});

function mudarAba(idAba) {
    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.remove('aba-ativa'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('ativo'));
    const abaAlvo = document.getElementById(idAba);
    if (abaAlvo) abaAlvo.classList.add('aba-ativa');
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(idAba)) link.classList.add('ativo');
    });

    if (idAba !== 'aba-chat') {
        luanaToken = null;
        const panelLogin = document.getElementById('login-admin-retirada');
        const panelAtivo = document.getElementById('painel-luana-ativo');
        const senhaInp = document.getElementById('senha-luana');
        if (panelLogin) panelLogin.style.display = 'block';
        if (panelAtivo) panelAtivo.style.display = 'none';
        if (senhaInp) senhaInp.value = '';
    }

    if (idAba === 'aba-mural' || idAba === 'aba-chat') carregarMuralDoServidor();
    if (idAba === 'aba-os' || idAba === 'aba-pacotes') atualizarPlaceholdersAleatorios();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHTML(str) {
    if (!str) return "";
    return str.toString().replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

const termosProibidos = ["porra", "caralho", "buceta", "puta", "merda", "fuder", "foda", "fdp", "cu", "cuzao", "cacete", "arrombado", "piranha", "desgraca", "corno", "viado", "putaria", "pau", "rola", "vtnc", "tnc", "krl", "vsf", "pqp", "crl", "pnc"];

function detectarLixoOuOfensa(texto) {
    const min = texto.toLowerCase().trim();
    if (min.length === 0) return false;
    const contemPalavrao = termosProibidos.some(p => new RegExp(`\\b${p}\\b`, 'i').test(min) || min.includes(p));
    if (contemPalavrao) return "Linguajar inadequado bloqueado pelo sistema de segurança.";
    if (/(.)\1{4,}/.test(min) || /[bcdfghjklmnpqrstvwxz]{5,}/i.test(min)) return "Texto inválido. Por favor, digite palavras reais.";
    return false;
}

function validarCampoRigoroso(input) {
    let texto = input.value.replace(/[0-9!@#\$%\^\&*\)\(+=._-]/g, "").trim();
    input.value = texto;

    if (texto.length === 0) return;

    if (texto.length < 3) {
        alert("O texto é muito curto. Insira um nome válido (mínimo de 3 letras).");
        input.value = ""; return;
    }

    if (input.id.includes("tutor")) {
        if (!texto.includes(" ")) {
            alert("Para o Nome do Tutor, por favor digite o NOME e o SOBRENOME.");
            input.value = ""; return;
        }
    }

    const sequenciasTeclado = /(qwe|wer|ert|rty|tyu|yui|uio|iop|asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm|ewq|rew|tre|ytr|uyt|iuy|oiu|poi|dsa|fds|gfd|hgf|jhg|kjh|lkj|cxz|vcx|bvc|nbv|mnb)/i;
    if (sequenciasTeclado.test(texto)) {
        alert("Detectamos uma sequência de letras inválida. Por favor, digite palavras reais.");
        input.value = ""; return;
    }

    const consoantesSeguidas = /[bcdfghjklmnpqrstvwxz]{4,}/i;
    if (consoantesSeguidas.test(texto)) {
        alert("O texto contém muitas consoantes seguidas e parece inválido.");
        input.value = ""; return;
    }

    if (/(.)\1{2,}/.test(texto)) {
        alert("Por favor, não repita a mesma letra várias vezes seguidas.");
        input.value = ""; return;
    }

    if (!/[aeiouyáéíóúâêîôûãõ]/i.test(texto)) {
        alert("O texto deve conter vogais para ser considerado válido.");
        input.value = ""; return;
    }

    const erro = detectarLixoOuOfensa(texto);
    if (erro) { alert(erro); input.value = ""; return; }
}

function validarCampoObs(input) {
    let texto = input.value.trim();
    if (texto.length === 0) return;
    const erro = detectarLixoOuOfensa(texto);
    if (erro) { alert(erro); input.value = ""; }
}

function validarEmail(input) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (input.value && !re.test(input.value)) { alert("Insira um e-mail válido."); input.value = ""; }
}

function formatarTempo(minutosTotais) {
    if (minutosTotais === 0) return "0h 0min";
    const h = Math.floor(minutosTotais / 60);
    const m = minutosTotais % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
}

function getBrasiliaDate() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function popularDatasDropdown() {
    const selectsOS = document.querySelectorAll('.seletor-datas-curto');
    const selectsPCT = document.querySelectorAll('.seletor-datas');
    const hoje = getBrasiliaDate();
    const anoBase = 2026;
    const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

    function preencher(sel, maxDias) {
        sel.innerHTML = '<option value="">DD/MM - Dia da Semana</option>';
        for (let i = 0; i <= maxDias; i++) {
            let d = new Date(hoje);
            d.setDate(hoje.getDate() + i);
            if (d.getFullYear() > anoBase) break;

            let valIso = `${anoBase}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            let domAviso = d.getDay() === 0 ? " (Aprovação)" : "";
            let dataFmt = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            let label = `${dataFmt} - ${diasSemana[d.getDay()]}${domAviso}`;
            sel.innerHTML += `<option value="${valIso}">${label}</option>`;
        }
    }

    selectsOS.forEach(sel => preencher(sel, 30));
    selectsPCT.forEach(sel => preencher(sel, 60));
}

function atualizarHorariosDisponiveis(idData, idSelect, prefixo) {
    const dataVal = document.getElementById(idData)?.value;
    const select = document.getElementById(idSelect);
    if (!select) return;
    if (!dataVal) { select.innerHTML = '<option value="">Escolha uma data 1º</option>'; return; }

    const d = new Date(`${dataVal}T00:00:00`);
    const isDomingo = d.getDay() === 0;
    const hojeObj = getBrasiliaDate();
    const dataSelecionadaEhHoje = (d.getDate() === hojeObj.getDate() && d.getMonth() === hojeObj.getMonth());

    select.innerHTML = '<option value="">Escolha um horário livre</option>';
    let hora = 9; let min = 0;
    const maxHora = isDomingo ? 16 : 18;
    const horaAtual = hojeObj.getHours();
    const minAtual = hojeObj.getMinutes();

    while (hora <= (maxHora - 1)) {
        let mostrarHorario = true;
        if (dataSelecionadaEhHoje) {
            if (hora < horaAtual || (hora === horaAtual && min <= minAtual)) mostrarHorario = false;
        }
        if (mostrarHorario) {
            let hStr = String(hora).padStart(2, '0');
            let mStr = String(min).padStart(2, '0');
            select.innerHTML += `<option value="${hStr}:${mStr}">${hStr}:${mStr}</option>`;
        }
        min += 30;
        if (min === 60) { min = 0; hora++; }
    }
    verificarBloqueioTosa(prefixo);
}

function verificarDiaSemana() {
    const dataInput = document.getElementById('os-data')?.value;
    if (!dataInput) return;
    const d = new Date(`${dataInput}T00:00:00`);
    const dias = ["Domingo (Sujeito a Aprovação da Especialista)", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const lbl = document.getElementById('label-dia-semana');
    if (lbl) lbl.innerText = dias[d.getDay()];
}

function verificarBloqueioTosa(prefixo) {
    const dataVal = document.getElementById(`${prefixo}-add-data`)?.value || document.getElementById(`${prefixo}-data`)?.value;
    const horaVal = document.getElementById(`${prefixo}-add-hora`)?.value || document.getElementById(`${prefixo}-hora`)?.value;

    let bloquearTosa = false;
    if (dataVal && horaVal) {
        const d = new Date(`${dataVal}T00:00:00`);
        const hora = parseInt(horaVal.split(':')[0]);
        if (d.getDay() === 0 && hora >= 15) bloquearTosa = true;
        if (d.getDay() !== 0 && hora >= 17) bloquearTosa = true;
    }

    const container = document.getElementById(`container-servicos-${prefixo}`);
    if (container) {
        container.querySelectorAll(`input[type="checkbox"]`).forEach(cb => {
            if (cb.value.includes("Tosa")) {
                cb.disabled = bloquearTosa;
                if (bloquearTosa) cb.checked = false;
            }
        });
    }
    if (prefixo === 'os') calcularTotalOS();
    checarTosaEspecifica(prefixo);
}

function gerarLinkGoogleAgenda(pet, dataISO, tempoMinutos) {
    const dInicio = new Date(dataISO);
    const dFim = new Date(dInicio.getTime() + tempoMinutos * 60000);
    const formataData = (d) => d.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';
    const titulo = encodeURIComponent(`Pet Personalè - Banho/Tosa (${pet})`);
    const detalhes = encodeURIComponent(`Horário reservado na Pet Personalè. Limite de tolerância de 15 minutos!`);
    const local = encodeURIComponent(`Rua Jundiaí, 306 - Boqueirão, Praia Grande - SP`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${formataData(dInicio)}/${formataData(dFim)}&details=${detalhes}&location=${local}`;
}

function selecionarPorteExibicao(porte) {
    document.querySelectorAll('.btn-porte').forEach(btn => {
        btn.classList.remove('ativo');
        if (btn.innerText.includes(`(${porte})`)) btn.classList.add('ativo');
    });

    const container = document.getElementById('grid-servicos-exibicao');
    if (!container) return;
    container.innerHTML = "";
    dbServicos.forEach(s => {
        const dadosPorte = s[porte] || { v: 0, t: 0 };
        container.innerHTML += `
            <div class="card">
                <h3>${s.icone} ${escapeHTML(s.id)}</h3>
                <p>A partir de: <b>R$ ${dadosPorte.v},00</b></p>
                <p>Estimativa Mínima: <b>${formatarTempo(dadosPorte.t)}</b></p>
                <span class="card-tooltip">${escapeHTML(s.desc)}</span>
            </div>
        `;
    });
}

function checarTosaEspecifica(prefixo) {
    const checks = document.querySelectorAll(`.check-servico-${prefixo}:checked`);
    const temTosa = Array.from(checks).some(cb => cb.value === "Tosa Específica");
    const inputEspecial = document.getElementById(`${prefixo}-desc-tosa`);
    if (inputEspecial) inputEspecial.style.display = temTosa ? "block" : "none";
}

// AGENDA ÚNICA E PACOTES 
function atualizarValoresServicosOS() {
    const porte = document.getElementById(`os-porte`)?.value || 'P';
    const container = document.getElementById(`container-servicos-os`);
    if (!container || !porte) return;

    const checados = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
    container.innerHTML = "";
    dbServicos.forEach(s => {
        const dadosPorte = s[porte] || { v: 0, t: 0 };
        const isChecked = checados.includes(s.id) ? "checked" : "";
        container.innerHTML += `
            <label><input type="checkbox" class="check-servico-os" value="${s.id}" data-valor="${dadosPorte.v}" data-tempo="${dadosPorte.t}" onchange="calcularTotalOS(); checarTosaEspecifica('os')" ${isChecked}> 
            ${s.icone} ${escapeHTML(s.id)} (A Partir R$ ${dadosPorte.v} - ${formatarTempo(dadosPorte.t)})</label>
        `;
    });
    verificarBloqueioTosa('os');
    calcularTotalOS();
}

function calcularTotalOS() {
    let v = 0, t = 0;
    document.querySelectorAll('.check-servico-os:checked').forEach(m => {
        v += parseFloat(m.getAttribute('data-valor') || 0);
        t += parseInt(m.getAttribute('data-tempo') || 0);
    });
    const elV = document.getElementById('os-valor-total');
    const elT = document.getElementById('os-tempo-total');
    if (elV) elV.value = v;
    if (elT) elT.value = formatarTempo(t);
}

const getValSeguro = (id) => document.getElementById(id)?.value.trim() || "";

async function gerarOrdemServico() {
    const obj = {
        tutor: getValSeguro('os-tutor'), pet: getValSeguro('os-pet'), raca: getValSeguro('os-raca'),
        celular: getValSeguro('os-celular'), email: getValSeguro('os-email'), porte: getValSeguro('os-porte'),
        obs: getValSeguro('os-obs'), data: getValSeguro('os-data'), hora: getValSeguro('os-hora'),
        enfeite: getValSeguro('os-enfeite'), perfume: getValSeguro('os-perfume'),
        servicos: Array.from(document.querySelectorAll('.check-servico-os:checked')).map(cb => cb.value),
        descTosa: getValSeguro('os-desc-tosa')
    };

    if (!obj.tutor || !obj.pet || !obj.raca || !obj.porte || !obj.data || !obj.hora || !obj.celular || !obj.email) {
        return alert("ATENÇÃO: Por favor, preencha TODOS os campos obrigatórios (*).");
    }
    if (obj.celular.length !== 11) return alert("O celular deve conter DDD + 9 dígitos contínuos.");
    if (obj.servicos.length === 0) return alert("Selecione ao menos um serviço.");
    if (obj.servicos.includes("Tosa Específica") && !obj.descTosa) return alert("Por favor, digite a tosa específica desejada.");

    const btn = document.getElementById('btn-gerar-os');
    if (btn) { btn.disabled = true; btn.innerText = "Verificando Disponibilidade..."; }

    try {
        const resposta = await fetch('/gerar-os', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj)
        });
        const r = await resposta.json();
        if (resposta.ok) {
            document.getElementById('form-os').style.display = 'none';
            document.getElementById('os-sucesso-container').style.display = 'block';

            document.getElementById('msg-status-os').innerText = r.statusAgendamento && r.statusAgendamento.includes("Aprovação")
                ? "Horário enviado para Aprovação Especial. Você será notificado por E-mail."
                : "Seu horário foi confirmado na agenda!";

            const linkGC = gerarLinkGoogleAgenda(obj.pet, `${obj.data}T${obj.hora}:00-03:00`, r.tempoTotal);
            document.getElementById('link-google-agenda-os').innerHTML = `<a href="${linkGC}" target="_blank" class="botao" style="background:#4285F4;">📅 Adicionar ao Meu Google Agenda</a>`;
            carregarMuralDoServidor();
        } else alert(r.erro || "Erro ao agendar.");
    } catch { alert("Servidor offline ou indisponível no momento."); }
    finally { if (btn) { btn.disabled = false; btn.innerText = "🧾 Confirmar e Agendar"; } }
}

let pacoteDias = [];
const precosPacotesFixos = {
    essencial: { P: 204, M: 289, G: 389, diasReq: 4, label: "4 Dias" },
    basico: { P: 154, M: 224, G: 295, diasReq: 3, label: "3 Dias" }
};

function atualizarInterfacePacotes() {
    const porte = document.getElementById('pct-porte')?.value || 'P';
    const elemTipo = document.querySelector('input[name="tipo-pacote"]:checked');
    if (!elemTipo || !porte) return;
    const tipo = elemTipo.value;

    const pEss = document.getElementById('preco-essencial');
    const pBas = document.getElementById('preco-basico');
    if (pEss) pEss.innerText = `A partir de R$ ${precosPacotesFixos.essencial[porte]},00`;
    if (pBas) pBas.innerText = `A partir de R$ ${precosPacotesFixos.basico[porte]},00`;

    const containerPersonalizado = document.getElementById('bloco-servicos-personalizados');
    const avisoDias = document.getElementById('aviso-dias-pct');

    if (tipo === 'personalizado') {
        if (containerPersonalizado) containerPersonalizado.style.display = 'block';
        if (avisoDias) avisoDias.innerText = "Para o Personalizado, escolha de 3 a 45 dias.";
        renderizarServicosPersonalizadosPacote(porte);
    } else {
        if (containerPersonalizado) containerPersonalizado.style.display = 'none';
        if (avisoDias) avisoDias.innerText = `Este plano exige estritamente a marcação de ${precosPacotesFixos[tipo].label}. Cada sessão inclui Banho. A 1º sessão inclui Tosa Higiênica.`;
    }
}

function renderizarServicosPersonalizadosPacote(porte) {
    const container = document.getElementById(`container-servicos-pct`);
    if (!container) return;
    const checados = Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);

    container.innerHTML = "";
    dbServicos.forEach(s => {
        const dadosPorte = s[porte] || { v: 0, t: 0 };
        const isChecked = checados.includes(s.id) ? "checked" : "";
        container.innerHTML += `<label><input type="checkbox" class="check-servico-pct" value="${s.id}" onchange="checarTosaEspecifica('pct'); verificarBloqueioTosa('pct')" ${isChecked}> ${s.icone} ${escapeHTML(s.id)} (A partir R$ ${dadosPorte.v} - ${formatarTempo(dadosPorte.t)})</label>`;
    });
    verificarBloqueioTosa('pct'); checarTosaEspecifica('pct');
}

function addDiaPacote() {
    const dt = document.getElementById('pct-add-data')?.value;
    const hr = document.getElementById('pct-add-hora')?.value;
    const elemTipo = document.querySelector('input[name="tipo-pacote"]:checked');
    if (!dt || !hr || !elemTipo) return alert("Selecione a data, horário e o pacote.");
    
    let limite = elemTipo.value === 'personalizado' ? 45 : precosPacotesFixos[elemTipo.value].diasReq;
    if (pacoteDias.length >= limite) return alert(`Limite atingido para este pacote.`);

    const iso = `${dt}T${hr}:00-03:00`;
    if (pacoteDias.some(d => d.iso === iso)) return alert("Já adicionado!");

    const labelData = document.getElementById('pct-add-data').options[document.getElementById('pct-add-data').selectedIndex].text;
    pacoteDias.push({ iso: iso, dataFmt: labelData, horaFmt: hr });
    atualizarListaPacotes();
}

function removerDiaPacote(index) {
    pacoteDias.splice(index, 1);
    atualizarListaPacotes();
}

function atualizarListaPacotes() {
    const ul = document.getElementById('lista-dias-pacote');
    const porte = document.getElementById('pct-porte')?.value || 'P';
    const elemTipo = document.querySelector('input[name="tipo-pacote"]:checked');
    if (!ul || !elemTipo) return;

    ul.innerHTML = "";
    pacoteDias.sort((a, b) => a.iso.localeCompare(b.iso)).forEach((objDia, index) => {
        const d = new Date(objDia.iso);
        let tSessaoCalculada = 0;

        if (elemTipo.value !== 'personalizado') {
            const sBanho = dbServicos.find(s => s.id === "Banho Padrão");
            tSessaoCalculada = sBanho && sBanho[porte] ? sBanho[porte].t : 40;
            if (index === 0 && d.getDay() !== 0) {
                const sTosa = dbServicos.find(s => s.id === "Tosa Higiênica");
                if (sTosa && sTosa[porte]) tSessaoCalculada += sTosa[porte].t;
            }
        } else {
            Array.from(document.querySelectorAll('.check-servico-pct:checked')).forEach(cb => {
                let sObj = dbServicos.find(x => x.id === cb.value);
                if (sObj && sObj[porte]) tSessaoCalculada += sObj[porte].t;
            });
        }
        objDia.tempoCalculado = tSessaoCalculada;
        ul.innerHTML += `<li style="margin-bottom:6px; background:#fff; padding:6px; border-radius:4px; border:1px solid #eee;">
            ✅ ${objDia.dataFmt.split('-')[0].trim()} às ${objDia.horaFmt} | ⏳ Estimativa: ${formatarTempo(tSessaoCalculada)}
            <span onclick="removerDiaPacote(${index})" style="cursor:pointer; color:#dc3545; float:right; font-weight:bold; font-size:16px;" title="Remover este dia">🗑️</span></li>`;
    });
}

async function contratarPacote() {
    const elemTipo = document.querySelector('input[name="tipo-pacote"]:checked');
    if (!elemTipo) return;
    const tipo = elemTipo.value;

    let servicosEscolhidos = [];
    if (tipo === 'personalizado') {
        servicosEscolhidos = Array.from(document.querySelectorAll('.check-servico-pct:checked')).map(cb => cb.value);
        if (servicosEscolhidos.length === 0) return alert("Escolha os serviços para montar seu pacote.");
    }

    const obj = {
        tutor: getValSeguro('pct-tutor'), pet: getValSeguro('pct-pet'), raca: getValSeguro('pct-raca'),
        celular: getValSeguro('pct-celular'), email: getValSeguro('pct-email'), porte: getValSeguro('pct-porte'),
        obs: getValSeguro('pct-obs'), diasMarcados: pacoteDias.map(d => d.iso),
        enfeite: getValSeguro('pct-enfeite'), perfume: getValSeguro('pct-perfume'),
        tipoPacote: tipo, servicos: servicosEscolhidos, descTosa: getValSeguro('pct-desc-tosa')
    };

    if (!obj.tutor || !obj.pet || !obj.raca || !obj.porte || !obj.celular || !obj.email) return alert("ATENÇÃO: Todos os dados obrigatórios (*) devem ser preenchidos.");
    
    let limiteMin = tipo === 'personalizado' ? 3 : precosPacotesFixos[tipo].diasReq;
    let limiteMax = tipo === 'personalizado' ? 45 : precosPacotesFixos[tipo].diasReq;
    if (pacoteDias.length < limiteMin || pacoteDias.length > limiteMax) return alert(`Para este plano, você precisa selecionar exatos ${limiteMax} dias.`);

    const btn = document.getElementById('btn-contratar-pct');
    if (btn) { btn.disabled = true; btn.innerText = "Avaliando Agenda e Conflitos..."; }

    try {
        const res = await fetch('/gerar-pacote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
        const d = await res.json();
        if (res.ok) {
            document.getElementById('form-pacote').style.display = 'none';
            document.getElementById('pacote-sucesso-container').style.display = 'block';

            const contAgenda = document.getElementById('links-google-agenda-pacote');
            if (contAgenda) {
                contAgenda.innerHTML = "";
                pacoteDias.forEach(dia => {
                    contAgenda.innerHTML += `<a href="${gerarLinkGoogleAgenda(obj.pet, dia.iso, dia.tempoCalculado || 40)}" target="_blank" class="botao" style="background:#4285F4; font-size:12px; padding:8px;">📅 Add Dia ${new Date(dia.iso).toLocaleDateString('pt-BR')}</a>`;
                });
            }
            pacoteDias = []; atualizarListaPacotes(); carregarMuralDoServidor();
        } else alert(`Erro: ${d.erro || "Falha ao contratar pacote."}`);
    } catch { alert("Servidor offline."); }
    finally { if (btn) { btn.disabled = false; btn.innerText = "⭐ Confirmar Pacote"; } }
}

// MURAL OCUPADO E PAINEL ADMIN
async function carregarMuralDoServidor() {
    const corpo = document.getElementById('corpo-tabela-mural');
    if (!corpo) return;
    try {
        const resposta = await fetch('/agenda');
        const dados = await resposta.json();

        const banner = document.getElementById('status-loja-banner');
        if (banner) {
            banner.style.display = 'block';
            if (dados.lojaAberta) {
                banner.style.backgroundColor = '#d4edda'; banner.style.color = '#155724';
                banner.innerText = '🟢 ESTABELECIMENTO ABERTO PARA AGENDAMENTOS';
            } else {
                banner.style.backgroundColor = '#f8d7da'; banner.style.color = '#721c24';
                banner.innerText = '🔴 ESTABELECIMENTO FECHADO NO MOMENTO';
            }
        }

        corpo.innerHTML = '';
        const listaOcupados = dados.ocupados || [];
        if (listaOcupados.length === 0) { corpo.innerHTML = '<tr><td colspan="2" style="text-align:center;">Agenda livre! ✨</td></tr>'; return; }

        listaOcupados.sort((a, b) => new Date(a.horarioISO) - new Date(b.horarioISO)).forEach(item => {
            const tr = document.createElement('tr');
            const agora = new Date().getTime();
            const inicio = new Date(item.horarioISO).getTime();
            const fim = inicio + (item.tempoMin * 60000);

            let statusBadge = '';
            if (item.status === 'Confirmado') {
                statusBadge = `<span class="status-pet">Agendado 🐾</span>`;
                if (agora >= inicio && agora <= fim) statusBadge = `<span class="status-pet" style="background:#fff3cd; color:#856404;">Em Atendimento ✂️</span>`;
                if (agora > fim) statusBadge = `<span class="status-pet" style="background:#d4edda; color:#155724;">Finalizando ✅</span>`;
            } else if (item.status === 'Concluído') {
                statusBadge = `<span class="status-pet" style="background:#28a745; color:#fff;">Entregue ✅</span>`;
            } else if (item.status === 'Aguardando Aprovação' || item.status === 'Pendente Remarcação Luana') {
                statusBadge = `<span class="status-pet" style="background:#ffeeba; color:#856404;">Pendente Avaliação ⏳</span>`;
            }

            tr.innerHTML = `<td><b>${escapeHTML(item.horarioFmt)}</b></td><td>${escapeHTML(item.pet)} <br>${statusBadge}</td>`;
            corpo.appendChild(tr);
        });
    } catch (e) { corpo.innerHTML = '<tr><td colspan="2">Servidor Offline.</td></tr>'; }
}

async function autenticarLuana() {
    const senhaDigitada = document.getElementById('senha-luana')?.value;
    try {
        const res = await fetch('/admin/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: senhaDigitada })
        });
        if (res.ok) {
            const dados = await res.json();
            luanaToken = dados.token;
            document.getElementById('login-admin-retirada').style.display = 'none';
            document.getElementById('painel-luana-ativo').style.display = 'block';
            carregarNotificacoesAdmin();
        } else alert("Senha incorreta.");
    } catch { alert("Erro ao conectar no servidor."); }
}

async function baixarRelatorio() {
    if (!luanaToken) return alert("Sessão expirada. Logue novamente.");
    const senhaConfirmacao = prompt("🔐 Relatório Protegido. Insira sua Senha Mestra para Autorizar:");
    if (!senhaConfirmacao) return;

    try {
        const res = await fetch('/admin/exportar-relatorio', {
            method: 'POST', headers: { 'Authorization': `Bearer ${luanaToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha: senhaConfirmacao })
        });
        const d = await res.json();
        if (res.ok) { alert(d.mensagem); carregarNotificacoesAdmin(); } else alert(d.erro);
    } catch { alert("Erro de rede."); }
}

async function toggleStatusLoja() {
    if (!confirm("Tem certeza que deseja fechar a loja? Alertas serão gerados para os clientes pendentes.")) return;
    if (!luanaToken) return;
    try {
        const res = await fetch('/admin/toggle-loja', { method: 'POST', headers: { 'Authorization': `Bearer ${luanaToken}` } });
        const data = await res.json();
        alert(data.mensagem); carregarNotificacoesAdmin(); carregarMuralDoServidor();
    } catch { alert("Erro de rede."); }
}

function abrirModalRemarcar(idAgendamento) {
    document.getElementById('remarcar-id').value = idAgendamento;
    popularDatasDropdown();
    document.getElementById('modal-remarcar').style.display = 'block';
}

async function confirmarRemarcacao() {
    const id = document.getElementById('remarcar-id').value;
    const nData = document.getElementById('remarcar-data').value;
    const nHora = document.getElementById('remarcar-hora').value;
    if (!nData || !nHora) return alert("Preencha a nova data e horário!");

    if (!luanaToken) return;
    try {
        const res = await fetch('/admin/remarcar-manual', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${luanaToken}` },
            body: JSON.stringify({ id, data: nData, hora: nHora })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.mensagem); document.getElementById('modal-remarcar').style.display = 'none';
            carregarNotificacoesAdmin(); carregarMuralDoServidor();
        } else alert(data.erro);
    } catch { alert("Erro de rede."); }
}

async function processarAprovacao(id, acao) {
    if (!luanaToken) return;
    try {
        const res = await fetch('/admin/aprovar-agendamento', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${luanaToken}` },
            body: JSON.stringify({ id, acao })
        });
        const data = await res.json();
        alert(data.mensagem); carregarNotificacoesAdmin(); carregarMuralDoServidor();
    } catch { alert("Erro de rede."); }
}

async function concluirEAvisarTutor(id) {
    if (!confirm(`Registrar Saída? O sistema enviará os avisos (Email/Zap/Push) e o PDF final.`)) return;
    if (!luanaToken) return;
    try {
        const res = await fetch('/admin/concluir-pet', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${luanaToken}` },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.mensagem); carregarNotificacoesAdmin(); carregarMuralDoServidor();
        } else alert(data.erro);
    } catch { alert("Erro de rede."); }
}

async function esqueciMinhaSenha() {
    if (!confirm("Deseja gerar uma nova senha aleatória e enviá-la para o seu E-mail e WhatsApp de segurança?")) return;
    try {
        const res = await fetch('/admin/recuperar-senha', { method: 'POST' });
        const dados = await res.json();
        alert(dados.mensagem);
    } catch (e) { alert("Erro ao solicitar nova senha. Verifique se o servidor está online."); }
}

function abrirModalGestao() {
    document.getElementById('gestao-nova-senha').value = '';
    document.getElementById('gestao-fotos').value = (dbFotos || []).join(',\n');

    let htmlServicos = '';
    dbServicos.forEach(s => {
        const pVal = s.P ? s.P.v : 0;
        const mVal = s.M ? s.M.v : 0;
        const gVal = s.G ? s.G.v : 0;
        htmlServicos += `
        <div style="background:#f9f9f9; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;">
            <b style="color:var(--cor-primaria);">${s.icone} ${s.id}</b><br>
            <div style="display:flex; gap:15px; margin-top:8px;">
                <label style="font-size:12px; font-weight:bold;">P: R$ <input type="number" id="val-${s.id}-P" value="${pVal}" style="width:60px; padding:3px; border:1px solid #ccc;"></label>
                <label style="font-size:12px; font-weight:bold;">M: R$ <input type="number" id="val-${s.id}-M" value="${mVal}" style="width:60px; padding:3px; border:1px solid #ccc;"></label>
                <label style="font-size:12px; font-weight:bold;">G: R$ <input type="number" id="val-${s.id}-G" value="${gVal}" style="width:60px; padding:3px; border:1px solid #ccc;"></label>
            </div>
        </div>`;
    });

    document.getElementById('lista-gestao-servicos').innerHTML = htmlServicos;
    document.getElementById('modal-gestao').style.display = 'block';
}

async function salvarGestaoSite() {
    const btn = document.querySelector('#modal-gestao .botao');
    btn.innerText = "Salvando..."; btn.disabled = true;

    const novaSenha = document.getElementById('gestao-nova-senha').value.trim();
    const fotosLimpidas = document.getElementById('gestao-fotos').value.split(',').map(f => f.trim()).filter(f => f !== '');

    let servicosAtualizados = {};
    dbServicos.forEach(s => {
        servicosAtualizados[s.id] = {
            icone: s.icone, desc: s.desc,
            P: { v: parseFloat(document.getElementById(`val-${s.id}-P`).value) || 0, t: s.P ? s.P.t : 40 },
            M: { v: parseFloat(document.getElementById(`val-${s.id}-M`).value) || 0, t: s.M ? s.M.t : 50 },
            G: { v: parseFloat(document.getElementById(`val-${s.id}-G`).value) || 0, t: s.G ? s.G.t : 60 }
        };
    });

    const pacote = {
        novaSenha: novaSenha !== '' ? novaSenha : null,
        galeriaFotos: fotosLimpidas, servicos: servicosAtualizados
    };

    try {
        const res = await fetch('/admin/salvar-site', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${luanaToken}` },
            body: JSON.stringify(pacote)
        });
        const dados = await res.json();

        if (res.ok) {
            alert(dados.mensagem); document.getElementById('modal-gestao').style.display = 'none'; location.reload();
        } else alert(dados.erro);
    } catch (e) { alert("Erro crítico de conexão."); } 
    finally { btn.innerText = "💾 Salvar e Atualizar Site"; btn.disabled = false; }
}

async function carregarNotificacoesAdmin() {
    const tabela = document.getElementById('lista-notificacoes-admin');
    const pendentesDiv = document.getElementById('lista-pendentes-admin');
    if (!luanaToken) return;

    try {
        const res = await fetch('/admin/notificacoes', { headers: { 'Authorization': `Bearer ${luanaToken}` } });
        if (res.status === 401 || res.status === 403) { luanaToken = null; return alert("Sessão expirada. Logue novamente."); }
        
        const dados = await res.json();
        const btnToggle = document.getElementById('btn-toggle-loja');
        if (btnToggle) {
            if (dados.lojaAberta) { btnToggle.style.background = '#dc3545'; btnToggle.innerText = '🔴 Fechar Estabelecimento Imediatamente'; } 
            else { btnToggle.style.background = '#28a745'; btnToggle.innerText = '🟢 Reabrir Estabelecimento'; }
        }

        const listaAgendamentos = dados.agendamentos || [];
        const pendentes = listaAgendamentos.filter(a => a.status.includes('Aguardando') || a.status.includes('Pendente'));
        const ativos = listaAgendamentos.filter(a => a.status === 'Confirmado' || a.status === 'Concluído');

        if (pendentesDiv) {
            if (pendentes.length > 0) {
                pendentesDiv.innerHTML = pendentes.map(p => `
                    <div style="border-bottom: 1px solid #ccc; padding: 10px 0;">
                        <b>${escapeHTML(p.pet)}</b> (Tutor: ${escapeHTML(p.tutor)})<br>
                        Data/Hora Solicitada: <b>${escapeHTML(p.horarioFmt)}</b><br>
                        <button class="botao" style="padding: 5px 10px; font-size:12px; margin-top:5px; background:#28a745;" onclick="processarAprovacao('${p.id}', 'Aprovar')">✅ Aprovar</button>
                        <button class="botao" style="padding: 5px 10px; font-size:12px; margin-top:5px; background:#0056b3;" onclick="abrirModalRemarcar('${p.id}')">🔄 Remarcar</button>
                        <button class="botao" style="padding: 5px 10px; font-size:12px; margin-top:5px; background:#dc3545;" onclick="processarAprovacao('${p.id}', 'Recusar')">❌ Recusar</button>
                    </div>`).join('');
            } else pendentesDiv.innerHTML = "Nenhuma ação pendente.";
        }

        if (tabela) {
            tabela.innerHTML = '';
            if (ativos.length === 0) return tabela.innerHTML = '<tr><td colspan="2">Nenhum agendamento ativo.</td></tr>';

            ativos.sort((a, b) => new Date(a.horarioISO) - new Date(b.horarioISO)).forEach(a => {
                const agora = new Date().getTime(); const inicio = new Date(a.horarioISO).getTime(); const fim = inicio + (a.tempoMin * 60000);

                let msgZap = encodeURIComponent(`Olá ${escapeHTML(a.tutor)}, o banho/tosa do pet ${escapeHTML(a.pet)} já foi finalizado e ele está pronto para ir para casa! 🐾`);
                let btnZap = `<a href="https://wa.me/55${escapeHTML(a.celular)}?text=${msgZap}" target="_blank" class="botao" style="background:#25D366; padding: 5px; font-size:11px; margin-top:5px; text-decoration:none; display:block; text-align:center;">📱 Avisar no WhatsApp</a>`;

                let btnAcao = `<button class="botao" style="background:#28a745; width:100%;" onclick="concluirEAvisarTutor('${escapeHTML(a.id)}')">🔔 Registrar Saída</button>${btnZap}`;
                if (a.status === 'Concluído') btnAcao = `<button disabled class="botao botao-secundario">✅ Finalizado (${a.saidaFmt})</button>`;

                tabela.innerHTML += `<tr>
                    <td>
                        <b>Pet: ${escapeHTML(a.pet)}</b> (Raça: ${escapeHTML(a.raca || 'N/A')} | Porte ${escapeHTML(a.porte)})<br>
                        <span style="font-size:12px; color:#555;">Tutor: ${escapeHTML(a.tutor)} | Cel: ${escapeHTML(a.celular)}</span><br>
                        <span style="font-size:12px; color:#0056b3; font-weight:bold;">Início: ${escapeHTML(a.horarioISO.split('T')[1].substring(0, 5))} | Saída: ${escapeHTML(a.saidaFmt || 'Aguardando')}</span>
                    </td><td>${btnAcao}</td></tr>`;
            });
        }
    } catch { if (tabela) tabela.innerHTML = '<tr><td colspan="2">Erro de conexão.</td></tr>'; }
}
// GERADOR DE PLACEHOLDERS ALEATÓRIOS (TUTOR, PET E RAÇA)
function atualizarPlaceholdersAleatorios() {
    const nomes = ["Camila", "Lucas", "Mariana", "Felipe", "Beatriz", "Gabriel", "Larissa", "Rafael", "Amanda", "Gustavo", "Fernanda", "Rodrigo", "Juliana", "Bruno", "Carolina", "Leonardo", "Patrícia", "Thiago"];
    const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Carvalho", "Almeida", "Ferreira", "Ribeiro", "Gomes", "Martins", "Rocha", "Alves", "Monteiro", "Mendes", "Barros", "Freitas"];
    const pets = ["Mel", "Thor", "Luna", "Bob", "Nina", "Zeus", "Amora", "Theo", "Cacau", "Max", "Maya", "Billy", "Bela", "Nick", "Kiara", "Simba", "Paçoca", "Chico", "Nala", "Pandora", "Scott", "Meg"];
    const racas = ["Poodle", "Shih Tzu", "Golden Retriever", "Yorkshire", "Buldogue Francês", "Spitz Alemão (Lulu)", "Lhasa Apso", "Maltês", "Beagle", "Schnauzer", "Pug", "SRD (Vira-lata)", "Chihuahua", "Cocker Spaniel", "Teckel (Salsicha)"];

    const sortear = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const pctTutor = document.getElementById('pct-tutor');
    const pctPet = document.getElementById('pct-pet');
    const pctRaca = document.getElementById('pct-raca');
    if (pctTutor) pctTutor.placeholder = `Ex: ${sortear(nomes)} ${sortear(sobrenomes)}`;
    if (pctPet) pctPet.placeholder = `Ex: ${sortear(pets)}`;
    if (pctRaca) pctRaca.placeholder = `Ex: ${sortear(racas)}`;

    const osTutor = document.getElementById('os-tutor');
    const osPet = document.getElementById('os-pet');
    const osRaca = document.getElementById('os-raca');
    if (osTutor) osTutor.placeholder = `Ex: ${sortear(nomes)} ${sortear(sobrenomes)}`;
    if (osPet) osPet.placeholder = `Ex: ${sortear(pets)}`;
    if (osRaca) osRaca.placeholder = `Ex: ${sortear(racas)}`;
}

const funcMudarAbaOriginal = window.mudarAba;
window.mudarAba = function(idAba) {
    if (typeof funcMudarAbaOriginal === 'function') {
        funcMudarAbaOriginal(idAba);
    }
    if (idAba === 'aba-os' || idAba === 'aba-pacotes') {
        atualizarPlaceholdersAleatorios();
    }
};
