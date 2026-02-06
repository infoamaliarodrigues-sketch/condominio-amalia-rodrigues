import { db } from "./firebase-config.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const fracaoSelect = document.getElementById("fracaoSelect");
const mesInicio = document.getElementById("mesInicio");
const anoInicio = document.getElementById("anoInicio");
const mesFim = document.getElementById("mesFim");
const anoFim = document.getElementById("anoFim");
const btnGerar = document.getElementById("btnGerar");
const btnImprimir = document.getElementById("btnImprimir");
const btnEnviar = document.getElementById("btnEnviar");
const reciboContainer = document.getElementById("reciboContainer");
const reciboOriginal = document.getElementById("reciboOriginal");
const reciboDuplicado = document.getElementById("reciboDuplicado");
const tabelaRecibosBody = document.querySelector("#tabelaRecibos tbody");

const chkQuota = document.getElementById("chkQuota");
const chkExtra = document.getElementById("chkExtra");

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

let ultimoReciboGerado = null;

// ------------------------------------------------------------
// Carregar frações
// ------------------------------------------------------------
async function carregarFracoes() {
    const snap = await getDocs(collection(db, "condominos"));
    snap.forEach(docSnap => {
        const d = docSnap.data();
        const opt = document.createElement("option");
        opt.value = d.fracao;
        opt.textContent = `${d.fracao} (${d.letra})`;
        fracaoSelect.appendChild(opt);
    });
}

// ------------------------------------------------------------
// Carregar meses e anos
// ------------------------------------------------------------
function carregarMesesAnos() {
    for (let i = 0; i < 12; i++) {
        const opt1 = document.createElement("option");
        opt1.value = i + 1;
        opt1.textContent = MESES[i].toUpperCase();
        mesInicio.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = i + 1;
        opt2.textContent = MESES[i].toUpperCase();
        mesFim.appendChild(opt2);
    }

    for (let ano = 2020; ano <= 2050; ano++) {
        const opt1 = document.createElement("option");
        opt1.value = ano;
        opt1.textContent = ano;
        anoInicio.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = ano;
        opt2.textContent = ano;
        anoFim.appendChild(opt2);
    }

    const atual = new Date().getFullYear();
    anoInicio.value = atual;
    anoFim.value = atual;
    mesInicio.value = 1;
    mesFim.value = new Date().getMonth() + 1;
}

// ------------------------------------------------------------
// Valor por extenso
// ------------------------------------------------------------
function valorPorExtenso(valor) {
    const unidades = ["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove"];
    const especiais = ["dez","onze","doze","treze","catorze","quinze","dezasseis","dezassete","dezoito","dezanove"];
    const dezenas = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
    const centenas = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];

    function extenso(n) {
        if (n < 10) return unidades[n];
        if (n < 20) return especiais[n - 10];
        if (n < 100) {
            const d = Math.floor(n / 10);
            const u = n % 10;
            return dezenas[d] + (u ? " e " + unidades[u] : "");
        }
        if (n === 100) return "cem";
        if (n < 1000) {
            const c = Math.floor(n / 100);
            const r = n % 100;
            return centenas[c] + (r ? " e " + extenso(r) : "");
        }
        return "";
    }

    const euros = Math.floor(valor);
    const centimos = Math.round((valor - euros) * 100);

    let frase = extenso(euros) + (euros === 1 ? " euro" : " euros");
    if (centimos > 0) frase += " e " + extenso(centimos) + (centimos === 1 ? " cêntimo" : " cêntimos");

    return frase;
}

// ------------------------------------------------------------
// Número sequencial
// ------------------------------------------------------------
async function obterNumeroRecibo() {
    const ref = doc(db, "recibos_meta", "sequencia");
    const snap = await getDoc(ref);

    let numero = 1;

    if (snap.exists()) {
        numero = snap.data().ultimo + 1;
    }

    await setDoc(ref, { ultimo: numero });

    return numero;
}

// ------------------------------------------------------------
// Calcular linhas (pagos + checkboxes)
// ------------------------------------------------------------
async function calcularLinhas(fracao, anoI, mesI, anoF, mesF) {
    const linhas = [];
    let total = 0;

    for (let ano = anoI; ano <= anoF; ano++) {

        // LER CONFIGURAÇÃO (quotas e extras)
        const cfgRef = doc(db, `config_ano/${ano}/fracoes/${fracao}`);
        const cfgSnap = await getDoc(cfgRef);
        if (!cfgSnap.exists()) continue;
        const cfg = cfgSnap.data();

       // LER PAGAMENTOS (meses)
        const pagRef = doc(db, `pagamentos/${ano}/fracoes/${fracao}`);
        const pagSnap = await getDoc(pagRef);
        const pag = pagSnap.exists() ? pagSnap.data() : { meses:{} };


        const isento = cfg.isencao === true;
        const percent = Number(cfg.isencaoPercent || 0);
        const fator = isento ? (1 - percent / 100) : 1;

        for (let m = 1; m <= 12; m++) {

            if (ano === anoI && m < mesI) continue;
            if (ano === anoF && m > mesF) continue;

            const mesNome = MESES[m - 1];

            const vQ = Number(cfg.quotas[mesNome] || 0) * fator;
            const vE = Number(cfg.extras[mesNome] || 0) * fator;

            const pago = pag.meses && pag.meses[mesNome] === true;

            if (!pago) continue;

            if (chkQuota.checked && vQ > 0) {
                linhas.push({
                    descricao: `Quota ${mesNome.toUpperCase()} ${ano}`,
                    valor: vQ
                });
                total += vQ;
            }

            if (chkExtra.checked && vE > 0) {
                linhas.push({
                    descricao: `Extra ${mesNome.toUpperCase()} ${ano}`,
                    valor: vE
                });
                total += vE;
            }
        }
    }

    return { linhas, total };
}

// ------------------------------------------------------------
// Guardar recibo
// ------------------------------------------------------------
async function guardarReciboBD(dados) {
    const ref = doc(collection(db, "recibos"));
    await setDoc(ref, dados);
    return ref.id;
}

// ------------------------------------------------------------
// Carregar recibos (CRUD)
// ------------------------------------------------------------
async function carregarRecibosTabela() {
    tabelaRecibosBody.innerHTML = "";
    const snap = await getDocs(collection(db, "recibos"));

    snap.forEach(docSnap => {
        const r = docSnap.data();
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${r.numero}</td>
            <td>${r.dataEmissao}</td>
            <td>${r.fracao}</td>
            <td>${r.titular}</td>
            <td>${r.periodo}</td>
            <td>${r.total.toFixed(2)} €</td>
            <td>${r.estado || "Válido"}</td>
            <td>
                <button data-id="${docSnap.id}" class="btn-anular">Anular</button>
                <button data-id="${docSnap.id}" class="btn-apagar">Apagar</button>
            </td>
        `;

        tabelaRecibosBody.appendChild(tr);
    });

    document.querySelectorAll(".btn-anular").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            await updateDoc(doc(db, "recibos", id), { estado: "Anulado" });
            carregarRecibosTabela();
        });
    });

    document.querySelectorAll(".btn-apagar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            if (confirm("Tem a certeza que pretende apagar este recibo?")) {
                await deleteDoc(doc(db, "recibos", id));
                carregarRecibosTabela();
            }
        });
    });
}

// ------------------------------------------------------------
// Gerar recibo
// ------------------------------------------------------------
async function gerarRecibo() {
    const fracao = fracaoSelect.value;
    const anoI = Number(anoInicio.value);
    const anoF = Number(anoFim.value);
    const mesI = Number(mesInicio.value);
    const mesF = Number(mesFim.value);

    if (!fracao) return;

    const condSnap = await getDoc(doc(db, "condominos", fracao));
    const cond = condSnap.data();

    const numero = await obterNumeroRecibo();
    const dataHoje = new Date().toLocaleDateString("pt-PT");

    const { linhas, total } = await calcularLinhas(fracao, anoI, mesI, anoF, mesF);
    const extenso = valorPorExtenso(total);

    const periodo = `${String(mesI).padStart(2,"0")}/${anoI} a ${String(mesF).padStart(2,"0")}/${anoF}`;

    let detalheHTML = "";
    linhas.forEach(l => {
        detalheHTML += `
            <tr>
                <td></td>
                <td colspan="2">${l.descricao}</td>
                <td>${l.valor.toFixed(2)} €</td>
            </tr>
        `;
    });

    const htmlTabela = `
        <table class="recibo-tabela">
            <tr><th></th><th colspan="2">RECIBO</th><th>Nº ${numero}</th></tr>

            <tr><td colspan="4">
                CONDOMÍNIO DO PRÉDIO: AV. AMÁLIA RODRIGUES Nº 28 – JARDIM AMOREIRA<br>
                NIF: 901 842 931
            </td></tr>

            <tr><td>Fração:</td><td colspan="2">${fracao} (${cond.letra})</td><td></td></tr>
            <tr><td>Titular:</td><td colspan="2">${cond.nome}</td><td></td></tr>
            <tr><td>Relativo a:</td><td colspan="2">Pagamento de quotas</td><td></td></tr>

            <tr><td>Descrição</td><td colspan="2"></td><td>Valor</td></tr>

            ${detalheHTML}

            <tr><td></td><td colspan="2"><b>Total</b></td><td><b>${total.toFixed(2)} €</b></td></tr>

            <tr><td>Data:</td><td>${dataHoje}</td><td>Processado</td><td>por computador</td></tr>
        </table>

        <p><b>Valor por extenso:</b> ${extenso}</p>
        <p style="margin-top:30px; font-size:12px; opacity:0.5; text-align:right;">
            A Administração
        </p>
    `;

    reciboOriginal.innerHTML = htmlTabela;
    reciboDuplicado.innerHTML = htmlTabela;

    reciboContainer.style.display = "block";
    btnEnviar.disabled = false;
    btnImprimir.disabled = false;

    ultimoReciboGerado = {
        numero,
        dataEmissao: dataHoje,
        fracao,
        titular: cond.nome,
        periodo,
        total,
        html: htmlTabela
    };

    await guardarReciboBD({
        numero,
        dataEmissao: dataHoje,
        fracao,
        titular: cond.nome,
        periodo,
        total,
        estado: "Válido"
    });

    carregarRecibosTabela();
}

// ------------------------------------------------------------
// Imprimir PDF
// ------------------------------------------------------------
btnImprimir.addEventListener("click", () => {
    if (!ultimoReciboGerado) return;

    const win = window.open("", "_blank");
    win.document.write(`
        <html>
        <head>
            <title>Recibo Nº ${ultimoReciboGerado.numero}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; }
                .recibo-via { margin-bottom: 40px; }
                .recibo-tabela { width: 100%; border-collapse: collapse; }
                .recibo-tabela th, .recibo-tabela td {
                    border: 1px solid #000;
                    padding: 4px;
                    font-size: 11px;
                }
                .marca-agua {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    font-size: 10px;
                    opacity: 0.4;
                }
            </style>
        </head>
        <body>
            <div class="recibo-via">
                <h3>RECIBO – ORIGINAL</h3>
                ${ultimoReciboGerado.html}
            </div>
            <hr>
            <div class="recibo-via">
                <h3>RECIBO – DUPLICADO</h3>
                ${ultimoReciboGerado.html}
            </div>
            <div class="marca-agua">A Administração</div>
            <script>
                window.print();
            </script>
        </body>
        </html>
    `);
    win.document.close();
});

// ------------------------------------------------------------
// Enviar por email
// ------------------------------------------------------------
btnEnviar.addEventListener("click", async () => {
    const fracao = fracaoSelect.value;
    const condSnap = await getDoc(doc(db, "condominos", fracao));
    const cond = condSnap.data();

    const assunto = encodeURIComponent("Recibo de Quotas do Condomínio");
    const corpo = encodeURIComponent(reciboOriginal.innerText);

    window.location.href = `mailto:${cond.email}?subject=${assunto}&body=${corpo}`;
});

// ------------------------------------------------------------
// Inicialização
// ------------------------------------------------------------
btnGerar.addEventListener("click", gerarRecibo);

carregarFracoes();
carregarMesesAnos();
carregarRecibosTabela();
