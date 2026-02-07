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

    let totalGeral = 0;

    const anosSnap = await getDocs(collection(db, "config_ano"));
    const anos = anosSnap.docs
        .map(d => Number(d.id))
        .filter(a => a >= 2020 && a <= 2050)
        .sort((a,b) => a - b);

    const condSnap = await getDocs(collection(db, "condominos"));

    for (const docSnap of condSnap.docs) {
        const c = docSnap.data();
        const fracao = c.fracao;

        let totalQuota = 0;
        let totalExtra = 0;
        let inicioDivida = null;

        for (const ano of anos) {

            const cfgRef = doc(db, `config_ano/${ano}/fracoes/${fracao}`);
            const cfgSnap = await getDoc(cfgRef);
            const cfg = cfgSnap.exists() ? cfgSnap.data() : null;
            if (!cfg) continue;

            const pagRef = doc(db, `pagamentos/${ano}/fracao/${fracao}`);
            const pagSnap = await getDoc(pagRef);
            const pag = pagSnap.exists() ? pagSnap.data() : { quotas:{}, extras:{} };

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
        totalGeral += totalDivida;

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

  document.getElementById("total-geral").innerHTML =
    `Total Geral de Dívida: <b>${totalGeral.toFixed(2)} €</b>`;
}

carregarDashboard();


// ----------------------------
// EXPORTAR EXCEL
// ----------------------------
document.getElementById("btnExcel").addEventListener("click", () => {
    const linhas = [];

    // Cabeçalho
    const cabecalho = ["Fração", "Letra", "Nome", "Quotas (€)", "Extras (€)", "Total (€)", "Início Dívida", "Fim Dívida"];
    linhas.push(cabecalho);

    // Ler cartões do dashboard
    document.querySelectorAll(".dashboard-card:not(:first-child)").forEach(card => {
        const nome = card.querySelector(".dashboard-nome").textContent;
        const fracao = card.querySelector(".dashboard-fracao").textContent.split(" — ")[0];
        const letra = card.querySelector(".dashboard-fracao").textContent.split(" — ")[1];

        const quotas = Number(card.querySelector(".dashboard-valores div:nth-child(1) span").textContent.replace(" €",""));
        const extras = Number(card.querySelector(".dashboard-valores div:nth-child(2) span").textContent.replace(" €",""));
        const total = Number(card.querySelector(".dashboard-valores div:nth-child(3) span").textContent.replace(" €",""));

        const inicio = card.querySelector(".dashboard-datas div:nth-child(1) b").textContent;
        const fim = card.querySelector(".dashboard-datas div:nth-child(2) b").textContent;

        linhas.push([fracao, letra, nome, quotas, extras, total, inicio, fim]);
    });

    // Criar folha
    const ws = XLSX.utils.aoa_to_sheet(linhas);

    // Formatar cabeçalho
    cabecalho.forEach((_, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
        cell.s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "333333" } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true }
        };
    });

    // Formatar colunas como Euro
    const euroFormat = "€ #,##0.00";

    for (let r = 1; r < linhas.length; r++) {
        ws[XLSX.utils.encode_cell({ r, c: 3 })].t = "n";
        ws[XLSX.utils.encode_cell({ r, c: 3 })].z = euroFormat;

        ws[XLSX.utils.encode_cell({ r, c: 4 })].t = "n";
        ws[XLSX.utils.encode_cell({ r, c: 4 })].z = euroFormat;

        ws[XLSX.utils.encode_cell({ r, c: 5 })].t = "n";
        ws[XLSX.utils.encode_cell({ r, c: 5 })].z = euroFormat;
    }

    // Auto largura das colunas
    const colWidths = cabecalho.map((_, colIndex) => {
        const maxLen = linhas.reduce((acc, row) => {
            const val = row[colIndex] ? row[colIndex].toString() : "";
            return Math.max(acc, val.length);
        }, 10);
        return { wch: maxLen + 2 };
    });

    ws["!cols"] = colWidths;

    // Filtros automáticos
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: cabecalho.length - 1 } }) };

    // Criar workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard");

    XLSX.writeFile(wb, "dashboard_condominio.xlsx");
});
;


// ----------------------------
// EXPORTAR PDF
// ----------------------------
document.getElementById("btnPDF").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Resumo de Dívidas - Condomínio Amália Rodrigues", 14, 20);

    const linhas = [];

    document.querySelectorAll(".dashboard-card:not(:first-child)").forEach(card => {
        const nome = card.querySelector(".dashboard-nome").textContent;
        const fracao = card.querySelector(".dashboard-fracao").textContent.split(" — ")[0];
        const letra = card.querySelector(".dashboard-fracao").textContent.split(" — ")[1];

        const quotas = card.querySelector(".dashboard-valores div:nth-child(1) span").textContent;
        const extras = card.querySelector(".dashboard-valores div:nth-child(2) span").textContent;
        const total = card.querySelector(".dashboard-valores div:nth-child(3) span").textContent;

        const inicio = card.querySelector(".dashboard-datas div:nth-child(1) b").textContent;
        const fim = card.querySelector(".dashboard-datas div:nth-child(2) b").textContent;

        linhas.push([fracao, letra, nome, quotas, extras, total, inicio, fim]);
    });

    doc.autoTable({
        startY: 30,
        head: [["Fração", "Letra", "Nome", "Quotas", "Extras", "Total", "Início", "Fim"]],
        body: linhas,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [40, 40, 40], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] }
    });

    doc.save("dashboard_condominio.pdf");
});
