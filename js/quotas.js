import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    setDoc,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const anoSelect = document.getElementById("anoSelect");
const tabela = document.querySelector("#tabelaQuotas tbody");
const totalTopo = document.getElementById("totalCondominioTopo");
const totalFundo = document.getElementById("totalCondominioFundo");

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

async function carregarAnos() {
    for (let ano = 2010; ano <= 2050; ano++) {
        const opt = document.createElement("option");
        opt.value = ano;
        opt.textContent = ano;
        anoSelect.appendChild(opt);
    }
}

async function carregarTabela(ano) {
    tabela.innerHTML = "";
    totalTopo.textContent = "";
    totalFundo.textContent = "";

    const condSnap = await getDocs(collection(db, "condominos"));
    const quotasSnap = await getDocs(collection(db, "quotas_ano"));

    let quotasAno = {};
    quotasSnap.forEach(q => {
        const dados = q.data();
        if (dados.ano === ano) quotasAno[dados.fracao] = dados;
    });

    let totalCondominio = 0;

    for (const c of condSnap.docs) {
        const dados = c.data();
        const fracao = dados.fracao;

        let reg = quotasAno[fracao];

        if (!reg) {
            reg = {
                ano,
                fracao,
                letra: dados.letra,
                nome: dados.nome,
                quotaMensal: 0,
                quotaExtra: 0,
                valorPago: 0,
                isencao50: false,
                observacoes: "",
                meses: {
                    jan:false, fev:false, mar:false, abr:false, mai:false, jun:false,
                    jul:false, ago:false, set:false, out:false, nov:false, dez:false
                }
            };

            await setDoc(doc(db, "quotas_ano", `${ano}_${fracao}`), reg);
        }

        const totalFracao = (reg.quotaMensal * MESES.filter(m => reg.meses[m]).length)
                          + reg.quotaExtra
                          - reg.valorPago;

        totalCondominio += totalFracao;

        let linha = `
        <tr id="linha-${fracao}">
        <td>${reg.letra}</td>
        <td>${fracao}</td>
        <td><input type="number" id="quota-${fracao}" value="${reg.quotaMensal}" disabled></td>
        `;


        MESES.forEach(m => {
            const classe = reg.meses[m] ? "pago" : "falta";
            linha += `<td class="${classe}" onclick="toggleMes('${fracao}','${m}')">${reg.meses[m] ? "✔" : "✘"}</td>`;
        });

        linha += `
            <td><input type="number" id="extra-${fracao}" value="${reg.quotaExtra}" disabled></td>
            <td><input type="number" id="pago-${fracao}" value="${reg.valorPago}" disabled></td>
            <td class="total-fracao">${totalFracao.toFixed(2)}</td>
            <td><input type="checkbox" id="isen-${fracao}" ${reg.isencao50 ? "checked" : ""} disabled></td>
            <td><input id="obs-${fracao}" value="${reg.observacoes}" disabled></td>

            <td>
                <button onclick="editar('${fracao}')">Editar</button>
                <button onclick="guardar('${fracao}', ${ano})">Guardar</button>
            </td>
        </tr>
        `;

        tabela.innerHTML += linha;
    }

    totalTopo.textContent = `TOTAL DO CONDOMÍNIO: ${totalCondominio.toFixed(2)} €`;
    totalFundo.textContent = `TOTAL DO CONDOMÍNIO: ${totalCondominio.toFixed(2)} €`;
}

window.toggleMes = async function(fracao, mes) {
    const ano = Number(anoSelect.value);
    const ref = doc(db, "quotas_ano", `${ano}_${fracao}`);
    const snap = await getDocs(collection(db, "quotas_ano"));
    let reg;

    snap.forEach(d => {
        if (d.id === `${ano}_${fracao}`) reg = d.data();
    });

    reg.meses[mes] = !reg.meses[mes];

    await updateDoc(ref, { meses: reg.meses });
    carregarTabela(ano);
};

window.editar = function(fracao) {
    document.querySelectorAll(`#linha-${fracao} input`).forEach(i => i.disabled = false);
};

window.guardar = async function(fracao, ano) {
    const ref = doc(db, "quotas_ano", `${ano}_${fracao}`);

    await updateDoc(ref, {
        quotaMensal: Number(document.getElementById(`quota-${fracao}`).value),
        quotaExtra: Number(document.getElementById(`extra-${fracao}`).value),
        valorPago: Number(document.getElementById(`pago-${fracao}`).value),
        isencao50: document.getElementById(`isen-${fracao}`).checked,
        observacoes: document.getElementById(`obs-${fracao}`).value
    });

    carregarTabela(ano);
};

anoSelect.onchange = () => carregarTabela(Number(anoSelect.value));

await carregarAnos();
await carregarTabela(2025);
