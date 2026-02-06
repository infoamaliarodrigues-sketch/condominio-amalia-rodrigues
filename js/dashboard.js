import { db } from "./firebase-config.js";
import { collection, doc, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const tabela = document.querySelector("#tabela-dashboard tbody");
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

// Data atual
const hoje = new Date();
const anoAtual = hoje.getFullYear();
const mesAtual = hoje.getMonth() + 1;

// Fim da dívida = mês anterior
const fimAno = mesAtual === 1 ? anoAtual - 1 : anoAtual;
const fimMes = mesAtual === 1 ? 12 : mesAtual - 1;
const fimChave = `${fimAno}-${String(fimMes).padStart(2, "0")}`;

async function carregarDashboard() {
    tabela.innerHTML = "";

    // Obter todos os anos configurados
    const anosSnap = await getDocs(collection(db, "config_ano"));
    const anos = anosSnap.docs.map(d => Number(d.id)).sort();

    // Carregar condóminos
    const condSnap = await getDocs(collection(db, "condominos"));

    for (const docSnap of condSnap.docs) {
        const c = docSnap.data();
        const fracao = c.fracao;

        let totalDivida = 0;
        let inicioDivida = null;

        for (const ano of anos) {

            const cfgSnap = await getDocs(collection(db, `config_ano/${ano}/fracoes`));
            const cfg = cfgSnap.docs.find(d => d.id === fracao)?.data();
            if (!cfg) continue;

            const pagSnap = await getDocs(collection(db, `pagamentos/${ano}/fracoes`));
            const pag = pagSnap.docs.find(d => d.id === fracao)?.data() || { quotas:{}, extras:{} };

            const isento = cfg.isencao === true;
            const percent = Number(cfg.isencaoPercent || 0);
            const fator = isento ? (1 - percent / 100) : 1;

            MESES.forEach((m, index) => {
                const mesNumero = index + 1;

                const dentroDoPeriodo =
                    ano < fimAno ||
                    (ano === fimAno && mesNumero <= fimMes);

                if (!dentroDoPeriodo) return;

                const vQ = Number(cfg.quotas[m] || 0) * fator;
                const vE = Number(cfg.extras[m] || 0) * fator;

                const pagoQ = pag.quotas && pag.quotas[m] === true;
                const pagoE = pag.extras && pag.extras[m] === true;

                if (!pagoQ) {
                    totalDivida += vQ;
                    if (!inicioDivida) inicioDivida = `${ano}-${String(mesNumero).padStart(2,"0")}`;
                }

                if (!pagoE) {
                    totalDivida += vE;
                    if (!inicioDivida) inicioDivida = `${ano}-${String(mesNumero).padStart(2,"0")}`;
                }
            });
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
}

carregarDashboard();
