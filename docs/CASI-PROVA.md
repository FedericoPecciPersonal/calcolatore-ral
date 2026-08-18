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

## Caso F — La discontinuità della soglia comunale di Milano

L'esenzione di Milano è una **soglia**, non una franchigia. L'imponibile raggiunge 23.000 €
con una RAL di circa 23.000 / (1 − 0,0919) ≈ 25.327 €.

| RAL | Imponibile fiscale | Addizionale comunale | Netto annuo |
|---|---|---|---|
| 25.327 € | 22.999,45 € | 0,00 € | maggiore |
| 25.330 € | 23.001,17 € | 184,01 € | **minore** |

Tre euro di RAL in più fanno **perdere** circa 184 € di netto. Non è un bug del
prototipo: è un effetto reale della norma, e il test
`la soglia comunale di Milano genera una discontinuità nota nel netto` lo verifica
esplicitamente perché una modifica futura al codice non lo nasconda per errore.

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
