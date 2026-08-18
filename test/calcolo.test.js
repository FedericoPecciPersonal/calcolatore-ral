/**
 * Test del motore di calcolo.
 * Esecuzione:  node --test test/
 * Nessuna dipendenza esterna: si usa il test runner integrato di Node (>= 18).
 *
 * I valori di riferimento nei test "scenario" sono stati calcolati a mano,
 * passaggio per passaggio, prima di scrivere il codice. Vedi docs/CASI-PROVA.md.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { REGOLE_2026 as R } from '../src/regole-2026.js';
import {
  tronca,
  impostaProgressiva,
  contributiInps,
  detrazioneLavoroDipendente,
  ulterioreDetrazione,
  sommaIntegrativa,
  addizionaleComunale,
  calcolaNetto,
  ralPerNettoAnnuo,
  discontinuita,
} from '../src/calcolo.js';

const vicino = (a, b, tolleranza = 0.01) =>
  assert.ok(
    Math.abs(a - b) <= tolleranza,
    `atteso ~${b}, ottenuto ${a} (delta ${Math.abs(a - b).toFixed(4)})`,
  );

// -----------------------------------------------------------------------------
test('tronca non arrotonda, taglia', () => {
  assert.equal(tronca(0.62163636, 4), 0.6216);
  assert.equal(tronca(0.89999999, 4), 0.8999);
  assert.equal(tronca(1, 4), 1);
});

// -----------------------------------------------------------------------------
test('imposta progressiva: solo primo scaglione', () => {
  const r = impostaProgressiva(10000, R.irpef.scaglioni);
  vicino(r.totale, 2300);
  assert.equal(r.dettaglio.length, 1);
});

test('imposta progressiva: al confine esatto dello scaglione', () => {
  const r = impostaProgressiva(28000, R.irpef.scaglioni);
  vicino(r.totale, 6440);
  assert.equal(r.dettaglio.length, 1, 'a 28.000 il secondo scaglione non deve attivarsi');
});

test('imposta progressiva: attraversa tutti gli scaglioni', () => {
  const r = impostaProgressiva(60000, R.irpef.scaglioni);
  // 28.000 x 23% + 22.000 x 33% + 10.000 x 43%
  vicino(r.totale, 6440 + 7260 + 4300);
  assert.equal(r.dettaglio.length, 3);
  // la somma delle basi degli scaglioni deve ricostruire l'imponibile
  vicino(r.dettaglio.reduce((s, d) => s + d.base, 0), 60000);
});

test('imposta progressiva: base zero o negativa', () => {
  vicino(impostaProgressiva(0, R.irpef.scaglioni).totale, 0);
  vicino(impostaProgressiva(-100, R.irpef.scaglioni).totale, 0);
});

// -----------------------------------------------------------------------------
test('contributi INPS: aliquota base senza eccedenze', () => {
  const c = contributiInps(40000, R);
  vicino(c.quotaIvs, 3676);
  vicino(c.quotaAggiuntiva, 0);
  vicino(c.totale, 3676);
  assert.equal(c.massimaleApplicato, false);
});

test('contributi INPS: aliquota aggiuntiva 1% oltre la prima fascia', () => {
  const c = contributiInps(70000, R);
  vicino(c.eccedenzaPrimaFascia, 70000 - 56224);
  vicino(c.quotaAggiuntiva, 137.76);
  vicino(c.totale, 6433 + 137.76);
});

test('contributi INPS: il massimale limita la base contributiva', () => {
  const c = contributiInps(200000, R);
  assert.equal(c.imponibilePrevidenziale, 122295);
  assert.equal(c.massimaleApplicato, true);
  // oltre il massimale i contributi non crescono piu'
  vicino(c.totale, contributiInps(122295, R).totale);
});

// -----------------------------------------------------------------------------
test('detrazione lavoro dipendente: fascia fissa', () => {
  vicino(detrazioneLavoroDipendente(12000, R).totale, 1955);
  vicino(detrazioneLavoroDipendente(15000, R).totale, 1955);
});

test('detrazione lavoro dipendente: seconda fascia con troncamento', () => {
  // 1.910 + 1.190 x trunc4[(28.000 - 16.345,80)/13.000]
  vicino(detrazioneLavoroDipendente(16345.8, R).base, 1910 + 1190 * 0.8964);
});

test('detrazione lavoro dipendente: terza fascia e azzeramento a 50.000', () => {
  vicino(detrazioneLavoroDipendente(36324, R).base, 1910 * 0.6216);
  vicino(detrazioneLavoroDipendente(50000, R).totale, 0);
  vicino(detrazioneLavoroDipendente(50001, R).totale, 0);
});

test('detrazione lavoro dipendente: maggiorazione di 65 euro solo tra 25k e 35k', () => {
  assert.equal(detrazioneLavoroDipendente(25000, R).maggiorazione, 0);
  assert.equal(detrazioneLavoroDipendente(25001, R).maggiorazione, 65);
  assert.equal(detrazioneLavoroDipendente(35000, R).maggiorazione, 65);
  assert.equal(detrazioneLavoroDipendente(35001, R).maggiorazione, 0);
});

test('detrazione lavoro dipendente: il minimo garantito non deve inquinare la terza fascia', () => {
  // vicino a 50.000 la detrazione deve poter scendere sotto 690 euro
  assert.ok(detrazioneLavoroDipendente(49500, R).base < 690);
});

// -----------------------------------------------------------------------------
test('ulteriore detrazione: soglie e decrescenza', () => {
  assert.equal(ulterioreDetrazione(20000, R), 0);
  vicino(ulterioreDetrazione(20001, R), 1000);
  vicino(ulterioreDetrazione(32000, R), 1000);
  vicino(ulterioreDetrazione(36000, R), 500);
  vicino(ulterioreDetrazione(40000, R), 0);
  assert.equal(ulterioreDetrazione(40001, R), 0);
});

// -----------------------------------------------------------------------------
test('somma integrativa: percentuale corretta per fascia', () => {
  vicino(sommaIntegrativa(8000, 8000, R).importo, 8000 * 0.071);
  vicino(sommaIntegrativa(12000, 12000, R).importo, 12000 * 0.053);
  vicino(sommaIntegrativa(16345.8, 16345.8, R).importo, 16345.8 * 0.048);
  assert.equal(sommaIntegrativa(20001, 20001, R).importo, 0);
});

// -----------------------------------------------------------------------------
test('addizionale comunale Milano: soglia, non franchigia', () => {
  assert.equal(addizionaleComunale(23000, R).importo, 0);
  assert.equal(addizionaleComunale(23000, R).esente, true);
  // appena sopra soglia si tassa TUTTO l'imponibile
  vicino(addizionaleComunale(23001, R).importo, 23001 * 0.008);
});

// -----------------------------------------------------------------------------
// Scenari completi - valori calcolati a mano (docs/CASI-PROVA.md)
// -----------------------------------------------------------------------------

test('scenario RAL 18.000 (somma integrativa attiva, comunale esente)', () => {
  const r = calcolaNetto(18000, R, { mensilita: 13 });
  vicino(r.contributi.totale, 1654.2);
  vicino(r.imponibileFiscale, 16345.8);
  vicino(r.irpefLorda, 3759.534);
  vicino(r.irpefNetta, 782.818);
  vicino(r.integrazioni.sommaIntegrativa.importo, 784.5984);
  assert.equal(r.addizionali.comunale.importo, 0);
  vicino(r.addizionali.regionale.importo, 205.76364);
  vicino(r.nettoAnnuo, 16141.81676);
});

test('scenario RAL 40.000 (caso centrale)', () => {
  const r = calcolaNetto(40000, R, { mensilita: 13 });
  vicino(r.contributi.totale, 3676);
  vicino(r.imponibileFiscale, 36324);
  vicino(r.irpefLorda, 9186.92);
  vicino(r.detrazioni.totale, 1187.256 + 459.5);
  vicino(r.irpefNetta, 7540.164);
  vicino(r.addizionali.regionale.importo, 533.0728);
  vicino(r.addizionali.comunale.importo, 290.592);
  vicino(r.totaleTrattenute, 12039.8288);
  vicino(r.nettoAnnuo, 27960.1712);
  vicino(r.nettoMensile, 27960.1712 / 13);
  vicino(r.aliquotaEffettivaTotale, 0.3009957, 0.0001);
});

test('scenario RAL 70.000 (1% aggiuntivo, nessuna detrazione)', () => {
  const r = calcolaNetto(70000, R, { mensilita: 13 });
  vicino(r.contributi.totale, 6570.76);
  vicino(r.imponibileFiscale, 63429.24);
  vicino(r.detrazioni.totale, 0);
  vicino(r.irpefNetta, 19474.5732);
  vicino(r.addizionali.regionale.importo, 1000.625852);
  vicino(r.addizionali.comunale.importo, 507.43392);
  vicino(r.nettoAnnuo, 42446.607028);
});

test('scenario RAL 130.000 (massimale contributivo)', () => {
  const r = calcolaNetto(130000, R, { mensilita: 13 });
  assert.equal(r.contributi.massimaleApplicato, true);
  vicino(r.contributi.totale, 11899.6205);
  vicino(r.imponibileFiscale, 118100.3795);
});

// -----------------------------------------------------------------------------
// Proprieta' strutturali
// -----------------------------------------------------------------------------

test('coerenza: RAL = netto + trattenute - integrazioni', () => {
  for (const ral of [0, 9000, 15000, 22000, 28000, 45000, 60000, 90000, 150000]) {
    const r = calcolaNetto(ral, R);
    vicino(r.nettoAnnuo + r.totaleTrattenute - r.integrazioni.totale, ral);
  }
});

test('il netto non supera mai il lordo e non e\' negativo', () => {
  for (let ral = 0; ral <= 200000; ral += 500) {
    const r = calcolaNetto(ral, R);
    assert.ok(r.nettoAnnuo >= 0, `netto negativo a RAL ${ral}`);
    assert.ok(r.nettoAnnuo <= ral + r.integrazioni.totale + 0.01, `netto > lordo a RAL ${ral}`);
  }
});

test('nessuna imposta e nessuna addizionale sotto la no-tax area', () => {
  const r = calcolaNetto(8000, R);
  assert.equal(r.irpefNetta, 0);
  assert.equal(r.addizionali.totale, 0, 'le addizionali non sono dovute se l\'IRPEF netta e\' zero');
  assert.ok(r.detrazioni.nonGodute > 0, 'parte delle detrazioni risulta incapiente');
});

test('la soglia comunale di Milano genera una discontinuita\' nota nel netto', () => {
  // Imponibile 23.000 -> RAL ~ 23.000 / (1 - 0,0919)
  const sotto = calcolaNetto(25327, R);
  const sopra = calcolaNetto(25330, R);
  assert.ok(sotto.imponibileFiscale <= 23000);
  assert.ok(sopra.imponibileFiscale > 23000);
  // 3 euro di RAL in piu' fanno PERDERE netto: e' un effetto reale della norma
  assert.ok(
    sopra.nettoAnnuo < sotto.nettoAnnuo,
    'attesa perdita di netto superata la soglia di esenzione comunale',
  );
  vicino(sopra.addizionali.comunale.importo, sopra.imponibileFiscale * 0.008);
});

test('input non validi vengono rifiutati', () => {
  assert.throws(() => calcolaNetto(-1, R));
  assert.throws(() => calcolaNetto(NaN, R));
  assert.throws(() => calcolaNetto('40000', R));
});

// -----------------------------------------------------------------------------
// Calcolo inverso: dal netto alla RAL
// -----------------------------------------------------------------------------

test('calcolo inverso: andata e ritorno su RAL lontane dalle discontinuita\'', () => {
  for (const ral of [20000, 30000, 45000, 60000, 90000]) {
    const nettoAtteso = calcolaNetto(ral, R).nettoAnnuo;
    const inverso = ralPerNettoAnnuo(nettoAtteso, R);
    assert.ok(inverso.trovata);
    vicino(inverso.ral, ral, 1);
    vicino(inverso.nettoOttenuto, nettoAtteso, 1);
  }
});

test('calcolo inverso: obiettivo zero e obiettivo irraggiungibile', () => {
  assert.equal(ralPerNettoAnnuo(0, R).ral, 0);
  const impossibile = ralPerNettoAnnuo(900000, R, { ralMassima: 200000 });
  assert.equal(impossibile.trovata, false);
  assert.equal(impossibile.ral, null);
});

test('calcolo inverso: rifiuta obiettivi non validi', () => {
  assert.throws(() => ralPerNettoAnnuo(-1, R));
  assert.throws(() => ralPerNettoAnnuo(NaN, R));
});

test('calcolo inverso: restituisce la RAL MINIMA quando due RAL danno lo stesso netto', () => {
  // Sotto la soglia comunale il netto e' piu' alto che appena sopra: il netto
  // raggiunto a 25.327 di RAL viene raggiunto una seconda volta solo molto
  // dopo il salto. L'inverso deve restituire la soluzione piu' economica.
  const nettoSottoSoglia = calcolaNetto(25327, R).nettoAnnuo;
  const inverso = ralPerNettoAnnuo(nettoSottoSoglia, R);
  assert.ok(inverso.ral <= 25327 + 1, `attesa la RAL bassa, ottenuta ${inverso.ral}`);

  // Verifica che esista davvero una seconda soluzione, piu' alta: altrimenti il
  // test sopra non starebbe distinguendo fra le due. Dopo il salto il netto
  // torna al livello pre-soglia solo con qualche centinaio di euro di RAL in
  // piu', perche' deve recuperare i 184 euro di addizionale comunale al ritmo
  // dell'aliquota marginale.
  assert.ok(calcolaNetto(25330, R).nettoAnnuo < nettoSottoSoglia);

  let ralDiRecupero = 25328;
  while (calcolaNetto(ralDiRecupero, R).nettoAnnuo < nettoSottoSoglia) ralDiRecupero++;

  assert.ok(
    ralDiRecupero - 25327 > 200,
    `il recupero dovrebbe costare centinaia di euro di RAL, ne costa ${ralDiRecupero - 25327}`,
  );
  assert.ok(
    inverso.ral < ralDiRecupero,
    'l\'inverso deve preferire la soluzione economica a quella oltre il salto',
  );
});

test('calcolo inverso: il netto obiettivo e\' sempre raggiunto o superato, mai mancato', () => {
  for (const obiettivo of [8000, 15000, 18500, 22000, 26000, 31000, 40000, 55000]) {
    const inverso = ralPerNettoAnnuo(obiettivo, R);
    assert.ok(inverso.trovata, `nessuna RAL per ${obiettivo}`);
    assert.ok(
      inverso.nettoOttenuto >= obiettivo - 0.01,
      `obiettivo ${obiettivo} mancato: ottenuto ${inverso.nettoOttenuto}`,
    );
  }
});

// -----------------------------------------------------------------------------
// Curva e aliquota marginale
// -----------------------------------------------------------------------------


test('il modello ha esattamente le sei discontinuita\' note', () => {
  // Ogni soglia della normativa che non sia un raccordo continuo produce un
  // salto nel netto. Sono sei fra 0 e 130.000 euro di RAL, e TRE fanno scendere
  // il netto all'aumentare del lordo. Il test fissa l'insieme: se una modifica
  // futura ne aggiunge, sposta o elimina una, il test lo segnala invece di
  // lasciarla passare inosservata. Vedi docs/CASI-PROVA.md.
  const attese = [
    { ral: 9361,  verso: '+', causa: 'capienza del trattamento integrativo (RC 8.500)' },
    { ral: 16519, verso: '-', causa: 'cessa il trattamento integrativo (RC 15.000)' },
    { ral: 22025, verso: '+', causa: 'somma integrativa -> ulteriore detrazione (RC 20.000)' },
    { ral: 25328, verso: '-', causa: 'soglia addizionale comunale Milano (imponibile 23.000)' },
    { ral: 27531, verso: '+', causa: 'inizia la maggiorazione di 65 euro (RC 25.000)' },
    { ral: 38543, verso: '-', causa: 'cessa la maggiorazione di 65 euro (RC 35.000)' },
  ];

  const trovate = discontinuita(R, { da: 0, a: 130000 }).map((d) => ({
    ral: d.ral,
    verso: d.riduceIlNetto ? '-' : '+',
    salto: d.salto,
  }));

  assert.equal(
    trovate.length,
    attese.length,
    `discontinuita' trovate: ${JSON.stringify(trovate.map((t) => [t.ral, t.salto.toFixed(2)]))}`,
  );

  attese.forEach((atteso, i) => {
    assert.equal(trovate[i].ral, atteso.ral, `posizione inattesa — ${atteso.causa}`);
    assert.equal(trovate[i].verso, atteso.verso, `verso inatteso — ${atteso.causa}`);
  });

  const cheRiduconoIlNetto = trovate.filter((t) => t.verso === '-');
  assert.equal(cheRiduconoIlNetto.length, 3, 'tre soglie fanno scendere il netto');
});


test('calcolo inverso: segnala i netti che nessuna RAL puo\' produrre', () => {
  // Il gradino verso l'alto a 8.500 euro di reddito complessivo (dove scatta la
  // capienza del trattamento integrativo) crea una banda di netti irraggiungibile.
  const sotto = calcolaNetto(9360, R).nettoAnnuo;
  const sopra = calcolaNetto(9361, R).nettoAnnuo;
  assert.ok(sopra - sotto > 900, 'il gradino atteso vale circa 943 euro');

  const dentroLaBanda = (sotto + sopra) / 2;
  const esito = ralPerNettoAnnuo(dentroLaBanda, R);

  assert.ok(esito.trovata);
  assert.equal(esito.oltreObiettivo, true, 'va segnalato che l\'obiettivo esatto non esiste');
  assert.ok(esito.nettoOttenuto > dentroLaBanda, 'la RAL trovata deve superare l\'obiettivo');

  // Fuori dalle bande il flag non deve accendersi.
  const normale = ralPerNettoAnnuo(calcolaNetto(45000, R).nettoAnnuo, R);
  assert.equal(normale.oltreObiettivo, false);
});
