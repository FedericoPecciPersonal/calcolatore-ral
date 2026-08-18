/**
 * PARAMETRI NORMATIVI - ANNO D'IMPOSTA 2026
 * =========================================
 *
 * Questo file contiene TUTTI i valori numerici usati dal calcolatore.
 * Il motore di calcolo (calcolo.js) non contiene nessuna costante hardcoded:
 * cambiare anno d'imposta significa scrivere un nuovo file come questo.
 *
 * Ogni blocco riporta la propria fonte normativa. Vedi docs/FONTI.md per i link.
 */

export const REGOLE_2026 = {
  anno: 2026,
  descrizione: 'Impiegato, tempo indeterminato, FPLD, residente a Milano (Lombardia)',

  // ---------------------------------------------------------------------------
  // 1. CONTRIBUTI PREVIDENZIALI INPS
  //    Fondo Pensioni Lavoratori Dipendenti (FPLD): aliquota complessiva 33%,
  //    ripartita 9,19% lavoratore / 23,81% datore.
  //    Fonte: L. 335/1995; INPS circolare n. 6 del 30/01/2026 (minimali/massimali).
  // ---------------------------------------------------------------------------
  inps: {
    fonte: 'L. 335/1995 - INPS circ. n. 6 del 30/01/2026',

    // Quota IVS a carico del lavoratore.
    aliquotaLavoratore: 0.0919,

    // Quota IVS a carico del datore (usata solo per la stima del costo azienda).
    aliquotaDatore: 0.2381,

    // Aliquota aggiuntiva dell'1% dovuta dal lavoratore sulla quota di
    // retribuzione che eccede la prima fascia di retribuzione pensionabile.
    // Fonte: art. 3-ter D.L. 384/1992.
    aliquotaAggiuntiva: 0.01,
    primaFasciaPensionabile: 56224,

    // Massimale annuo della base contributiva e pensionabile.
    // Si applica ai soggetti privi di anzianita' contributiva al 31/12/1995
    // (iscritti dal 01/01/1996). Oltre il massimale non si versano contributi IVS.
    massimaleAnnuo: 122295,

    // Quota TFR accantonata annualmente = retribuzione / 13,5 (art. 2120 c.c.).
    // Non e' una trattenuta al netto: e' costo azienda differito.
    divisoreTfr: 13.5,
  },

  // ---------------------------------------------------------------------------
  // 2. IRPEF - SCAGLIONI E ALIQUOTE
  //    La L. 199/2025 (Legge di Bilancio 2026), art. 1 co. 3, ha ridotto
  //    il secondo scaglione dal 35% al 33% con effetto dal 01/01/2026.
  //    Fonte: art. 11 TUIR come modificato da L. 199/2025.
  // ---------------------------------------------------------------------------
  irpef: {
    fonte: 'art. 11 TUIR - L. 199/2025 art. 1 co. 3',
    // `fino: null` = scaglione senza limite superiore.
    scaglioni: [
      { fino: 28000, aliquota: 0.23 },
      { fino: 50000, aliquota: 0.33 },
      { fino: null,  aliquota: 0.43 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. DETRAZIONE PER REDDITI DA LAVORO DIPENDENTE
  //    Fonte: art. 13 co. 1 TUIR (D.Lgs. 216/2023, confermato da L. 207/2024).
  //    Si calcola sul REDDITO COMPLESSIVO e si azzera oltre 50.000 euro.
  // ---------------------------------------------------------------------------
  detrazioneLavoroDipendente: {
    fonte: 'art. 13 co. 1 TUIR',

    // Fascia 1: reddito complessivo fino a 15.000 euro -> importo fisso.
    fascia1: {
      limite: 15000,
      importo: 1955,
      // Importo minimo garantito (rapportato ai giorni di lavoro nell'anno).
      // Con anno intero non e' vincolante, ma il motore lo applica come floor
      // nella sola fascia 1 - fuori da questa fascia la detrazione decresce
      // legittimamente fino a zero.
      minimoTempoIndeterminato: 690,
    },

    // Fascia 2: 15.001 - 28.000 euro
    // 1.910 + 1.190 x [(28.000 - reddito complessivo) / 13.000]
    fascia2: { limite: 28000, base: 1910, quotaVariabile: 1190, divisore: 13000 },

    // Fascia 3: 28.001 - 50.000 euro
    // 1.910 x [(50.000 - reddito complessivo) / 22.000]
    fascia3: { limite: 50000, base: 1910, divisore: 22000 },

    // Maggiorazione fissa per reddito complessivo tra 25.001 e 35.000 euro.
    // Non e' soggetta a ragguaglio ai giorni di lavoro.
    maggiorazione: { da: 25000, a: 35000, importo: 65 },

    // I rapporti nelle formule vanno troncati alla quarta cifra decimale.
    decimaliTroncamento: 4,
  },

  // ---------------------------------------------------------------------------
  // 4. TRATTAMENTO INTEGRATIVO ("ex bonus Renzi")
  //    Fonte: D.L. 3/2020 art. 1, come modificato da L. 207/2024.
  //    Somma erogata in busta paga, non imponibile IRPEF.
  //    Richiede la VERIFICA DI CAPIENZA: l'imposta lorda calcolata sui redditi
  //    da lavoro dipendente deve essere superiore alla detrazione art. 13.
  // ---------------------------------------------------------------------------
  trattamentoIntegrativo: {
    fonte: 'D.L. 3/2020 art. 1 - L. 207/2024',
    limiteRedditoComplessivo: 15000,
    importo: 1200,
    richiedeCapienza: true,
  },

  // ---------------------------------------------------------------------------
  // 5. SOMMA INTEGRATIVA NON IMPONIBILE
  //    Fonte: L. 207/2024 art. 1 co. 4-5; Circolare AdE n. 4/E del 16/05/2025.
  //    Spetta se il REDDITO COMPLESSIVO non supera 20.000 euro; l'importo si
  //    ottiene applicando le percentuali al REDDITO DI LAVORO DIPENDENTE.
  //    Cumulabile con il trattamento integrativo.
  // ---------------------------------------------------------------------------
  sommaIntegrativa: {
    fonte: 'L. 207/2024 art. 1 co. 4-5 - Circ. AdE 4/E/2025',
    limiteRedditoComplessivo: 20000,
    // Scaglioni sul reddito di lavoro dipendente (percentuale su TUTTO il reddito
    // di lavoro dipendente, non per scaglioni marginali).
    fasce: [
      { fino: 8500,  percentuale: 0.071 },
      { fino: 15000, percentuale: 0.053 },
      { fino: 20000, percentuale: 0.048 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. ULTERIORE DETRAZIONE
  //    Fonte: L. 207/2024 art. 1 co. 6; Circolare AdE n. 4/E del 16/05/2025.
  //    Si calcola sul REDDITO COMPLESSIVO. E' una detrazione d'imposta,
  //    quindi soggetta a capienza sull'IRPEF lorda.
  // ---------------------------------------------------------------------------
  ulterioreDetrazione: {
    fonte: 'L. 207/2024 art. 1 co. 6 - Circ. AdE 4/E/2025',
    da: 20000,
    importoPieno: 1000,
    limitePieno: 32000,      // fino a 32.000 -> 1.000 euro pieni
    limiteAzzeramento: 40000, // 1.000 x [(40.000 - RC) / 8.000]
  },

  // ---------------------------------------------------------------------------
  // 7. ADDIZIONALE REGIONALE IRPEF - LOMBARDIA
  //    Aliquote progressive per scaglioni (aliquota marginale su ciascuna fascia),
  //    allineate agli scaglioni IRPEF ante-riforma.
  //    Fonte: Regione Lombardia - L.R. 27/2021, aliquote vigenti.
  // ---------------------------------------------------------------------------
  addizionaleRegionale: {
    fonte: 'Regione Lombardia - aliquote vigenti (scaglioni progressivi)',
    regione: 'Lombardia',
    scaglioni: [
      { fino: 15000, aliquota: 0.0123 },
      { fino: 28000, aliquota: 0.0158 },
      { fino: 50000, aliquota: 0.0172 },
      { fino: null,  aliquota: 0.0173 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 8. ADDIZIONALE COMUNALE IRPEF - MILANO
  //    Aliquota unica 0,80% con soglia di esenzione a 23.000 euro di imponibile.
  //    ATTENZIONE: superata la soglia, l'addizionale e' dovuta sull'INTERO
  //    imponibile (non e' una franchigia). Genera una discontinuita' nel netto.
  //    Fonte: Comune di Milano, delibera n. 46 del 28/09/2020, confermata per il 2026
  //    (registro MEF - Dipartimento delle Finanze).
  // ---------------------------------------------------------------------------
  addizionaleComunale: {
    fonte: 'Comune di Milano, del. n. 46 del 28/09/2020 - registro MEF',
    comune: 'Milano',
    aliquota: 0.008,
    sogliaEsenzione: 23000,
    // true = soglia (esenzione totale sotto, imponibile pieno sopra)
    // false = franchigia (si tassa solo l'eccedenza)
    esenzioneATotale: true,
  },

  // ---------------------------------------------------------------------------
  // 9. REGOLA TRASVERSALE SULLE ADDIZIONALI
  //    Le addizionali regionale e comunale non sono dovute se, per lo stesso
  //    anno, non risulta dovuta l'IRPEF (imposta netta pari a zero).
  //    Rilevante per le RAL basse, dove le detrazioni azzerano l'imposta.
  // ---------------------------------------------------------------------------
  addizionaliDovuteSoloSeImpostaNetta: true,
};

export default REGOLE_2026;
