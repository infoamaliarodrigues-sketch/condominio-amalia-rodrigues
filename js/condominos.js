import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import {
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

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

inicializarFracoes();


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
        <td><input id="nome-${c.fracao}" value="${c.nome}"></td>
        <td><input id="perm-${c.fracao}" value="${c.permilagem}"></td>
        <td><input id="tel-${c.fracao}" value="${c.telefone}"></td>
        <td><input id="email-${c.fracao}" value="${c.email}"></td>
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
    window.location.href = "login.html";
});

// ----------------------
// ABRIR E FECHAR MENU
// ----------------------

document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("sideMenu").classList.toggle("open");
});

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Só aqui carregas a tabela
    inicializarFracoes();
    iniciarTabela();

});
