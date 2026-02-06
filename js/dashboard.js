import { db } from "./firebase-config.js";
import { collection, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const tabela = document.querySelector("#tabela-dashboard tbody");

// Data atual
const hoje = new Date();
const anoAtual = hoje.getFullYear();
const mesAtual = hoje.getMonth() + 1;

// Fim da dívida = mês anterior
const fimAno = mesAtual === 1 ? anoAtual - 1 : anoAtual;
const fimMes = mesAtual === 1 ? 12 : mesAtual - 1;
const fimChave = `${fimAno}-${String(fimMes).padStart(2, "0")}`;

onSnapshot(collection(db, "condominos"), async (snapshot) => {
    tabela.innerHTML = "";

    for (const docSnap of snapshot.docs) {
        const c = docSnap.data();
        const fracao = c.fracao;

        const quotasRef = doc(db, "quotas", fracao);
        const quotasSnap = await getDoc(quotasRef);
        const quotas = quotasSnap.exists() ? quotasSnap.data() : {};

        let totalDivida = 0;
        let inicioDivida = null;

        // Percorrer todos os anos e meses existentes
        const anos = [2024, 2025, 2026, 2027, 2028];

        for (const ano of anos) {
            for (let mes = 1; mes <= 12; mes++) {

                const chave = `${ano}-${String(mes).padStart(2, "0")}`;
                const info = quotas[chave];

                if (!info) continue;

                const pago = info.pago === true;
                const valor = Number(info.valor ?? 0);

                // Só conta dívida até ao mês anterior ao atual
                const dentroDoPeriodo =
                    ano < fimAno ||
                    (ano === fimAno && mes <= fimMes);

                if (!pago && dentroDoPeriodo) {

                    totalDivida += valor;

                    if (!inicioDivida) inicioDivida = chave;
                }
            }
        }

        tabela.innerHTML += `
            <tr>
                <td>${c.letra}</td>
                <td>${fracao}</td>
                <td>${c.nome}</td>
                <td><b>${totalDivida.toFixed(2)} €</b></td>
                <td>${inicioDivida ?? "-"}</td>
                <td>${totalDivida > 0 ? fimChave : "-"}</td>
            </tr>
        `;
    }
});
