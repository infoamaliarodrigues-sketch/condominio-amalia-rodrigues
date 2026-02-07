import { db } from "./firebase-config.js";
import {
    collection,
    doc,
    getDocs,
    setDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const anoSelect = document.getElementById("anoSelect");
const fracoesContainer = document.getElementById("fracoesContainer");
const totalCondominioDiv = document.getElementById("totalCondominio");

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

// Estado em memória
let estado = {
    ano: new Date().getFullYear(),
    fracoes: {}
};

// ------------------------------------------------------------
// 1) Carregar anos
// ------------------------------------------------------------
function carregarAnos() {
    for (let ano = 2020; ano <= 2050; ano++) {
        const opt = document.createElement("option");
        opt.value = ano;
        opt.textContent = ano;
        anoSelect.appendChild(opt);
    }
    anoSelect.value = estado.ano;
}

// ------------------------------------------------------------
// 2) Criar blocos por fração
// ------------------------------------------------------------
async function criarBlocos(ano) {
    fracoesContainer.innerHTML = "";
    estado.ano = ano;
    estado.fracoes = {};

    const condSnap = await getDocs(collection(db, "condominos"));
    const configSnap = await getDocs(collection(db, `config_ano/${ano}/fracoes`));
    const pagSnap = await getDocs(collection(db, `pagamentos/${ano}/fracao`));

    const configMap = {};
    configSnap.forEach(d => configMap[d.id] = d.data());

    const pagMap = {};
    pagSnap.forEach(d => pagMap[d.id] = d.data());

    for (const docSnap of condSnap.docs) {
        const dados = docSnap.data();
        const fracao = dados.fracao;
        const letra = dados.letra;

        const config = configMap[fracao];
        if (!config) continue;

        const isento = config.isencao === true;
        const percent = Number(config.isencaoPercent || 0);
        const fator = isento ? (1 - percent / 100) : 1;

        const quotasValores = {};
        const extrasValores = {};

        MESES.forEach(m => {
            quotasValores[m] = Number(config.quotas[m] || 0) * fator;
            extrasValores[m] = Number(config.extras[m] || 0) * fator;
        });

        const pagamentos = pagMap[fracao] || {};
        const quotasPagas = pagamentos.quotas || {};
        const extrasPagas = pagamentos.extras || {};
        const obs = pagamentos.obs || "";

        estado.fracoes[fracao] = {
            quotasValores,
            extrasValores,
            quotasPagas,
            extrasPagas,
            obs
        };

        const bloco = document.createElement("div");
        bloco.className = "fracao-bloco";
        bloco.id = `bloco-${fracao}`;

        bloco.innerHTML = `
            <div class="linha-titulo">Fração ${fracao} (${letra}) — QUOTAS</div>
            <div class="linha-meses" id="linha-q-${fracao}"></div>
            <div class="linha-info" id="info-q-${fracao}"></div>

            <div class="linha-titulo">Fração ${fracao} (${letra}) — EXTRAS</div>
            <div class="linha-meses" id="linha-e-${fracao}"></div>
            <div class="linha-info" id="info-e-${fracao}"></div>

            <textarea id="obs-${fracao}" class="obs-box" placeholder="Observações da fração">${obs}</textarea>

            <button class="guardar-btn" id="guardar-${fracao}">Guardar fração</button>
        `;

        fracoesContainer.appendChild(bloco);

        // Linha "Guardado em..."
        const estadoDiv = document.createElement("div");
        estadoDiv.id = `estado-${fracao}`;
        estadoDiv.className = "estado-guardado";
        estadoDiv.style = "margin-top:8px; font-size:13px; color:#555;";
        estadoDiv.textContent = "Ainda não guardado";
        bloco.appendChild(estadoDiv);

        criarLinhaMeses(fracao, "quotas");
        criarLinhaMeses(fracao, "extras");
        atualizarInfoFracao(fracao);

        document.getElementById(`guardar-${fracao}`)
            .addEventListener("click", () => guardarFracao(fracao));
    }
}

// ------------------------------------------------------------
// 3) Criar linha de meses
// ------------------------------------------------------------
function criarLinhaMeses(fracao, tipo) {
    const linhaId = tipo === "quotas" ? `linha-q-${fracao}` : `linha-e-${fracao}`;
    const linhaDiv = document.getElementById(linhaId);
    linhaDiv.innerHTML = "";

    const valores = tipo === "quotas"
        ? estado.fracoes[fracao].quotasValores
        : estado.fracoes[fracao].extrasValores;

    const pagos = tipo === "quotas"
        ? estado.fracoes[fracao].quotasPagas
        : estado.fracoes[fracao].extrasPagas;

    MESES.forEach(m => {
        const valor = valores[m] || 0;
        const pago = pagos[m] === true;

        const mesDiv = document.createElement("div");
        mesDiv.className = "mes " + (pago ? "pago" : "nao-pago");
        mesDiv.dataset.fracao = fracao;
        mesDiv.dataset.tipo = tipo;
        mesDiv.dataset.mes = m;

        mesDiv.innerHTML = `
            <div class="mes-label">${m.toUpperCase()}</div>
            <div class="mes-valor">${valor}</div>
        `;

        mesDiv.addEventListener("click", onClickMes);
        linhaDiv.appendChild(mesDiv);
    });
}

// ------------------------------------------------------------
// 4) Clique num mês
// ------------------------------------------------------------
async function onClickMes(e) {
    const div = e.currentTarget;
    const fracao = div.dataset.fracao;
    const tipo = div.dataset.tipo;
    const mes = div.dataset.mes;

    const fr = estado.fracoes[fracao];
    if (!fr) return;

    if (tipo === "quotas") {
        fr.quotasPagas[mes] = !fr.quotasPagas[mes];
    } else {
        fr.extrasPagas[mes] = !fr.extrasPagas[mes];
    }

    const pago = tipo === "quotas" ? fr.quotasPagas[mes] : fr.extrasPagas[mes];
    div.classList.toggle("pago", pago);
    div.classList.toggle("nao-pago", !pago);

    atualizarInfoFracao(fracao);
    await guardarFracao(fracao, true);
}

// ------------------------------------------------------------
// 5) Atualizar info da fração
// ------------------------------------------------------------
function atualizarInfoFracao(fracao) {
    const fr = estado.fracoes[fracao];
    if (!fr) return;

    let pagoQuotas = 0;
    let dividaQuotas = 0;
    let pagoExtras = 0;
    let dividaExtras = 0;
    let atraso = 0;

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const ultimoMesAtraso = mesAtual - 1;

    MESES.forEach((m, index) => {
        const mesNumero = index + 1;

        const vQ = Number(fr.quotasValores[m] || 0);
        const vE = Number(fr.extrasValores[m] || 0);

        const pagoQ = fr.quotasPagas[m] === true;
        const pagoE = fr.extrasPagas[m] === true;

        if (pagoQ) pagoQuotas += vQ;
        else dividaQuotas += vQ;

        if (pagoE) pagoExtras += vE;
        else dividaExtras += vE;

        if (mesNumero <= ultimoMesAtraso) {
            if (!pagoQ) atraso += vQ;
            if (!pagoE) atraso += vE;
        }
    });

    document.getElementById(`info-q-${fracao}`).textContent =
        `Pago: ${pagoQuotas.toFixed(2)} € | Dívida Ano: ${dividaQuotas.toFixed(2)} € | Atraso: ${atraso.toFixed(2)} €`;

    document.getElementById(`info-e-${fracao}`).textContent =
        `Pago: ${pagoExtras.toFixed(2)} € | Dívida Ano: ${dividaExtras.toFixed(2)} € | Atraso: ${atraso.toFixed(2)} €`;
}

// ------------------------------------------------------------
// 6) Guardar fração
// ------------------------------------------------------------
async function guardarFracao(fracao, silencioso = false) {
    const fr = estado.fracoes[fracao];
    if (!fr) return;

    const ano = estado.ano;
    const obs = document.getElementById(`obs-${fracao}`).value;

    MESES.forEach(m => {
        if (fr.quotasPagas[m] === undefined) fr.quotasPagas[m] = false;
        if (fr.extrasPagas[m] === undefined) fr.extrasPagas[m] = false;
    });

    await setDoc(
        doc(db, `pagamentos/${ano}/fracao/${fracao}`),
        {
            quotas: fr.quotasPagas,
            extras: fr.extrasPagas,
            obs
        },
        { merge: true }
    );

    const agora = new Date();
    const data = agora.toLocaleDateString("pt-PT");
    const horas = agora.toLocaleTimeString("pt-PT");

    document.getElementById(`estado-${fracao}`).textContent =
        `Guardado em ${data} - ${horas}`;

    if (!silencioso) {
        alert(`Fração ${fracao} guardada com sucesso.`);
    }
}

// ------------------------------------------------------------
// 7) Recalcular total do condomínio
// ------------------------------------------------------------
async function recalcularTotalCondominio() {
    const ano = estado.ano;
    let totalPago = 0;
    let totalDivida = 0;

    const configSnap = await getDocs(collection(db, `config_ano/${ano}/fracoes`));
    const pagSnap = await getDocs(collection(db, `pagamentos/${ano}/fracao`));

    const configMap = {};
    configSnap.forEach(d => configMap[d.id] = d.data());

    const pagMap = {};
    pagSnap.forEach(d => pagMap[d.id] = d.data());

    for (const fracao in configMap) {
        const cfg = configMap[fracao];
        const pag = pagMap[fracao] || { quotas:{}, extras:{} };

        MESES.forEach(m => {
            const isento = cfg.isencao === true;
            const percent = Number(cfg.isencaoPercent || 0);
            const fator = isento ? (1 - percent / 100) : 1;

            const vQ = Number(cfg.quotas[m] || 0) * fator;
            const vE = Number(cfg.extras[m] || 0) * fator;

            if (pag.quotas && pag.quotas[m]) totalPago += vQ;
            else totalDivida += vQ;

            if (pag.extras && pag.extras[m]) totalPago += vE;
            else totalDivida += vE;
        });
    }

    totalCondominioDiv.innerHTML = `
        Total Pago: ${totalPago.toFixed(2)} €<br>
        Total em Dívida: ${totalDivida.toFixed(2)} €
    `;
}

// ------------------------------------------------------------
// 8) Botão recalcular (topo)
// ------------------------------------------------------------
document.getElementById("btnRecalcularTopo")
    .addEventListener("click", recalcularTotalCondominio);

// ------------------------------------------------------------
// 9) Alteração do ano
// ------------------------------------------------------------
anoSelect.addEventListener("change", () => criarBlocos(anoSelect.value));

// ------------------------------------------------------------
// 10) Inicialização
// ------------------------------------------------------------
carregarAnos();
criarBlocos(estado.ano);
