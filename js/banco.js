import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const tabela = document.getElementById("tabela-banco").querySelector("tbody");
const inputExcel = document.getElementById("inputExcel");
const filtroDataInicio = document.getElementById("filtroDataInicio");
const filtroDataFim = document.getElementById("filtroDataFim");
const filtroTexto = document.getElementById("filtroTexto");
const saldoAtualEl = document.getElementById("saldoAtual");
const saldoDataEl = document.getElementById("saldoData");
const btnExportExcel = document.getElementById("btnExportExcel");
const btnExportPDF = document.getElementById("btnExportPDF");

let movimentos = [];          // todos os docs
let movimentosFiltrados = []; // após filtros

/* ============================
   CARREGAR TABELA
============================ */
async function carregar() {
    tabela.innerHTML = "";
    movimentos = [];

    const snap = await getDocs(collection(db, "banco"));
    snap.forEach(d => {
        const m = d.data();
        movimentos.push({
            id: d.id,
            ...m
        });
    });

    // ordenar por data valor
    movimentos.sort((a, b) => (a.dataValor || "").localeCompare(b.dataValor || ""));

    aplicarFiltros();
}

/* ============================
   APLICAR FILTROS
============================ */
function aplicarFiltros() {
    const di = filtroDataInicio.value ? new Date(filtroDataInicio.value) : null;
    const df = filtroDataFim.value ? new Date(filtroDataFim.value) : null;
    const termo = filtroTexto.value.toLowerCase();

    movimentosFiltrados = movimentos.filter(m => {
        // filtro por data valor
        if (m.dataValor) {
            const dv = new Date(m.dataValor);
            if (di && dv < di) return false;
            if (df && dv > df) return false;
        }

        // filtro texto
        const texto = `
            ${m.descricao || ""}
            ${m.notas || ""}
            ${m.tratado || ""}
        `.toLowerCase();

        if (termo && !texto.includes(termo)) return false;

        return true;
    });

    renderTabela();
    atualizarSaldoCard();
}

/* ============================
   RENDER TABELA
============================ */
function renderTabela() {
    tabela.innerHTML = "";

    movimentosFiltrados.forEach(m => {
        const tr = document.createElement("tr");
        tr.id = `linha-${m.id}`;

        tr.innerHTML = `
            <td><input class="input-tabela" value="${m.dataLanc || ""}" disabled></td>
            <td><input class="input-tabela" value="${m.dataValor || ""}" disabled></td>
            <td><input class="input-tabela" value="${m.descricao || ""}" disabled></td>
            <td><input class="input-tabela" value="${formatMontante(m.montante)}" disabled></td>
            <td><input class="input-tabela" value="${formatMontante(m.saldo)}" disabled></td>
            <td><input class="input-tabela" value="${m.moeda || ""}" disabled></td>
            <td><input class="input-tabela" value="${m.notas || ""}" disabled></td>
            <td><input class="input-tabela" value="${m.tratado || "Não"}" disabled></td>
            <td class="acoes">
                <button class="btn-edit" onclick="editarBanco('${m.id}')">Editar</button>
                <button class="btn-delete" onclick="apagarBanco('${m.id}')">Apagar</button>
            </td>
        `;

        tabela.appendChild(tr);
    });
}

/* ============================
   SALDO CARD
============================ */
function atualizarSaldoCard() {
    if (movimentosFiltrados.length === 0) {
        saldoAtualEl.textContent = "€ 0,00";
        saldoDataEl.textContent = "(sem movimentos no filtro)";
        return;
    }

    const ultimo = movimentosFiltrados[movimentosFiltrados.length - 1];
    saldoAtualEl.textContent = formatMontante(ultimo.saldo || 0);
    saldoDataEl.textContent = `Saldo em ${ultimo.dataValor || ultimo.dataLanc || ""}`;
}

/* ============================
   FORMATAR MONTANTE
============================ */
function formatMontante(v) {
    if (v === undefined || v === null || v === "") return "";
    const num = Number(v);
    if (isNaN(num)) return v;
    return num.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

/* ============================
   EDITAR / GUARDAR / CANCELAR
   (apenas Notas e Tratado)
============================ */
window.editarBanco = function(id) {
    const tr = document.getElementById(`linha-${id}`);
    const inputs = tr.querySelectorAll("input");
    const acoes = tr.querySelector(".acoes");

    // permitir editar apenas Notas (7) e Tratado (8)
    inputs[6].disabled = false;
    inputs[7].disabled = false;

    acoes.innerHTML = `
        <button class="btn-save" onclick="guardarBanco('${id}')">Guardar</button>
        <button class="btn-delete" onclick="cancelarBanco('${id}')">Cancelar</button>
    `;
};

window.cancelarBanco = function(id) {
    aplicarFiltros(); // volta a renderizar
};

window.guardarBanco = async function(id) {
    const tr = document.getElementById(`linha-${id}`);
    const inputs = tr.querySelectorAll("input");

    const dados = {
        notas: inputs[6].value,
        tratado: inputs[7].value
    };

    await updateDoc(doc(db, "banco", id), dados);
    await carregar();
};

/* ============================
   APAGAR
============================ */
window.apagarBanco = async function(id) {
    if (!confirm("Apagar movimento de banco?")) return;
    await deleteDoc(doc(db, "banco", id));
    await carregar();
};

/* ============================
   IMPORTAR EXCEL (sem duplicar)
============================ */
inputExcel.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        // 1. Buscar movimentos existentes
        const existentesSnap = await getDocs(collection(db, "banco"));
        const existentes = [];
        existentesSnap.forEach(d => existentes.push(d.data()));

        // 2. Criar lista de UIDs existentes
        const uidsExistentes = new Set(
            existentes.map(m => `${m.dataValor}|${m.descricao}|${m.montante}`)
        );

        let novos = 0;
        let repetidos = 0;

        // 3. Processar Excel
        for (const row of json) {
            const dataLanc = excelDateToISO(row["Data Lançamento"]);
            const dataValor = excelDateToISO(row["Data Valor"]);
            const montante = parseNumber(row["Montante"]);
            const saldo = parseNumber(row["Saldo Contabilistico"]);
            const descricao = row["Descrição"] || "";

            const uid = `${dataValor}|${descricao}|${montante}`;

            if (uidsExistentes.has(uid)) {
                repetidos++;
                continue; // já existe → não grava
            }

            await addDoc(collection(db, "banco"), {
                dataLanc,
                dataValor,
                descricao,
                montante,
                saldo,
                moeda: row["Moeda"] || "EUR",
                notas: row["Notas"] || "",
                tratado: row["Tratado"] || "Não"
            });

            uidsExistentes.add(uid);
            novos++;
        }

        await carregar();
        alert(`Importação concluída.\nNovos: ${novos}\nIgnorados (duplicados): ${repetidos}`);
    };

    reader.readAsArrayBuffer(file);
});

function excelDateToISO(v) {
    if (!v) return "";
    // se já vier como string tipo 10/10/2025
    if (typeof v === "string") {
        const partes = v.split("/");
        if (partes.length === 3) {
            const [dia, mes, ano] = partes;
            return `${ano}-${mes.padStart(2,"0")}-${dia.padStart(2,"0")}`;
        }
        return v;
    }
    // se vier como número (data Excel)
    if (typeof v === "number") {
        const date = XLSX.SSF.parse_date_code(v);
        const ano = date.y;
        const mes = String(date.m).padStart(2,"0");
        const dia = String(date.d).padStart(2,"0");
        return `${ano}-${mes}-${dia}`;
    }
    return "";
}

function parseNumber(v) {
    if (v === "" || v === null || v === undefined) return 0;
    if (typeof v === "number") return v;
    const s = String(v).replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return isNaN(n) ? 0 : n;
}

/* ============================
   EXPORTAR EXCEL
============================ */
btnExportExcel.addEventListener("click", () => {
    const dados = movimentosFiltrados.map(m => ({
        "Data Lançamento": m.dataLanc || "",
        "Data Valor": m.dataValor || "",
        "Descrição": m.descricao || "",
        "Montante": m.montante || "",
        "Saldo": m.saldo || "",
        "Moeda": m.moeda || "",
        "Notas": m.notas || "",
        "Tratado": m.tratado || ""
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Banco");
    XLSX.writeFile(wb, "banco_filtrado.xlsx");
});

/* ============================
   EXPORTAR PDF
============================ */
btnExportPDF.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF("l", "pt", "a4");

    const head = [[
        "Data Lanç.",
        "Data Valor",
        "Descrição",
        "Montante",
        "Saldo",
        "Moeda",
        "Notas",
        "Tratado"
    ]];

    const body = movimentosFiltrados.map(m => [
        m.dataLanc || "",
        m.dataValor || "",
        m.descricao || "",
        String(m.montante ?? ""),
        String(m.saldo ?? ""),
        m.moeda || "",
        m.notas || "",
        m.tratado || ""
    ]);

    docPdf.setFontSize(12);
    docPdf.text("Movimentos de Banco (filtrados)", 40, 30);

    docPdf.autoTable({
        head,
        body,
        startY: 40,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 58, 138] }
    });

    docPdf.save("banco_filtrado.pdf");
});

/* ============================
   FILTROS
============================ */
[filtroDataInicio, filtroDataFim, filtroTexto].forEach(el => {
    el.addEventListener("input", aplicarFiltros);
});

/* ============================
   INICIAR
============================ */
carregar();
