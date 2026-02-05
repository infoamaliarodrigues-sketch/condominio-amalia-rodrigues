import { db } from "./firebase.js";
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tabela = document.querySelector("#tabelaAtrasos tbody");

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

async function iniciar() {
    await carregarCondominos();
    await carregarAtrasos();
}

iniciar();
