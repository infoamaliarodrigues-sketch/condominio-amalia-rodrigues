import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import {
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";


// ----------------------
// FRAÇÕES FIXAS
// ----------------------
const fracoesFixas = [
    "1A","1B","1C",
    "2A","2B","2C",
    "3A","3B","3C",
    "4A","4B","4C",
    "5A","5B","5C",
    "LOJA 1","LOJA 2","LOJA 3",
    "CASA DO LIXO"
];


// ----------------------
// CRIAR FRAÇÕES NO FIREBASE SE NÃO EXISTIREM
// ----------------------
async function inicializarFracoes() {
    for (const fracao of fracoesFixas) {
        const ref = doc(db, "condominos", fracao);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            await setDoc(ref, {
                fracao,
                nome: "",
                permilagem: "",
                telefone: "",
                email: ""
            });
        }
    }
}


// ----------------------
// VERIFICAR LOGIN
// ----------------------
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    await inicializarFracoes();
});


// ----------------------
// LISTAR TABELA EM TEMPO REAL
// ----------------------
const tabela = document.querySelector("#tabela tbody");

onSnapshot(collection(db, "condominos"), (snapshot) => {
    tabela.innerHTML = "";

    snapshot.forEach(docSnap => {
        const c = docSnap.data();

        tabela.innerHTML += `
            <tr>
                <td>${c.fracao}</td>
                <td><input id="nome-${c.fracao}" value="${c.nome}" disabled></td>
                <td><input id="perm-${c.fracao}" value="${c.permilagem}" disabled></td>
                <td><input id="tel-${c.fracao}" value="${c.telefone}" disabled></td>
                <td><input id="email-${c.fracao}" value="${c.email}" disabled></td>
                <td>
                    <button class="btn-edit" onclick="editar('${c.fracao}')">Editar</button>
                    <button class="btn-save" onclick="guardar('${c.fracao}')">Guardar</button>
                    <button class="btn-delete" onclick="limpar('${c.fracao}')">Apagar</button>
                </td>
            </tr>
        `;
    });
});


// ----------------------
// EDITAR (ativa inputs)
// ----------------------
window.editar = (fracao) => {
    document.getElementById(`nome-${fracao}`).disabled = false;
    document.getElementById(`perm-${fracao}`).disabled = false;
    document.getElementById(`tel-${fracao}`).disabled = false;
    document.getElementById(`email-${fracao}`).disabled = false;
};


// ----------------------
// GUARDAR ALTERAÇÕES
// ----------------------
window.guardar = async (fracao) => {

    await setDoc(doc(db, "condominos", fracao), {
        fracao,
        nome: document.getElementById(`nome-${fracao}`).value,
        permilagem: document.getElementById(`perm-${fracao}`).value,
        telefone: document.getElementById(`tel-${fracao}`).value,
        email: document.getElementById(`email-${fracao}`).value
    });

    document.getElementById(`nome-${fracao}`).disabled = true;
    document.getElementById(`perm-${fracao}`).disabled = true;
    document.getElementById(`tel-${fracao}`).disabled = true;
    document.getElementById(`email-${fracao}`).disabled = true;
};


// ----------------------
// LIMPAR DADOS DA FRAÇÃO
// ----------------------
window.limpar = async (fracao) => {

    await setDoc(doc(db, "condominos", fracao), {
        fracao,
        nome: "",
        permilagem: "",
        telefone: "",
        email: ""
    });

    document.getElementById(`nome-${fracao}`).value = "";
    document.getElementById(`perm-${fracao}`).value = "";
    document.getElementById(`tel-${fracao}`).value = "";
    document.getElementById(`email-${fracao}`).value = "";

    document.getElementById(`nome-${fracao}`).disabled = true;
    document.getElementById(`perm-${fracao}`).disabled = true;
    document.getElementById(`tel-${fracao}`).disabled = true;
    document.getElementById(`email-${fracao}`).disabled = true;
};


// ----------------------
// FILTRO
// ----------------------
document.getElementById("filtro").addEventListener("input", () => {
    const termo = document.getElementById("filtro").value.toLowerCase();
    const linhas = document.querySelectorAll("#tabela tbody tr");

    linhas.forEach(linha => {
        const texto = linha.innerText.toLowerCase();
        linha.style.display = texto.includes(termo) ? "" : "none";
    });
});


// ----------------------
// LOGOUT
// ----------------------
document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
});


// ----------------------
// MENU LATERAL
// ----------------------
document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("sideMenu").classList.toggle("open");
});
