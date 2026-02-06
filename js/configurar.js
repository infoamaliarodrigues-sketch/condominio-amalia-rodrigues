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
const guardarBtn = document.getElementById("guardarBtn");

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

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
}

// ------------------------------------------------------------
// 2) Criar blocos de configuração por fração
// ------------------------------------------------------------
async function criarBlocos(ano) {
    fracoesContainer.innerHTML = "";

    const snap = await getDocs(collection(db, "condominos"));

    snap.forEach(docSnap => {
        const dados = docSnap.data();
        const fracao = dados.fracao;
        const letra = dados.letra;

        const bloco = document.createElement("div");
        bloco.className = "fracao-bloco";
        bloco.id = `bloco-${fracao}`;

        bloco.innerHTML = `
            <h2>Fração ${fracao} (${letra})</h2>

            <label>Valor mensal base (€):</label>
            <div style="display:flex; gap:10px; align-items:center; margin-bottom:15px;">
                <input type="number" id="valorBase-${fracao}" min="0" value="0" style="width:120px;">
                <button class="btn-primario" onclick="aplicarValorBase('${fracao}')">Aplicar a todos os meses</button>
            </div>

            <div class="secao-titulo">Quotas Mensais</div>
            <div class="linha-meses" id="q-${fracao}">
                ${MESES.map(m => `
                    <div>
                        <label>${m.toUpperCase()}</label>
                        <input type="number" id="q-${fracao}-${m}" value="0">
                    </div>
                `).join("")}
            </div>

            <div style="display:flex; align-items:center; gap:10px; margin-top:10px;">
                <label style="display:flex; align-items:center; gap:6px;">
                    <input type="checkbox" id="isen-${fracao}">
                    Isento
                </label>

                <input type="number" id="isenPercent-${fracao}" min="0" max="100" value="0" style="width:80px;">
                <span>%</span>
            </div>

            <textarea id="obsQ-${fracao}" class="obs-box" placeholder="Observações das quotas"></textarea>

            <div class="secao-titulo">Extras</div>
            <div class="linha-meses" id="e-${fracao}">
                ${MESES.map(m => `
                    <div>
                        <label>${m.toUpperCase()}</label>
                        <input type="number" id="e-${fracao}-${m}" value="0">
                    </div>
                `).join("")}
            </div>

            <textarea id="obsE-${fracao}" class="obs-box" placeholder="Observações dos extras"></textarea>
        `;

        fracoesContainer.appendChild(bloco);
    });

    // 1) Carregar valores do Firestore
    await carregarValoresExistentes(ano);

    // 2) Agora que os inputs existem e têm valores → calcular totais
    calcularTotais();

    // 3) Ligar eventos a todos os inputs criados dinamicamente
    document.querySelectorAll("input").forEach(inp => {
        inp.addEventListener("input", calcularTotais);
    });
}

// ------------------------------------------------------------
// 3) Aplicar valor base a todos os meses
// ------------------------------------------------------------
window.aplicarValorBase = function(fracao) {
    const base = Number(document.getElementById(`valorBase-${fracao}`).value);

    MESES.forEach(m => {
        document.getElementById(`q-${fracao}-${m}`).value = base;
    });
};

// ------------------------------------------------------------
// 4) Carregar valores já guardados no Firestore
// ------------------------------------------------------------
async function carregarValoresExistentes(ano) {
    const snap = await getDocs(collection(db, `config_ano/${ano}/fracoes`));

    snap.forEach(docSnap => {
        const fracao = docSnap.id;
        const dados = docSnap.data();

        MESES.forEach(m => {
            document.getElementById(`q-${fracao}-${m}`).value = dados.quotas[m];
            document.getElementById(`e-${fracao}-${m}`).value = dados.extras[m];
        });

        document.getElementById(`isen-${fracao}`).checked = dados.isencao;
        document.getElementById(`isenPercent-${fracao}`).value = dados.isencaoPercent ?? 0;

        document.getElementById(`obsQ-${fracao}`).value = dados.obsQuotas;
        document.getElementById(`obsE-${fracao}`).value = dados.obsExtras;
    });
}

// ------------------------------------------------------------
// 5) Guardar configuração do ano
// ------------------------------------------------------------
async function guardarConfiguracao() {
    const ano = anoSelect.value;

    const snap = await getDocs(collection(db, "condominos"));

    for (const docSnap of snap.docs) {
        const dados = docSnap.data();
        const fracao = dados.fracao;

        const quotas = {};
        const extras = {};

        MESES.forEach(m => {
            quotas[m] = Number(document.getElementById(`q-${fracao}-${m}`).value);
            extras[m] = Number(document.getElementById(`e-${fracao}-${m}`).value);
        });

        const isencao = document.getElementById(`isen-${fracao}`).checked;
        const isencaoPercent = Number(document.getElementById(`isenPercent-${fracao}`).value);

        const obsQ = document.getElementById(`obsQ-${fracao}`).value;
        const obsE = document.getElementById(`obsE-${fracao}`).value;

        await setDoc(doc(db, `config_ano/${ano}/fracoes`, fracao), {
            quotas,
            extras,
            isencao,
            isencaoPercent,
            obsQuotas: obsQ,
            obsExtras: obsE
        });
    }

    alert("Configuração guardada com sucesso!");
}

// ------------------------------------------------------------
// tabelas de totais
// ------------------------------------------------------------

function calcularTotais() {
    let totalQuotas = 0;
    let totalExtras = 0;
    let totalSemIsencao = 0;
    let totalComIsencao = 0;

    const snapPromise = getDocs(collection(db, "condominos"));

    snapPromise.then(snap => {
        snap.forEach(docSnap => {
            const fracao = docSnap.data().fracao;

            let somaQuotas = 0;
            let somaExtras = 0;

            MESES.forEach(m => {
                somaQuotas += Number(document.getElementById(`q-${fracao}-${m}`).value);
                somaExtras += Number(document.getElementById(`e-${fracao}-${m}`).value);
            });

            const isento = document.getElementById(`isen-${fracao}`).checked;
            const percent = Number(document.getElementById(`isenPercent-${fracao}`).value);

            const totalFracaoSem = somaQuotas + somaExtras;
            const totalFracaoCom = isento ? totalFracaoSem * (1 - percent / 100) : totalFracaoSem;

            totalQuotas += somaQuotas;
            totalExtras += somaExtras;
            totalSemIsencao += totalFracaoSem;
            totalComIsencao += totalFracaoCom;
        });

        document.getElementById("totalQuotas").textContent = totalQuotas.toFixed(2) + " €";
        document.getElementById("totalExtras").textContent = totalExtras.toFixed(2) + " €";
        document.getElementById("totalGeral").textContent = (totalQuotas + totalExtras).toFixed(2) + " €";
        document.getElementById("totalSemIsencao").textContent = totalSemIsencao.toFixed(2) + " €";
        document.getElementById("totalComIsencao").textContent = totalComIsencao.toFixed(2) + " €";
    });
}


// ------------------------------------------------------------
// Eventos
// ------------------------------------------------------------
anoSelect.addEventListener("change", () => criarBlocos(anoSelect.value));
guardarBtn.addEventListener("click", guardarConfiguracao);

// Inicialização
carregarAnos();
criarBlocos(anoSelect.value = new Date().getFullYear());
