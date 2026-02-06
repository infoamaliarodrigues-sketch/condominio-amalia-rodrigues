import { db } from "./firebase-config.js";
import {
    collection,
    doc,
    getDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const fracaoSelect = document.getElementById("fracaoSelect");
const mesInicio = document.getElementById("mesInicio");
const anoInicio = document.getElementById("anoInicio");
const mesFim = document.getElementById("mesFim");
const anoFim = document.getElementById("anoFim");
const btnGerar = document.getElementById("btnGerar");
const btnEnviar = document.getElementById("btnEnviar");
const reciboContainer = document.getElementById("reciboContainer");
const reciboOriginal = document.getElementById("reciboOriginal");
const reciboDuplicado = document.getElementById("reciboDuplicado");

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

// ------------------------------------------------------------
// 1) Carregar frações
// ------------------------------------------------------------
async function carregarFracoes() {
    const snap = await getDocs(collection(db, "condominos"));
    snap.forEach(doc => {
        const d = doc.data();
        const opt = document.createElement("option");
        opt.value = d.fracao;
        opt.textContent = `${d.fracao} (${d.letra})`;
        fracaoSelect.appendChild(opt);
    });
}

// ------------------------------------------------------------
// 2) Carregar meses e anos
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
// 3) Converter valor para extenso (PT-PT)
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
// 4) Calcular total entre datas
// ------------------------------------------------------------
async function calcularTotal(fracao, anoI, mesI, anoF, mesF) {
    let total = 0;

    for (let ano = anoI; ano <= anoF; ano++) {

        const cfgSnap = await getDocs(collection(db, `config_ano/${ano}/fracoes`));
        const cfg = cfgSnap.docs.find(d => d.id === fracao)?.data();
        if (!cfg) continue;

        const pagSnap = await getDocs(collection(db, `pagamentos/${ano}/fracoes`));
        const pag = pagSnap.docs.find(d => d.id === fracao)?.data() || { quotas:{}, extras:{} };

        const isento = cfg.isencao === true;
        const percent = Number(cfg.isencaoPercent || 0);
        const fator = isento ? (1 - percent / 100) : 1;

        for (let m = 1; m <= 12; m++) {

            if (ano === anoI && m < mesI) continue;
            if (ano === anoF && m > mesF) continue;

            const mesNome = MESES[m - 1];

            const vQ = Number(cfg.quotas[mesNome] || 0) * fator;
            const vE = Number(cfg.extras[mesNome] || 0) * fator;

            total += vQ + vE;
        }
    }

    return total;
}

// ------------------------------------------------------------
// 5) Gerar recibo
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

    const total = await calcularTotal(fracao, anoI, mesI, anoF, mesF);
    const extenso = valorPorExtenso(total);

    const periodo = `${String(mesI).padStart(2,"0")}/${anoI} a ${String(mesF).padStart(2,"0")}/${anoF}`;

    const html = `
        <p><b>Condomínio do Prédio sito na Avenida Amália Rodrigues, Lote 28</b><br>
        NIF 901842931</p>

        <p><b>Fração:</b> ${fracao} (${cond.letra})<br>
        <b>Nome:</b> ${cond.nome}<br>
        <b>NIF:</b> ${cond.nif}</p>

        <p><b>Período:</b> ${periodo}</p>

        <p><b>Valor:</b> ${total.toFixed(2)} €<br>
        <b>Por extenso:</b> ${extenso}</p>
    `;

    reciboOriginal.innerHTML = html;
    reciboDuplicado.innerHTML = html;

    reciboContainer.style.display = "block";
    btnEnviar.disabled = false;

    return { total, extenso, cond, periodo };
}

// ------------------------------------------------------------
// 6) Enviar por email (mailto simples)
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
// 7) Eventos
// ------------------------------------------------------------
btnGerar.addEventListener("click", gerarRecibo);

// ------------------------------------------------------------
// 8) Inicialização
// ------------------------------------------------------------
carregarFracoes();
carregarMesesAnos();
