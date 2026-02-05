import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import {
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const tabela = document.getElementById("tabela").querySelector("tbody");



// ----------------------
// DADOS FIXOS: LETRA, PERMILAGEM, NOME
// ----------------------
const dadosIniciais = {
    "LOJA 1": { letra: "A", permilagem: 30, nome: "Gonçalo Faísca – Mediação de Seguros, Unipessoal" },
    "LOJA 2": { letra: "B", permilagem: 21, nome: "Princesses Unipessoal, Lda." },
    "LOJA 3": { letra: "C", permilagem: 39, nome: "OdivelbrindeSul, Lda." },

    "1A": { letra: "D", permilagem: 83, nome: "José Martins Marques" },
    "1B": { letra: "E", permilagem: 48, nome: "Bruno Branco" },
    "1C": { letra: "F", permilagem: 61, nome: "Joana da Costa Maurício" },

    "2A": { letra: "G", permilagem: 80, nome: "Aida Maria Gonçalves Ferreira Pena" },
    "2B": { letra: "H", permilagem: 43, nome: "António Martins Francisco" },
    "2C": { letra: "I", permilagem: 55, nome: "João Vieira" },

    "3A": { letra: "J", permilagem: 80, nome: "Samuel Afonso Lima Ramos" },
    "3B": { letra: "K", permilagem: 43, nome: "Luísa Gonçalves da Almeida" },
    "3C": { letra: "L", permilagem: 55, nome: "Filipe Boaventura" },

    "4A": { letra: "M", permilagem: 84, nome: "Paulo Jorge Oliveira" },
    "4B": { letra: "N", permilagem: 36, nome: "Maria João Caetano Branco" },
    "4C": { letra: "O", permilagem: 58, nome: "Hugo Ricardo Miguens Machado" },

    "5A": { letra: "P", permilagem: 87, nome: "António Fernando Pereira Santos" },
    "5B": { letra: "Q", permilagem: 38, nome: "David Alexandre de Azoia Ferreira Prescott" },
    "5C": { letra: "R", permilagem: 59, nome: "Torcato José Fernandes Duarte" },

    "CASA DO LIXO": { letra: "–", permilagem: "–", nome: "" }
};


// ----------------------
// CRIAR FRAÇÕES NO FIREBASE SE NÃO EXISTIREM
// ----------------------
async function inicializarFracoes() {
    for (const fracao of Object.keys(dadosIniciais)) {

        const ref = doc(db, "condominos", fracao);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            const info = dadosIniciais[fracao];

            await setDoc(ref, {
                fracao,
                letra: info.letra,
                permilagem: info.permilagem,
                nome: info.nome,
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


// LISTAR TABELA EM TEMPO REAL
onSnapshot(collection(db, "condominos"), (snapshot) => {
    tabela.innerHTML = "";

    snapshot.forEach(docSnap => {
        const c = docSnap.data();

        const isento = c.isento === true;
        const perc = c.percentagemIsencao ?? 0;

        tabela.innerHTML += `
            <tr>
                <td>${c.letra}</td>
                <td>${c.fracao}</td>
                <td>${c.permilagem}</td>

                <td><input id="nome-${c.fracao}" value="${c.nome}" disabled></td>
                <td><input id="tel-${c.fracao}" value="${c.telefone}" disabled></td>
                <td><input id="email-${c.fracao}" value="${c.email}" disabled></td>

                <td>
                    <input type="checkbox" id="isento-${c.fracao}" ${isento ? "checked" : ""} disabled>
                </td>

                <td>
                    <input type="number" id="perc-${c.fracao}" value="${perc}" min="0" max="100" disabled>
                </td>

                <td>
                    <button class="btn-edit" onclick="editar('${c.fracao}')">Editar</button>
                    <button class="btn-save" onclick="guardar('${c.fracao}')">Guardar</button>
                    <button class="btn-delete" onclick="limpar('${c.fracao}')">Apagar</button>
                </td>
            </tr>
        `;
    });
});


// EDITAR
window.editar = (fracao) => {
    document.getElementById(`nome-${fracao}`).disabled = false;
    document.getElementById(`tel-${fracao}`).disabled = false;
    document.getElementById(`email-${fracao}`).disabled = false;

    document.getElementById(`isento-${fracao}`).disabled = false;
    document.getElementById(`perc-${fracao}`).disabled = false;
};


// GUARDAR
window.guardar = async (fracao) => {

    const nome = document.getElementById(`nome-${fracao}`).value;
    const telefone = document.getElementById(`tel-${fracao}`).value;
    const email = document.getElementById(`email-${fracao}`).value;

    const isento = document.getElementById(`isento-${fracao}`).checked;
    let perc = Number(document.getElementById(`perc-${fracao}`).value);

    // REGRAS LÓGICAS (opção B)
    if (isento && perc === 0) {
        alert("Se o condómino está isento, a percentagem deve ser maior que 0.");
        return;
    }

    if (!isento && perc !== 0) {
        alert("Se o condómino não está isento, a percentagem deve ser 0.");
        return;
    }

    await setDoc(doc(db, "condominos", fracao), {
        fracao,
        letra: dadosIniciais[fracao].letra,
        permilagem: dadosIniciais[fracao].permilagem,
        nome,
        telefone,
        email,
        isento,
        percentagemIsencao: perc
    });

    document.getElementById(`nome-${fracao}`).disabled = true;
    document.getElementById(`tel-${fracao}`).disabled = true;
    document.getElementById(`email-${fracao}`).disabled = true;
    document.getElementById(`isento-${fracao}`).disabled = true;
    document.getElementById(`perc-${fracao}`).disabled = true;
};


// ----------------------
// LIMPAR DADOS DA FRAÇÃO
// ----------------------
window.limpar = async (fracao) => {

    await setDoc(doc(db, "condominos", fracao), {
        fracao,
        letra: dadosIniciais[fracao].letra,
        permilagem: dadosIniciais[fracao].permilagem,
        nome: "",
        telefone: "",
        email: ""
    });

    document.getElementById(`nome-${fracao}`).value = "";
    document.getElementById(`tel-${fracao}`).value = "";
    document.getElementById(`email-${fracao}`).value = "";

    document.getElementById(`nome-${fracao}`).disabled = true;
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
