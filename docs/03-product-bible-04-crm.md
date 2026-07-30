# AIOS Product Bible
## Modulo 4 — AI CRM (Customer Relationship Intelligence)

**Stato:** Bozza per approvazione
**Dipende da:** Design System, Home Dashboard, AI Chat, Navigation (approvati)
**Prossimo modulo dopo approvazione:** Finance

---

## 1. Filosofia del CRM

### 1.1 Perché un CRM tradizionale non basta più

Un CRM classico (Salesforce, HubSpot, Pipedrive) è, nella sua essenza tecnica, **un archivio con dei promemoria**: registra ciò che l'utente inserisce, e al massimo lo avvisa quando una data programmata arriva. Il lavoro di interpretazione — "questo cliente sta per abbandonarci", "questa è l'offerta giusta da proporre ora" — resta interamente nella testa del commerciale, e se il commerciale se ne va, quella interpretazione se ne va con lui.

**Un CRM AI-native ribalta questo rapporto**: il sistema stesso costruisce l'interpretazione, continuamente, sopra i dati grezzi — e la espone, spiegata, a chiunque ne abbia bisogno in quel momento. Non sostituisce il giudizio del commerciale (Costituzione, principio del "controllo umano sempre vincente"), ma gli evita di dover ricostruire da zero, ogni volta, quello che il sistema può già dedurre.

### 1.2 Come cambia concretamente il lavoro di un commerciale

Nel modello tradizionale: il commerciale apre il CRM, scorre la sua lista di clienti, decide da solo chi contattare oggi basandosi sulla memoria e sull'intuito, inserisce manualmente ogni nota dopo ogni chiamata. Nel modello AIOS: il commerciale apre AIOS (o la Chat) e **la priorità del giorno è già emersa**, ogni interazione recente è già collegata automaticamente al cliente (Business Brain, ingestione eventi — Costituzione, sezione 1.2), e il tempo che prima si spendeva a "capire dove riprendere" si sposta a "decidere cosa fare", che è l'unica parte del lavoro che genera davvero valore commerciale.

### 1.3 Da dati a conoscenza — il ruolo specifico del Business Brain qui

Ogni evento del CRM (un'email aperta, una chiamata registrata, un preventivo rifiutato) non è solo salvato: viene collegato nel Knowledge Graph ad altre entità (prodotto, categoria cliente, stagionalità) e reso ricercabile semanticamente. Questo è ciò che rende possibile, più avanti in questo documento, una domanda come "mostrami i clienti incontrati a Milano che non hanno ricevuto un'offerta" (sezione 10) — impossibile in un CRM che tratta ogni campo come una colonna isolata.

---

## 2. Dashboard CRM

### 2.1 Principio di selezione dei contenuti

Stessa disciplina della Home (Modulo 1): non un muro di grafici, ma **una gerarchia di priorità**. Ordine verticale:

1. **Suggerimenti AI ad alta urgenza** (es. "3 clienti a rischio abbandono", "1 opportunità pronta per la chiusura")
2. **KPI del ruolo** (4 card, coerente col Design System — per un Direttore Commerciale: Pipeline totale, Tasso di conversione, Fatturato previsto mese, Performance team; per un Commerciale: le sue proprie 4 metriche)
3. **Pipeline in sintesi** (vista compatta, il dettaglio completo è nel modulo Pipeline, sezione 5)
4. **Attività di oggi** (chiamate/follow-up pianificati)
5. **Lead caldi** (i lead con score più alto non ancora contattati)
6. **Performance del team** (solo per ruoli con visibilità gerarchica, RBAC sezione 13)

### 2.2 Opportunità a rischio — come vengono identificate

Un'opportunità entra in questa lista non per una regola statica ("nessun contatto da 14 giorni") ma per un punteggio composito che il Sales Agent calcola: tempo dall'ultimo contatto **pesato per la fase della pipeline** (un'opportunità in fase iniziale tollera più silenzio di una in fase di chiusura), storico di risposta di quel cliente specifico, valore economico coinvolto. Ogni voce della lista è cliccabile su "Perché è a rischio?" con la stessa struttura a quattro parti definita nel Modulo Chat (sezione 8.1) — riutilizzo esplicito del componente, non una nuova spiegazione inventata qui.

### 2.3 Previsioni di vendita (forecast)

Mostrato come intervallo, non un numero secco falsamente preciso (coerente col principio "mai una percentuale di affidabilità finta" del Modulo Chat, sezione 8.2, applicato qui al forecast): *"Fatturato atteso questo mese: tra €180.000 e €210.000"*, con un link "Come viene calcolato?" che mostra i fattori (pipeline pesata per probabilità di fase, stagionalità storica del cliente/settore).

---

## 3. Lead Management

### 3.1 Ciclo di vita completo

```
Acquisizione → Deduplicazione → Qualificazione → Scoring → Assegnazione → Nutrimento → Conversione o Archiviazione
```

### 3.2 Acquisizione e importazione

Fonti: form sito web, importazione CSV/Excel, inoltro di un'email a un indirizzo dedicato (`lead@[azienda].aios.com`), creazione manuale, creazione vocale/conversazionale dalla Chat ("Ho appena conosciuto un potenziale cliente a una fiera, si chiama..."). Ogni fonte converge nello stesso schema di evento del Business Brain (Costituzione, sezione 1.2) — nessuna fonte ha un trattamento privilegiato o degradato.

### 3.3 Deduplicazione

Al momento dell'acquisizione, il sistema verifica automaticamente possibili duplicati (stesso dominio email, stessa partita IVA, nome molto simile con fuzzy matching) e **non li unisce mai automaticamente** — propone l'unione come azione da confermare, con un confronto affiancato dei due record e la possibilità di scegliere quale valore tenere campo per campo in caso di conflitto. Un'unione errata di due aziende distinte con lo stesso nome sarebbe un danno difficile da correggere: qui il principio "vince sempre il controllo umano" (Modulo Chat, 1.3) è applicato senza eccezioni.

### 3.4 Scoring dinamico

Il punteggio di un lead non è statico al momento dell'inserimento: si aggiorna ad ogni nuovo evento (apertura email, visita al sito, risposta a una chiamata). Fattori: fit con il profilo cliente ideale (dedotto dal Business Brain sui clienti già convertiti con successo, non da regole scritte a mano), livello di engagement recente, provenienza. Il punteggio è sempre accompagnato da un "Perché questo punteggio?" — mai un numero opaco.

### 3.5 Assegnazione

Automatica per regola configurabile (area geografica, dimensione azienda, carico di lavoro corrente del commerciale) con possibilità di riassegnazione manuale sempre disponibile. Il Sales Agent può suggerire un'assegnazione non ovvia ("Questo lead ha caratteristiche simili ai clienti che Marco ha chiuso con più successo — assegnarlo a lui anche se non è il prossimo in turno?") — proposta, mai automatica silenziosa quando devia dalla regola standard.

### 3.6 Collaborazione del Sales Agent in ogni fase

Qualificazione: propone domande da fare basate su cosa manca per una valutazione completa. Nutrimento: suggerisce contenuti/argomenti pertinenti in base a interazioni simili passate. Conversione: prepara automaticamente la prima bozza di preventivo quando il lead segnala intento d'acquisto esplicito in una comunicazione.

---

## 4. Scheda Cliente — il "gemello digitale"

### 4.1 Struttura del layout

```
┌───────────────────────────────────────────────┬────────────┐
│  Intestazione: nome, logo/iniziali, punteggio  │            │
│  relazione, tag, azioni rapide                  │  INSIGHT   │
├───────────────────────────────────────────────┤  DEL        │
│  TAB: Panoramica │ Timeline │ Documenti │ ...   │  BUSINESS  │
├───────────────────────────────────────────────┤  BRAIN     │
│                                                  │  (pannello │
│              Contenuto della tab attiva          │  fisso,    │
│                                                  │  come il   │
│                                                  │  Context   │
│                                                  │  Panel di  │
│                                                  │  Chat)     │
└───────────────────────────────────────────────┴────────────┘
```

Il pannello Insight a destra **non è un tab tra gli altri**: è sempre presente, coerente strutturalmente col Context Panel della Chat (Modulo 2, sezione 2.6) e col Business Brain Panel della Home (Modulo 1, sezione 3) — stesso principio di presenza costante dell'intelligenza, riapplicato qui a livello di singola entità invece che di piattaforma intera.

### 4.2 Contenuto del pannello Insight

- **Business Summary generato automaticamente** (già previsto nel materiale di prodotto originario): riepilogo in linguaggio naturale, aggiornato ad ogni evento rilevante, non una singola volta all'apertura.
- **AI Relationship Score** con scomposizione dei fattori (frequenza ordini, puntualità pagamenti, marginalità, rischio abbandono) — ogni fattore singolarmente ispezionabile, mai solo un numero aggregato.
- **Prossima azione consigliata**, sempre una sola proposta principale (mai una lista di dieci suggerimenti che annacquano la priorità), con "Perché?" a corredo.

### 4.3 Timeline (tab)

Stessa meccanica della Timeline di Home (Modulo 1, sezione 6) e della Business Brain Timeline della Costituzione — qui senza il limite delle 24-48 ore: è lo storico completo del cliente, filtrata per tipo di evento (email, chiamate, ordini, documenti, ticket), con la stessa struttura "spiegabile e navigabile" già stabilita.

### 4.4 Relazioni tra aziende e contatti

Un'azienda cliente ha una o più persone di contatto; una persona può essere collegata a più aziende nel tempo (cambio lavoro). Il Knowledge Graph traccia questa evoluzione: se un contatto chiave cambia azienda, AIOS lo segnala come evento rilevante ("Mario Rossi, tuo referente in Alfa Srl, risulta ora in Beta Srl secondo [fonte] — potrebbe essere un'opportunità commerciale in una nuova azienda").

### 4.5 Documenti, ordini, fatture, ticket

Ognuno in una propria tab ma **tutti derivati dallo stesso Business Brain**, mai duplicati localmente nella scheda cliente — la scheda è una vista aggregata, non un secondo luogo dove i dati "vivono".

---

## 5. Pipeline

### 5.1 Tre viste dello stesso dato, non tre strutture dati diverse

- **Kanban** (default): colonne per fase, card trascinabili. Il trascinamento manuale di una card resta sempre possibile — l'AI suggerisce la fase, non la impone mai spostando da sola una card senza conferma.
- **Tabellare**: per chi preferisce vedere molte opportunità contemporaneamente, densità configurabile (Design System, sezione 4).
- **Timeline**: opportunità disposte lungo un asse temporale di chiusura prevista, utile per pianificazione trimestrale.

Il cambio vista è istantaneo e non perde alcun filtro attivo — sono tre proiezioni della stessa query, non tre schermate separate.

### 5.2 Ogni card mostra, senza dover aprire il dettaglio

Nome cliente, valore, probabilità di chiusura (calcolata, con indicatore di trend ↑/↓ rispetto alla settimana precedente), un'icona se è "a rischio" (sezione 2.2), e un indicatore se l'ultima azione rilevante è stata generata dall'AI (trattamento visivo coerente col Design System, sezione 5.1).

### 5.3 Suggerimento della prossima azione migliore

Non un consiglio generico ("contatta il cliente") — sempre specifico e motivato: *"Proponi uno sconto del 5%: negli ultimi 6 mesi, il 70% delle trattative simili per importo e settore si sono chiuse dopo un'offerta di sconto in questa fascia."* Il dato a supporto è sempre mostrabile su richiesta (spiegabilità, principio trasversale).

---

## 6. Attività

### 6.1 Creazione automatica dal contesto, non solo manuale

Se un'email menziona "ci sentiamo la prossima settimana", AIOS propone la creazione di un follow-up con data suggerita — **proposta**, mostrata come Suggested Action (Modulo Chat, sezione 2.3), mai creata silenziosamente senza che l'utente la veda almeno una volta prima che diventi un impegno reale sul calendario.

### 6.2 Tipologie unificate

Task, chiamate, email, meeting, follow-up e promemoria condividono la stessa struttura dati e la stessa UX di creazione/modifica — varia solo un'icona di tipo e i campi specifici (es. una chiamata ha un campo "esito"), mai un modulo separato per ciascuna tipologia.

### 6.3 Completamento e cronologia

Ogni attività completata alimenta immediatamente la Timeline del cliente coinvolto (sezione 4.3) — nessun doppio inserimento richiesto all'utente.

---

## 7. Comunicazioni

### 7.1 Unificazione dei canali

Email, WhatsApp, telefonate (con trascrizione automatica se registrate, coerente con la multimodalità del Modulo Chat, sezione 9), videochiamate, messaggi da Chat interna — tutti confluiscono nella stessa Timeline del cliente, con un'icona di canale ma un formato di visualizzazione coerente (mittente, contenuto/riassunto, timestamp).

### 7.2 Come si costruisce la cronologia automaticamente

Ogni canale collegato (integrazione email, connettore WhatsApp Business) pubblica un evento sul Business Brain nello stesso formato standard (Costituzione, sezione 1.2) — l'unificazione non è un lavoro di interfaccia che "raggruppa visivamente" fonti diverse, è una conseguenza diretta dell'architettura dati sottostante.

### 7.3 Riassunto automatico delle comunicazioni lunghe

Una chiamata di 40 minuti trascritta non viene mostrata per intero di default nella Timeline: appare un riassunto di 2-3 frasi generato dall'AI, con la trascrizione completa disponibile a un click — coerente col principio "priorità alla chiarezza" del Design System (sezione 1).

---

## 8. Sales Agent

### 8.1 Quando interviene attivamente

- Genera un preventivo su richiesta (Chat o pulsante nella scheda cliente).
- Propone la prossima azione migliore (sezione 5.3).
- Segnala un cliente a rischio abbandono prima che il commerciale se ne accorga da solo.
- Prepara la bozza di un'email di follow-up.

### 8.2 Quando resta invisibile

Durante la normale consultazione di dati già chiari (l'utente sta solo leggendo la scheda cliente senza aver chiesto nulla) — il Sales Agent non interrompe con suggerimenti non richiesti mentre l'utente sta semplicemente leggendo, coerente col principio "l'AI non deve mai essere invadente" ribadito in ogni modulo finora.

### 8.3 Come spiega ogni raccomandazione

Stessa struttura a quattro parti del Modulo Chat (sezione 8.1), qui applicata specificamente ai dati commerciali: cosa ha capito della situazione, quali dati ha usato (storico ordini, comunicazioni recenti), quanto è sicuro, cosa succede se si segue il consiglio.

---

## 9. Automazioni create in linguaggio naturale

Stessa esperienza del Modulo Chat (sezione 10), qui con esempi specifici del CRM:

> *"Se un lead non riceve risposta entro 5 giorni crea automaticamente un follow-up."*

AIOS conferma prima di attivare: *"Ho impostato: se un lead resta senza risposta da parte nostra per 5 giorni lavorativi, verrà creato un task di follow-up assegnato al commerciale responsabile. Vuoi attivarla?"*

> *"Quando un'opportunità supera il 90% prepara il contratto."*

Qui l'automazione ha un'implicazione più delicata (genera un documento legale) — il livello di autonomia di default per questa specifica automazione è **Preparazione** (Costituzione, livello 2), mai esecuzione automatica di invio: il contratto viene predisposto, non firmato né inviato senza revisione umana.

> *"Se un cliente VIP non viene contattato da 30 giorni avvisa il commerciale."*

Richiede che "VIP" sia un tag/segmento già esistente o da definire in quel momento — se ambiguo, AIOS chiede chiarimento prima di creare la regola (coerente col Modulo Chat, sezione 10.3, sulle automazioni condizionali complesse).

---

## 10. Ricerca CRM — ricerca semantica

### 10.1 L'esempio guida

*"Mostrami i clienti che abbiamo incontrato a Milano negli ultimi sei mesi e che non hanno ancora ricevuto un'offerta."*

Questa query non ha una corrispondenza diretta in nessun singolo campo del database — richiede di combinare: eventi di tipo "incontro" con località Milano (dal Knowledge Graph), filtro temporale, e un'assenza (nessun preventivo associato). Questo è esattamente il tipo di domanda per cui la Ricerca universale (Modulo Navigazione, sezione 5) e la ricerca semantica del Business Brain esistono.

### 10.2 Come viene interpretata

Il Prompt Orchestrator (Costituzione, sezione 4) scompone la richiesta in una query strutturata sul Knowledge Graph (eventi + località + intervallo temporale) combinata con una condizione negativa (assenza di un evento collegato) — restituendo un elenco con, per ciascun cliente, il motivo puntuale dell'inclusione ("Incontrato il 12 marzo, evento fieristico, nessun preventivo inviato").

### 10.3 Risultato come punto di partenza per un'azione

L'elenco risultante non è statico: ogni riga porta un'azione diretta ("Prepara preventivo"), coerente col principio "nessun dato è un vicolo cieco" già stabilito in Home (Modulo 1, sezione 5.3).

---

## 11. Analytics CRM

### 11.1 Contenuti

Dashboard vendite (fatturato per periodo, per prodotto, per commerciale), tasso di conversione per fase di pipeline, analisi del funnel (dove si perdono più opportunità, e — cruciale — **perché**, non solo il dato numerico ma un'ipotesi generata dall'AI sul pattern comune alle opportunità perse in quella fase), performance individuali e di team, forecast (sezione 2.3).

### 11.2 Ogni grafico è spiegabile

Click su qualunque punto dati apre lo stesso pattern "Perché?" — mai un grafico che richiede di aprire un modulo diverso per capirne il significato.

### 11.3 Confronto onesto delle performance individuali

Le classifiche di performance tra commerciali sono visibili secondo il RBAC (sezione 13) — un Direttore Commerciale le vede, un singolo commerciale vede tipicamente solo la propria performance e la media di team, mai un ranking pubblico non richiesto che potrebbe generare dinamiche interne indesiderate: questa è una scelta di prodotto deliberata, non solo tecnica.

---

## 12. Collaborazione

Commenti su qualunque entità (cliente, opportunità, attività) con menzioni `@utente` che generano una notifica coerente col Modulo Navigazione (sezione 7.3, notifiche collaborative con avatar). Cronologia modifiche sempre tracciata (chi ha cambiato cosa e quando — anche quando la modifica è stata proposta dall'AI ed eseguita dopo conferma umana, entrambe le informazioni restano nel log). Lavoro simultaneo: se due utenti aprono la stessa scheda cliente, un indicatore discreto mostra chi altro la sta visualizzando in questo momento (mai un blocco rigido "record in modifica da altro utente", che è un pattern datato e frustrante — si preferisce la trasparenza sulla presenza, con merge intelligente dei cambi quando possibile).

---

## 13. Permessi (RBAC specifico del CRM)

| Ruolo | Visibilità | Modifica | Approvazione |
|---|---|---|---|
| CEO | Tutti i clienti e tutte le performance | Tutto | Tutto |
| Direttore Commerciale | Tutti i clienti del proprio team/area | Tutto nel proprio perimetro | Sconti oltre soglia, riassegnazioni |
| Commerciale | Solo i propri clienti/lead assegnati | Solo i propri record | Nessuna approvazione di terzi |
| Account Manager | Clienti strategici assegnati, vista arricchita (storico esteso) | I propri clienti assegnati | Nessuna |
| Back Office | Dati amministrativi collegati (fatture, contratti) di tutti i clienti | Solo campi amministrativi, non commerciali | Nessuna |
| Agente esterno | Solo i propri lead/clienti, senza visibilità su margini/costi interni | Dati di contatto e attività, non condizioni commerciali riservate | Nessuna |

Questo RBAC specifico del modulo si compone con il motore generale (Step 1, sezione 12) e con il motore di autorizzazioni AI (Costituzione, sezione 5) — un Agente esterno, ad esempio, non potrà mai ricevere dal Sales Agent un'proposta che riveli il margine interno, indipendentemente dal livello di autonomia configurato, perché il limite è di visibilità del dato, non di autonomia dell'azione.

---

## 14. Stati ed errori

| Situazione | Comportamento |
|---|---|
| Clienti duplicati rilevati | Mai unione automatica — proposta con confronto affiancato (sezione 3.3) |
| Informazioni mancanti per una valutazione (es. scoring lead incompleto) | Il punteggio viene mostrato come "provvisorio" con l'elenco esplicito di cosa manca per affinarlo |
| Integrazione email/WhatsApp fallita | La Timeline segnala il gap temporale ("Sincronizzazione email interrotta dal [data]"), mai un silenzio che faccia credere che semplicemente non ci sia stata comunicazione in quel periodo |
| Il Sales Agent non è sicuro della risposta | Dichiarazione esplicita di incertezza (coerente col Modulo Chat, sezione 8.1, livello "Bassa"), mai una raccomandazione presentata con sicurezza che il sistema non possiede realmente |
| Conflitto tra dati (es. due fonti riportano indirizzi diversi per lo stesso cliente) | Entrambe le versioni mostrate con la fonte, mai una scelta silenziosa di quale sia "quella giusta" |

---

## 15. Scenari reali

### CEO analizza il forecast
Apre Analytics CRM (sezione 11) → vede l'intervallo di forecast con fattori a supporto → chiede in Chat "perché il forecast di questo trimestre è più basso dell'anno scorso?" → Sales Agent + Analytics Agent (Modulo Chat, sezione 6.1) collaborano per isolare la causa (es. un cliente storico ha ridotto gli ordini) con link diretto alla scheda cliente coinvolta.

### Direttore Commerciale assegna lead
Vede la coda di nuovi lead non assegnati in Dashboard CRM → il Sales Agent propone un'assegnazione ottimale per ciascuno (sezione 3.5) → approva in blocco quelle che condivide, riassegna manualmente le altre con un click.

### Commerciale prepara un'offerta
Dalla scheda cliente, click su "Nuovo preventivo" (o richiesta diretta in Chat) → Sales Agent verifica listino, storico sconti concessi a quel cliente, disponibilità (collaborazione con Inventory Agent) → propone il preventivo → commerciale lo rivede, eventualmente modifica lo sconto, invia.

### Account Manager gestisce un cliente strategico
Apre la scheda cliente → il pannello Insight mostra un Relationship Score in calo rispetto al trimestre precedente → espande "Perché?" → scopre che il tempo medio di risposta alle richieste di questo cliente è aumentato → decide di intervenire personalmente, l'azione viene registrata nella Timeline.

### Agente esterno in mobilità
Da smartphone, dopo una visita cliente, apre la Chat e detta: *"Appena visto Bianchi Srl, interessati a 200 unità del prodotto Gamma, vogliono un preventivo entro venerdì"* → AIOS crea l'attività, aggiorna la scheda cliente, propone la bozza di preventivo (nei limiti di visibilità del suo ruolo, RBAC sezione 13) — tutto senza che l'agente abbia aperto un modulo CRM tradizionale in senso stretto.

---

## 16. Evoluzione futura

- **AI sempre più autonome:** l'architettura a soglie del motore di autorizzazioni (Costituzione, sezione 5.2) permette già oggi di alzare gradualmente il livello di automazione (es. invio automatico di follow-up di routine) senza richiedere un nuovo sistema — solo una configurazione diversa nel tempo, mano a mano che la fiducia si costruisce.
- **Nuovi canali di comunicazione:** ogni nuovo canale (es. un futuro canale di messaggistica non ancora diffuso oggi) si integra pubblicando eventi nello stesso schema standard (sezione 7.2) — non richiede modifiche alla Timeline o alla scheda cliente.
- **Plugin di terze parti nel CRM:** un plugin verticale (es. un connettore per un settore specifico) può aggiungere campi o viste alla scheda cliente attraverso l'architettura a manifest del Marketplace (Costituzione, sezione 8), senza intervenire sul codice core del modulo.
- **Analisi predittive più avanzate:** il forecast e lo scoring di oggi sono basati su pattern osservati (Business Brain, memoria strategica); un'evoluzione naturale userà modelli predittivi più sofisticati sugli stessi dati già raccolti, senza richiedere una nuova architettura di ingestione.

---

## Conclusione

### Principi fondamentali stabiliti in questo modulo
1. Il CRM produce conoscenza interpretata, non solo un archivio di dati grezzi.
2. Nessuna unione di record duplicati è mai automatica.
3. Ogni raccomandazione commerciale è spiegabile con la stessa struttura a quattro parti usata in tutta la piattaforma.
4. Le automazioni con implicazioni legali/finanziarie (es. generazione contratti) hanno livello di autonomia di default più prudente delle altre.
5. La visibilità dei dati commerciali sensibili (margini, condizioni) è un limite di RBAC, non di configurazione dell'autonomia AI.

### Decisioni architetturali prese
- Tre viste della Pipeline (Kanban/Tabellare/Timeline) come proiezioni della stessa query, non tre strutture dati.
- Il pannello Insight della scheda cliente è strutturalmente identico al Context Panel della Chat — stesso componente riutilizzato, non una nuova invenzione.
- Comunicazioni multicanale unificate a livello di schema evento, non di sola interfaccia.

### Decisioni rimandate
- Il dettaglio dell'algoritmo di scoring lead (quali pesi specifici ai fattori) — materia di iterazione basata su dati reali, non di progettazione UX a priori.
- L'integrazione con canali di comunicazione non ancora diffusi.

### Dipendenze con Home, Chat AI, Navigation e Business Brain
- Riusa integralmente: Business Brain Panel/Insight pattern, struttura "Perché?", Suggested Actions, Notification Center, Ricerca universale come motore della ricerca semantica CRM.
- Introduce per la prima volta nella Product Bible: il pattern di deduplicazione con conferma esplicita, che diventerà template per altri moduli con lo stesso problema (es. Inventory con prodotti duplicati).

### Impatto sul database
Entità core: Azienda cliente, Contatto, Lead, Opportunità (con storico fasi), Attività, Comunicazione (con riferimento a canale e trascrizione/allegato), Tag/Segmento. Relazioni molti-a-molti tra Contatto e Azienda (storico, non solo attuale) da modellare esplicitamente per supportare la sezione 4.4.

### Impatto sulle API
Ogni azione del Sales Agent (sezione 8) corrisponde a un Tool dell'API pubblica (Modulo Chat, sezione 7), coerente col principio "nessuna funzionalità esclusiva della UI grafica".

### Impatto su frontend web, desktop, mobile
Pipeline Kanban richiede drag & drop performante — attenzione particolare su mobile, dove il trascinamento è sostituito da un menu di cambio fase più adatto al touch (coerente col principio di riprogettazione mobile del Modulo Navigazione, sezione 8.1), non da un tentativo di replicare il drag & drop desktop.

### Linee guida per lo sviluppo futuro del modulo
Costruire per primi Scheda Cliente e Business Brain Panel/Insight come componenti riutilizzabili — sono il punto di massimo riuso trasversale con i moduli successivi (Finance, Inventory avranno pattern di "scheda entità con insight AI" strutturalmente identici).

---

## Prossimo modulo (in attesa di approvazione)

Con il CRM approvato, procediamo con **Finance** (Preventivi, Fatture, Pagamenti, Cash Flow, Bilancio, Costi, Margini, Dashboard finanziaria, Forecast).
