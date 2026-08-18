# Dal lordo al netto — calcolatore RAL → netto

[![test](https://github.com/FedericoPecciPersonal/calcolatore-ral/actions/workflows/test.yml/badge.svg)](https://github.com/FedericoPecciPersonal/calcolatore-ral/actions/workflows/test.yml)

Prototipo di calcolatore della retribuzione **netta annuale e mensile** a partire dalla
**RAL**, che espone tutte le voci trattenute lungo il percorso.

**Anno d'imposta 2026.** Caso modellato: impiegato a tempo indeterminato, residente a
Milano, senza agevolazioni né familiari a carico.

> 🔗 **Demo live:** <https://federicopeccipersonal.github.io/calcolatore-ral/>

---

## Cosa mostra

- **Netto annuo** e **netto mensile** (su 12, 13 o 14 mensilità).
- Il **calcolo inverso**: dato un netto mensile obiettivo, la RAL più bassa che lo produce.
- La **catena completa delle trattenute**, voce per voce e nell'ordine in cui si applicano,
  con il progressivo che scende dalla RAL al netto.
- Il **dettaglio ispezionabile** di ogni blocco: contributi INPS, IRPEF per scaglione,
  detrazioni, addizionali locali — ciascuno con la formula usata e la fonte normativa.
- Per ogni blocco, una **spiegazione in linguaggio comune** di cosa sia quella trattenuta e
  a cosa serva: la pagina è pensata perché un lavoratore capisca la propria busta paga,
  non solo perché i conti tornino.
- Il **costo per l'azienda**, per dare la misura del cuneo complessivo.

Ogni scenario è condivisibile: lo stato vive nella querystring
(`?ral=35000&mensilita=13` oppure `?netto=2000&mensilita=13`).

## Come provarlo

**Online:** apri il link della demo qui sopra.

**In locale:** il progetto usa moduli ES, quindi serve un server HTTP (non funziona
aprendo `index.html` da `file://`).

```bash
python3 -m http.server 8765
```

Poi apri <http://127.0.0.1:8765>.

**Test:**

```bash
node --test 'test/*.test.js'
```

25 test, nessuna dipendenza esterna: si usa il test runner integrato di Node.

---

## La catena di calcolo

| # | Voce | Base di calcolo |
|---|---|---|
| 1 | **RAL** | input |
| 2 | − Contributi INPS a carico del dipendente | 9,19% sull'imponibile previdenziale, + 1% sulla quota oltre la prima fascia (56.224 €), con tetto al massimale (122.295 €) |
| 3 | **= Imponibile fiscale** | RAL − contributi |
| 4 | − IRPEF lorda | scaglioni progressivi 23% / **33%** / 43% |
| 5 | + Detrazione da lavoro dipendente | art. 13 TUIR, decrescente fino ad azzerarsi a 50.000 € |
| 6 | + Ulteriore detrazione | 1.000 € tra 20.000 e 32.000 €, poi in décalage fino a 40.000 € |
| 7 | **= IRPEF netta** | mai negativa: l'eccedenza di detrazioni è incapiente e si perde |
| 8 | − Addizionale regionale Lombardia | scaglioni progressivi 1,23% → 1,73% |
| 9 | − Addizionale comunale Milano | 0,80% con **soglia** di esenzione a 23.000 € |
| 10 | + Trattamento integrativo / somma integrativa | somme non imponibili, solo per i redditi bassi |
| 11 | **= Netto annuo** | |
| 12 | **Netto mensile** | netto annuo ÷ mensilità |

Tutti i parametri e le fonti sono in **[docs/FONTI.md](docs/FONTI.md)**.
I calcoli di riferimento fatti a mano sono in **[docs/CASI-PROVA.md](docs/CASI-PROVA.md)**.

---

## Struttura del progetto

```
src/regole-2026.js    parametri normativi: ogni numero con la sua fonte
src/calcolo.js        motore di calcolo — funzioni pure, nessun accesso al DOM
src/ui.js             unico file che tocca il DOM
index.html            pagina
style.css             stili (tema chiaro e scuro, nessun font remoto)
test/calcolo.test.js  32 test con il runner integrato di Node
.github/workflows/    CI: i test girano a ogni push
docs/                 fonti normative e casi di prova calcolati a mano
```

Tre scelte architetturali, tutte a servizio dello stesso obiettivo — poter rispondere alla
domanda "da dove viene questo numero?":

1. **Nessuna costante nel motore.** Ogni valore normativo sta in `regole-2026.js` con la
   propria fonte. Cambiare anno d'imposta significa scrivere un nuovo file di regole, non
   andare a caccia di numeri sparsi nel codice.
2. **Il motore non conosce il DOM.** `calcolo.js` è importato identico dal browser e dai
   test sotto Node. Non c'è una seconda implementazione da tenere allineata.
3. **Il motore restituisce tutti i passaggi intermedi, non solo il netto.** La UI non
   ricalcola niente: si limita a formattare. Il risultato completo è ispezionabile anche
   dalla console del browser, in `window.ultimoRisultato`.
4. **Due registri linguistici, non uno.** La cascata e le intestazioni parlano in italiano
   corrente — "Contributi per la pensione", "Su questo importo si pagano le tasse", "Quanto
   resta" — perché sono ciò che si legge per primo, e spesso l'unica cosa che si legge. Il
   lessico tecnico, le formule e i riferimenti normativi restano nelle card di dettaglio, a
   un click di distanza: chi vuole verificare li trova, chi vuole solo capire non ci
   inciampa. Le due versioni descrivono gli stessi numeri, prodotti dallo stesso motore.

5. **Mobile: le tabelle si impilano, non scorrono.** Sotto i 620px ogni riga diventa un
   blocco e ogni valore porta davanti l'etichetta della sua colonna, presa da un attributo
   `data-etichetta` emesso dal generatore di tabelle. Una tabella a quattro colonne con
   importi in valuta chiede circa 400px: su un telefono da 390 lo scorrimento orizzontale
   dentro una card è un'affordance che nessuno trova. Tutti i bersagli tattili sono almeno
   44px.
6. **Tema chiaro/scuro con tre stati**, non due: *Auto* segue la preferenza di sistema,
   *Chiaro* e *Scuro* la sovrascrivono e restano memorizzati. Uno script inline nel `<head>`
   applica la scelta prima del primo paint, così non si vede il lampo del tema sbagliato al
   caricamento.

Nessuna dipendenza, nessun build step, nessun framework: il repo è anche il sito.

---

## Semplificazioni e scelte

Ognuna è una decisione consapevole, non una lacuna.

| Semplificazione | Perché |
|---|---|
| **Reddito complessivo = imponibile fiscale** | Con un unico reddito da lavoro dipendente e nessun onere deducibile le due grandezze coincidono. È l'ipotesi che rende il modello a un solo input coerente. |
| **Aliquota contributiva 9,19% + 1%** | È la ripartizione FPLD del settore privato. Alcuni CCNL prevedono contribuzioni minori aggiuntive (fondi sanitari, previdenza complementare) che variano per contratto: modellarle richiederebbe il CCNL come input. |
| **Calcolo su base annua, non mensile** | In busta paga l'IRPEF si applica per ratei con conguaglio a fine anno, e l'aliquota aggiuntiva dell'1% segue il criterio mensile. Su un anno intero e retribuzione costante il risultato annuale coincide; le differenze emergono solo con retribuzione variabile. |
| **Addizionali imputate all'anno di competenza** | Nella realtà si versano in acconto e saldo nell'anno successivo. Per una proiezione annuale trattarle come competenza dell'anno è la lettura corretta. |
| **Nessun arrotondamento intermedio** | Il calcolo procede a precisione piena e si arrotonda solo in visualizzazione. La busta paga reale arrotonda all'euro in più punti: da qui gran parte dello scostamento di qualche euro rispetto ai calcolatori commerciali. |
| **Massimale contributivo sempre applicato** | Vale per gli iscritti dal 1° gennaio 1996. Assumerlo è coerente con un dipendente in età lavorativa oggi, e conta solo sopra i 122.295 € di RAL. |
| **TFR escluso dal netto** | È accantonato, non erogato: comparirebbe come netto senza esserlo. È contato nel costo azienda, dove è un costo reale. |
| **Nessun familiare a carico, nessuna agevolazione** | Esplicitamente ammesso dalla traccia. Sono le variabili che moltiplicherebbero i casi senza aggiungere niente alla comprensione della catena di calcolo. |
| **Costo azienda come stima minima** | Include solo la quota INPS a carico del datore (23,81%) e il TFR. Sono escluse CUAF, CIGS, DS e il premio INAIL, che dipendono da settore e classe di rischio. Preferisco un numero dichiaratamente prudenziale a uno preciso per finta. |

## Cosa il prototipo non copre

Fringe benefit e welfare aziendale · premi di risultato a tassazione agevolata ·
detrazioni per familiari a carico e oneri detraibili · regimi agevolati (impatriati,
rientro dei cervelli) · part-time e anni parziali · categorie diverse dall'impiegato
del settore privato · comuni e regioni diversi da Milano e Lombardia ·
previdenza complementare · conguagli e ratei mensili.

---

## La cosa che ho scoperto costruendolo

Il sistema italiano ha **sei discontinuità** fra 0 e 130.000 € di RAL, e in **tre** di esse
aumentare il lordo fa *scendere* il netto.

Non l'avevo previsto. Il primo test che ho scritto assumeva una sola discontinuità, quella
della soglia comunale di Milano. Ne ha trovata subito una seconda a RAL 38.500 — la
maggiorazione di 65 € della detrazione art. 13, che a 35.000 € di reddito complessivo
cessa di colpo invece di sfumare. Una scansione a passo di un euro ne ha rivelate sei in
totale, tutte spiegabili: la mappa completa con causa e importo di ogni salto è in
[docs/CASI-PROVA.md](docs/CASI-PROVA.md).

Il caso più vistoso resta Milano: l'esenzione è una **soglia**, non una franchigia, quindi
superati 23.000 € di imponibile lo 0,80% colpisce l'intero importo. Attorno a una RAL di
25.328 € tre euro di lordo in più costano circa 184 € di netto.

Il grafico dell'aliquota marginale che ha portato alla scoperta è stato poi **rimosso
dall'interfaccia**: la pagina è pensata per un lavoratore che vuole capire la propria busta
paga, non per l'analisi quantitativa, e un grafico a due pannelli chiedeva più di quanto
restituisse a quel lettore. La scoperta però non se n'è andata con lui: il test
`il modello ha esattamente le sei discontinuità note` fissa posizione e verso di ognuna, e
se una modifica futura ne sposta una il test la intercetta invece di lasciarla passare per
una correzione.

**Due conseguenze pratiche sul calcolo inverso**, entrambe gestite esplicitamente:

- I gradini verso l'alto rendono alcuni netti **irraggiungibili** — quello a 8.500 € di
  reddito complessivo ne esclude 943 € consecutivi. Il calcolatore lo dichiara invece di
  restituire un valore approssimato senza dirlo.
- I gradini verso il basso fanno sì che **lo stesso netto sia prodotto da due RAL diverse**.
  La ricerca restituisce sempre la minima, la meno costosa per il datore. È anche il motivo
  per cui procede con una scansione a passo di un euro e non con una bisezione: la finestra
  in cui il netto tocca il massimo locale prima del salto è larga circa un euro.

## Altre due cose non ovvie

**Le addizionali locali non sono dovute se l'IRPEF netta è zero.**
Facile da dimenticare, perché per le retribuzioni medie l'IRPEF è sempre dovuta e la regola
non si vede mai. Sulle RAL basse, dove le detrazioni azzerano l'imposta, ignorarla significa
trattenere qualche centinaio di euro che non andrebbero trattenuti. È anche uno dei tre
effetti che si sovrappongono nel gradino a 8.500 €.

**Le formule delle detrazioni si troncano, non si arrotondano.**
Il rapporto va troncato alla quarta cifra decimale. Sembra un dettaglio da nulla, ma è la
differenza fra riprodurre la norma e approssimarla: il codice ha una funzione `tronca`
dedicata proprio per non usare `Math.round` per distrazione.

## Verifica

- **32 test** sul motore di calcolo, eseguiti dalla CI a ogni push: unità sulle singole
  funzioni, comportamento ai confini di ogni scaglione e soglia, cinque scenari completi
  confrontati con i calcoli fatti a mano, l'insieme esatto delle sei discontinuità, andata
  e ritorno del calcolo inverso, e proprietà strutturali verificate su tutte le RAL da 0 a
  200.000 € a passi di 500 € (il netto non è mai negativo, non supera mai il lordo, e
  RAL = netto + trattenute − integrazioni).
- **Validazione esterna**: a parità di ipotesi, RAL 40.000 € dà 27.960,17 € contro i
  27.960–27.965 € dei calcolatori pubblici; RAL 35.000 € dà 2.002,48 €/mese contro ~2.003 €.
  Dettagli e spiegazione dello scostamento residuo in [docs/CASI-PROVA.md](docs/CASI-PROVA.md).

---

## Avvertenza

Prototipo realizzato per un esercizio di product building. Non è uno strumento di
consulenza fiscale o del lavoro e non va usato per decisioni contrattuali o retributive.
