# AIOS Product Bible
## Modulo 6 — AI Inventory (Supply Chain Intelligence)

**Stato:** Bozza per approvazione
**Dipende da:** Design System, Home Dashboard, AI Chat, Navigation, AI CRM, AI Finance (approvati)
**Prossimo modulo dopo approvazione:** HR

---

## 1. Filosofia del modulo Inventory

### 1.1 Perché un WMS tradizionale non basta

Un gestionale di magazzino classico risponde a "quanto ne ho" e, nella migliore delle ipotesi, "quando scenderò sotto scorta". Non risponde quasi mai a "quanto dovrei ordinarne, da chi, e cosa succede alla mia liquidità se lo faccio ora invece che tra due settimane" — perché queste domande richiedono di incrociare dati che in un gestionale tradizionale vivono in sistemi separati: le vendite storiche (CRM), la cassa disponibile (Finance), l'affidabilità del fornitore (anagrafica isolata).

**Inventory AI-native esiste esattamente per rispondere alla seconda categoria di domande**, perché ha accesso allo stesso Business Brain di CRM e Finance — non deve integrare questi dati con un progetto a parte, li ha già a disposizione per costruzione architetturale (Costituzione, sezione 1).

### 1.2 Il vincolo specifico di questo modulo: l'accuratezza fisica prima di tutto

In Finance abbiamo stabilito che l'accuratezza economica viene prima della fluidità (Modulo 5, sezione 1.2). Qui il vincolo equivalente è **l'accuratezza fisica**: una giacenza mostrata deve corrispondere alla realtà del magazzino, o il sistema perde la fiducia dell'intera azienda in un solo errore percepito ("mi ha detto che c'erano 50 pezzi e non c'erano"). Per questo ogni suggerimento AI in questo modulo (riordino, forecast) è chiaramente separato dal dato di giacenza oggettivo, mai mescolato in un unico numero ambiguo.

### 1.3 Come cambia il lavoro

Il magazziniere oggi passa gran parte del tempo a controllare manualmente cosa sta per finire. Con AIOS, questo controllo è continuo e automatico — il suo tempo si sposta dal "controllare" al "decidere ed eseguire" (confermare un riordino proposto, gestire un'eccezione). Il responsabile acquisti oggi decide "a sensazione" basandosi su esperienza personale; con AIOS ha a disposizione una proposta motivata da dati reali su cui esercitare comunque il proprio giudizio finale — non sostituito, accelerato.

---

## 2. Dashboard Inventory

### 2.1 Gerarchia di priorità (stessa disciplina di tutti i moduli precedenti)

1. **Prodotti critici** (sotto scorta minima o a rischio esaurimento imminente secondo il forecast, sezione 8) — sempre in cima, con azione diretta "Rivedi riordino proposto"
2. **KPI per ruolo** (4 card: per Responsabile Logistica — Valore magazzino, Rotazione media, Prodotti sotto scorta, Capitale immobilizzato; per Responsabile Acquisti — Ordini in attesa, Riordini proposti dall'AI, Performance fornitori media, Fabbisogno di cassa previsto)
3. **Suggerimenti dell'Inventory Agent**
4. **Prodotti più venduti / prodotti fermi** (le due facce della stessa domanda: dove si muove il magazzino, dove è immobile)
5. **Anomalie** (giacenze negative, discrepanze da ultimo inventario fisico)

### 2.2 Capitale immobilizzato — perché è un KPI di prima classe, non secondario

Il valore del magazzino da solo dice poco; il **capitale immobilizzato in prodotti a bassa rotazione** è l'informazione che collega direttamente Inventory a Finance (cassa bloccata in scorte invece che disponibile) — per questo non è relegato in una vista secondaria ma è tra i KPI principali, con link diretto all'elenco dei prodotti responsabili di quella immobilizzazione.

### 2.3 Rotazione delle scorte — spiegata, non solo mostrata

Il numero di rotazione da solo non dice se è un problema: è normale che sia basso per un prodotto stagionale fuori stagione. Ogni indicatore di rotazione è quindi accompagnato dal confronto con la rotazione storica dello stesso prodotto nello stesso periodo dell'anno precedente, non un benchmark generico — evita falsi allarmi che eroderebbero fiducia nel sistema.

---

## 3. Catalogo Prodotti — il gemello digitale del prodotto

### 3.1 Struttura, stesso pattern della Scheda Cliente (CRM, Modulo 4)

```
┌───────────────────────────────────────────────┬────────────┐
│  Intestazione: nome, immagine, SKU, stato       │            │
├───────────────────────────────────────────────┤  INSIGHT   │
│  TAB: Anagrafica │ Giacenze │ Movimenti │        │  DEL       │
│       Fornitori │ Documenti │ Storico            │  BUSINESS  │
├───────────────────────────────────────────────┤  BRAIN     │
│              Contenuto della tab attiva          │  (fisso)   │
└───────────────────────────────────────────────┴────────────┘
```

Stesso principio architetturale già stabilito due volte (Scheda Cliente in CRM, e implicitamente ogni entità con Insight in Finance): un pannello di intelligenza fisso, non un tab tra gli altri — coerenza di pattern in tutta la Product Bible, non una nuova invenzione per ogni modulo.

### 3.2 Dati anagrafici e varianti

SKU, codice a barre, categoria, varianti (taglia/colore/formato) modellate come prodotti collegati a un prodotto "genitore" — condividono anagrafica comune ma hanno giacenze e movimenti propri, per riflettere la realtà operativa (una taglia può esaurirsi mentre un'altra è abbondante).

### 3.3 Lotti e scadenze

Per prodotti deperibili o soggetti a lotto: ogni unità di giacenza è tracciata per lotto con data di scadenza; il sistema segnala proattivamente i lotti in scadenza prima che diventino invendibili (coerente col principio "prevenire, non solo registrare" già visto in Finance).

### 3.4 Insight del Business Brain per il prodotto

Analogamente al Relationship Score del cliente (CRM): un punteggio di "salute del prodotto" che combina rotazione, marginalità (da Finance, sezione 7.2 del Modulo 5), affidabilità del fornitore collegato (sezione 6), e rischio di esaurimento — sempre scomponibile nei singoli fattori, mai un numero opaco.

### 3.5 Storico prezzi e costi

Andamento del costo di acquisto nel tempo (utile per negoziare con i fornitori con dati alla mano) e del prezzo di vendita — entrambi collegati direttamente al calcolo di marginalità condiviso con Finance (Modulo 5, "motore di calcolo margine in tempo reale" citato come servizio da costruire una sola volta e riusare).

---

## 4. Movimenti di magazzino

### 4.1 Tipologie unificate, stesso principio del Modulo CRM per le Attività

Carichi, scarichi, trasferimenti tra sedi, rettifiche (correzioni manuali dopo un inventario fisico), resi — tutti condividono la stessa struttura dati e la stessa UX di registrazione, varia solo un'icona di tipo e i campi specifici (es. un trasferimento richiede sede di origine e destinazione).

### 4.2 Tracciabilità totale

Ogni movimento registra: chi lo ha effettuato (utente o automazione), quando, quale documento lo giustifica (ordine, fattura, verbale di inventario), e — se generato da un'automazione AI — quale regola l'ha attivato. Nessun movimento "anonimo": è il fondamento dell'auditability richiesta esplicitamente per questo modulo.

### 4.3 Rettifiche — sempre motivate

Una rettifica manuale (es. dopo un conteggio fisico che non coincide col sistema) richiede sempre una motivazione testuale minima prima di essere salvata — non per burocrazia, ma perché una rettifica ricorrente sullo stesso prodotto è un segnale che l'Inventory Agent userà per indagare una possibile causa sistemica (es. un errore di processo nello scarico, o un problema di furto/smarrimento da segnalare).

### 4.4 Inventario fisico periodico

Modalità dedicata (anche da mobile, con lettura codice a barre tramite fotocamera) per il conteggio fisico: il sistema mostra la giacenza teorica accanto al campo di inserimento del conteggio reale, calcola automaticamente lo scostamento, e propone la rettifica solo dopo conferma — mai una sovrascrittura automatica della giacenza teorica.

---

## 5. Riordino Intelligente

### 5.1 I fattori considerati, tutti esplicitati nella proposta

Vendite storiche (con destagionalizzazione quando pertinente), lead time del fornitore specifico (sezione 6), ordini già aperti e non ancora arrivati (per non raddoppiare un riordino già in corso), opportunità aperte in CRM che potrebbero consumare scorta oltre la media storica, forecast di cash flow da Finance (per non proporre un riordino che comprometterebbe la liquidità), livello di servizio desiderato (configurabile per categoria di prodotto — un prodotto strategico può avere un margine di sicurezza più alto di uno secondario).

### 5.2 Struttura della proposta — stessa disciplina di spiegabilità di tutta la Bible

```
┌─────────────────────────────────────────┐
│ ✦ Riordino proposto: Prodotto Beta       │
│                                          │
│ Quantità: 500 unità                     │
│ Fornitore suggerito: Fornitore Alfa     │
│ Costo stimato: €4.200                   │
│ Impatto su liquidità: -€4.200 tra 15gg  │
│  (termini di pagamento fornitore)       │
│                                          │
│ Perché ora e questa quantità?           │
│  → Consumo medio 40 unità/settimana     │
│  → Lead time fornitore: 12 giorni       │
│  → Scorta attuale copre 9 giorni        │
│  → Rischio di rottura stock senza       │
│    intervento entro 3 giorni            │
│                                          │
│ [Approva]  [Modifica quantità]  [Ignora]│
└─────────────────────────────────────────┘
```

Questa card è, in sostanza, la stessa struttura del Suggested Action con "Perché?" già definita nel Modulo Chat (sezione 2.3, 8.1) — qui arricchita con l'impatto finanziario esplicito, elemento specifico che rende questo modulo distintivo rispetto agli altri: **ogni riordino mostra sempre il suo costo in termini di cassa**, mai solo in termini di quantità.

### 5.3 Livello di autonomia di default

Coerente con la prudenza già mostrata per azioni ad impatto economico (Finance, Costituzione sezione 5): il riordino è di default a livello 2-3 (Preparazione / Esecuzione previa approvazione), mai automazione completa di fabbrica — un'azienda può alzare l'autonomia nel tempo per categorie di prodotto a basso rischio (es. materiali di consumo economici), mai per default su tutto il catalogo.

---

## 6. Fornitori

### 6.1 Anagrafica e performance

Oltre ai dati anagrafici standard, ogni fornitore accumula uno storico di performance calcolato automaticamente: puntualità (consegne in tempo vs ritardate, con il ritardo medio in giorni), qualità (resi/contestazioni collegati a quel fornitore), competitività di prezzo nel tempo.

### 6.2 Come l'Inventory Agent sceglie il fornitore suggerito

Quando un prodotto è disponibile da più fornitori, la proposta di riordino (sezione 5.2) suggerisce quello con il miglior bilanciamento tra prezzo, puntualità storica e lead time — mai semplicemente il più economico, se questo comporta un rischio di ritardo che il forecast (sezione 8) giudica rilevante. La motivazione del "perché questo fornitore" è sempre disponibile allo stesso modo delle altre spiegazioni.

### 6.3 Valutazioni AI vs valutazioni umane

Il punteggio calcolato di un fornitore è sempre affiancabile, mai sostituito, da una valutazione qualitativa manuale che un responsabile acquisti può inserire (es. un rapporto di fiducia costruito nel tempo che i numeri da soli non catturano) — le due informazioni restano distinte e both visibili, non fuse in un unico numero che nasconderebbe il giudizio umano dentro un calcolo automatico.

---

## 7. Inventory Agent

### 7.1 Quando interviene

- Propone riordini (sezione 5).
- Segnala prodotti fermi da un periodo configurabile (sezione 9, esempio "180 giorni").
- Rileva sprechi potenziali (es. lotti in avvicinamento a scadenza, sezione 3.3).
- Segnala un fornitore con pattern di ritardo crescente prima che diventi un problema conclamato (stesso principio predittivo del Finance Agent sugli insoluti, Modulo 5 sezione 5.4).

### 7.2 Quando resta invisibile

Durante la normale consultazione di giacenze già note e stabili — stesso principio di non interruzione di tutti gli agenti precedenti.

### 7.3 Collaborazione con Finance Agent e Sales Agent

Con Finance Agent: ogni proposta di riordino (5.2) è verificata contro la liquidità prevista prima di essere mostrata come "sicura" — se comprometterebbe il cash flow, la card di proposta lo segnala esplicitamente invece di nasconderlo (*"Attenzione: questo riordino porterebbe la liquidità prevista sotto la soglia di sicurezza tra 20 giorni"*). Con Sales Agent: quando un'opportunità CRM di valore rilevante è in fase avanzata, l'Inventory Agent la considera nel calcolo del fabbisogno anche se non ancora un ordine confermato, con un fattore di ponderazione per la probabilità di chiusura — stessa logica già vista nel cash flow di Finance (Modulo 5, sezione 6.3).

---

## 8. Forecast della Domanda

### 8.1 Cosa prevede e con quale onestà

Domanda futura per prodotto, data stimata di esaurimento scorte al ritmo attuale, impatto atteso di promozioni pianificate (da Marketing, quando quel modulo sarà progettato) — sempre con **livello di affidabilità dichiarato** (stessa disciplina di Finance, Modulo 5 sezione 8.3): un prodotto nuovo senza storico riceve una previsione esplicitamente marcata come "Bassa affidabilità — nessuno storico disponibile", mai un numero presentato con falsa sicurezza.

### 8.2 Scenari alternativi

Come per Cash Flow e Forecast finanziario (Modulo 5, sezione 6.1, 8.1), anche qui la previsione di esaurimento scorte è mostrata a intervallo (es. "tra 8 e 14 giorni secondo il ritmo di vendita recente"), non una data secca — coerenza di linguaggio predittivo in tutta la piattaforma, non un'invenzione specifica di questo modulo.

### 8.3 Impatto delle opportunità CRM sul forecast

Un'opportunità di grande volume in chiusura imminente (Pipeline CRM) altera il forecast di consumo previsto per i prodotti coinvolti — mostrato esplicitamente come fattore ("Il forecast include l'impatto potenziale dell'opportunità Rossi Srl, probabilità 80%") per non sorprendere l'utente con un numero che sembra sproporzionato rispetto allo storico puro.

---

## 9. Automazioni in linguaggio naturale

| Richiesta | Livello di autonomia di default | Nota |
|---|---|---|
| *"Quando un prodotto scende sotto le 20 unità prepara un ordine"* | 2 — Preparazione | Coerente con 5.3: mai esecuzione automatica di un impegno di spesa senza conferma, salvo esplicita configurazione successiva per categorie a basso rischio |
| *"Se un fornitore ritarda oltre 10 giorni avvisami"* | 1 — Suggerimento/notifica | Puramente informativo |
| *"Segnalami prodotti fermi da più di 180 giorni"* | 1 — Suggerimento | Analitico, nessuna azione sui dati |
| *"Ogni venerdì inviami il report del magazzino"* | 2 — Preparazione | Il report è generato e reso disponibile, invio a destinatari esterni sempre confermato la prima volta (coerente con Finance, Modulo 5, sezione 10) |

Automazioni sempre gestite nello stesso motore condiviso AIOS Flow (coerente con CRM e Finance) — mai un sistema di regole separato per Inventory.

---

## 10. Ricerca Inventory

### 10.1 Esempi guida

*"Mostrami i prodotti con rotazione inferiore a 2"* → filtro strutturato diretto sul KPI di rotazione (sezione 2.3).

*"Quali articoli rischiano di terminare entro il prossimo mese?"* → combina giacenza attuale, consumo medio recente e forecast (sezione 8) — non una semplice sottrazione aritmetica, ma la stessa proiezione mostrata nel forecast del prodotto, qui aggregata su tutto il catalogo per rispondere in un colpo solo.

*"Quali fornitori hanno avuto più ritardi quest'anno?"* → aggregazione sullo storico di performance fornitori (sezione 6.1), ordinata per numero/gravità dei ritardi.

### 10.2 Precisione numerica come priorità, coerente col principio del modulo

Come per la Ricerca Finanziaria (Modulo 5, sezione 11.2), un filtro numerico esplicito ("inferiore a 2", "180 giorni") viene sempre interpretato alla lettera, mai in modo approssimativo — l'accuratezza fisica (sezione 1.2) si estende anche all'interpretazione delle query.

---

## 11. Analytics Inventory

Dashboard dedicate a: rotazione delle scorte (per categoria, per prodotto, confronto periodi), valore del magazzino nel tempo, capitale immobilizzato (sezione 2.2) con trend, performance fornitori aggregata, prodotti più/meno redditizi (collegato al margine di Finance), costi logistici quando tracciati, **precisione del forecast** — una dashboard che confronta le previsioni passate di esaurimento scorte con quello che è realmente accaduto, per costruire fiducia misurabile nel motore predittivo nel tempo (stesso principio di trasparenza applicato alla qualità stessa delle previsioni, non solo ai dati che le compongono).

---

## 12. Permessi (RBAC specifico di Inventory)

| Ruolo | Visibilità | Modifica | Approvazione |
|---|---|---|---|
| CEO | Tutto | Tutto | Tutto |
| Responsabile Logistica | Tutto il magazzino, tutte le sedi | Movimenti, anagrafica prodotti | Rettifiche rilevanti, trasferimenti tra sedi |
| Responsabile Acquisti | Tutto ciò che riguarda fornitori e riordini, giacenze in sola lettura | Anagrafica fornitori, ordini di acquisto | Riordini proposti dall'AI sopra soglia |
| Magazziniere | Giacenze e movimenti della propria sede | Registrazione movimenti, inventario fisico | Nessuna approvazione economica |
| Commerciale | Sola disponibilità (quantità), non costi né fornitori | Nessuna | Nessuna |
| Revisore | Tutto, sola lettura, incluso audit log movimenti | Nessuna | Nessuna |
| Fornitore esterno (se previsto da un portale dedicato) | Solo i propri ordini aperti e relative consegne | Conferma date di consegna previste | Nessuna sui dati interni |

Coerente col principio già visto in CRM (Modulo 4, sezione 13): la visibilità dei dati economici (costi, fornitori) è separata dalla visibilità della sola disponibilità operativa — un commerciale deve sapere "quanto posso vendere", mai "quanto costa produrlo o acquistarlo".

---

## 13. Stati ed errori

| Situazione | Comportamento |
|---|---|
| Giacenza negativa (più scarico che disponibile) | Segnalata immediatamente come anomalia bloccante per nuovi scarichi dello stesso prodotto finché non risolta — mai un numero negativo mostrato come se fosse normale |
| Prodotto duplicato (stesso articolo inserito due volte) | Stesso pattern di deduplicazione con conferma esplicita del Modulo CRM (sezione 3.3) — mai unione automatica |
| Movimento incoerente (es. trasferimento verso una sede inesistente) | Bloccato alla validazione, mai salvato "nel dubbio" |
| Fornitore non rispetta i tempi | Registrato nello storico performance (6.1), e se il pattern è ricorrente il fornitore scende automaticamente di priorità nei suggerimenti futuri (5.2, 6.2), sempre con motivazione visibile |
| Forecast poco affidabile | Dichiarato esplicitamente (8.1), mai nascosto |
| Dati mancanti (es. lead time del fornitore non censito) | La proposta di riordino lo segnala come limite della propria affidabilità invece di stimarlo arbitrariamente |

---

## 14. Scenari reali

### CEO controlla il valore del magazzino
Apre Dashboard Inventory → vede capitale immobilizzato in cima ai KPI (2.2) → nota che è cresciuto rispetto al mese scorso → chiede in Chat "perché il capitale immobilizzato è aumentato?" → Inventory Agent + Analytics Agent isolano la causa (es. un prodotto stagionale non ancora venduto) con link diretto al prodotto.

### Responsabile Acquisti approva un riordino
Vede la card di proposta (5.2) con impatto su liquidità già verificato dal Finance Agent (7.3) → approva direttamente, oppure modifica la quantità se ha informazioni aggiuntive (es. sa di una promozione in arrivo non ancora inserita nel sistema).

### Magazziniere registra un carico
Da tablet in magazzino, scansiona il codice a barre → il sistema riconosce il prodotto e propone la quantità dal documento di trasporto collegato (se caricato, coerente con la multimodalità del Modulo Chat) → conferma con un tocco.

### Commerciale verifica disponibilità
Dalla scheda cliente (CRM) durante una chiamata, chiede in Chat "Quanto Gamma abbiamo disponibile?" → risposta immediata, senza dover aprire il modulo Inventory — stesso principio di accesso universale tramite Chat già stabilito ovunque nella Bible.

### Imprenditore da smartphone
Notifica push per un'anomalia critica (es. rischio di rottura stock su un prodotto strategico) → apre l'app, vede la card di proposta di riordino già pronta → approva con un tocco dalla notifica stessa, senza dover navigare fino al modulo.

---

## 15. Evoluzione futura

- **RFID e sensori IoT:** l'architettura a eventi (Step 1) tratta già ogni fonte di movimento come un evento standardizzato (Costituzione, sezione 1.2) — un sensore RFID che rileva automaticamente un movimento fisico pubblica lo stesso tipo di evento di una registrazione manuale, senza richiedere un nuovo modello dati.
- **Robot e AGV nei magazzini automatizzati:** un AGV che sposta merce internamente genera eventi di trasferimento (sezione 4.1) nello stesso formato di un trasferimento manuale — l'automazione fisica del magazzino si integra come "un altro attore che genera movimenti", non come un sistema parallelo da riconciliare.
- **Digital Twin del magazzino:** già anticipato nel materiale di prodotto originario come modulo futuro — questo Catalogo Prodotti e questi Movimenti (sezioni 3–4) sono esattamente i dati che alimenterebbero una rappresentazione visiva in tempo reale, senza richiedere una nuova base dati dedicata.
- **Droni inventariali:** un conteggio automatico via drone alimenterebbe l'Inventario fisico periodico (sezione 4.4) come fonte alternativa al conteggio manuale, stesso flusso di conferma prima della rettifica.
- **Ottimizzazione AI in tempo reale:** l'evoluzione naturale del Riordino Intelligente (sezione 5) verso decisioni sempre più autonome è già supportata dall'architettura a soglie del motore di autorizzazioni (Costituzione, sezione 5.2) — richiede solo configurazione crescente della fiducia, non una nuova architettura.

---

## Conclusione

### Principi fondamentali stabiliti in questo modulo
1. L'accuratezza fisica delle giacenze non è mai negoziabile, distinta chiaramente da ogni suggerimento predittivo.
2. Ogni riordino proposto mostra sempre il proprio impatto sulla liquidità, non solo la quantità.
3. Il punteggio di un fornitore calcolato dall'AI affianca, non sostituisce mai, il giudizio qualitativo umano.
4. Le previsioni di esaurimento scorte sono sempre a intervallo, mai una data secca.
5. Ogni movimento di magazzino è tracciabile fino alla sua origine (utente o automazione).

### Decisioni architetturali prese
- Catalogo Prodotti con pannello Insight strutturalmente identico a Scheda Cliente (CRM) — terzo riuso dello stesso pattern architetturale dopo CRM e l'impostazione generale di Finance.
- Il riordino intelligente eredita obbligatoriamente una verifica del Finance Agent prima di essere presentato come proposta "pulita".
- Deduplicazione prodotti con lo stesso meccanismo di conferma esplicita già stabilito per i clienti nel CRM.

### Decisioni rimandate
- L'integrazione tecnica specifica con hardware IoT/RFID (materia di sviluppo, non di UX a priori).
- Il dettaglio del Digital Twin del magazzino, trattato come modulo futuro a sé.

### Dipendenze con CRM, Finance, Home, Chat AI, Navigation e Business Brain
- Dipende direttamente da Finance per la verifica di liquidità su ogni riordino (5.2, 7.3) e da CRM per il peso delle opportunità aperte nel forecast (8.3).
- Riusa integralmente: struttura "Perché?", Suggested Actions con azione diretta, RBAC differenziato per sensibilità del dato (economico vs operativo), motore di automazione unico AIOS Flow.

### Impatto sul database
Entità core: Prodotto (con varianti come entità collegate), Lotto, Giacenza (per sede), Movimento (tipizzato), Fornitore (con storico performance calcolato), Ordine di acquisto. Necessaria una relazione esplicita muti-fornitore per prodotto, con storico prezzi per fornitore nel tempo (sezione 3.5, 6.2).

### Impatto sulle API
Ogni azione dell'Inventory Agent (proposta riordino, segnalazione prodotto fermo) è un Tool dell'API pubblica, coerente con tutta la Bible; l'endpoint di verifica liquidità (condiviso con Finance) deve essere richiamabile in tempo reale dal motore di riordino senza introdurre latenza percepibile nella UX della card di proposta (5.2).

### Impatto su frontend web, desktop, mobile
La modalità di inventario fisico (4.4) con scansione codice a barre richiede accesso alla fotocamera — priorità di sviluppo per l'app mobile nativa (React Native, Step 1) e per il caso specifico del magazziniere, il ruolo con l'uso mobile più intenso di questo modulo tra tutti quelli progettati finora.

### Linee guida per lo sviluppo
Costruire per primo il servizio di verifica "impatto su liquidità di un impegno di spesa futuro" come componente condiviso con Finance (non duplicarlo) — sarà riusato anche in futuri moduli che comportano spesa (es. HR per l'assunzione di personale, quando progettato).

---

## Prossimo modulo (in attesa di approvazione)

Con Inventory approvato, procediamo con **HR** (Dipendenti, Permessi, Ferie, Buste paga, Performance, Formazione).
