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

            <div class="secao-titulo">Quotas Mensais</div>
            <div class="linha-meses" id="q-${fracao}">
                ${MESES.map(m => `
                    <div>
                        <label>${m}</label>
                        <input type="number" id="q-${fracao}-${m}" value="0">
                    </div>
                `).join("")}
            </div>

            <label>Isenção 50%:
                <input type="checkbox" id="isen-${fracao}">
            </label>

            <textarea id="obsQ-${fracao}" class="obs-box" placeholder="Observações das quotas"></textarea>

            <div class="secao-titulo">Extras</div>
            <div class="linha-meses" id="e-${fracao}">
                ${MESES.map(m => `
                    <div>
                        <label>${m}</label>
                        <input type="number" id="e-${fracao}-${m}" value="0">
                    </div>
                `).join("")}
            </div>

            <textarea id="obsE-${fracao}" class="obs-box" placeholder="Observações dos extras"></textarea>
        `;

        fracoesContainer.appendChild(bloco);
    });

    await carregarValoresExistentes(ano);
}

// ------------------------------------------------------------
// 3) Carregar valores já guardados no Firestore
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
        document.getElementById(`obsQ-${fracao}`).value = dados.obsQuotas;
        document.getElementById(`obsE-${fracao}`).value = dados.obsExtras;
    });
}

// ------------------------------------------------------------
// 4) Guardar configuração do ano
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
        const obsQ = document.getElementById(`obsQ-${fracao}`).value;
        const obsE = document.getElementById(`obsE-${fracao}`).value;

        await setDoc(doc(db, `config_ano/${ano}/fracoes`, fracao), {
            quotas,
            extras,
            isencao,
            obsQuotas: obsQ,
            obsExtras: obsE
        });
    }

    alert("Configuração guardada com sucesso!");
}

// ------------------------------------------------------------
// Eventos
// ------------------------------------------------------------
anoSelect.addEventListener("change", () => criarBlocos(anoSelect.value));
guardarBtn.addEventListener("click", guardarConfiguracao);

// Inicialização
carregarAnos();
criarBlocos(anoSelect.value = new Date().getFullYear());
