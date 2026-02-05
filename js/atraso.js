import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const tabela = document.querySelector("#tabelaAtrasos tbody");
const btnAdd = document.createElement("button");
btnAdd.textContent = "Adicionar Dívida";
btnAdd.classList.add("btn-edit");
document.querySelector(".main-container").prepend(btnAdd);

let cond = {}; // mapa de condóminos

async function carregarCondominos() {
    const snap = await getDocs(collection(db, "condominos"));
    snap.forEach(c => {
        cond[c.data().fracao] = {
            letra: c.data().letra,
            nome: c.data().nome
        };
    });
}

async function carregarAtrasos() {
    tabela.innerHTML = "";
    const snap = await getDocs(collection(db, "dividas_registo"));

    snap.forEach(d => {
        const dados = d.data();
        const info = cond[dados.fracao];

        tabela.innerHTML += `
        <tr id="linha-${d.id}">
            <td>${info.letra}</td>
            <td>${dados.fracao}</td>
            <td>${info.nome}</td>

            <td><input id="tipo-${d.id}" value="${dados.tipo}" disabled></td>
            <td><input id="inicio-${d.id}" type="number" value="${dados.anoInicio}" disabled></td>
            <td><input id="fim-${d.id}" type="number" value="${dados.anoFim}" disabled></td>
            <td><input id="valor-${d.id}" type="number" value="${dados.valor}" disabled></td>
            <td><input id="obs-${d.id}" value="${dados.observacoes || ''}" disabled></td>

            <td>
                <button class="btn-edit" onclick="editar('${d.id}')">Editar</button>
                <button class="btn-save" onclick="guardar('${d.id}')">Guardar</button>
                <button class="btn-delete" onclick="apagar('${d.id}')">Apagar</button>
            </td>
        </tr>
        `;
    });
}

window.editar = function(id) {
    document.querySelectorAll(`#linha-${id} input`).forEach(i => i.disabled = false);
};

window.guardar = async function(id) {
    const ref = doc(db, "dividas_registo", id);

    await updateDoc(ref, {
        tipo: document.querySelector(`#tipo-${id}`).value,
        anoInicio: Number(document.querySelector(`#inicio-${id}`).value),
        anoFim: Number(document.querySelector(`#fim-${id}`).value),
        valor: Number(document.querySelector(`#valor-${id}`).value),
        observacoes: document.querySelector(`#obs-${id}`).value
    });

    document.querySelectorAll(`#linha-${id} input`).forEach(i => i.disabled = true);
};

window.apagar = async function(id) {
    await deleteDoc(doc(db, "dividas_registo", id));
    document.querySelector(`#linha-${id}`).remove();
};

btnAdd.onclick = async function() {
    const fracao = prompt("Fração (ex: 1A):");
    if (!fracao || !cond[fracao]) {
        alert("Fração inválida ou inexistente.");
        return;
    }

    const tipo = prompt("Tipo (mensal / extra):");
    const anoInicio = Number(prompt("Ano início:"));
    const anoFim = Number(prompt("Ano fim:"));
    const valor = Number(prompt("Valor total (€):"));
    const observacoes = prompt("Observações:");

    await addDoc(collection(db, "dividas_registo"), {
        fracao,
        tipo,
        anoInicio,
        anoFim,
        valor,
        observacoes
    });

    carregarAtrasos();
};

async function iniciar() {
    await carregarCondominos();
    await carregarAtrasos();
}

iniciar();
