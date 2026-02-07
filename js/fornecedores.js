import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const tabela = document.querySelector("#tabela tbody");
const filtro = document.getElementById("filtro");
const btnNovo = document.getElementById("btnNovo");

async function carregar() {
    tabela.innerHTML = "";
    const snap = await getDocs(collection(db, "fornecedores"));

    snap.forEach(d => {
        const f = d.data();
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${f.empresa}</td>
            <td>${f.categoria}</td>
            <td>${f.contacto}</td>
            <td>${f.telefone}</td>
            <td>${f.email}</td>
            <td>${f.obs || ""}</td>
            <td>
                <button class="btn-primario" onclick="editar('${d.id}')">Editar</button>
                <button class="btn-perigo" onclick="apagar('${d.id}')">Apagar</button>
            </td>
        `;

        tabela.appendChild(tr);
    });
}

window.editar = async function(id) {
    const ref = doc(db, "fornecedores", id);
    const snap = await getDocs(collection(db, "fornecedores"));
    const dados = snap.docs.find(x => x.id === id).data();

    const empresa = prompt("Empresa:", dados.empresa);
    if (!empresa) return;

    await updateDoc(ref, {
        empresa,
        categoria: prompt("Categoria:", dados.categoria),
        contacto: prompt("Nome de contacto:", dados.contacto),
        telefone: prompt("Telefone:", dados.telefone),
        email: prompt("Email:", dados.email),
        obs: prompt("Observações:", dados.obs || "")
    });

    carregar();
};

window.apagar = async function(id) {
    if (!confirm("Apagar fornecedor?")) return;
    await deleteDoc(doc(db, "fornecedores", id));
    carregar();
};

btnNovo.addEventListener("click", async () => {
    const empresa = prompt("Empresa:");
    if (!empresa) return;

    await addDoc(collection(db, "fornecedores"), {
        empresa,
        categoria: prompt("Categoria:"),
        contacto: prompt("Nome de contacto:"),
        telefone: prompt("Telefone:"),
        email: prompt("Email:"),
        obs: prompt("Observações:")
    });

    carregar();
});

filtro.addEventListener("input", () => {
    const termo = filtro.value.toLowerCase();
    [...tabela.rows].forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(termo) ? "" : "none";
    });
});

carregar();
