/**
 * MOTORE DI CALCOLO LORDO -> NETTO
 * ================================
 *
 * Funzioni pure, senza dipendenze e senza accesso al DOM: lo stesso file gira
 * nel browser e sotto Node per i test.
 *
 * La funzione principale e' `calcolaNetto(ral, regole, opzioni)`, che restituisce
 * un oggetto con TUTTI i passaggi intermedi - non solo il risultato finale.
 * Questo serve a due cose: rendere il calcolo ispezionabile in pagina e rendere
 * il motore testabile passaggio per passaggio.
 *
 * LA CATENA DI CALCOLO
 *   RAL
 *   - contributi INPS a carico del lavoratore   -> imponibile fiscale
 *   - IRPEF lorda (scaglioni)
 *   + detrazioni (lavoro dipendente + ulteriore) -> IRPEF netta
 *   - addizionale regionale
 *   - addizionale comunale
 *   + trattamento integrativo / somma integrativa (non imponibili)
 *   = netto annuo
 */

// -----------------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------------

/** Tronca (non arrotonda) alla n-esima cifra decimale, come richiesto dalle
 *  istruzioni sui rapporti nelle formule delle detrazioni. */
export function tronca(valore, decimali) {
  const f = 10 ** decimali;
  return Math.trunc(valore * f) / f;
}

/**
 * Applica un'imposta progressiva per scaglioni marginali.
 * Restituisce il totale e il dettaglio scaglione per scaglione, cosi' la UI
 * puo' mostrare quanto pesa ogni fascia.
 *
 * @param {number} base      imponibile
 * @param {Array}  scaglioni [{ fino: number|null, aliquota: number }]
 */
export function impostaProgressiva(base, scaglioni) {
  const dettaglio = [];
  let totale = 0;
  let limiteInferiore = 0;
  let residuo = Math.max(0, base);

  for (const scaglione of scaglioni) {
    if (residuo <= 0) break;
    const limiteSuperiore = scaglione.fino ?? Infinity;
    const ampiezzaScaglione = limiteSuperiore - limiteInferiore;
    const quotaTassata = Math.min(residuo, ampiezzaScaglione);
    const imposta = quotaTassata * scaglione.aliquota;

    dettaglio.push({
      da: limiteInferiore,
      a: scaglione.fino,
      aliquota: scaglione.aliquota,
      base: quotaTassata,
      imposta,
    });

    totale += imposta;
    residuo -= quotaTassata;
    limiteInferiore = limiteSuperiore;
  }

  return { totale, dettaglio };
}

// -----------------------------------------------------------------------------
// 1. Contributi previdenziali a carico del lavoratore
// -----------------------------------------------------------------------------

/**
 * Contributi INPS trattenuti al dipendente.
 *
 * Due elementi:
 *  - aliquota IVS ordinaria (9,19%) sull'imponibile previdenziale;
 *  - aliquota aggiuntiva 1% sulla sola quota che eccede la prima fascia di
 *    retribuzione pensionabile.
 *
 * L'imponibile previdenziale e' limitato dal massimale annuo: oltre quella
 * soglia non si versano contributi IVS.
 */
export function contributiInps(ral, regole) {
  const p = regole.inps;
  const imponibilePrevidenziale = Math.min(ral, p.massimaleAnnuo);

  const quotaIvs = imponibilePrevidenziale * p.aliquotaLavoratore;

  const eccedenzaPrimaFascia = Math.max(0, imponibilePrevidenziale - p.primaFasciaPensionabile);
  const quotaAggiuntiva = eccedenzaPrimaFascia * p.aliquotaAggiuntiva;

  return {
    imponibilePrevidenziale,
    quotaIvs,
    aliquotaIvs: p.aliquotaLavoratore,
    eccedenzaPrimaFascia,
    quotaAggiuntiva,
    massimaleApplicato: ral > p.massimaleAnnuo,
    totale: quotaIvs + quotaAggiuntiva,
  };
}

// -----------------------------------------------------------------------------
// 2. Detrazione per redditi da lavoro dipendente (art. 13 TUIR)
// -----------------------------------------------------------------------------

export function detrazioneLavoroDipendente(redditoComplessivo, regole) {
  const d = regole.detrazioneLavoroDipendente;
  const rc = redditoComplessivo;
  let base = 0;
  // Chiave della fascia applicata: la formattazione per l'utente e' compito della UI.
  let fascia = null;

  if (rc <= 0) {
    fascia = 'nessunReddito';
  } else if (rc <= d.fascia1.limite) {
    base = Math.max(d.fascia1.importo, d.fascia1.minimoTempoIndeterminato);
    fascia = 'fascia1';
  } else if (rc <= d.fascia2.limite) {
    const rapporto = tronca(
      (d.fascia2.limite - rc) / d.fascia2.divisore,
      d.decimaliTroncamento,
    );
    base = d.fascia2.base + d.fascia2.quotaVariabile * rapporto;
    fascia = 'fascia2';
  } else if (rc <= d.fascia3.limite) {
    const rapporto = tronca(
      (d.fascia3.limite - rc) / d.fascia3.divisore,
      d.decimaliTroncamento,
    );
    base = d.fascia3.base * rapporto;
    fascia = 'fascia3';
  } else {
    // Oltre 50.000 euro la detrazione non spetta.
    fascia = 'oltreLimite';
  }

  const maggiorazione =
    rc > d.maggiorazione.da && rc <= d.maggiorazione.a ? d.maggiorazione.importo : 0;

  return { base, maggiorazione, fascia, totale: base + maggiorazione };
}

// -----------------------------------------------------------------------------
// 3. Ulteriore detrazione (L. 207/2024)
// -----------------------------------------------------------------------------

export function ulterioreDetrazione(redditoComplessivo, regole) {
  const u = regole.ulterioreDetrazione;
  const rc = redditoComplessivo;

  if (rc <= u.da || rc > u.limiteAzzeramento) return 0;
  if (rc <= u.limitePieno) return u.importoPieno;

  const rapporto = (u.limiteAzzeramento - rc) / (u.limiteAzzeramento - u.limitePieno);
  return u.importoPieno * rapporto;
}

// -----------------------------------------------------------------------------
// 4. Somme non imponibili erogate in busta paga
// -----------------------------------------------------------------------------

/**
 * Trattamento integrativo: 1.200 euro se il reddito complessivo non supera
 * 15.000 euro E l'imposta lorda supera la detrazione da lavoro dipendente
 * (verifica di capienza).
 */
export function trattamentoIntegrativo(redditoComplessivo, irpefLorda, detrazioneArt13, regole) {
  const t = regole.trattamentoIntegrativo;
  if (redditoComplessivo <= 0 || redditoComplessivo > t.limiteRedditoComplessivo) return 0;
  if (t.richiedeCapienza && irpefLorda <= detrazioneArt13) return 0;
  return t.importo;
}

/**
 * Somma integrativa non imponibile: percentuale del reddito di lavoro
 * dipendente, spettante solo se il reddito complessivo non supera 20.000 euro.
 * La percentuale si applica all'intero reddito di lavoro dipendente (non e'
 * un calcolo per scaglioni marginali).
 */
export function sommaIntegrativa(redditoComplessivo, redditoLavoroDipendente, regole) {
  const s = regole.sommaIntegrativa;
  if (redditoComplessivo <= 0 || redditoComplessivo > s.limiteRedditoComplessivo) {
    return { percentuale: 0, importo: 0 };
  }

  const fascia = s.fasce.find((f) => redditoLavoroDipendente <= f.fino);
  if (!fascia) return { percentuale: 0, importo: 0 };

  return {
    percentuale: fascia.percentuale,
    importo: redditoLavoroDipendente * fascia.percentuale,
  };
}

// -----------------------------------------------------------------------------
// 5. Addizionali locali
// -----------------------------------------------------------------------------

export function addizionaleComunale(imponibile, regole) {
  const a = regole.addizionaleComunale;
  if (imponibile <= a.sogliaEsenzione) {
    return { imponibileTassato: 0, aliquota: a.aliquota, importo: 0, esente: true };
  }
  // Superata la soglia si tassa l'intero imponibile: e' una soglia, non una franchigia.
  const imponibileTassato = a.esenzioneATotale ? imponibile : imponibile - a.sogliaEsenzione;
  return {
    imponibileTassato,
    aliquota: a.aliquota,
    importo: imponibileTassato * a.aliquota,
    esente: false,
  };
}

// -----------------------------------------------------------------------------
// 6. Costo azienda (stima prudenziale)
// -----------------------------------------------------------------------------

/**
 * Stima del costo del lavoro per il datore.
 * ATTENZIONE: include solo la quota IVS a carico del datore (23,81%) e la quota
 * TFR. Sono ESCLUSE le contribuzioni minori (CUAF, CIGS, DS, fondo garanzia) e
 * il premio INAIL, che variano per settore e classe di rischio. Il valore va
 * quindi letto come LIMITE INFERIORE del costo reale.
 */
export function costoAzienda(ral, regole) {
  const p = regole.inps;
  const imponibilePrevidenziale = Math.min(ral, p.massimaleAnnuo);
  const contributiDatore = imponibilePrevidenziale * p.aliquotaDatore;
  const quotaTfr = ral / p.divisoreTfr;

  return {
    ral,
    contributiDatore,
    aliquotaDatore: p.aliquotaDatore,
    quotaTfr,
    totale: ral + contributiDatore + quotaTfr,
    stimaPrudenziale: true,
  };
}

// -----------------------------------------------------------------------------
// FUNZIONE PRINCIPALE
// -----------------------------------------------------------------------------

/**
 * @param {number} ral      retribuzione annua lorda
 * @param {object} regole   parametri normativi (es. REGOLE_2026)
 * @param {object} opzioni  { mensilita?: 12|13|14 }
 */
export function calcolaNetto(ral, regole, opzioni = {}) {
  const mensilita = opzioni.mensilita ?? 13;

  if (!Number.isFinite(ral) || ral < 0) {
    throw new Error('La RAL deve essere un numero maggiore o uguale a zero.');
  }

  // --- Passo 1: contributi previdenziali -------------------------------------
  const inps = contributiInps(ral, regole);

  // --- Passo 2: imponibile fiscale ------------------------------------------
  // Nel caso standard modellato (nessun altro reddito, nessun onere deducibile)
  // imponibile fiscale = reddito complessivo = reddito di lavoro dipendente.
  const imponibileFiscale = ral - inps.totale;
  const redditoComplessivo = imponibileFiscale;

  // --- Passo 3: IRPEF lorda -------------------------------------------------
  const irpef = impostaProgressiva(imponibileFiscale, regole.irpef.scaglioni);

  // --- Passo 4: detrazioni --------------------------------------------------
  const detrLavoro = detrazioneLavoroDipendente(redditoComplessivo, regole);
  const detrUlteriore = ulterioreDetrazione(redditoComplessivo, regole);
  const detrazioniTotali = detrLavoro.totale + detrUlteriore;

  // --- Passo 5: IRPEF netta (non puo' essere negativa) ----------------------
  const irpefNetta = Math.max(0, irpef.totale - detrazioniTotali);
  // Parte di detrazione persa per incapienza dell'imposta.
  const detrazioniNonGodute = Math.max(0, detrazioniTotali - irpef.totale);

  // --- Passo 6: addizionali locali -----------------------------------------
  // Non dovute se per l'anno non risulta dovuta l'IRPEF.
  const addizionaliDovute = !regole.addizionaliDovuteSoloSeImpostaNetta || irpefNetta > 0;

  const regionale = addizionaliDovute
    ? impostaProgressiva(imponibileFiscale, regole.addizionaleRegionale.scaglioni)
    : { totale: 0, dettaglio: [] };

  const comunale = addizionaliDovute
    ? addizionaleComunale(imponibileFiscale, regole)
    : { imponibileTassato: 0, aliquota: regole.addizionaleComunale.aliquota, importo: 0, esente: true };

  // --- Passo 7: somme non imponibili in busta paga -------------------------
  const trattIntegrativo = trattamentoIntegrativo(
    redditoComplessivo,
    irpef.totale,
    detrLavoro.totale,
    regole,
  );
  const sommaInt = sommaIntegrativa(redditoComplessivo, imponibileFiscale, regole);

  // --- Passo 8: netto -------------------------------------------------------
  const totaleTrattenute = inps.totale + irpefNetta + regionale.totale + comunale.importo;
  const totaleIntegrazioni = trattIntegrativo + sommaInt.importo;
  const nettoAnnuo = ral - totaleTrattenute + totaleIntegrazioni;

  const totaleImposte = irpefNetta + regionale.totale + comunale.importo;

  return {
    input: { ral, mensilita, anno: regole.anno },

    contributi: inps,
    imponibileFiscale,
    redditoComplessivo,

    irpefLorda: irpef.totale,
    irpefScaglioni: irpef.dettaglio,
    detrazioni: {
      lavoroDipendente: detrLavoro,
      ulteriore: detrUlteriore,
      totale: detrazioniTotali,
      nonGodute: detrazioniNonGodute,
    },
    irpefNetta,

    addizionali: {
      dovute: addizionaliDovute,
      regionale: { importo: regionale.totale, dettaglio: regionale.dettaglio },
      comunale,
      totale: regionale.totale + comunale.importo,
    },

    integrazioni: {
      trattamentoIntegrativo: trattIntegrativo,
      sommaIntegrativa: sommaInt,
      totale: totaleIntegrazioni,
    },

    totaleTrattenute,
    totaleImposte,

    nettoAnnuo,
    nettoMensile: nettoAnnuo / mensilita,
    nettoMedioSu12: nettoAnnuo / 12,

    // Indicatori di sintesi
    aliquotaEffettivaTotale: ral > 0 ? totaleTrattenute / ral : 0,
    aliquotaEffettivaFiscale: ral > 0 ? totaleImposte / ral : 0,
    aliquotaEffettivaContributiva: ral > 0 ? inps.totale / ral : 0,

    costoAzienda: costoAzienda(ral, regole),
  };
}

// -----------------------------------------------------------------------------
// CALCOLO INVERSO: dal netto desiderato alla RAL
// -----------------------------------------------------------------------------

/**
 * Trova la RAL piu' bassa che produce almeno il netto annuo richiesto.
 *
 * Non si puo' usare una bisezione secca su tutto l'intervallo, perche' il netto
 * NON e' monotono crescente nella RAL: la soglia dell'addizionale comunale
 * introduce un salto verso il basso (docs/CASI-PROVA.md, caso F). Alcuni valori
 * di netto sono quindi prodotti da DUE RAL diverse, e una bisezione ingenua
 * potrebbe restituire quella piu' alta.
 *
 * Si procede in due fasi: una scansione a passo fisso per individuare il PRIMO
 * intervallo in cui il netto raggiunge l'obiettivo, poi una bisezione dentro
 * quell'intervallo. Il risultato e' la RAL minima - la meno costosa per il
 * datore - fra quelle che soddisfano il vincolo.
 *
 * `oltreObiettivo` segnala che la bisezione ha scavalcato una discontinuita':
 * quel netto esatto non e' ottenibile da nessuna RAL.
 */
export function ralPerNettoAnnuo(nettoObiettivo, regole, opzioni = {}) {
  const ralMassima = opzioni.ralMassima ?? 1000000;
  const passoScansione = opzioni.passoScansione ?? 1;
  const netto = (ral) => calcolaNetto(ral, regole, opzioni).nettoAnnuo;

  if (!Number.isFinite(nettoObiettivo) || nettoObiettivo < 0) {
    throw new Error('Il netto obiettivo deve essere un numero maggiore o uguale a zero.');
  }

  if (nettoObiettivo === 0) {
    return { trovata: true, ral: 0, nettoOttenuto: 0, scostamento: 0, oltreObiettivo: false };
  }

  if (netto(ralMassima) < nettoObiettivo) {
    return {
      trovata: false,
      ral: null,
      nettoOttenuto: null,
      scostamento: null,
      oltreObiettivo: false,
      ralMassima,
    };
  }

  // Fase 1: primo punto in cui il netto raggiunge l'obiettivo.
  //
  // La scansione parte da un limite inferiore ricavato analiticamente invece che
  // da zero. Il netto non puo' superare la RAL piu' le somme non imponibili, il
  // cui massimo si deduce dalle regole: sotto quella soglia nessuna RAL puo'
  // produrre l'obiettivo, quindi scandirla sarebbe lavoro sprecato. Cosi' il
  // passo puo' restare a 1 euro senza costi proibitivi - e serve che sia 1,
  // perche' appena sotto la soglia comunale la finestra in cui il netto tocca il
  // suo massimo locale e' larga circa un euro: un passo piu' grosso la
  // scavalcherebbe restituendo una RAL piu' alta del necessario.
  const massimoIntegrazioni =
    regole.trattamentoIntegrativo.importo +
    Math.max(...regole.sommaIntegrativa.fasce.map((f) => f.fino * f.percentuale));

  let basso = Math.max(0, Math.floor(nettoObiettivo - massimoIntegrazioni) - 1);
  if (netto(basso) >= nettoObiettivo) basso = 0;

  let alto = ralMassima;
  for (let ral = basso; ral <= ralMassima; ral += passoScansione) {
    if (netto(ral) >= nettoObiettivo) {
      alto = ral;
      break;
    }
    basso = ral;
  }

  // Fase 2: bisezione fino al centesimo di euro.
  for (let i = 0; i < 80 && alto - basso > 0.005; i++) {
    const medio = (basso + alto) / 2;
    if (netto(medio) >= nettoObiettivo) alto = medio;
    else basso = medio;
  }

  const nettoOttenuto = netto(alto);
  const scostamento = nettoOttenuto - nettoObiettivo;

  return {
    trovata: true,
    ral: alto,
    nettoOttenuto,
    scostamento,
    oltreObiettivo: scostamento > 1,
  };
}

// -----------------------------------------------------------------------------
// CAMPIONAMENTO DELLA CURVA
// -----------------------------------------------------------------------------

/**
 * Campiona il modello su un intervallo di RAL restituendo, per ogni punto, il
 * netto e l'ALIQUOTA MARGINALE: la quota di ogni euro aggiuntivo di lordo che
 * non arriva al dipendente.
 *
 * L'aliquota marginale e' la grandezza che rende visibili le discontinuita' del
 * sistema. Dove supera il 100% un aumento di lordo RIDUCE il netto: e' il caso
 * della soglia comunale di Milano.
 */
export function curvaNetto(regole, opzioni = {}) {
  const da = opzioni.da ?? 0;
  const a = opzioni.a ?? 100000;
  const passo = opzioni.passo ?? 250;
  const delta = opzioni.delta ?? 50;

  const punti = [];
  for (let ral = da; ral <= a; ral += passo) {
    const nettoQui = calcolaNetto(ral, regole, opzioni).nettoAnnuo;
    const nettoDopo = calcolaNetto(ral + delta, regole, opzioni).nettoAnnuo;
    const guadagnoMarginale = (nettoDopo - nettoQui) / delta;

    punti.push({
      ral,
      netto: nettoQui,
      aliquotaMarginale: 1 - guadagnoMarginale,
    });
  }

  return punti;
}

/**
 * Individua le RAL in cui il netto SALTA: le soglie della normativa che non sono
 * raccordi continui ma gradini.
 *
 * Unica definizione condivisa fra il grafico, che le marca, e i test, che ne
 * fissano l'insieme: se una modifica futura ne aggiunge o sposta una, il test la
 * intercetta invece di lasciarla passare.
 *
 * `riduceIlNetto` distingue i gradini in cui un aumento di lordo fa DIMINUIRE il
 * netto - controintuitivi, ma reali.
 */
export function discontinuita(regole, opzioni = {}) {
  const da = opzioni.da ?? 0;
  const a = opzioni.a ?? 130000;
  const sogliaSalto = opzioni.sogliaSalto ?? 3;

  const trovate = [];
  let precedente = calcolaNetto(da, regole, opzioni).nettoAnnuo;

  for (let ral = da + 1; ral <= a; ral++) {
    const corrente = calcolaNetto(ral, regole, opzioni).nettoAnnuo;
    const salto = corrente - precedente;
    if (Math.abs(salto) > sogliaSalto) {
      trovate.push({ ral, salto, riduceIlNetto: salto < 0 });
    }
    precedente = corrente;
  }

  return trovate;
}
