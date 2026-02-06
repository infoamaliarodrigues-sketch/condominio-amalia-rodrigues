import { db } from "./firebase-config.js";
import { collection, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const tabela = document.querySelector("#tabela-dashboard tbody");

onSnapshot(collection(db, "condominos"), async (snapshot) => {
    tabela.innerHTML = "";

    for (const docSnap of snapshot.docs) {
        const c = docSnap.data();
        const fracao = c.fracao;

        const quotasRef = doc(db, "quotas", fracao);
        const quotasSnap = await getDoc(quotasRef);
        const quotas = quotasSnap.exists() ? quotasSnap.data() : {};

        const totaisAno = { 2024: 0, 2025: 0, 2026: 0 };
        let inicioDivida = null;
        let fimDivida = null;

        for (const ano of [2024, 2025, 2026]) {
            for (let mes = 1; mes <= 12; mes++) {

                const chave = `${ano}-${String(mes).padStart(2, "0")}`;
                const info = quotas[chave];

                if (!info) continue;

                const pago = info.pago === true;
                const valor = Number(info.valor ?? 0);

                if (!pago) {
                    totaisAno[ano] += valor;

                    if (!inicioDivida) inicioDivida = chave;
                    fimDivida = chave;
                }
            }
        }

        const totalDivida =
            totaisAno[2024] +
            totaisAno[2025] +
            totaisAno[2026];

        tabela.innerHTML += `
            <tr>
                <td>${c.letra}</td>
                <td>${fracao}</td>
                <td>${c.nome}</td>
                <td>${totaisAno[2024].toFixed(2)} €</td>
                <td>${totaisAno[2025].toFixed(2)} €</td>
                <td>${totaisAno[2026].toFixed(2)} €</td>
                <td><b>${totalDivida.toFixed(2)} €</b></td>
                <td>${inicioDivida ?? "-"}</td>
                <td>${fimDivida ?? "-"}</td>
            </tr>
        `;
    }
});
