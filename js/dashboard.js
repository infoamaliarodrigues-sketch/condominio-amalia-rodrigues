import { db } from "./firebase-config.js";
import { collection, doc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const lista = document.getElementById("dashboard-lista");
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
    lista.innerHTML = "";

    let totalGeral = 0; // acumulador do total geral

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

            // Configuração do ano
            const cfgRef = doc(db, `config_ano/${ano}/fracoes/${fracao}`);
            const cfgSnap = await getDoc(cfgRef);
            const cfg = cfgSnap.exists() ? cfgSnap.data() : null;
            if (!cfg) continue;

            // Pagamentos do ano
            const pagRef = doc(db, `pagamentos/${ano}/fracao/${fracao}`);
            const pagSnap = await getDoc(pagRef);
            const pag = pagSnap.exists() ? pagSnap.data() : { quotas:{}, extras:{} };

            // Isenção
            const isento = cfg.isencao === true;
            const percent = Number(cfg.isencaoPercent || 0);
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
        totalGeral += totalDivida; // acumular total geral

        const classe = totalDivida > 0 ? "dashboard-card com-divida" : "dashboard-card sem-divida";

        lista.innerHTML += `
            <div class="${classe}">
                <div class="dashboard-topo">
                    <div class="dashboard-nome">${c.nome}</div>
                    <div class="dashboard-fracao">${fracao} — ${c.letra}</div>
                </div>

                <div class="dashboard-valores">
                    <div>Quotas: <span>${totalQuota.toFixed(2)} €</span></div>
                    <div>Extras: <span>${totalExtra.toFixed(2)} €</span></div>
                    <div>Total: <span>${totalDivida.toFixed(2)} €</span></div>
                </div>

                <div class="dashboard-datas">
                    <div>Início da Dívida: <b>${inicioDivida ?? "-"}</b></div>
                    <div>Fim da Dívida: <b>${totalDivida > 0 ? fimChave : "-"}</b></div>
                </div>
            </div>
        `;
    }

    // Inserir cartão do total geral no topo
    lista.insertAdjacentHTML("afterbegin", `
        <div class="dashboard-card com-divida" style="border-left: 6px solid #000;">
            <div class="dashboard-topo">
                <div class="dashboard-nome">Total Geral de Dívida</div>
                <div class="dashboard-fracao">Condomínio</div>
            </div>

            <div class="dashboard-valores">
                <div>Total em Dívida: <span>${totalGeral.toFixed(2)} €</span></div>
            </div>
        </div>
    `);
}

carregarDashboard();
