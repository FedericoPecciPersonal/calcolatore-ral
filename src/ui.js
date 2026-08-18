/**
 * INTERFACCIA
 * ===========
 * Unico file che tocca il DOM. Non contiene logica di calcolo ne' parametri
 * normativi: legge il risultato prodotto da calcolo.js e lo rende leggibile.
 */

import { REGOLE_2026 as REGOLE } from './regole-2026.js';
import { calcolaNetto, ralPerNettoAnnuo } from './calcolo.js';

// -----------------------------------------------------------------------------
// Formattazione
// -----------------------------------------------------------------------------

const fmtEuro = (decimali = 2) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
    // L'italiano ometterebbe il separatore per i numeri a 4 cifre (3216,50 invece
    // di 3.216,50): in una colonna di importi allineati crea incoerenza visiva.
    useGrouping: 'always',
  });

const euro0 = (n) => fmtEuro(0).format(n);
const euro2 = (n) => fmtEuro(2).format(n);

const pct = (n, decimali = 2) =>
  new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
  }).format(n);

const num = (n) =>
  new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' }).format(n);

/** Numero decimale in formato italiano (virgola). */
const dec = (n, decimali = 2) =>
  new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
  }).format(n);

/** Etichetta leggibile di uno scaglione: "0 – 28.000", "oltre 50.000". */
const etichettaScaglione = (da, a) =>
  a === null || a === undefined ? `oltre ${num(da)}` : `${num(da)} – ${num(a)}`;

const el = (id) => document.getElementById(id);

/** Costruisce una tabella a due o piu' colonne da un array di righe. */
function tabella(intestazioni, righe) {
  const th = intestazioni
    .map((h, i) => `<th scope="col"${i > 0 ? ' class="num"' : ''}>${h}</th>`)
    .join('');
  const tr = righe
    .map((riga) => {
      const classe = riga.classe ? ` class="${riga.classe}"` : '';
      const celle = riga.celle
        .map((c, i) =>
          i === 0
            ? `<td>${c}</td>`
            : `<td class="num" data-etichetta="${intestazioni[i] ?? ''}">${c}</td>`,
        )
        .join('');
      return `<tr${classe}>${celle}</tr>`;
    })
    .join('');
  return `<div class="tabella-scroll"><table class="tabella"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}

// -----------------------------------------------------------------------------
// Rendering delle singole sezioni
// -----------------------------------------------------------------------------

function renderKpi(r) {
  el('kpi-netto-annuo').textContent = euro0(r.nettoAnnuo);
  el('kpi-netto-annuo-nota').textContent =
    `su ${euro0(r.input.ral)} di lordo · trattenuto il ${pct(r.aliquotaEffettivaTotale, 1)}`;

  el('kpi-netto-mensile').textContent = euro2(r.nettoMensile);
  el('kpi-netto-mensile-nota').textContent =
    r.input.mensilita === 12
      ? 'su 12 mensilità'
      : `su ${r.input.mensilita} mensilità · media su 12: ${euro2(r.nettoMedioSu12)}`;

  el('kpi-trattenute').textContent = euro0(r.totaleTrattenute);
  el('kpi-trattenute-nota').textContent =
    `pensione ${euro0(r.contributi.totale)} · imposte ${euro0(r.totaleImposte)}`;
}

function renderBarra(r) {
  const segmenti = [
    { nome: 'Quello che ti resta', valore: r.input.ral - r.totaleTrattenute, colore: 'var(--c-netto)' },
    { nome: 'Contributi per la pensione', valore: r.contributi.totale, colore: 'var(--c-contributi)' },
    { nome: 'Imposta sul reddito', valore: r.irpefNetta, colore: 'var(--c-irpef)' },
    { nome: 'Imposte di Regione e Comune', valore: r.addizionali.totale, colore: 'var(--c-addizionali)' },
  ];

  const totale = r.input.ral || 1;

  el('barra').innerHTML = segmenti
    .filter((s) => s.valore > 0)
    .map(
      (s) =>
        `<div class="barra-segmento" style="flex:0 0 ${(s.valore / totale) * 100}%;background:${s.colore}" title="${s.nome}: ${euro0(s.valore)}"></div>`,
    )
    .join('');

  let legenda = segmenti
    .map(
      (s) => `<li>
        <span class="pallino" style="background:${s.colore}"></span>
        <span>${s.nome}<br><span class="valore">${euro0(s.valore)}</span>
        <span class="quota">· ${pct(s.valore / totale, 1)}</span></span>
      </li>`,
    )
    .join('');

  // Le somme non imponibili si aggiungono al netto: non sono una quota della RAL,
  // quindi non compaiono nella barra ma vanno dichiarate.
  if (r.integrazioni.totale > 0) {
    legenda += `<li>
      <span class="pallino" style="background:var(--positivo)"></span>
      <span>Aggiunte in busta paga, non tassate<br>
      <span class="valore">+ ${euro0(r.integrazioni.totale)}</span>
      <span class="quota">· in più, oltre il lordo</span></span>
    </li>`;
  }

  el('legenda').innerHTML = legenda;
}

/**
 * La cascata e' il primo blocco che si legge, spesso l'unico. Quindi parla in
 * italiano corrente: "Contributi per la pensione", non "contributi previdenziali
 * IVS"; "Su questo importo si pagano le tasse", non "imponibile fiscale". Il
 * lessico tecnico, le formule e le fonti restano nelle card di dettaglio, a un
 * click di distanza: chi vuole verificare li trova, chi vuole capire non ci
 * inciampa.
 */
function renderCascata(r) {
  const righe = [];
  let progressivo = 0;

  const aggiungi = ({ nome, nota, importo, tipo }) => {
    if (tipo === 'partenza') progressivo = importo;
    else if (tipo === 'trattenuta') progressivo -= importo;
    else if (tipo === 'integrazione') progressivo += importo;

    const segno = tipo === 'trattenuta' ? '−' : tipo === 'integrazione' ? '+' : '';
    const soloValore =
      tipo === 'partenza' || tipo === 'intermedia' || tipo === 'finale' || importo === 0;

    righe.push({
      classe: `riga--${tipo}`,
      celle: [
        `<span class="voce-nome">${nome}</span>${nota ? `<span class="voce-nota">${nota}</span>` : ''}`,
        soloValore ? euro2(importo) : `${segno} ${euro2(importo)}`,
        `<span class="progressivo">${euro2(progressivo)}</span>`,
      ],
    });
  };

  // --- Punto di partenza ----------------------------------------------------
  aggiungi({
    nome: 'Stipendio lordo annuo',
    nota: `l'importo scritto nel contratto, distribuito su ${r.input.mensilita} mensilità`,
    importo: r.input.ral,
    tipo: 'partenza',
  });

  // --- Contributi ------------------------------------------------------------
  const c = r.contributi;
  let notaContributi =
    `il ${pct(c.aliquotaIvs, 2)} dello stipendio lordo — non è una tassa: ` +
    'costruisce la tua pensione';
  if (c.quotaAggiuntiva > 0) {
    notaContributi += `; sulla parte oltre ${euro0(REGOLE.inps.primaFasciaPensionabile)} si versa l'1% in più`;
  }
  if (c.massimaleApplicato) {
    notaContributi += `; oltre ${euro0(REGOLE.inps.massimaleAnnuo)} non se ne versano più`;
  }

  aggiungi({
    nome: 'Contributi per la pensione (INPS)',
    nota: notaContributi,
    importo: c.totale,
    tipo: 'trattenuta',
  });

  // --- Base imponibile ------------------------------------------------------
  aggiungi({
    nome: 'Su questo importo si pagano le tasse',
    nota: 'lo stipendio lordo meno i contributi: le imposte non si calcolano su tutto il lordo',
    importo: r.imponibileFiscale,
    tipo: 'intermedia',
  });

  // --- IRPEF ----------------------------------------------------------------
  let notaIrpef;
  if (r.detrazioni.totale <= 0) {
    notaIrpef =
      `nessuna detrazione la riduce: oltre ${euro0(REGOLE.detrazioneLavoroDipendente.fascia3.limite)} ` +
      'di reddito non spettano più';
  } else if (r.irpefNetta <= 0) {
    notaIrpef = `sarebbe stata ${euro2(r.irpefLorda)}, ma le detrazioni la azzerano del tutto`;
  } else {
    notaIrpef =
      `sarebbe stata ${euro2(r.irpefLorda)}, ridotta a ${euro2(r.irpefNetta)} dalle detrazioni` +
      (r.detrazioni.nonGodute > 0
        ? `; ${euro2(r.detrazioni.nonGodute)} di detrazioni non si riescono a usare`
        : '');
  }

  aggiungi({
    nome: 'Imposta sul reddito (IRPEF)',
    nota: notaIrpef,
    importo: r.irpefNetta,
    tipo: 'trattenuta',
  });

  // --- Addizionali ----------------------------------------------------------
  const nonDovute = 'non si paga: su questo reddito non risulta dovuta l\'IRPEF';

  aggiungi({
    nome: `Imposta della Regione ${REGOLE.addizionaleRegionale.regione}`,
    nota: r.addizionali.dovute
      ? `in media ${pct(r.addizionali.regionale.importo / (r.imponibileFiscale || 1), 2)} del reddito tassabile`
      : nonDovute,
    importo: r.addizionali.regionale.importo,
    tipo: 'trattenuta',
  });

  const soglia = euro0(REGOLE.addizionaleComunale.sogliaEsenzione);
  aggiungi({
    nome: `Imposta del Comune di ${REGOLE.addizionaleComunale.comune}`,
    nota: !r.addizionali.dovute
      ? nonDovute
      : r.addizionali.comunale.esente
        ? `non si paga: il reddito tassabile resta sotto ${soglia}`
        : `${pct(REGOLE.addizionaleComunale.aliquota, 2)} — si paga perché il reddito tassabile supera ${soglia}`,
    importo: r.addizionali.comunale.importo,
    tipo: 'trattenuta',
  });

  // --- Somme aggiunte in busta paga ----------------------------------------
  if (r.integrazioni.trattamentoIntegrativo > 0) {
    aggiungi({
      nome: 'Trattamento integrativo',
      nota: 'un importo aggiunto in busta paga e non tassato, previsto per i redditi più bassi',
      importo: r.integrazioni.trattamentoIntegrativo,
      tipo: 'integrazione',
    });
  }

  if (r.integrazioni.sommaIntegrativa.importo > 0) {
    aggiungi({
      nome: 'Somma integrativa',
      nota: `il ${pct(r.integrazioni.sommaIntegrativa.percentuale, 1)} dello stipendio, aggiunto in busta paga e non tassato`,
      importo: r.integrazioni.sommaIntegrativa.importo,
      tipo: 'integrazione',
    });
  }

  // --- Arrivo ---------------------------------------------------------------
  righe.push({
    classe: 'riga--finale',
    celle: [
      '<span class="voce-nome">Quello che incassi in un anno</span>' +
        `<span class="voce-nota">${euro2(r.nettoMensile)} al mese, per ${r.input.mensilita} mensilità</span>`,
      euro2(r.nettoAnnuo),
      '',
    ],
  });

  el('cascata').querySelector('tbody').innerHTML = righe
    .map(
      (riga) =>
        `<tr class="${riga.classe}">${riga.celle
          .map((cella, i) =>
            i === 0
              ? `<td>${cella}</td>`
              : `<td class="num${i === 1 ? ' importo' : ''}"${
                  i === 2 ? ' data-etichetta="Quanto resta"' : ''
                }>${cella}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');
}

function renderDettaglioInps(r) {
  const c = r.contributi;
  const righe = [
    {
      celle: [
        'Imponibile previdenziale',
        euro2(c.imponibilePrevidenziale),
        c.massimaleApplicato ? 'limitato al massimale' : '—',
      ],
    },
    {
      celle: [
        `Quota IVS (${pct(c.aliquotaIvs, 2)})`,
        euro2(c.quotaIvs),
        `${euro0(c.imponibilePrevidenziale)} × ${pct(c.aliquotaIvs, 2)}`,
      ],
    },
    {
      celle: [
        'Aliquota aggiuntiva 1%',
        euro2(c.quotaAggiuntiva),
        c.eccedenzaPrimaFascia > 0
          ? `${euro0(c.eccedenzaPrimaFascia)} × 1%`
          : 'nessuna eccedenza',
      ],
    },
    { classe: 'riga--intermedia', celle: ['Totale trattenuto', euro2(c.totale), pct(r.aliquotaEffettivaContributiva, 2)] },
  ];

  el('dettaglio-inps').innerHTML =
    tabella(['Voce', 'Importo', 'Calcolo'], righe) +
    `<p class="formula">prima fascia di retribuzione pensionabile ${num(REGOLE.inps.primaFasciaPensionabile)} €
massimale contributivo annuo         ${num(REGOLE.inps.massimaleAnnuo)} €</p>` +
    `<p class="nota-fonte">Fonte: ${REGOLE.inps.fonte}</p>`;
}

function renderDettaglioIrpef(r) {
  const righe = r.irpefScaglioni.map((s) => ({
    celle: [
      etichettaScaglione(s.da, s.a),
      pct(s.aliquota, 0),
      euro2(s.base),
      euro2(s.imposta),
    ],
  }));

  righe.push({
    classe: 'riga--intermedia',
    celle: ['IRPEF lorda', '', euro2(r.imponibileFiscale), euro2(r.irpefLorda)],
  });
  righe.push({
    celle: ['Detrazioni applicate', '', '', `− ${euro2(Math.min(r.detrazioni.totale, r.irpefLorda))}`],
  });
  righe.push({
    classe: 'riga--finale',
    celle: ['IRPEF netta', '', '', euro2(r.irpefNetta)],
  });

  el('dettaglio-irpef').innerHTML =
    tabella(['Scaglione (€)', 'Aliquota', 'Base tassata', 'Imposta'], righe) +
    `<p class="nota-fonte">Fonte: ${REGOLE.irpef.fonte}. Dal 2026 il secondo scaglione è al 33% (era 35%).</p>`;
}

/** Etichette leggibili delle fasce della detrazione art. 13 TUIR. */
function etichettaFasciaDetrazione(chiave) {
  const d = REGOLE.detrazioneLavoroDipendente;
  switch (chiave) {
    case 'fascia1':      return `reddito complessivo fino a ${num(d.fascia1.limite)} €`;
    case 'fascia2':      return `reddito complessivo tra ${num(d.fascia1.limite)} e ${num(d.fascia2.limite)} €`;
    case 'fascia3':      return `reddito complessivo tra ${num(d.fascia2.limite)} e ${num(d.fascia3.limite)} €`;
    case 'oltreLimite':  return `reddito complessivo oltre ${num(d.fascia3.limite)} €: non spetta`;
    default:             return 'nessun reddito imponibile';
  }
}

function renderDettaglioDetrazioni(r) {
  const d = r.detrazioni;
  const righe = [
    {
      celle: [
        `Detrazione da lavoro dipendente<span class="voce-nota">${etichettaFasciaDetrazione(d.lavoroDipendente.fascia)}</span>`,
        euro2(d.lavoroDipendente.base),
      ],
    },
  ];

  if (d.lavoroDipendente.maggiorazione > 0) {
    righe.push({
      celle: [
        'Maggiorazione fissa<span class="voce-nota">reddito complessivo tra 25.001 e 35.000 €</span>',
        euro2(d.lavoroDipendente.maggiorazione),
      ],
    });
  }

  righe.push({
    celle: [
      `Ulteriore detrazione<span class="voce-nota">${
        d.ulteriore > 0 ? 'reddito complessivo tra 20.000 e 40.000 €' : 'non spettante per questo reddito'
      }</span>`,
      euro2(d.ulteriore),
    ],
  });

  righe.push({ classe: 'riga--intermedia', celle: ['Totale detrazioni', euro2(d.totale)] });

  if (d.nonGodute > 0) {
    righe.push({
      celle: [
        'di cui non godute<span class="voce-nota">detrazioni superiori all\'imposta lorda</span>',
        euro2(d.nonGodute),
      ],
    });
  }

  if (r.integrazioni.totale > 0) {
    righe.push({
      classe: 'riga--integrazione',
      celle: ['Somme non imponibili in busta paga', `+ ${euro2(r.integrazioni.totale)}`],
    });
  }

  const rc = r.redditoComplessivo;
  const dc = REGOLE.detrazioneLavoroDipendente;
  let formula = '';
  if (rc > dc.fascia1.limite && rc <= dc.fascia2.limite) {
    formula = `${dc.fascia2.base} + ${dc.fascia2.quotaVariabile} × trunc₄[(${num(dc.fascia2.limite)} − ${dec(rc, 2)}) / ${num(dc.fascia2.divisore)}]`;
  } else if (rc > dc.fascia2.limite && rc <= dc.fascia3.limite) {
    formula = `${dc.fascia3.base} × trunc₄[(${num(dc.fascia3.limite)} − ${dec(rc, 2)}) / ${num(dc.fascia3.divisore)}]`;
  } else if (rc > 0 && rc <= dc.fascia1.limite) {
    formula = `importo fisso ${dc.fascia1.importo} € (reddito complessivo ≤ ${num(dc.fascia1.limite)} €)`;
  } else {
    formula = `nessuna detrazione: reddito complessivo oltre ${num(dc.fascia3.limite)} €`;
  }

  el('dettaglio-detrazioni').innerHTML =
    tabella(['Voce', 'Importo'], righe) +
    `<p class="formula">${formula}</p>` +
    `<p class="nota-fonte">Fonti: ${dc.fonte}; ${REGOLE.ulterioreDetrazione.fonte}; ${REGOLE.sommaIntegrativa.fonte}.</p>`;
}

function renderDettaglioAddizionali(r) {
  let html = '';

  if (!r.addizionali.dovute) {
    html += `<p class="avviso">Nessuna addizionale è dovuta: l'IRPEF netta è pari a zero per effetto delle detrazioni.</p>`;
  }

  const righeReg = r.addizionali.regionale.dettaglio.map((s) => ({
    celle: [etichettaScaglione(s.da, s.a), pct(s.aliquota, 2), euro2(s.base), euro2(s.imposta)],
  }));

  if (righeReg.length) {
    righeReg.push({
      classe: 'riga--intermedia',
      celle: ['Totale regionale', '', '', euro2(r.addizionali.regionale.importo)],
    });
    html += `<h3 class="kpi-etichetta" style="margin-top:4px">Regionale — ${REGOLE.addizionaleRegionale.regione}</h3>`;
    html += tabella(['Scaglione (€)', 'Aliquota', 'Base', 'Importo'], righeReg);
  }

  const com = r.addizionali.comunale;
  html += `<h3 class="kpi-etichetta" style="margin-top:18px">Comunale — ${REGOLE.addizionaleComunale.comune}</h3>`;
  html += tabella(
    ['Voce', 'Importo'],
    [
      { celle: [`Soglia di esenzione`, euro0(REGOLE.addizionaleComunale.sogliaEsenzione)] },
      { celle: ['Imponibile assoggettato', euro2(com.imponibileTassato)] },
      {
        classe: 'riga--intermedia',
        celle: [`Importo (${pct(com.aliquota, 2)})`, euro2(com.importo)],
      },
    ],
  );

  html += `<p class="avviso">La soglia di Milano <strong>non è una franchigia</strong>: superati
    ${euro0(REGOLE.addizionaleComunale.sogliaEsenzione)} di imponibile, lo 0,80% si applica
    sull'intero importo. Attorno alla soglia un aumento di RAL può quindi ridurre il netto
    di circa ${euro0(REGOLE.addizionaleComunale.sogliaEsenzione * REGOLE.addizionaleComunale.aliquota)}.</p>`;

  html += `<p class="nota-fonte">Fonti: ${REGOLE.addizionaleRegionale.fonte}; ${REGOLE.addizionaleComunale.fonte}.</p>`;

  el('dettaglio-addizionali').innerHTML = html;
}

function renderCostoAzienda(r) {
  const c = r.costoAzienda;
  const righe = [
    { celle: ['Retribuzione annua lorda', euro2(c.ral)] },
    { celle: [`Contributi INPS a carico del datore (${pct(c.aliquotaDatore, 2)})`, euro2(c.contributiDatore)] },
    { celle: [`Accantonamento TFR (RAL / ${dec(REGOLE.inps.divisoreTfr, 1)})`, euro2(c.quotaTfr)] },
    { classe: 'riga--finale', celle: ['Costo azienda (stima minima)', euro2(c.totale)] },
  ];

  const moltiplicatore = r.nettoAnnuo > 0 ? c.totale / r.nettoAnnuo : 0;

  el('dettaglio-costo').innerHTML =
    tabella(['Voce', 'Importo'], righe) +
    `<p class="avviso">Per ogni euro che arriva netto al dipendente, l'azienda ne spende almeno
      <strong>${dec(moltiplicatore, 2)}</strong>. Il cuneo complessivo su questa retribuzione è di almeno
      ${euro0(c.totale - r.nettoAnnuo)}.</p>`;
}

// -----------------------------------------------------------------------------
// Orchestrazione
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Tema chiaro / scuro
// -----------------------------------------------------------------------------

const RADICE = document.documentElement;

/**
 * Tre stati. "auto" non scrive nessun attributo e lascia decidere alla media
 * query `prefers-color-scheme`: e' importante, perche' se scrivessimo comunque un
 * valore la pagina resterebbe congelata sul tema del momento anche quando l'utente
 * cambia impostazione di sistema.
 */
function applicaTema(scelta) {
  if (scelta === 'chiaro') RADICE.dataset.theme = 'light';
  else if (scelta === 'scuro') RADICE.dataset.theme = 'dark';
  else delete RADICE.dataset.theme;

  try {
    localStorage.setItem('tema', scelta);
  } catch (e) {
    // Navigazione privata o storage negato: il tema vale per la sessione corrente.
  }
}

function inizializzaTema() {
  let scelta = 'auto';
  try {
    scelta = localStorage.getItem('tema') || 'auto';
  } catch (e) {}

  const radio = document.getElementById(`tema-${scelta}`);
  if (radio) radio.checked = true;
  else scelta = 'auto';

  applicaTema(scelta);
}

document.querySelectorAll('input[name="tema"]').forEach((radio) =>
  radio.addEventListener('change', () => applicaTema(radio.value)),
);

// -----------------------------------------------------------------------------
// Modalita' e stato nell'URL
// -----------------------------------------------------------------------------

/** Legge gli input correnti del modulo. */
function inputCorrenti() {
  const mens = document.querySelector('input[name="mensilita"]:checked');
  const modo = document.querySelector('input[name="modo"]:checked');
  return {
    modo: modo ? modo.value : 'lordo',
    importo: Number(el('importo').value),
    mensilita: Number(mens ? mens.value : 13),
  };
}

const TESTI = {
  lordo: {
    etichetta: 'Retribuzione annua lorda',
    aiuto:
      'Importo annuo comprensivo delle mensilità aggiuntive. Il numero di mensilità incide sul netto mensile, non sul totale annuo.',
  },
  netto: {
    etichetta: 'Netto mensile desiderato',
    aiuto:
      "Il calcolatore cerca la RAL più bassa che produce almeno questo netto. L'obiettivo annuo è il mensile moltiplicato per le mensilità scelte.",
  },
};

function aggiornaTestiModalita() {
  const { modo } = inputCorrenti();
  el('etichetta-importo').textContent = TESTI[modo].etichetta;
  el('aiuto-testo').textContent = TESTI[modo].aiuto;
}

/** Rende lo scenario condivisibile: lo stato del modulo vive nella querystring. */
function aggiornaUrl({ modo, importo, mensilita }) {
  const q = new URLSearchParams();
  q.set(modo === 'netto' ? 'netto' : 'ral', String(importo));
  q.set('mensilita', String(mensilita));
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

function leggiUrl() {
  const q = new URLSearchParams(location.search);
  const netto = q.get('netto');
  const ral = q.get('ral');
  const mensilita = q.get('mensilita');

  if (netto !== null && Number.isFinite(Number(netto))) {
    document.getElementById('modo-netto').checked = true;
    el('importo').value = netto;
  } else if (ral !== null && Number.isFinite(Number(ral))) {
    document.getElementById('modo-lordo').checked = true;
    el('importo').value = ral;
  }

  if (['12', '13', '14'].includes(mensilita)) {
    document.getElementById(`m${mensilita}`).checked = true;
  }
}

// -----------------------------------------------------------------------------
// Esito del calcolo inverso
// -----------------------------------------------------------------------------

function renderEsitoInverso(esito, obiettivoMensile, mensilita) {
  const nodo = el('esito-inverso');

  if (!esito) {
    nodo.hidden = true;
    return;
  }

  if (!esito.trovata) {
    nodo.className = 'esito-inverso esito-inverso--avvertenza';
    nodo.innerHTML = `<p>Nessuna RAL entro <strong>${euro0(esito.ralMassima)}</strong> produce
      ${euro0(obiettivoMensile)} netti al mese.</p>`;
    nodo.hidden = false;
    return;
  }

  const righe = [
    `<p>Per ottenere ${euro0(obiettivoMensile)} netti al mese su ${mensilita} mensilità
     serve una RAL di <strong>${euro0(esito.ral)}</strong>.</p>`,
  ];

  if (esito.oltreObiettivo) {
    righe.push(`<p class="nota">Quel netto esatto non è ottenibile da nessuna RAL: quella
      trovata è la prima che lo supera, di ${euro2(esito.scostamento)}. Dipende dal fatto che
      alcune agevolazioni non crescono in modo graduale ma scattano di colpo al superamento di
      una soglia di reddito: intorno a quel punto il netto fa un salto, e i valori dentro il
      salto non corrispondono a nessuno stipendio lordo.</p>`);
  } else {
    righe.push(`<p class="nota">È la RAL più bassa che soddisfa il vincolo, quindi la meno
      costosa per il datore.</p>`);
  }

  nodo.className = 'esito-inverso';
  nodo.innerHTML = righe.join('');
  nodo.hidden = false;
}

// -----------------------------------------------------------------------------
// Risultati non aggiornati
// -----------------------------------------------------------------------------

/**
 * Il calcolo parte solo con Calcola, come richiesto. Senza questo segnale, dopo
 * aver modificato un campo la pagina mostrerebbe ancora i numeri dell'input
 * precedente senza dichiararlo.
 */
let ultimoInputCalcolato = null;

function aggiornaSegnaleObsoleto() {
  const attuale = inputCorrenti();
  const obsoleto =
    ultimoInputCalcolato !== null &&
    (attuale.importo !== ultimoInputCalcolato.importo ||
      attuale.mensilita !== ultimoInputCalcolato.mensilita ||
      attuale.modo !== ultimoInputCalcolato.modo);

  el('segnale-obsoleto').hidden = !obsoleto;
  el('risultati').classList.toggle('risultati--obsoleti', obsoleto);
}

/** Totali mostrati nelle intestazioni dei dettagli, visibili anche da chiusi. */
function renderSommari(r) {
  const imposta = (id, valore, tipo) => {
    const nodo = el(id);
    nodo.textContent = `${tipo === 'trattenuta' ? '−' : '+'} ${euro0(valore)}`;
    nodo.className = `sommario-valore sommario-valore--${
      tipo === 'trattenuta' ? 'trattenuta' : 'beneficio'
    }`;
  };

  imposta('sommario-inps', r.contributi.totale, 'trattenuta');
  imposta('sommario-irpef', r.irpefNetta, 'trattenuta');
  imposta(
    'sommario-detrazioni',
    Math.min(r.detrazioni.totale, r.irpefLorda) + r.integrazioni.totale,
    'beneficio',
  );
  imposta('sommario-addizionali', r.addizionali.totale, 'trattenuta');
}

// -----------------------------------------------------------------------------
// Orchestrazione
// -----------------------------------------------------------------------------

function calcolaEMostra() {
  const errore = el('errore');
  const { modo, importo, mensilita } = inputCorrenti();

  if (!Number.isFinite(importo) || importo < 0) {
    errore.textContent =
      modo === 'netto'
        ? 'Inserisci un netto mensile valido: un numero maggiore o uguale a zero.'
        : 'Inserisci una RAL valida: un numero maggiore o uguale a zero.';
    errore.hidden = false;
    el('risultati').hidden = true;
    return;
  }

  errore.hidden = true;

  // In modalità inversa si risolve prima la RAL, poi il resto della pagina si
  // costruisce identico: una sola catena di calcolo, nessuna logica duplicata.
  let ral = importo;
  let esitoInverso = null;

  if (modo === 'netto') {
    esitoInverso = ralPerNettoAnnuo(importo * mensilita, REGOLE, { mensilita });
    if (!esitoInverso.trovata) {
      renderEsitoInverso(esitoInverso, importo, mensilita);
      el('risultati').hidden = false;
      document.querySelectorAll('.risultati > *:not(#esito-inverso)').forEach((n) => {
        n.style.display = 'none';
      });
      return;
    }
    ral = esitoInverso.ral;
  }

  document.querySelectorAll('.risultati > *').forEach((n) => {
    n.style.display = '';
  });

  let r;
  try {
    r = calcolaNetto(ral, REGOLE, { mensilita });
  } catch (e) {
    errore.textContent = e.message;
    errore.hidden = false;
    el('risultati').hidden = true;
    return;
  }

  renderEsitoInverso(esitoInverso, importo, mensilita);
  renderKpi(r);
  renderBarra(r);
  renderCascata(r);
  renderDettaglioInps(r);
  renderDettaglioIrpef(r);
  renderDettaglioDetrazioni(r);
  renderDettaglioAddizionali(r);
  renderCostoAzienda(r);
  renderSommari(r);

  el('risultati').hidden = false;
  ultimoInputCalcolato = { modo, importo, mensilita };
  aggiornaSegnaleObsoleto();
  aggiornaUrl({ modo, importo, mensilita });

  // Utile per ispezionare il risultato completo dalla console del browser.
  window.ultimoRisultato = r;
}

el('modulo').addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcolaEMostra();
});

el('modulo').addEventListener('input', aggiornaSegnaleObsoleto);
el('modulo').addEventListener('change', aggiornaSegnaleObsoleto);

document.querySelectorAll('input[name="modo"]').forEach((radio) =>
  radio.addEventListener('change', aggiornaTestiModalita),
);

inizializzaTema();
leggiUrl();
aggiornaTestiModalita();
calcolaEMostra();
