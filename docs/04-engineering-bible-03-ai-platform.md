# AIOS Engineering Bible
## Modulo 3 — AI Platform Architecture

**Stato:** Bozza per approvazione
**Dipende da:** Costituzione (Business Brain, Agent, Memoria, Autorizzazioni AI), Domain Model, API Contract & Event Catalog
**Prossimo modulo dopo approvazione:** da concordare

---

## Nota di metodo — la relazione tra questo documento e la Costituzione

La Costituzione ha stabilito **cosa** esiste (Business Brain a tre strutture, catalogo agenti, quattro livelli di memoria, motore di autorizzazioni) e **perché** al livello di principio di prodotto. Questo documento progetta **come funziona internamente ciascuno di quei componenti come sistema software** — il livello di dettaglio necessario perché un AI Engineer possa costruirlo senza reinterpretare le decisioni già prese. Dove la Costituzione ha già stabilito un principio, questo documento lo eredita senza ridiscuterlo; dove la Costituzione si fermava a livello concettuale, qui si scende di un livello.

---

## 1. Architettura generale

### 1.1 I dieci componenti e come si susseguono in una richiesta tipica

```
Richiesta (utente o trigger di sistema)
   │
   ▼
[1] REASONING PIPELINE (orchestratore dell'intero flusso)
   │
   ├──▶ [2] CONTEXT ENGINE ──▶ interroga [4] MEMORY ENGINE, [5] KNOWLEDGE GRAPH, [6] VECTOR PLATFORM
   │
   ├──▶ [3] PROMPT ORCHESTRATOR ──▶ costruisce il prompt finale con il contesto assemblato
   │
   ├──▶ [8] MODEL ROUTER ──▶ seleziona il modello per questo specifico task
   │
   ├──▶ [10] PLANNING ENGINE (solo se il task richiede più passaggi)
   │        │
   │        ▼
   ├──▶ [9] MULTI-AGENT COORDINATOR (se più agenti coinvolti)
   │        │
   │        ▼
   ├──▶ [12] TOOL EXECUTION ENGINE ──▶ verifica con Domain Model + API Contract
   │
   ├──▶ [13] CONFIDENCE ENGINE ──▶ valuta l'affidabilità del risultato
   │
   ├──▶ [14] SAFETY ENGINE ──▶ verifica finale prima di mostrare/eseguire
   │
   ▼
Risposta o azione, sempre accompagnata da spiegazione (Costituzione, Explainability)
```

Trasversali a ogni passaggio: **[7] RAG Pipeline** (parte del Context Engine per il recupero informativo), **[11] Cost Engine** (osserva e ottimizza ogni passaggio), **[15] Observability AI** (traccia ogni passaggio), **[16] Apprendimento** (osserva l'esito per migliorare nel tempo, mai in tempo reale sulla richiesta corrente).

### 1.2 Perché componenti distinti e non un unico "motore AI"

Ogni componente ha un confine di responsabilità preciso, stesso principio dei Bounded Context del Domain Model applicato qui al livello cognitivo: il Context Engine non genera testo, il Prompt Orchestrator non decide quali dati recuperare, il Model Router non ragiona sul contenuto. Questo permette di **sostituire, scalare o testare ogni componente indipendentemente** — un requisito esplicito di Model Agnostic e di Scalability.

### 1.3 Lifecycle di un componente

Ogni componente è un servizio stateless per la logica di orchestrazione (nessun componente conserva stato oltre la singola richiesta, eccetto il Memory Engine che è esplicitamente stateful per definizione) — coerente con la scalabilità orizzontale già stabilita nello Step 1.

---

## 2. Prompt Orchestrator

### 2.1 Costruzione del prompt — pipeline interna in sei fasi (estensione tecnica della Costituzione, sezione 4.1)

```
Intent Classification → Template Selection → Slot Filling (con contesto dal Context Engine)
   → Guardrail Injection → Compilazione finale → Validazione pre-invio
```

### 2.2 Template come risorse versionate, non stringhe inline nel codice

Ogni template vive in un **Template Registry** dedicato (non nel codice applicativo dei singoli servizi) con: identificatore, versione, variabili attese (slot), metadati di test associati. Un template non è mai modificato in-place: una modifica crea una nuova versione, con la precedente disponibile per rollback immediato — stesso principio di immutabilità già visto nel Domain Model per gli eventi, qui applicato ai prompt.

### 2.3 Prompt dinamici e contestuali

Un template può contenere sezioni condizionali (es. "se l'utente ha ruolo CFO, includi questa istruzione aggiuntiva sul tono") — la logica condizionale è dichiarativa (regole esplicite valutate dal Prompt Orchestrator), mai generata da un altro modello linguistico per comporre il prompt stesso: **il livello che decide come parlare al modello non deve a sua volta dipendere da un modello**, per evitare un'instabilità a cascata difficile da debuggare.

### 2.4 Validazione pre-invio

Prima che un prompt compilato venga inviato al Model Router, viene verificato contro: lunghezza massima per il modello target (sezione 8), presenza di tutti gli slot obbligatori compilati (mai un placeholder vuoto inviato per errore), assenza di dati che non dovrebbero essere nel contesto secondo lo Scope RBAC del richiedente (doppio controllo, oltre a quello già fatto dal Context Engine — ridondanza intenzionale su un punto critico di sicurezza).

### 2.5 Auditing

Ogni prompt compilato effettivamente inviato è loggato (con riferimento a versione del template, non necessariamente il testo integrale se contiene dati sensibili — vedi Safety Engine, sezione 14) — permette di ricostruire esattamente cosa ha "visto" il modello per una data risposta, requisito diretto di Explainability ed Auditability.

### 2.6 Fallback

Se la compilazione di un template fallisce (slot mancante, errore del Context Engine), il Prompt Orchestrator non invia mai un prompt parziale o corrotto al modello: restituisce un errore esplicito gestito dalla Reasoning Pipeline (sezione 11), che comunica all'utente un'incertezza dichiarata invece di un tentativo silenzioso con dati incompleti.

### 2.7 Ottimizzazione

Il Prompt Orchestrator misura, per ogni template/versione, un insieme di metriche (lunghezza media compilata, tasso di successo della risposta secondo il Confidence Engine, sezione 13) che alimentano l'Observability AI (sezione 15) — l'ottimizzazione di un template è sempre un intervento umano informato da questi dati, mai un'auto-modifica del template da parte del sistema stesso (vedi Apprendimento, sezione 17, sui limiti espliciti).

---

## 3. Context Engine

### 3.1 Responsabilità

Decidere **cosa** entra nel prompt, non **come** viene formulato (quello è il Prompt Orchestrator) — il confine tra i due componenti è netto e non negoziabile: il Context Engine restituisce dati strutturati e rilevanti, il Prompt Orchestrator li traduce in linguaggio per il modello.

### 3.2 Il ciclo di recupero

```
1. Determinazione dello scope necessario (quali entità, quali livelli di memoria — sez. 4)
2. Interrogazione parallela: Knowledge Graph (relazioni), Vector Platform (semantica),
   Memory Engine (livelli pertinenti)
3. Fusione dei risultati con deduplicazione (la stessa informazione non deve comparire
   due volte da fonti diverse)
4. Ordinamento per rilevanza (sez. 3.3)
5. Compressione al budget di contesto disponibile per il modello selezionato (sez. 3.4)
```

### 3.3 Ordinamento per rilevanza — i fattori, in ordine di peso

Corrispondenza diretta con l'intento della richiesta (peso più alto), recency dell'informazione, specificità (un dato specifico sull'entità in questione pesa più di un pattern aggregato generico), livello di confidenza della fonte stessa (un dato da un documento verificato pesa più di un'inferenza precedente del sistema).

### 3.4 Compressione — come si evita il rumore senza perdere ciò che conta

Quando il volume di contesto rilevante eccede il budget disponibile (sezione 8.2), il Context Engine non tronca semplicemente in coda: applica una **sintesi progressiva** — le informazioni a rilevanza più bassa vengono riassunte invece che escluse del tutto (es. dieci email simili diventano "10 comunicazioni simili nell'ultimo mese, tema: richieste di sconto"), mantenendo un riferimento recuperabile su richiesta invece di un'esclusione silenziosa. Questo è il meccanismo tecnico dietro a "AIOS non dimentica, ma non ripete tutto" già promesso a livello di prodotto.

### 3.5 Mantenimento della rilevanza in conversazioni lunghe

Ad ogni nuovo messaggio in una conversazione, il Context Engine non riusa ciecamente il contesto del turno precedente: lo **rivaluta** (un cambio di argomento, Product Bible Chat sezione 3.3, deve poter scartare contesto non più pertinente) — mai un contesto che cresce monotonicamente fino a diventare rumoroso.

---

## 4. Memory Engine

Estensione tecnica granulare della Costituzione (4 livelli) e del Modulo Chat (7 tipi): per ciascuna memoria, creazione/aggiornamento/versioning/eliminazione/retention/indicizzazione.

| Memoria | Creazione | Aggiornamento | Versioning | Eliminazione | Retention | Indicizzazione |
|---|---|---|---|---|---|---|
| Temporanea (sessione) | All'apertura di una Conversation | Ad ogni messaggio | Nessuno (effimera) | Automatica a timeout/chiusura | 30 min inattività | In-memory (Redis) |
| Conversazionale | Al primo messaggio | Ad ogni turno | Storico intero conservato (mai sovrascritto) | Solo su richiesta esplicita utente | Illimitata salvo policy azienda | Vector Platform per ricerca semantica cross-conversazione |
| Personale | Osservata nel tempo (pattern, mai dichiarazione esplicita) | Ricalcolo periodico | Ultima versione attiva + storico per audit | Cancellabile da Settings | Nessuna scadenza automatica | Struttura chiave-valore in Postgres |
| Di team | Confermata da pattern condivisi da più utenti | Su nuova conferma collettiva | Storico delle convenzioni cambiate nel tempo | Solo da amministratore di team | Nessuna scadenza automatica | Postgres, scope per team |
| Aziendale (Business Brain) | Ad ogni Domain Event | Continua | Knowledge Graph mai sovrascritto (sez. 5.2) | Solo per obbligo normativo (Domain Model, sez. 8.3) | Secondo policy di retention Organization | Knowledge Graph + Vector Platform |
| Documentale | Al caricamento documento | Su nuova versione documento | Ogni versione del documento conservata | Segue ciclo di vita del documento in Documents | Secondo policy Organization | Vector Platform (embedding) + metadati strutturati |
| Strategica | Ricalcolo batch periodico | Ogni ciclo batch | Storico dei ricalcoli per misurare l'evoluzione dei pattern | Mai (solo aggiornata) | Illimitata | ClickHouse (viste materializzate) |
| Degli agenti | All'avvio di un task multi-step | Ad ogni passo del piano | Nessuno (di lavoro, non di lungo periodo) | Al completamento o fallimento del task | Durata del task | In-memory, scope per esecuzione |

### 4.1 Perché il versioning è diverso per ogni tipo

Un'informazione che rappresenta un fatto oggettivo nel tempo (Knowledge Graph) non si sovrascrive mai — un'informazione di lavoro temporaneo (memoria degli agenti) non ha senso storicizzarla oltre la sua stessa esecuzione. Il documento tratta ogni caso esplicitamente invece di applicare una regola uniforme che sprecherebbe risorse o perderebbe informazione a seconda del tipo.

---

## 5. Knowledge Graph

### 5.1 Nodi e relazioni

Ogni Aggregate Root del Domain Model (Modulo 1, sezione 5) è un potenziale nodo; ogni Domain Event (Modulo 1, sezione 6) che collega due entità genera o rafforza un arco tra i nodi corrispondenti. Un arco porta sempre: tipo di relazione, timestamp di creazione, e — quando pertinente — un peso (es. "frequenza di interazione" tra due nodi Cliente e Prodotto).

### 5.2 Aggiornamento senza sovrascrittura

Coerente col Domain Model (sezione 8.2): una relazione che cambia genera un nuovo arco con validità temporale (`valid_from`/`valid_to`), il precedente arco viene marcato concluso, mai eliminato — il grafo è quindi, tecnicamente, un grafo temporale (temporal graph), non un semplice grafo statico.

### 5.3 Inferenze

Il Knowledge Graph supporta due tipi di inferenza: **diretta** (percorso esplicito tra nodi già connessi — es. Cliente→Ordine→Prodotto) e **per pattern** (es. "clienti con questo profilo tendono ad acquistare anche questo prodotto", calcolata periodicamente e memorizzata come arco di tipo "pattern inferito", sempre distinguibile visivamente/strutturalmente da un arco basato su un fatto diretto — mai confuso con un dato certo).

### 5.4 Sincronizzazione

Il grafo si aggiorna in modo asincrono rispetto alla scrittura transazionale originale (stesso pattern Transactional Outbox già citato nell'API Contract) — con un obiettivo di latenza di aggiornamento (secondi, non minuti) monitorato dall'Observability AI, perché un grafo troppo "in ritardo" rispetto alla realtà comprometterebbe l'affidabilità di ogni risposta che vi si basa.

### 5.5 Query e spiegabilità

Ogni query al Knowledge Graph restituisce, insieme al risultato, il **percorso** che l'ha prodotto (quali nodi e archi attraversati) — è la fonte diretta della sezione "Cosa ho consultato" nel pattern di spiegabilità già definito nella Costituzione e nel Modulo Chat.

---

## 6. Vector Platform

### 6.1 Cosa viene vettorizzato

Contenuto testuale non strutturato rilevante: email, note, documenti, trascrizioni. **Mai dati puramente numerici strutturati** (una giacenza, un importo) — quelli restano interrogabili solo tramite il Knowledge Graph/database transazionale, per lo stesso motivo di accuratezza già visto in Finance e Inventory: un embedding vettoriale non è lo strumento giusto per un numero che deve essere esatto.

### 6.2 Retrieval e ranking

Ricerca per similarità (cosine similarity) sui vettori, con un **reranking** successivo (modello più leggero e specializzato, non lo stesso modello di generazione) che riordina i primi risultati candidati secondo rilevanza contestuale più fine — due stadi distinti perché la sola similarità vettoriale grezza produce spesso risultati plausibili ma non ottimali, il reranking corregge questo limite noto della tecnica.

### 6.3 Deduplicazione

Documenti/contenuti quasi identici (es. due versioni della stessa email inoltrata) sono rilevati per similarità estrema e collassati in una singola voce indicizzata con riferimento a entrambe le fonti — evita che il Context Engine recuperi lo stesso contenuto due volte occupando budget di contesto inutilmente.

### 6.4 Aggiornamenti e versioning

Un documento aggiornato genera un nuovo embedding, il precedente non viene eliminato ma marcato come superato (stesso principio di storicizzazione del Knowledge Graph) — utile per query che riguardano esplicitamente "come era prima" (es. una versione precedente di un contratto).

---

## 7. RAG Pipeline

### 7.1 I passaggi, in dettaglio

```
Retrieval (Vector Platform + Knowledge Graph, sez. 3.2)
   → Reranking (sez. 6.2)
   → Selezione delle fonti (le migliori N, non tutte le rilevanti — sez. 7.2)
   → Costruzione del contesto (Context Engine, sez. 3.4)
   → Verifica delle fonti (sez. 7.3)
   → Generazione (Model Router + modello selezionato)
   → Controllo qualità post-generazione (Confidence Engine, sez. 13)
```

### 7.2 Selezione delle fonti — quante e quali

Non "tutte le fonti rilevanti sopra una soglia" (rischio di sovraccarico e rumore) ma un numero massimo configurabile (tipicamente 5-10) delle fonti a rilevanza più alta dopo il reranking — se il volume di informazione pertinente eccede questo numero, è un segnale che la richiesta dell'utente è probabilmente troppo ampia e il sistema lo comunica invece di tentare di comprimere tutto silenziosamente.

### 7.3 Verifica delle fonti e gestione dei conflitti

Prima della generazione, le fonti selezionate vengono controllate per coerenza reciproca — se due fonti si contraddicono (stesso principio già visto in CRM/Finance/Inventory per dati in conflitto, qui applicato a livello di pipeline generale), **entrambe vengono passate al modello con l'istruzione esplicita di segnalare il conflitto nella risposta**, mai lasciate al modello che sceglierebbe arbitrariamente quale credere.

### 7.4 Citazioni interne

Ogni affermazione sostanziale nella risposta generata porta un riferimento interno (non visibile all'utente come testo grezzo, ma strutturato) alla fonte specifica che la supporta — è ciò che rende possibile, un livello sopra, l'elenco puntuale "Cosa ho consultato" del Modulo Chat: non è un riassunto a posteriori, è tracciato durante la generazione stessa.

### 7.5 Controllo qualità — come si riduce il rischio di risposte non supportate

Dopo la generazione, un passaggio di verifica (un secondo, più economico, richiamo al modello o a un modello dedicato più piccolo — decisione di Cost Engine, sezione 15) controlla che ogni affermazione con citazione interna sia effettivamente supportata dalla fonte dichiarata. Un'affermazione senza supporto verificabile viene o rimossa dalla risposta finale o esplicitamente marcata a bassa confidenza (mai lasciata passare silenziosamente come se fosse equivalente al resto).

---

## 8. Model Router

### 8.1 Criteri di scelta

| Fattore | Come influenza la scelta |
|---|---|
| Complessità del task | Classificazione/estrazione → modello leggero; ragionamento multi-step/generazione articolata → modello avanzato |
| Costo | A parità di qualità sufficiente per il task, preferenza al modello più economico (Cost Engine, sezione 15) |
| Velocità richiesta | Un'interazione conversazionale in tempo reale tollera meno latenza di un report generato in background |
| Qualità richiesta | Task con impatto economico/legale (Finance, contratti) instradati sempre verso il modello di qualità più alta disponibile, indipendentemente dal costo |
| Disponibilità/salute del modello | Se un modello è degradato o non risponde, fallback automatico (sezione 8.3) |

### 8.2 Budget di contesto per modello

Ogni modello registrato nel Router dichiara la propria finestra di contesto massima — il Context Engine (sezione 3.4) riceve questo limite come vincolo per la compressione, mai un prompt costruito ignorando il limite del modello che lo riceverà.

### 8.3 Fallback e resilienza

Se il modello primario per una categoria di task non risponde entro un timeout configurato o restituisce un errore, il Router tenta automaticamente un modello alternativo dichiarato come fallback per quella categoria — con un evento `ModelFallbackTriggered` per l'osservabilità, mai un fallimento silenzioso che degrada la qualità senza che nessuno se ne accorga.

### 8.4 Come si sostituisce un modello senza toccare il resto della piattaforma

Ogni modello è registrato nel Router con: identificatore interno, categoria di task supportate, costo per token, finestra di contesto, endpoint. Nessun altro componente (Prompt Orchestrator, Reasoning Pipeline) conosce quale modello specifico è dietro una categoria — comunicano sempre con il Router per categoria astratta ("modello di ragionamento avanzato"), mai con un modello nominato — è la messa in pratica diretta del principio Model Agnostic della Costituzione.

---

## 9. Multi-Agent Coordinator

### 9.1 Distinzione dall'Agent Orchestrator della Costituzione

L'Agent Orchestrator (Costituzione, sezione 2.2) decide **quali** agenti coinvolgere per una richiesta. Il Multi-Agent Coordinator, qui, gestisce **come** lavorano insieme una volta assegnati: sincronizzazione, priorità, timeout, recupero errori — un livello di orchestrazione più tecnico e generico, riutilizzato indipendentemente da quali agenti specifici siano coinvolti.

### 9.2 Assegnazione dei compiti e prevenzione di duplicazioni

Ogni sotto-task derivato da una richiesta complessa (Planning Engine, sezione 10) è assegnato a un solo agente responsabile — mai due agenti che lavorano sullo stesso sotto-task in parallelo per ridondanza (spreco di costo, sezione 15, e rischio di risposte incoerenti tra loro). Se un agente fallisce il proprio sotto-task, la riassegnazione (a se stesso in retry, o a un fallback) è esplicita e tracciata, mai un secondo agente che parte silenziosamente in parallelo senza sapere che il primo sta ancora lavorando.

### 9.3 Gestione dei conflitti tra agenti

Estensione tecnica del Modulo Chat (sezione 6.4): quando due agenti restituiscono esiti in tensione, il Coordinator non media né sceglie — **presenta esplicitamente entrambi** al livello superiore (Reasoning Pipeline) che li inoltra all'utente secondo il pattern già stabilito nella Product Bible.

### 9.4 Timeout e recupero

Ogni agente ha un timeout massimo per sotto-task (differenziato per complessità dichiarata) — allo scadere, il Coordinator considera il sotto-task fallito e applica la politica di fallback configurata (riprova, salta con nota esplicita di lacuna, o interrompe l'intero piano se il sotto-task è bloccante) — mai un'attesa indefinita che lascerebbe l'utente senza risposta.

---

## 10. Planning Engine

### 10.1 Scomposizione di problemi complessi

Una richiesta che il Reasoning Pipeline classifica come "multi-step" (non risolvibile con una singola chiamata a Tool) viene scomposta in un **piano esplicito**: una sequenza ordinata di sotto-task, ciascuno con un agente/Tool responsabile e le proprie dipendenze dichiarate (il sotto-task B può richiedere l'esito del sotto-task A).

### 10.2 Verifica di ogni passaggio

Dopo ogni sotto-task completato, il Planning Engine verifica che l'esito sia coerente con quanto atteso prima di procedere al successivo — se un passaggio produce un risultato inatteso (es. un dato che rende il passo successivo del piano non più sensato), il piano viene **rivisto**, non eseguito ciecamente fino alla fine secondo la sequenza originale.

### 10.3 Modifica del piano in corso

Il piano non è immutabile una volta creato: se emergono nuove informazioni durante l'esecuzione (es. un Tool restituisce un dato che rende un passo successivo superfluo), il Planning Engine può rimuovere, aggiungere o riordinare passi rimanenti — sempre con un log esplicito del cambiamento e del motivo (Auditability).

### 10.4 Interruzione e ripresa

Un piano in esecuzione può essere interrotto (dall'utente, o da un timeout complessivo) e ripreso in un secondo momento senza perdere lo stato già raggiunto — reso possibile dalla persistenza esplicita dello stato del piano (memoria degli agenti, sezione 4) distinta dalla sola esecuzione in corso in memoria volatile.

---

## 11. Reasoning Pipeline — il flusso che orchestra tutto il resto

### 11.1 Le otto fasi

```
1. Analisi della richiesta      → cosa vuole l'utente, letteralmente
2. Comprensione                 → intento classificato (Prompt Orchestrator, sez. 2.1)
3. Recupero contesto             → Context Engine (sez. 3)
4. Pianificazione                → se necessario, Planning Engine (sez. 10)
5. Utilizzo dei Tool              → Tool Execution Engine (sez. 12), eventualmente
                                    coordinato da Multi-Agent Coordinator (sez. 9)
6. Verifica                      → Confidence Engine (sez. 13) + controllo RAG (sez. 7.5)
7. Generazione risposta           → formattazione finale per l'utente
8. Spiegazione                   → assemblaggio del blocco "Perché?" (Costituzione, Chat)
```

### 11.2 Controllo qualità prima di mostrare la risposta

Nessuna risposta raggiunge l'utente senza aver attraversato le fasi 6 e 8 — anche una risposta molto semplice ("che ore sono nel fuso orario di Tokyo?") attraversa comunque un controllo di confidenza (seppur rapido/economico), per non creare due percorsi di codice — uno "controllato" e uno "veloce ma non verificato" — che nel tempo divergerebbero in modo imprevedibile.

---

## 12. Tool Execution Engine

### 12.1 Selezione e validazione

Il Tool da invocare è determinato dal Planning Engine/Agent Orchestrator, non "scelto liberamente" dal modello linguistico tra un elenco aperto — coerente col principio Tool First: il modello propone un'intenzione, il Tool Execution Engine verifica che esista un Tool corrispondente dichiarato (API Contract, sezione 10) prima di procedere.

### 12.2 Autorizzazioni

Ogni invocazione verifica, in ordine: permesso RBAC dell'utente per conto di cui l'agente opera (mai un permesso "dell'agente" indipendente dall'utente — Domain Model, sezione 9.1), livello di autonomia configurato per quella combinazione azienda/agente/azione/soglia (Costituzione, sezione 5.2). Se una delle due verifiche fallisce, l'esecuzione si ferma **prima** di qualunque effetto collaterale, mai dopo un tentativo parziale.

### 12.3 Rollback, retry, timeout

Coerente con l'API Contract (sezione 10.1): ogni Tool dichiara se è reversibile e la propria finestra di rollback; il Tool Execution Engine è responsabile di rispettare questa finestra e di eseguire il rollback su richiesta esplicita, mai automaticamente se non richiesto. Retry con backoff per errori transitori (es. un servizio esterno temporaneamente non disponibile), mai per errori di validazione (che non si risolverebbero ripetendo la stessa richiesta invariata).

### 12.4 Audit

Ogni invocazione, esito, e — se applicabile — rollback genera `AgentActionExecuted`/`AgentActionFailed` (API Contract, sezione 5.2) — questo componente è, di fatto, il produttore tecnico diretto di quell'evento.

### 12.5 Coerenza con Domain Model e API Contract

Il Tool Execution Engine non duplica mai le regole di business (un invariante come "Invoice immutabile" non è riverificato qui con logica propria) — invoca sempre l'endpoint API corrispondente (sezione 3 dell'API Contract), che a sua volta applica le regole del Domain Model. Il Tool Execution Engine è un **client** dell'API pubblica, non un percorso di accesso privilegiato al database.

---

## 13. Confidence Engine

### 13.1 Calcolo del livello di confidenza

Combina: qualità e quantità delle fonti utilizzate (RAG, sezione 7.5), presenza di conflitti irrisolti tra fonti (sezione 7.3), complessità dell'inferenza richiesta (una risposta diretta da un dato strutturato ha confidenza intrinsecamente più alta di una dedotta da pattern), risultato del controllo di supporto post-generazione (sezione 7.5).

### 13.2 Le tre soglie, coerenti con la Costituzione (mai una percentuale)

**Alta** → risposta mostrata direttamente. **Media** → risposta mostrata con la dichiarazione esplicita di incertezza già prevista a livello di prodotto. **Bassa** → la Reasoning Pipeline non genera una risposta definitiva ma una richiesta di chiarimento o una dichiarazione esplicita di impossibilità (mai una risposta a bassa confidenza presentata con lo stesso peso di una ad alta confidenza).

### 13.3 Richieste di conferma legate alla confidenza

Un'azione (non solo un'informazione) con confidenza Media o Bassa richiede sempre conferma umana **indipendentemente dal livello di autonomia configurato** per quel Tool — l'autonomia si applica al rischio dell'azione stessa, la confidenza si applica alla certezza del ragionamento che l'ha proposta: sono due dimensioni distinte che si combinano, non si sostituiscono a vicenda (livello di autonomia alto non significa "esegui anche se non sei sicuro").

---

## 14. Safety Engine

### 14.1 Controllo prompt (input)

Rilevamento di tentativi di prompt injection (istruzioni nascoste in un documento allegato o in un'email che tentano di alterare il comportamento dell'agente, coerente col principio già stabilito nel comportamento generale di Claude in questa stessa conversazione, qui formalizzato come componente esplicito della piattaforma) — contenuto esterno (documenti, email di terzi) è sempre trattato come dato da analizzare, mai come istruzione da eseguire, indipendentemente da cosa affermi di essere.

### 14.2 Controllo output

Verifica che la risposta generata non contenga dati che l'utente specifico non dovrebbe vedere secondo RBAC/Scope (doppio controllo rispetto a quello già fatto in fase di Context Engine — stessa ridondanza intenzionale già motivata in sezione 2.4) e non contenga azioni implicite non dichiarate (un testo che descrive un'azione già eseguita quando in realtà è solo proposta, incoerenza che comprometterebbe la fiducia).

### 14.3 Gestione dei dati sensibili

Dati di categoria HR o altre categorie protette (Domain Model, sezione 7.4) non entrano mai nel contesto di un agente che non ne ha esplicito bisogno per il task corrente, anche se tecnicamente accessibili a livello di permesso base dell'utente — principio del minimo privilegio applicato non solo a chi può vedere un dato, ma a quando un agente lo recupera davvero.

### 14.4 Limiti di autonomia — enforcement finale

Il Safety Engine è l'ultimo checkpoint prima dell'esecuzione effettiva di un Tool ad alto rischio — anche se Planning Engine, Multi-Agent Coordinator e Tool Execution Engine hanno già verificato tutto correttamente, questo componente esegue una verifica indipendente e ridondante della soglia di autonomia, proprio perché è l'ultima barriera prima di un effetto reale sul mondo (coerente con "vince sempre il controllo umano", principio ribadito in ogni singolo modulo della Product Bible).

---

## 15. Cost Engine

### 15.1 Routing intelligente per costo

Collabora col Model Router (sezione 8) fornendo il fattore costo come input alla decisione — non decide da solo, informa la decisione insieme a qualità e velocità richieste.

### 15.2 Caching

Risposte a domande frequenti con lo stesso contesto (es. "quanto abbiamo fatturato oggi?" chiesto due volte nella stessa ora) possono essere servite da cache invece di rigenerate — con invalidazione automatica alla prima modifica di un dato rilevante (un nuovo evento che tocca lo stesso ambito invalida la cache, mai una cache a tempo fisso che rischia di mostrare dati superati).

### 15.3 Riutilizzo dei risultati intermedi

Se un Planning Engine ha già recuperato un dato per un sotto-task precedente nella stessa esecuzione, un sotto-task successivo che necessita dello stesso dato lo riusa invece di richiederlo di nuovo al Context Engine — ottimizzazione interna alla singola esecuzione, distinta dalla cache cross-richiesta di sezione 15.2.

### 15.4 Compressione del contesto come leva di costo

La compressione già descritta (Context Engine, sezione 3.4) ha anche un effetto diretto sul costo (meno token inviati al modello) — le due motivazioni (qualità del contesto e costo) sono allineate, non in tensione, il che semplifica la progettazione: non serve bilanciare due obiettivi opposti su questo punto specifico.

### 15.5 Bilanciamento qualità/costo — chi decide

Le soglie di bilanciamento (es. "per questa categoria di task, preferisci sempre il modello più economico salvo che la confidenza scenda sotto X") sono configurabili a livello di piattaforma da AIOS, non lasciate a un'ottimizzazione automatica non supervisionata — coerente con i limiti di apprendimento (sezione 17).

---

## 16. Observability AI

### 16.1 Metriche per componente

Per ogni componente di questa architettura: latenza, tasso di errore, volume di chiamate — con dashboard dedicate distinte da quelle di business (Product Bible Analytics) perché il pubblico è diverso (AI Engineer, non utente finale).

### 16.2 Tracing

Ogni richiesta genera una traccia end-to-end (stesso standard OpenTelemetry dell'API Contract) che attraversa tutti i dieci componenti coinvolti — essenziale per capire, ad esempio, se la latenza percepita dall'utente viene dal Context Engine (recupero dati lento) o dal modello stesso (generazione lenta).

### 16.3 Qualità delle risposte — la metrica più difficile e più importante

Oltre a latenza ed errori tecnici, il sistema traccia proxy di qualità: tasso di risposte a bassa confidenza (sezione 13.2), tasso di correzione umana su un'azione proposta (quanto spesso un utente modifica ciò che un agente ha proposto prima di approvarlo — segnale indiretto ma prezioso di dove il sistema "sbaglia" sistematicamente), tasso di conflitti rilevati tra fonti (sezione 7.3). Queste metriche alimentano l'Apprendimento (sezione 17) come segnale, mai come azione diretta e automatica sul comportamento del sistema.

---

## 17. Apprendimento — cosa AIOS può e non deve mai imparare da solo

### 17.1 Cosa può apprendere automaticamente

- **Pattern aggregati** (memoria strategica, Company DNA) — ricalcolati periodicamente da dati oggettivi già accaduti, mai da un singolo episodio isolato.
- **Preferenze personali osservate** (memoria personale, sezione 4) — es. "questo utente preferisce risposte brevi" — osservazioni di stile, mai di sostanza decisionale.
- **Pesi di ranking del Context Engine** (sezione 3.3) aggiustati su basi statistiche aggregate di quali fonti si sono storicamente rivelate più utili — non una singola interazione, un pattern misurato nel tempo su volumi significativi.

### 17.2 Cosa non deve mai apprendere/modificare automaticamente

- **Le regole di business** (invarianti del Domain Model, soglie di autonomia configurate) — modificabili solo da un'azione umana esplicita in Settings, mai dedotte e applicate autonomamente dal sistema sulla base dell'osservazione del comportamento.
- **I template di prompt in produzione** — un template può essere *proposto* per revisione sulla base delle metriche (sezione 16.3), ma la promozione a produzione è sempre un atto umano con passaggio attraverso l'ambiente di test (coerente con Step 1, versionamento dei prompt come codice).
- **Il proprio livello di autonomia** — un agente non può mai auto-innalzare la soglia configurata per le proprie azioni, indipendentemente da quanto "bene" stia performando secondo le metriche osservate.
- **La matrice di permessi RBAC** — mai modificata se non da un'azione amministrativa umana esplicita.

### 17.3 Perché questa distinzione è il punto più importante dell'intero documento

Un sistema che migliora nel proprio stile di comunicazione o nella qualità del recupero dati costruisce fiducia. Un sistema che modifica autonomamente le proprie regole di autorizzazione o il proprio comportamento decisionale distrugge fiducia alla prima scoperta, anche se il cambiamento fosse nel merito ragionevole — perché viola il principio di controllo umano che è il fondamento dell'intera Product Bible e della Costituzione. La linea di demarcazione qui tracciata (stile/ranking sì, regole/soglie/permessi no) è quindi non un dettaglio tecnico ma la traduzione operativa diretta di quel principio.

---

## 18. Evoluzione

- **Nuovi modelli AI:** il Model Router (sezione 8.4) è il solo punto di integrazione — un nuovo modello si registra con le proprie caratteristiche, nessun altro componente richiede modifiche.
- **Nuovi AI Agent:** consumano Tool e Context Engine già esistenti (coerente col Domain Model, sezione 9.2) — un nuovo agente è configurazione, non nuova architettura.
- **Nuovi Tool:** si aggiungono al catalogo dell'API Contract (sezione 10) — il Tool Execution Engine li esegue con lo stesso meccanismo generico, mai codice specifico per Tool.
- **Nuove memorie:** la tabella di sezione 4 è estensibile per righe (un nuovo tipo di memoria con le proprie regole di creazione/retention) senza toccare il funzionamento delle memorie esistenti.
- **Nuovi motori RAG:** l'architettura a fasi (sezione 7.1) permette di sostituire singole fasi (es. un algoritmo di reranking più avanzato) senza ridisegnare l'intera pipeline.
- **Nuove modalità multimodali:** ogni nuova modalità (es. video in tempo reale) entra come nuova fonte per il Context Engine con la propria pipeline di estrazione, coerente col principio di unificazione già stabilito nel Modulo Chat (sezione 9.1) — non richiede un nuovo Reasoning Pipeline.

---

## Conclusione

### Principi architetturali definitivi
1. Ogni componente cognitivo ha un confine di responsabilità netto, riusabile e sostituibile indipendentemente — stesso principio dei Bounded Context applicato al livello cognitivo.
2. Il livello che decide *come* parlare a un modello non dipende mai a sua volta da un modello (Prompt Orchestrator deterministico e dichiarativo).
3. Confidenza e autonomia sono due dimensioni distinte che si combinano, mai equivalenti tra loro.
4. Il Tool Execution Engine è sempre un client dell'API pubblica, mai un percorso privilegiato verso il database.
5. La linea tra ciò che il sistema può apprendere automaticamente (stile, ranking) e ciò che non può mai modificarsi da solo (regole, soglie, permessi) è il principio più importante dell'intero documento.

### Decisioni prese
- Reranking come stadio distinto dal retrieval vettoriale grezzo, sempre presente nella RAG Pipeline.
- Verifica ridondante e intenzionale di RBAC/Scope sia nel Context Engine sia nel Safety Engine, non un solo controllo.
- Cache delle risposte con invalidazione basata su eventi, mai a tempo fisso.

### Decisioni rimandate
- La scelta tecnica specifica dell'algoritmo di reranking e del modello di embedding (materia di sperimentazione del Research Team, non di architettura a priori).
- I valori numerici esatti delle soglie di timeout e retry per ogni componente (da calibrare con dati reali di produzione).

### Dipendenze con Domain Model e API Contract
Ogni Tool eseguito da questo sistema è un endpoint già catalogato nell'API Contract; ogni entità nel Knowledge Graph è un Aggregate Root già definito nel Domain Model — questo documento non introduce nuove entità di business, solo l'infrastruttura cognitiva che le usa.

### Impatto sul database fisico
Il Knowledge Graph temporale (sezione 5.2) richiede uno schema con colonne di validità esplicite su ogni tabella di relazione; la memoria degli agenti (sezione 4) richiede uno store veloce e volatile distinto dal database transazionale principale.

### Impatto sul Business Brain
Questo documento **è** l'implementazione tecnica del Business Brain descritto nella Costituzione — non esiste un Business Brain "oltre" a questi componenti, sono la stessa cosa vista a un livello di dettaglio superiore.

### Impatto sui frontend web, desktop e mobile
Gli indicatori di stato AI (Product Bible, "Sto cercando...", "Sto ragionando...") corrispondono esattamente alle fasi 3-5 della Reasoning Pipeline (sezione 11.1) — il frontend deve poter ricevere via streaming (API Contract, sezione 9) un evento per ciascuna transizione di fase, non solo un indicatore di caricamento generico.

### Impatto sull'infrastruttura
Vector Platform e Knowledge Graph richiedono capacità di calcolo dedicate e scalabili indipendentemente dal resto del backend (coerente Step 1) — pianificare fin da subito una separazione di risorse infrastrutturali tra "servizi applicativi" e "servizi cognitivi", perché i loro pattern di scaling sono strutturalmente diversi (picchi di CPU/GPU per l'AI, picchi di I/O per il resto).

### Linee guida per l'implementazione
Costruire per primi Model Router e Tool Execution Engine come componenti indipendenti e testabili in isolamento (con modelli/Tool finti per il test) — sono i due componenti da cui ogni altro dipende operativamente, e un'instabilità qui si propagherebbe a cascata su tutto il resto del sistema cognitivo.

---

## Prossimo modulo (in attesa di approvazione)

Con l'AI Platform Architecture approvata, ti chiedo di nuovo come preferisci proseguire: **schema fisico del database** (Engineering Bible), ripresa della **Product Bible con HR**, oppure un nuovo modulo tecnico che approfondisca specificamente l'infrastruttura di calcolo per Vector Platform e Knowledge Graph a scala.
