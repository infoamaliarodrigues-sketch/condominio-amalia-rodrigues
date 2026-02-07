import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const tabela = document.getElementById("tabela-manutencao").querySelector("tbody");
const btnNovo = document.getElementById("btnNovo");
const filtro = document.getElementById("filtro");

/* ============================
   CARREGAR TABELA
============================ */
async function carregar() {
    tabela.innerHTML = "";
    const snap = await getDocs(collection(db, "manutencao"));

    snap.forEach(d => {
        const m = d.data();
        const tr = document.createElement("tr");
        tr.id = `linha-${d.id}`;

        const classe = calcularClasseData(m.dataFim);
        tr.classList.add(classe);

        tr.innerHTML = `
    <td><input class="input-tabela" value="${m.tipo}" disabled></td>
    <td><input class="input-tabela" value="${m.empresa}" disabled></td>
    <td><input class="input-tabela" value="${m.contacto}" disabled></td>
    <td><input class="input-tabela" value="${m.email}" disabled></td>
    <td><input class="input-tabela" type="date" value="${m.dataInicio}" disabled></td>
    <td><input class="input-tabela" type="date" value="${m.dataFim}" disabled></td>

    <td class="acoes">
        <button class="btn-edit" onclick="editar('${d.id}')">Editar</button>
        <button class="btn-delete" onclick="apagar('${d.id}')">Apagar</button>
    </td>
`;



        tabela.appendChild(tr);
    });
}

/* ============================
   CALCULAR ALERTA DE DATA
============================ */
function calcularClasseData(dataFim) {
    if (!dataFim) return "manut-ok";

    const hoje = new Date();
    const fim = new Date(dataFim);

    const diffMeses =
        (fim.getFullYear() - hoje.getFullYear()) * 12 +
        (fim.getMonth() - hoje.getMonth());

    return diffMeses <= 2 ? "manut-alerta" : "manut-ok";
}

/* ============================
   EDITAR
============================ */
window.editar = function(id) {
    const tr = document.getElementById(`linha-${id}`);
    const inputs = tr.querySelectorAll("input");
    const acoes = tr.querySelector(".acoes");

    inputs.forEach(i => i.disabled = false);

    acoes.innerHTML = `
    <button class="btn-save" onclick="guardar('${id}')">Guardar</button>
    <button class="btn-delete" onclick="cancelar('${id}')">Cancelar</button>
`;

};

/* ============================
   CANCELAR
============================ */
window.cancelar = function(id) {
    carregar();
};

/* ============================
   GUARDAR
============================ */
window.guardar = async function(id) {
    const tr = document.getElementById(`linha-${id}`);
    const inputs = tr.querySelectorAll("input");

   const dados = {
    tipo: inputs[0].value,
    empresa: inputs[1].value,
    contacto: inputs[2].value,
    email: inputs[3].value,
    dataInicio: inputs[4].value,
    dataFim: inputs[5].value
};


    await updateDoc(doc(db, "manutencao", id), dados);
    carregar();
};

/* ============================
   APAGAR
============================ */
window.apagar = async function(id) {
    if (!confirm("Apagar registo de manutenção?")) return;
    await deleteDoc(doc(db, "manutencao", id));
    carregar();
};

/* ============================
   NOVO REGISTO
============================ */
btnNovo.addEventListener("click", async () => {
    const id = (await addDoc(collection(db, "manutencao"), {
        tipo: "",
        empresa: "",
        contacto: "",
        email: "",
        dataInicio: "",
        dataFim: "",
        obs: ""
    })).id;

    carregar();

    setTimeout(() => editar(id), 200);
});

/* ============================
   FILTRO
============================ */
filtro.addEventListener("input", () => {
    const termo = filtro.value.toLowerCase();
    [...tabela.rows].forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(termo) ? "" : "none";
    });
});

/* ============================
   INICIAR
============================ */
carregar();
