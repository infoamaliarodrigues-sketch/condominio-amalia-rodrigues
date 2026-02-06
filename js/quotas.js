import { db } from "./firebase-config.js";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const anoSelect = document.getElementById("anoSelect");
const fracoesContainer = document.getElementById("fracoesContainer");
const totalCondominioDiv = document.getElementById("totalCondominio");

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

// estado em memória
let estado = {
    ano: new Date().getFullYear(),
    fracoes: {} // fracao -> { quotasValores, extrasValores, quotasPagas, extrasPagas, obs }
};

// ------------------------------------------------------------
// 1) Carregar anos no seletor
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
// 2) Criar blocos por fração (a partir de condominos + config_ano + pagamentos)
// ------------------------------------------------------------
async function criarBlocos(ano) {
    fracoesContainer.innerHTML = "";
    estado.ano = ano;
    estado.fracoes = {};

    const condSnap = await getDocs(collection(db, "condominos"));
    const configSnap = await getDocs(collection(db, `config_ano/${ano}/fracoes`));
    const pagSnap = await getDocs(collection(db, `pagamentos/${ano}/fracoes`));

    const configMap = {};
    configSnap.forEach(d => configMap[d.id] = d.data());

    const pagMap = {};
    pagSnap.forEach(d => pagMap[d.id] = d.data());

    for (const docSnap of condSnap.docs) {
        const dados = docSnap.data();
        const fracao = dados.fracao;
        const letra = dados.letra;

        const config = configMap[fracao] || null;
if (!config) continue; // se não tiver configuração, ignora

// Ler isenção
const isento = config.isencao === true;
const percent = Number(config.isencaoPercent || 0);
const fator = isento ? (1 - percent / 100) : 1;

// Valores originais
const quotasValoresOrig = config.quotas || {};
const extrasValoresOrig = config.extras || {};

// Aplicar isenção aos valores
const quotasValores = {};
const extrasValores = {};

MESES.forEach(m => {
    quotasValores[m] = Number(quotasValoresOrig[m] || 0) * fator;
    extrasValores[m] = Number(extrasValoresOrig[m] || 0) * fator;
});

// Pagamentos
const pagamentos = pagMap[fracao] || {};
const quotasPagas = pagamentos.quotas || {};
const extrasPagas = pagamentos.extras || {};
const obs = pagamentos.obs || "";

// Guardar no estado
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

        criarLinhaMeses(fracao, "quotas");
        criarLinhaMeses(fracao, "extras");
        atualizarInfoFracao(fracao);

        document
            .getElementById(`guardar-${fracao}`)
            .addEventListener("click", () => guardarFracao(fracao));
    }
}

// ------------------------------------------------------------
// 3) Criar linha de meses (quotas ou extras)
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
// 4) Clique num mês (toggle pago/não pago + gravação imediata)
// ------------------------------------------------------------
async function onClickMes(e) {
    const div = e.currentTarget;
    const fracao = div.dataset.fracao;
    const tipo = div.dataset.tipo; // "quotas" ou "extras"
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
    await guardarFracao(fracao, true); // true = auto-save silencioso
}

// ------------------------------------------------------------
// 5) Atualizar info (Pago / Dívida) de uma fração
// ------------------------------------------------------------
function atualizarInfoFracao(fracao) {
    const fr = estado.fracoes[fracao];
    if (!fr) return;

    let pagoQuotas = 0;
    let dividaQuotas = 0;
    let pagoExtras = 0;
    let dividaExtras = 0;

    MESES.forEach(m => {
        const vQ = Number(fr.quotasValores[m] || 0);
        const vE = Number(fr.extrasValores[m] || 0);

        if (fr.quotasPagas[m]) pagoQuotas += vQ;
        else dividaQuotas += vQ;

        if (fr.extrasPagas[m]) pagoExtras += vE;
        else dividaExtras += vE;
    });

    const infoQ = document.getElementById(`info-q-${fracao}`);
    const infoE = document.getElementById(`info-e-${fracao}`);

    infoQ.textContent = `Pago: ${pagoQuotas.toFixed(2)} € | Dívida: ${dividaQuotas.toFixed(2)} €`;
    infoE.textContent = `Pago: ${pagoExtras.toFixed(2)} € | Dívida: ${dividaExtras.toFixed(2)} €`;
}

// ------------------------------------------------------------
// 6) Guardar fração no Firestore
// ------------------------------------------------------------
async function guardarFracao(fracao, silencioso = false) {
    const fr = estado.fracoes[fracao];
    if (!fr) return;

    const ano = estado.ano;
    const obs = document.getElementById(`obs-${fracao}`).value;

    await setDoc(
        doc(db, `pagamentos/${ano}/fracoes`, fracao),
        {
            quotas: fr.quotasPagas,
            extras: fr.extrasPagas,
            obs
        },
        { merge: true }
    );

    if (!silencioso) {
        alert(`Fração ${fracao} guardada com sucesso.`);
    }
}

// ------------------------------------------------------------
// 7) Recalcular total do condomínio (só quando chamado)
// ------------------------------------------------------------
async function recalcularTotalCondominio() {
    const ano = estado.ano;
    let totalPago = 0;
    let totalDivida = 0;

    const configSnap = await getDocs(collection(db, `config_ano/${ano}/fracoes`));
    const pagSnap = await getDocs(collection(db, `pagamentos/${ano}/fracoes`));

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
// 8) Botão para recalcular total do condomínio (em baixo)
// ------------------------------------------------------------
(function criarBotaoRecalcular() {
    const btn = document.createElement("button");
    btn.textContent = "Recalcular Totais do Condomínio";
    btn.className = "btn-primario";
    btn.style.marginTop = "15px";
    btn.addEventListener("click", recalcularTotalCondominio);
    totalCondominioDiv.parentNode.insertBefore(btn, totalCondominioDiv.nextSibling);
})();

// ------------------------------------------------------------
// 9) Botão de recalcular no topo
// ------------------------------------------------------------
document.getElementById("btnRecalcularTopo")
    .addEventListener("click", recalcularTotalCondominio);

// ------------------------------------------------------------
// 10) Alteração do ano
// ------------------------------------------------------------
anoSelect.addEventListener("change", () => criarBlocos(anoSelect.value));

// ------------------------------------------------------------
// 11) Inicialização
// ------------------------------------------------------------
carregarAnos();
criarBlocos(estado.ano);
