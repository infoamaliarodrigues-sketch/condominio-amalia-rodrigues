// Firestore
const db = firebase.firestore();

// ----------------------
// ADICIONAR
// ----------------------
function adicionarCondomino() {
    const fracao = document.getElementById("fracao").value;
    const nome = document.getElementById("nome").value;
    const permilagem = document.getElementById("permilagem").value;
    const telefone = document.getElementById("telefone").value;
    const email = document.getElementById("email").value;

    if (!fracao || !nome) {
        alert("Fração e Nome são obrigatórios");
        return;
    }

    db.collection("condominos").add({
        fracao,
        nome,
        permilagem,
        telefone,
        email
    });

    limparFormulario();
}

function limparFormulario() {
    document.getElementById("fracao").value = "";
    document.getElementById("nome").value = "";
    document.getElementById("permilagem").value = "";
    document.getElementById("telefone").value = "";
    document.getElementById("email").value = "";
}

// ----------------------
// LISTAR EM TEMPO REAL
// ----------------------
function carregarTabela() {
    db.collection("condominos").orderBy("fracao").onSnapshot(snapshot => {
        const tbody = document.querySelector("#tabela tbody");
        tbody.innerHTML = "";

        snapshot.forEach(doc => {
            const c = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${c.fracao}</td>
                    <td>${c.nome}</td>
                    <td>${c.permilagem}</td>
                    <td>${c.telefone}</td>
                    <td>${c.email}</td>
                    <td>
                        <button onclick="editar('${doc.id}')">Editar</button>
                        <button onclick="apagar('${doc.id}')">Apagar</button>
                    </td>
                </tr>
            `;
        });
    });
}

carregarTabela();

// ----------------------
// APAGAR
// ----------------------
function apagar(id) {
    if (confirm("Tem a certeza que deseja apagar?")) {
        db.collection("condominos").doc(id).delete();
    }
}

// ----------------------
// EDITAR
// ----------------------
function editar(id) {
    const novoNome = prompt("Novo nome:");
    if (!novoNome) return;

    db.collection("condominos").doc(id).update({
        nome: novoNome
    });
}

// ----------------------
// FILTRAR
// ----------------------
function filtrar() {
    const termo = document.getElementById("filtro").value.toLowerCase();
    const linhas = document.querySelectorAll("#tabela tbody tr");

    linhas.forEach(linha => {
        const texto = linha.innerText.toLowerCase();
        linha.style.display = texto.includes(termo) ? "" : "none";
    });
}

// ----------------------
// LOGOUT
// ----------------------
document.getElementById("logoutBtn").addEventListener("click", () => {
    firebase.auth().signOut().then(() => {
        window.location.href = "login.html";
    });
});
