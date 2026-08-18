# Fonti normative e parametri — anno d'imposta 2026

Ogni valore usato dal calcolatore è elencato qui con la propria fonte. I valori vivono
in un unico file, [`src/regole-2026.js`](../src/regole-2026.js), e non sono duplicati nel
motore di calcolo.

## 1. Contributi previdenziali INPS

| Parametro | Valore | Riferimento |
|---|---|---|
| Aliquota IVS a carico del lavoratore (FPLD) | 9,19% | L. 335/1995 |
| Aliquota IVS a carico del datore (FPLD) | 23,81% | L. 335/1995 |
| Aliquota complessiva FPLD | 33,00% | L. 335/1995 |
| Aliquota aggiuntiva a carico del lavoratore oltre la prima fascia | 1,00% | art. 3-ter D.L. 384/1992 |
| Prima fascia di retribuzione pensionabile 2026 | 56.224 € | INPS circolare n. 6 del 30/01/2026 |
| Massimale annuo base contributiva e pensionabile 2026 | 122.295 € | INPS circolare n. 6 del 30/01/2026 |
| Divisore per l'accantonamento TFR | 13,5 | art. 2120 c.c. |

- INPS, circolare n. 6 del 30/01/2026 (minimali e massimali):
  <https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.01.circolare-numero-6-del-30-01-2026_15151.html>
- Riepilogo dei nuovi importi 2026:
  <https://www.fiscoetasse.com/normativa-prassi/13549-retribuzioni-minime-e-massimali-contributivi-2026-i-nuovi-importi.html>
- Ripartizione 9,19% / 23,81%:
  <https://ntpluslavoro.ilsole24ore.com/art/inps-aliquote-contributive-2026-i-lavoratori-dipendenti-AI8FP90>

## 2. IRPEF — scaglioni e aliquote 2026

| Scaglione di reddito | Aliquota |
|---|---|
| fino a 28.000 € | 23% |
| oltre 28.000 € fino a 50.000 € | **33%** |
| oltre 50.000 € | 43% |

Il secondo scaglione è stato ridotto dal 35% al 33% dalla **Legge di Bilancio 2026
(L. 199/2025, art. 1 co. 3)**, con effetto dal 1° gennaio 2026. È la novità più
rilevante dell'anno d'imposta modellato.

- <https://fiscomania.com/aliquote-irpef/>
- <https://www.ipsoa.it/guide/irpef-calcolo>

## 3. Detrazione per redditi da lavoro dipendente — art. 13 co. 1 TUIR

| Reddito complessivo | Detrazione |
|---|---|
| fino a 15.000 € | 1.955 € (minimo garantito 690 € a tempo indeterminato, ragguagliato ai giorni) |
| oltre 15.000 € fino a 28.000 € | 1.910 + 1.190 × [(28.000 − RC) / 13.000] |
| oltre 28.000 € fino a 50.000 € | 1.910 × [(50.000 − RC) / 22.000] |
| oltre 50.000 € | nessuna detrazione |
| maggiorazione se 25.000 € < RC ≤ 35.000 € | + 65 € |

I rapporti nelle formule vanno **troncati** (non arrotondati) alla quarta cifra decimale.

- Base normativa: D.Lgs. 216/2023, confermato dalla L. 207/2024
- <https://fiscomania.com/detrazioni-per-redditi-da-lavoro-dipendente/>
- <https://www.informazionefiscale.it/detrazioni-lavoro-dipendente-importo-calcolo>

## 4. Trattamento integrativo

| Parametro | Valore |
|---|---|
| Limite di reddito complessivo | 15.000 € |
| Importo annuo | 1.200 € |
| Condizione | imposta lorda sui redditi di lavoro dipendente **superiore** alla detrazione art. 13 (verifica di capienza) |

Riferimento: art. 1 D.L. 3/2020, come modificato dalla L. 207/2024.

- <https://www.geps.it/la-nuova-legge-di-bilancio-2026-l-199-2025-trattamento-integrativo-e-detrazioni-irpef-per-lavoro-dipendente-disciplina-applicabile-nel-2026-11566/>

## 5. Somma integrativa non imponibile

Spetta se il **reddito complessivo** non supera 20.000 €. L'importo si ottiene applicando
al **reddito di lavoro dipendente** le percentuali seguenti (sull'intero importo, non per
scaglioni marginali):

| Reddito di lavoro dipendente | Percentuale |
|---|---|
| fino a 8.500 € | 7,1% |
| oltre 8.500 € fino a 15.000 € | 5,3% |
| oltre 15.000 € fino a 20.000 € | 4,8% |

Riferimento: L. 207/2024 art. 1 co. 4-5; Circolare Agenzia delle Entrate n. 4/E del 16/05/2025.

- <https://www.lizierbassobottari.it/2025/02/25/legge-n-207-2024-art-1-somma-integrativa-e-ulteriore-detrazione/>
- <https://www.edotto.com/articolo/circolare-42025-entrate-su-somma-integrativa-e-ulteriore-detrazione-per-i-lavoratori-dipendenti>

## 6. Ulteriore detrazione

Calcolata sul **reddito complessivo**:

| Reddito complessivo | Detrazione |
|---|---|
| oltre 20.000 € fino a 32.000 € | 1.000 € |
| oltre 32.000 € fino a 40.000 € | 1.000 × [(40.000 − RC) / 8.000] |
| oltre 40.000 € | nessuna |

Riferimento: L. 207/2024 art. 1 co. 6; Circolare AdE n. 4/E del 16/05/2025.

## 7. Addizionale regionale IRPEF — Lombardia

Aliquote **progressive per scaglioni** (aliquota marginale su ciascuna fascia):

| Scaglione | Aliquota |
|---|---|
| fino a 15.000 € | 1,23% |
| oltre 15.000 € fino a 28.000 € | 1,58% |
| oltre 28.000 € fino a 50.000 € | 1,72% |
| oltre 50.000 € | 1,73% |

- Regione Lombardia, pagina ufficiale sull'addizionale regionale:
  <https://www.regione.lombardia.it/bollo-auto-e-tributi-regionali/red-addizionale-regionale-irpef>

## 8. Addizionale comunale IRPEF — Milano

| Parametro | Valore |
|---|---|
| Aliquota | 0,80% |
| Soglia di esenzione | 23.000 € di imponibile |
| Meccanismo | **soglia**, non franchigia: superati i 23.000 €, l'aliquota si applica sull'intero imponibile |

Delibera comunale n. 46 del 28/09/2020, confermata anche per il 2026.

- Registro ufficiale MEF — Dipartimento delle Finanze:
  <https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/risultato.htm?anno=9999&lista=1&pagina=lombardia.htm&cm=&pr=MI&cc=F205&r=1>
- Comune di Milano: <https://www.comune.milano.it/argomenti/tributi/addizionale-comunale-irpef>

## 9. Regola trasversale sulle addizionali

Le addizionali regionale e comunale **non sono dovute** se per lo stesso anno non risulta
dovuta l'IRPEF (imposta netta pari a zero). Il calcolatore applica questa regola, che è
determinante per le RAL basse, dove le detrazioni azzerano l'imposta.

## Gerarchia delle fonti usata

1. Testi normativi e circolari (INPS circ. 6/2026, L. 199/2025, L. 207/2024, Circ. AdE 4/E/2025).
2. Registri ufficiali (registro MEF delle addizionali comunali; pagina Regione Lombardia).
3. Pubblicistica fiscale specializzata, usata per la conferma incrociata dei valori e per le
   formule operative (Il Sole 24 Ore, Fiscomania, Ipsoa, FiscoeTasse, circolari di studio).

Dove una fonte di livello 3 era l'unica immediatamente disponibile, il valore è stato
confermato da almeno due fonti indipendenti fra loro.
