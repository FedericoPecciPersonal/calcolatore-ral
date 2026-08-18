# Casi di prova — calcolo a mano

Questi calcoli sono stati fatti **a mano prima di scrivere il codice**, per avere valori di
riferimento indipendenti dall'implementazione. Sono poi diventati i test di regressione in
[`test/calcolo.test.js`](../test/calcolo.test.js).

Ipotesi comuni: impiegato a tempo indeterminato, anno intero, Milano, 13 mensilità,
nessun familiare a carico, nessun altro reddito.

---

## Caso A — RAL 18.000 € (somma integrativa attiva, addizionale comunale esente)

| Passaggio | Calcolo | Importo |
|---|---|---|
| RAL | | 18.000,00 |
| Contributi INPS | 18.000 × 9,19% | −1.654,20 |
| Imponibile fiscale | 18.000 − 1.654,20 | 16.345,80 |
| IRPEF lorda | 16.345,80 × 23% | 3.759,53 |
| Detrazione art. 13 (2ª fascia) | 1.910 + 1.190 × trunc₄[(28.000 − 16.345,80)/13.000] = 1.910 + 1.190 × 0,8964 | 2.976,72 |
| Ulteriore detrazione | RC ≤ 20.000 → non spetta | 0,00 |
| IRPEF netta | 3.759,53 − 2.976,72 | −782,82 |
| Addizionale regionale | 15.000 × 1,23% + 1.345,80 × 1,58% | −205,76 |
| Addizionale comunale | 16.345,80 ≤ 23.000 → esente | 0,00 |
| Somma integrativa | 16.345,80 × 4,8% | +784,60 |
| **Netto annuo** | | **16.141,82** |

Netto mensile su 13 mensilità: **1.241,68 €**

Nota: il trattamento integrativo non spetta perché il reddito complessivo supera 15.000 €.

---

## Caso B — RAL 35.000 € (caso di riferimento della pagina)

| Passaggio | Calcolo | Importo |
|---|---|---|
| RAL | | 35.000,00 |
| Contributi INPS | 35.000 × 9,19% | −3.216,50 |
| Imponibile fiscale | | 31.783,50 |
| IRPEF lorda | 28.000 × 23% + 3.783,50 × 33% | 7.688,56 |
| Detrazione art. 13 (3ª fascia) | 1.910 × trunc₄[(50.000 − 31.783,50)/22.000] = 1.910 × 0,8280 | 1.581,48 |
| Maggiorazione | 25.000 < RC ≤ 35.000 | 65,00 |
| Ulteriore detrazione | RC ≤ 32.000 → importo pieno | 1.000,00 |
| IRPEF netta | 7.688,56 − 2.646,48 | −5.042,08 |
| Addizionale regionale | 184,50 + 205,40 + 3.783,50 × 1,72% | −454,98 |
| Addizionale comunale | 31.783,50 × 0,80% | −254,27 |
| **Netto annuo** | | **26.032,18** |

Netto mensile su 13 mensilità: **2.002,48 €** · Aliquota effettiva totale: **25,62%**

---

## Caso C — RAL 40.000 € (secondo scaglione, décalage dell'ulteriore detrazione)

| Passaggio | Calcolo | Importo |
|---|---|---|
| RAL | | 40.000,00 |
| Contributi INPS | 40.000 × 9,19% | −3.676,00 |
| Imponibile fiscale | | 36.324,00 |
| IRPEF lorda | 28.000 × 23% + 8.324 × 33% | 9.186,92 |
| Detrazione art. 13 | 1.910 × trunc₄[(50.000 − 36.324)/22.000] = 1.910 × 0,6216 | 1.187,26 |
| Maggiorazione | RC > 35.000 → non spetta | 0,00 |
| Ulteriore detrazione | 1.000 × (40.000 − 36.324)/8.000 | 459,50 |
| IRPEF netta | 9.186,92 − 1.646,76 | −7.540,16 |
| Addizionale regionale | 184,50 + 205,40 + 8.324 × 1,72% | −533,07 |
| Addizionale comunale | 36.324 × 0,80% | −290,59 |
| **Netto annuo** | | **27.960,17** |

Netto mensile su 13 mensilità: **2.150,78 €** · Aliquota effettiva totale: **30,10%**

---

## Caso D — RAL 70.000 € (aliquota aggiuntiva 1%, nessuna detrazione)

| Passaggio | Calcolo | Importo |
|---|---|---|
| RAL | | 70.000,00 |
| Contributi INPS — quota IVS | 70.000 × 9,19% | −6.433,00 |
| Contributi INPS — aliquota aggiuntiva | (70.000 − 56.224) × 1% | −137,76 |
| Imponibile fiscale | | 63.429,24 |
| IRPEF lorda | 6.440 + 7.260 + 13.429,24 × 43% | 19.474,57 |
| Detrazioni | RC > 50.000 → nessuna detrazione | 0,00 |
| IRPEF netta | | −19.474,57 |
| Addizionale regionale | 184,50 + 205,40 + 378,40 + 13.429,24 × 1,73% | −1.000,63 |
| Addizionale comunale | 63.429,24 × 0,80% | −507,43 |
| **Netto annuo** | | **42.446,61** |

---

## Caso E — RAL 130.000 € (massimale contributivo)

| Passaggio | Calcolo | Importo |
|---|---|---|
| Imponibile previdenziale | min(130.000; 122.295) | 122.295,00 |
| Quota IVS | 122.295 × 9,19% | 11.238,91 |
| Aliquota aggiuntiva | (122.295 − 56.224) × 1% | 660,71 |
| Contributi totali | | 11.899,62 |
| Imponibile fiscale | 130.000 − 11.899,62 | 118.100,38 |

Oltre il massimale i contributi non crescono più: è la verifica che il tetto sia applicato.

---

## Caso F — Le sei discontinuità del sistema

Questa non era una previsione: è emersa costruendo il grafico dell'aliquota marginale.
Il primo test scritto assumeva **una** discontinuità, quella di Milano. Ne ha trovata
una seconda a RAL 38.500, e una scansione a passo di un euro fra 0 e 130.000 € ne ha
rivelate sei.

Ogni soglia della normativa che non sia un raccordo continuo produce un gradino nel netto:

| RAL | Reddito complessivo | Salto sul netto | Causa |
|---|---|---|---|
| 9.361 € | 8.500 € | **+943,23 €** | Scatta la capienza del trattamento integrativo (1.200 €). Alla stessa soglia cambia la percentuale della somma integrativa (7,1% → 5,3%) e le addizionali diventano dovute perché l'IRPEF netta supera zero: tre effetti sovrapposti |
| 16.519 € | 15.000 € | **−129,39 €** | Cessa il trattamento integrativo. La perdita di 1.200 € è quasi compensata dal salto della detrazione art. 13, che passa dai 1.955 € fissi ai ~3.100 € della formula di seconda fascia |
| 22.025 € | 20.000 € | **+40,69 €** | Cessa la somma integrativa (~960 €) e inizia l'ulteriore detrazione (1.000 €). I due strumenti sono tarati per compensarsi quasi esattamente |
| 25.328 € | 23.000 € di imponibile | **−183,44 €** | Soglia dell'addizionale comunale di Milano: non è una franchigia, quindi lo 0,80% si applica di colpo sull'intero imponibile |
| 27.531 € | 25.000 € | **+65,56 €** | Inizia la maggiorazione fissa di 65 € della detrazione art. 13 |
| 38.543 € | 35.000 € | **−64,72 €** | Cessa la maggiorazione di 65 €: è un gradino, non una discesa graduale |

**Tre di queste fanno scendere il netto all'aumentare del lordo.** Non sono errori del
prototipo: sono la norma. Attorno a 25.328 € di RAL, tre euro di lordo in più costano
circa 184 € di netto.

Il test `il modello ha esattamente le sei discontinuità note` fissa l'insieme: posizione e
verso di ognuna. Se una modifica futura ne aggiunge, sposta o elimina una, il test la
intercetta invece di lasciarla passare inosservata.

### Conseguenza sul calcolo inverso

I gradini verso l'alto creano bande di netto che **nessuna RAL produce**. Quello a 8.500 €
di reddito complessivo ne rende irraggiungibili 943 € consecutivi. Il calcolo inverso lo
rileva e lo dichiara, invece di restituire silenziosamente un valore approssimato.

I gradini verso il basso creano il problema opposto: lo stesso netto è prodotto da **due**
RAL diverse. Dopo la soglia di Milano il netto torna al livello precedente solo con oltre
200 € di RAL in più, perché deve recuperare i 184 € di addizionale all'aliquota marginale.
Il calcolo inverso restituisce sempre la RAL minima, cioè la meno costosa per il datore —
ed è per questo che la ricerca procede con una scansione a passo di un euro e non con una
bisezione: la finestra in cui il netto tocca il massimo locale prima del salto è larga
circa un euro, e un passo più grosso la scavalcherebbe.

---

## Validazione esterna

Confronto con calcolatori pubblici di terze parti, a parità di ipotesi (Milano, 13 mensilità):

| RAL | Questo prototipo | Riferimenti esterni | Scostamento |
|---|---|---|---|
| 35.000 € | 2.002,48 €/mese | ~2.003 €/mese | < 1 € |
| 40.000 € | 27.960,17 €/anno | 27.960 € – 27.965 €/anno | < 5 € |

Lo scostamento residuo è atteso e attribuibile a: arrotondamenti mensili in busta paga,
contribuzioni previste da singoli CCNL (fondi di assistenza sanitaria e previdenza
complementare) e differenze nel numero di giorni utili considerati. Il prototipo non
modella nessuno di questi elementi.
