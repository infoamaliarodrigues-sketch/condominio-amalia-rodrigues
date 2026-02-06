import { db } from "./firebase-config.js";
import { collection, doc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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

    // Ler anos configurados
    const anosSnap = await getDocs(collection(db, "config_ano"));
    const anos = anosSnap.docs
        .map(d => Number(d.id))
        .filter(a => a >= 2020 && a <= 2050)
        .sort((a,b) => a - b);

    // Ler condóminos
    const condSnap = await getDocs(collection(db, "condominos"));

    for (const docSnap of condSnap.docs) {
        const c = docSnap.data();
        const fracao = c.fracao;

        let totalQuota = 0;
        let totalExtra = 0;
        let inicioDivida = null;

        for (const ano of anos) {

            // Configuração do ano (corrigido)
            const cfgRef = doc(db, `config_ano/${ano}/fracoes/${fracao}`);
            const cfgSnap = await getDoc(cfgRef);
            const cfg = cfgSnap.exists() ? cfgSnap.data() : null;
            if (!cfg) continue;

            // Pagamentos do ano (corrigido)
            const pagRef = doc(db, `pagamentos/${ano}/fracoes/${fracao}`);
            const pagSnap = await getDoc(pagRef);
            const pag = pagSnap.exists() ? pagSnap.data() : { quotas:{}, extras:{} };

            // Isenção (corrigido)
            const isento = cfg.isento === true;
            const percent = Number(cfg.percentagemIsencao || 0);
            const fator = isento ? (1 - percent / 100) : 1;

            MESES.forEach((m, index) => {
                const mesNumero = index + 1;

                const dentroDoPeriodo =
                    ano < fimAno ||
                    (ano === fimAno && mesNumero <= fimMes);

                if (!dentroDoPeriodo) return;

                const vQ = Number(cfg.quotas?.[m] || 0) * fator;
                const vE = Number(cfg.extras?.[m] || 0) * fator;

                const pagoQ = pag.quotas && pag.quotas[m] === true;
                const pagoE = pag.extras && pag.extras[m] === true;

                if (!pagoQ && vQ > 0) {
                    totalQuota += vQ;
                    if (!inicioDivida) inicioDivida = `${ano}-${String(mesNumero).padStart(2,"0")}`;
                }

                if (!pagoE && vE > 0) {
                    totalExtra += vE;
                    if (!inicioDivida) inicioDivida = `${ano}-${String(mesNumero).padStart(2,"0")}`;
                }
            });
        }

        const totalDivida = totalQuota + totalExtra;

        tabela.innerHTML += `
            <tr>
                <td>${c.letra}</td>
                <td>${fracao}</td>
                <td>${c.nome}</td>
                <td>
                    <div><b>Quotas:</b> ${totalQuota.toFixed(2)} €</div>
                    <div><b>Extras:</b> ${totalExtra.toFixed(2)} €</div>
                    <div><b>Total:</b> ${totalDivida.toFixed(2)} €</div>
                </td>
                <td>${inicioDivida ?? "-"}</td>
                <td>${totalDivida > 0 ? fimChave : "-"}</td>
            </tr>
        `;
    }
}

carregarDashboard();
