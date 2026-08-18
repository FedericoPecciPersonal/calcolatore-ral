/**
 * INTERFACCIA
 * ===========
 * Unico file che tocca il DOM. Non contiene logica di calcolo ne' parametri
 * normativi: legge il risultato prodotto da calcolo.js e lo rende leggibile.
 */

import { REGOLE_2026 as REGOLE } from './regole-2026.js';
import { calcolaNetto } from './calcolo.js';

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
        .map((c, i) => (i === 0 ? `<td>${c}</td>` : `<td class="num">${c}</td>`))
        .join('');
      return `<tr${classe}>${celle}</tr>`;
    })
    .join('');
  return `<table class="tabella"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

// -----------------------------------------------------------------------------
// Rendering delle singole sezioni
// -----------------------------------------------------------------------------

function renderKpi(r) {
  el('kpi-netto-annuo').textContent = euro0(r.nettoAnnuo);
  el('kpi-netto-annuo-nota').textContent =
    `su una RAL di ${euro0(r.input.ral)} · trattenuto il ${pct(r.aliquotaEffettivaTotale, 1)}`;

  el('kpi-netto-mensile').textContent = euro2(r.nettoMensile);
  el('kpi-netto-mensile-nota').textContent =
    r.input.mensilita === 12
      ? 'su 12 mensilità'
      : `su ${r.input.mensilita} mensilità · media su 12: ${euro2(r.nettoMedioSu12)}`;

  el('kpi-trattenute').textContent = euro0(r.totaleTrattenute);
  el('kpi-trattenute-nota').textContent =
    `contributi ${euro0(r.contributi.totale)} · imposte ${euro0(r.totaleImposte)}`;
}

function renderBarra(r) {
  const segmenti = [
    { nome: 'Netto (quota della RAL)', valore: r.input.ral - r.totaleTrattenute, colore: 'var(--c-netto)' },
    { nome: 'Contributi INPS', valore: r.contributi.totale, colore: 'var(--c-contributi)' },
    { nome: 'IRPEF netta', valore: r.irpefNetta, colore: 'var(--c-irpef)' },
    { nome: 'Addizionali locali', valore: r.addizionali.totale, colore: 'var(--c-addizionali)' },
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
      <span>Somme non imponibili <em>in aggiunta</em><br>
      <span class="valore">+ ${euro0(r.integrazioni.totale)}</span>
      <span class="quota">· fuori dalla RAL</span></span>
    </li>`;
  }

  el('legenda').innerHTML = legenda;
}

function renderCascata(r) {
  const righe = [];
  let progressivo = 0;

  const aggiungi = ({ nome, nota, importo, tipo }) => {
    if (tipo === 'partenza') progressivo = importo;
    else if (tipo === 'trattenuta') progressivo -= importo;
    else if (tipo === 'integrazione') progressivo += importo;

    const segno = tipo === 'trattenuta' ? '−' : tipo === 'integrazione' ? '+' : '';

    righe.push({
      classe: `riga--${tipo}`,
      celle: [
        `<span class="voce-nome">${nome}</span>${nota ? `<span class="voce-nota">${nota}</span>` : ''}`,
        tipo === 'partenza' || tipo === 'intermedia' || tipo === 'finale'
          ? euro2(importo)
          : `${segno} ${euro2(importo)}`,
        `<span class="progressivo">${euro2(progressivo)}</span>`,
      ],
    });
  };

  aggiungi({
    nome: 'Retribuzione annua lorda',
    nota: `${r.input.mensilita} mensilità`,
    importo: r.input.ral,
    tipo: 'partenza',
  });

  aggiungi({
    nome: 'Contributi previdenziali INPS a carico del dipendente',
    nota:
      `aliquota IVS ${pct(r.contributi.aliquotaIvs, 2)}` +
      (r.contributi.quotaAggiuntiva > 0
        ? ` + 1% sulla quota oltre ${euro0(REGOLE.inps.primaFasciaPensionabile)}`
        : '') +
      (r.contributi.massimaleApplicato
        ? ` · base limitata al massimale di ${euro0(REGOLE.inps.massimaleAnnuo)}`
        : ''),
    importo: r.contributi.totale,
    tipo: 'trattenuta',
  });

  aggiungi({
    nome: 'Imponibile fiscale',
    nota: 'base di calcolo dell\'IRPEF e delle addizionali',
    importo: r.imponibileFiscale,
    tipo: 'intermedia',
  });

  aggiungi({
    nome: 'IRPEF netta',
    nota:
      `imposta lorda ${euro2(r.irpefLorda)} − detrazioni ${euro2(Math.min(r.detrazioni.totale, r.irpefLorda))}` +
      (r.detrazioni.nonGodute > 0
        ? ` · ${euro2(r.detrazioni.nonGodute)} di detrazioni incapienti`
        : ''),
    importo: r.irpefNetta,
    tipo: 'trattenuta',
  });

  aggiungi({
    nome: `Addizionale regionale — ${REGOLE.addizionaleRegionale.regione}`,
    nota: r.addizionali.dovute
      ? `scaglioni progressivi · aliquota media ${pct(r.addizionali.regionale.importo / (r.imponibileFiscale || 1), 2)}`
      : 'non dovuta: IRPEF netta pari a zero',
    importo: r.addizionali.regionale.importo,
    tipo: 'trattenuta',
  });

  aggiungi({
    nome: `Addizionale comunale — ${REGOLE.addizionaleComunale.comune}`,
    nota: !r.addizionali.dovute
      ? 'non dovuta: IRPEF netta pari a zero'
      : r.addizionali.comunale.esente
        ? `esente: imponibile entro la soglia di ${euro0(REGOLE.addizionaleComunale.sogliaEsenzione)}`
        : `${pct(REGOLE.addizionaleComunale.aliquota, 2)} sull'intero imponibile (soglia superata)`,
    importo: r.addizionali.comunale.importo,
    tipo: 'trattenuta',
  });

  if (r.integrazioni.trattamentoIntegrativo > 0) {
    aggiungi({
      nome: 'Trattamento integrativo',
      nota: 'somma non imponibile erogata in busta paga',
      importo: r.integrazioni.trattamentoIntegrativo,
      tipo: 'integrazione',
    });
  }

  if (r.integrazioni.sommaIntegrativa.importo > 0) {
    aggiungi({
      nome: 'Somma integrativa',
      nota: `${pct(r.integrazioni.sommaIntegrativa.percentuale, 1)} del reddito di lavoro dipendente`,
      importo: r.integrazioni.sommaIntegrativa.importo,
      tipo: 'integrazione',
    });
  }

  righe.push({
    classe: 'riga--finale',
    celle: [
      `<span class="voce-nome">Netto annuo</span><span class="voce-nota">${euro2(r.nettoMensile)} × ${r.input.mensilita} mensilità</span>`,
      euro2(r.nettoAnnuo),
      '',
    ],
  });

  el('cascata').querySelector('tbody').innerHTML = righe
    .map(
      (riga) =>
        `<tr class="${riga.classe}">${riga.celle
          .map((c, i) => (i === 0 ? `<td>${c}</td>` : `<td class="num${i === 1 ? ' importo' : ''}">${c}</td>`))
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

function calcolaEMostra() {
  const errore = el('errore');
  const ral = Number(el('ral').value);
  const mensilita = Number(el('mensilita').value);

  if (!Number.isFinite(ral) || ral < 0) {
    errore.textContent = 'Inserisci una RAL valida: un numero maggiore o uguale a zero.';
    errore.hidden = false;
    el('risultati').hidden = true;
    return;
  }

  errore.hidden = true;

  let r;
  try {
    r = calcolaNetto(ral, REGOLE, { mensilita });
  } catch (e) {
    errore.textContent = e.message;
    errore.hidden = false;
    el('risultati').hidden = true;
    return;
  }

  renderKpi(r);
  renderBarra(r);
  renderCascata(r);
  renderDettaglioInps(r);
  renderDettaglioIrpef(r);
  renderDettaglioDetrazioni(r);
  renderDettaglioAddizionali(r);
  renderCostoAzienda(r);

  el('risultati').hidden = false;

  // Utile per ispezionare il risultato completo dalla console del browser.
  window.ultimoRisultato = r;
}

el('modulo').addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcolaEMostra();
});

// Primo calcolo al caricamento, così la pagina non si apre vuota.
calcolaEMostra();
