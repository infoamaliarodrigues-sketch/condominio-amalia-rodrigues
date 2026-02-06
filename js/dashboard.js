import { db } from "./firebase-config.js";
import { collection, doc, getDoc, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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

onSnapshot(collection(db, "condominos"), async (snapshot) => {
    tabela.innerHTML = "";

    // Carregar configurações do ano atual
    const configSnap = await getDocs(collection(db, `config_ano/${anoAtual}/fracoes`));
    const configMap = {};
    configSnap.forEach(d => configMap[d.id] = d.data());

    // Carregar pagamentos do ano atual
    const pagSnap = await getDocs(collection(db, `pagamentos/${anoAtual}/fracoes`));
    const pagMap = {};
    pagSnap.forEach(d => pagMap[d.id] = d.data());

    for (const docSnap of snapshot.docs) {
        const c = docSnap.data();
        const fracao = c.fracao;

        const cfg = configMap[fracao];
        if (!cfg) continue;

        const pag = pagMap[fracao] || { quotas:{}, extras:{} };

        const isento = cfg.isencao === true;
        const percent = Number(cfg.isencaoPercent || 0);
        const fator = isento ? (1 - percent / 100) : 1;

        let totalDivida = 0;
        let inicioDivida = null;

        MESES.forEach((m, index) => {
            const mesNumero = index + 1;

            const vQ = Number(cfg.quotas[m] || 0) * fator;
            const vE = Number(cfg.extras[m] || 0) * fator;

            const pagoQ = pag.quotas && pag.quotas[m] === true;
            const pagoE = pag.extras && pag.extras[m] === true;

            const dentroDoPeriodo =
                anoAtual < fimAno ||
                (anoAtual === fimAno && mesNumero <= fimMes);

            if (!dentroDoPeriodo) return;

            if (!pagoQ) {
                totalDivida += vQ;
                if (!inicioDivida) inicioDivida = `${anoAtual}-${String(mesNumero).padStart(2,"0")}`;
            }

            if (!pagoE) {
                totalDivida += vE;
                if (!inicioDivida) inicioDivida = `${anoAtual}-${String(mesNumero).padStart(2,"0")}`;
            }
        });

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
