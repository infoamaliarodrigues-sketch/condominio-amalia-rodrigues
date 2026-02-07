import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const tabela = document.getElementById("tabela-fornecedores").querySelector("tbody");
const filtro = document.getElementById("filtro");
const btnNovo = document.getElementById("btnNovo");

async function carregar() {
    tabela.innerHTML = "";
    const snap = await getDocs(collection(db, "fornecedores"));

    snap.forEach(d => {
        const f = d.data();
        const tr = document.createElement("tr");
        tr.id = `linha-${d.id}`;

        tr.innerHTML = `
            <td><input class="input-tabela" value="${f.empresa}" disabled></td>
            <td><input class="input-tabela" value="${f.categoria}" disabled></td>
            <td><input class="input-tabela" value="${f.contacto}" disabled></td>
            <td><input class="input-tabela" value="${f.telefone}" disabled></td>
            <td><input class="input-tabela" value="${f.email}" disabled></td>
            <td><input class="input-tabela" value="${f.obs || ""}" disabled></td>
            <td class="acoes">
            <button class="btn-edit" onclick="editar('${d.id}')">Editar</button>
            <button class="btn-delete" onclick="apagar('${d.id}')">Apagar</button>
        </td>

        `;

        tabela.appendChild(tr);
    });
}

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

window.cancelar = function(id) {
    carregar();
};

window.guardar = async function(id) {
    const tr = document.getElementById(`linha-${id}`);
    const inputs = tr.querySelectorAll("input");

    const dados = {
        empresa: inputs[0].value,
        categoria: inputs[1].value,
        contacto: inputs[2].value,
        telefone: inputs[3].value,
        email: inputs[4].value,
        obs: inputs[5].value
    };

    await updateDoc(doc(db, "fornecedores", id), dados);
    carregar();
};

window.apagar = async function(id) {
    if (!confirm("Apagar fornecedor?")) return;
    await deleteDoc(doc(db, "fornecedores", id));
    carregar();
};

btnNovo.addEventListener("click", async () => {
    const id = (await addDoc(collection(db, "fornecedores"), {
        empresa: "",
        categoria: "",
        contacto: "",
        telefone: "",
        email: "",
        obs: ""
    })).id;

    carregar();

    setTimeout(() => editar(id), 200);
});

filtro.addEventListener("input", () => {
    const termo = filtro.value.toLowerCase();
    [...tabela.rows].forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(termo) ? "" : "none";
    });
});

carregar();
