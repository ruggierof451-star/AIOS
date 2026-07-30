# AIOS Engineering Bible
## Modulo 5 — System Runtime & Execution Architecture

**Stato:** Bozza per approvazione
**Dipende da:** Domain Model, API Contract & Event Catalog, AI Platform Architecture, Infrastructure & Cloud Platform Architecture
**Prossimo modulo dopo approvazione:** da concordare

---

## Nota di metodo — cosa aggiunge questo documento rispetto ai precedenti

I quattro documenti precedenti hanno descritto **componenti** (Bounded Context, endpoint, Model Router, cluster). Questo documento descrive **comportamento nel tempo**: cosa succede, in che ordine, con quali garanzie, quando qualcosa va storto, quando due cose accadono insieme. È il documento che risponde alla domanda "e se...?" per ogni componente già progettato — non introduce nuove entità o servizi, orchestra quelli già definiti.

---

## 1. Principi runtime

1. **Consistency Before Speed** — dove i due principi sono in tensione (sezione 8), il sistema sceglie sempre la correttezza dei dati sopra il tempo di risposta, coerente con l'accuratezza già imposta in Finance e Inventory.
2. **Ogni operazione è idempotente per costruzione**, non per disciplina di implementazione lasciata al singolo sviluppatore (API Contract, sezione 1.3 — qui esteso a ogni livello di esecuzione, non solo l'API esterna).
3. **Nessuno stato vive solo nella memoria di un processo** — ogni componente stateless (Infrastructure, principio 1.3) implica che il runtime deve poter interrompere e riprendere qualunque operazione lunga senza perdita, appoggiandosi sempre a uno stato esplicitamente persistito.
4. **Il fallimento è un caso previsto, non un'eccezione** — ogni pipeline descritta in questo documento ha un percorso esplicito per il caso in cui un passo fallisce, mai un "percorso felice" documentato da solo con la gestione errori lasciata all'implementazione.

---

## 2. System Lifecycle — il ciclo di vita di una richiesta

### 2.1 Le nove fasi

```
1. Ingresso           → richiesta arriva all'Entry Layer (Infrastructure, sez. 2.1)
2. Autenticazione      → verifica identità (API Contract, sez. 2)
3. Autorizzazione      → RBAC/Scope (Domain Model, sez. 7)
4. Routing            → verso il Bounded Context/servizio competente
5. Orchestrazione      → Request Orchestration Engine (sez. 3)
6. Esecuzione         → Execution Pipeline (sez. 4)
7. Risposta           → all'utente, sincrona o via streaming
8. Aggiornamento memoria → Business Brain Update (sez. 8), Memory Update (sez. 9)
9. Logging            → traccia completa (sez. 13)
```

### 2.2 Perché "Aggiornamento memoria" è una fase distinta dalla risposta, non parte di essa

Un errore comune da evitare esplicitamente: far dipendere la risposta all'utente dal completamento dell'aggiornamento del Business Brain. Le due cose sono **disaccoppiate**: l'utente riceve la risposta appena l'esecuzione (fase 6) produce un esito valido; l'aggiornamento della memoria (fase 8) procede in modo asincrono subito dopo, tramite lo stesso pattern Transactional Outbox già stabilito nell'API Contract — un ritardo nell'ingestione della memoria non deve mai tradursi in una latenza percepita dall'utente.

---

## 3. Request Orchestration

### 3.1 Classificazione e identificazione del dominio

Ogni richiesta in ingresso è classificata (stessa logica del Modulo 3, Reasoning Pipeline, qui applicata anche a richieste non conversazionali come una chiamata API diretta da un client) per determinare: quale Bounded Context è il proprietario primario, se sono coinvolti Bounded Context secondari (es. un ordine tocca CRM, Finance, Inventory), se è richiesto un coinvolgimento AI o è un'operazione puramente CRUD.

### 3.2 Individuazione dei servizi coinvolti e gestione delle dipendenze

Per richieste multi-contesto, il Request Orchestration Engine costruisce un **grafo di dipendenza** dei passi necessari (non necessariamente lineare — alcuni passi possono procedere in parallelo se non dipendono l'uno dall'altro) prima di iniziare l'esecuzione, non "man mano che si scopre cosa serve" — questo permette di rilevare in anticipo un'impossibilità (es. un servizio richiesto non disponibile) prima di aver già eseguito effetti collaterali parziali.

### 3.3 Timeout e retry a livello di orchestrazione

Ogni passo del grafo ha un timeout dichiarato in base al tipo di operazione (una query dati ha timeout molto più breve di un'invocazione AI complessa) — il superamento del timeout di un passo non distruttivo attiva retry secondo la stessa policy di backoff già stabilita (API Contract, sezione 5.2); il superamento del timeout di un passo con effetti collaterali già avvenuti attiva invece il meccanismo di compensazione (sezione 8).

---

## 4. Execution Pipeline

### 4.1 Le nove fasi per singola operazione

```
Validazione (schema + business rule) → Recupero contesto (Modulo 3, Context Engine)
   → Recupero memoria pertinente → Attivazione AI (se richiesta)
   → Eventuale uso Tool (sez. 6) → Verifica autorizzazioni (ripetuta qui,
     non solo alla fase 3 del lifecycle — vedi 4.2)
   → Aggiornamento dati (Aggregate Root, Domain Model sez. 5)
   → Pubblicazione evento (sez. 7) → Risposta
```

### 4.2 Perché l'autorizzazione è verificata due volte (lifecycle fase 3 e qui fase 4.2)

Non è ridondanza superflua: la fase 3 del lifecycle verifica che l'utente possa accedere all'operazione richiesta in generale; questa seconda verifica, immediatamente prima dell'aggiornamento dati effettivo, controlla che le condizioni **non siano cambiate nel frattempo** (tra l'inizio della richiesta e il momento dell'effetto reale possono passare secondi in cui, ad esempio, un permesso è stato revocato) — stesso principio di ridondanza intenzionale su un punto di sicurezza critico già visto nel Modulo 3 (Context Engine + Safety Engine).

### 4.3 Validazione in due livelli

Validazione di schema (formato dei dati, indipendente dal contesto di business) sempre prima della validazione di regola di business (invarianti del Domain Model, es. "non modificare un'Invoice Emessa") — un fallimento di schema non arriva mai a toccare la logica di business, per fallire nel modo più veloce ed economico possibile quando l'errore è banale.

---

## 5. AI Agent Execution

### 5.1 Attivazione

Un agente si attiva per uno dei tre motivi: invocazione diretta in una conversazione (Modulo Chat), reazione a un Domain Event a cui è iscritto (Modulo 3, sezione 9.2), o schedulazione periodica (es. ricalcolo della memoria strategica). Ogni attivazione porta un contesto di provenienza esplicito, tracciato per audit (mai un'attivazione "anonima" di cui non si sa il motivo).

### 5.2 Priorità e concorrenza

Più agenti possono essere attivi contemporaneamente per la stessa Organization (es. il Sales Agent risponde a una richiesta Chat mentre il Finance Agent processa una riconciliazione bancaria schedulata) — questo è normale e atteso, **fino a quando non toccano lo stesso Aggregate Root**: in quel caso si applica il meccanismo di concorrenza generale (sezione 10), nessuna eccezione speciale per gli agenti rispetto a scritture umane concorrenti.

### 5.3 Sincronizzazione nel Multi-Agent Coordinator

Quando un piano (Modulo 3, Planning Engine) richiede più agenti in sequenza o in parallelo con un punto di sincronizzazione, il Multi-Agent Coordinator attende esplicitamente il completamento dei passi da cui un passo successivo dipende, con un timeout per ciascuna attesa (sezione 5.5) — mai un'attesa indefinita.

### 5.4 Cancellazione

Un'esecuzione di agente può essere cancellata (dall'utente, o da un'interruzione di piano superiore, Modulo 3 sezione 10.4) — la cancellazione è **cooperativa**: l'agente verifica un segnale di cancellazione ai confini naturali della propria esecuzione (prima di ogni nuova invocazione di Tool), mai un'interruzione violenta a metà di un'operazione con effetti collaterali già in corso, che lascerebbe lo stato in condizione incerta.

### 5.5 Timeout

Ogni esecuzione di agente ha un timeout massimo complessivo (oltre alla somma dei timeout dei singoli passi, sezione 3.3) — allo scadere, l'esecuzione viene considerata fallita, con comunicazione esplicita all'utente (mai un'attesa che si prolunga silenziosamente) e possibilità di ripresa se lo stato del piano lo consente (Modulo 3, sezione 10.4).

---

## 6. Tool Execution — il ciclo runtime dettagliato

### 6.1 I sei passaggi in sequenza runtime

```
Selezione (già decisa da Planning/Reasoning, qui solo eseguita)
   → Validazione schema input (API Contract, sez. 10)
   → Autorizzazione (RBAC + soglia di autonomia, doppio controllo come sez. 4.2)
   → Esecuzione (chiamata all'endpoint API corrispondente, Modulo 3 sez. 12.5)
   → Verifica esito (coerente con quanto atteso, o anomalia da segnalare)
   → Audit (sempre, indipendentemente dall'esito — Modulo 3, sez. 12.4)
```

### 6.2 Tracciabilità end-to-end di un singolo Tool

Ogni invocazione porta un identificatore univoco propagato dall'inizio alla fine (`correlation_id`, API Contract sezione 1.4) che collega: la richiesta che l'ha originata, il piano che l'ha programmata, l'evento generato dall'esecuzione, e la voce di audit — permette, dato un qualunque punto di questa catena, di ricostruire l'intera storia in entrambe le direzioni.

### 6.3 Rollback in pratica

Se un Tool reversibile (API Contract, sezione 10.1) viene annullato entro la propria finestra, il runtime esegue l'operazione di compensazione dichiarata dal Tool stesso (mai un rollback generico "annulla l'ultima operazione" a livello di database, che sarebbe pericoloso in un sistema con scritture concorrenti nel frattempo) — il rollback è esso stesso una nuova operazione tracciata con il proprio evento, mai una cancellazione silenziosa della traccia precedente (coerente col principio "mai eliminare, sempre storicizzare").

---

## 7. Event Execution — il ciclo di vita di un Domain Event

### 7.1 Dalla pubblicazione al consumo completo

```
Pubblicazione (Transactional Outbox, garantita solo dopo commit della transazione
  locale che l'ha generata)
   → Distribuzione (Event Bus, Infrastructure sez. 6)
   → Consumo parallelo da ogni sottoscrittore (ordine garantito solo per stesso
     aggregate_id, Infrastructure sez. 6.2)
   → Deduplicazione lato consumatore (per event_id)
   → Applicazione dell'effetto
   → Conferma di consumo (offset avanzato solo dopo effetto applicato con successo,
     mai prima — altrimenti un crash del consumatore tra ricezione e applicazione
     perderebbe l'evento)
```

### 7.2 Retry e Dead Letter Queue in runtime

Un consumatore che fallisce l'applicazione di un evento non blocca gli altri consumatori dello stesso evento (ogni sottoscrizione è indipendente) né blocca il consumo di eventi successivi non correlati (solo eventi sulla stessa chiave di partizionamento, stesso `aggregate_id`, rispettano l'ordine e quindi potrebbero accodarsi in attesa) — un fallimento isolato non deve mai propagarsi a un blocco generale del sistema.

### 7.3 Replay in runtime — quando si attiva realmente

Non un meccanismo sempre attivo, ma attivabile esplicitamente (da un operatore, con audit) in scenari come: correzione di un bug nel Knowledge Graph Writer che richiede di ricostruire lo stato da un punto storico, o onboarding di un nuovo consumatore che deve recuperare lo storico rilevante — il replay ha sempre un `correlation_id` proprio distinto dagli eventi originali, per non confondere, nei log, un evento rigenerato con uno realmente accaduto in quel momento.

---

## 8. Transazioni — consistenza forte vs eventuale

### 8.1 Il criterio di scelta

**Consistenza forte** (transazione ACID locale) per operazioni contenute in un solo Aggregate Root di un solo Bounded Context (es. la creazione di un'Invoice con le sue righe — Domain Model, sezione 5). **Consistenza eventuale** (coordinata tramite eventi, pattern Saga) per operazioni che attraversano più Bounded Context (es. Order→Invoice→Stock) — non è una scelta di comodo, è una conseguenza diretta del confine tra Bounded Context stabilito nel Domain Model: se richiedesse consistenza forte tra contesti, quel confine non sarebbe più reale a livello architetturale.

### 8.2 Pattern Saga per operazioni distribuite

Ogni sequenza multi-contesto (es. Order confermato → riserva Stock → genera Invoice) è modellata come Saga: una sequenza di passi locali, ciascuno con una **compensazione dichiarata** (es. se la riserva di Stock fallisce dopo che l'Order è già confermato, la compensazione è "annulla la conferma dell'Order" tramite un nuovo evento, non una cancellazione diretta del record).

### 8.3 Gestione delle anomalie in una Saga

Se un passo fallisce in modo non recuperabile con retry, il runtime esegue la catena di compensazione all'indietro sui passi già completati con successo — ogni compensazione è essa stessa tracciata (sezione 7.1) e genera una notifica se l'anomalia richiede attenzione umana (coerente col Notification Center) piuttosto che una correzione silenziosa che nasconderebbe un problema sistemico ricorrente.

### 8.4 Perché mai una transazione distribuita a due fasi (2PC) tra Bounded Context

Un 2PC richiederebbe di bloccare risorse su più servizi contemporaneamente in attesa di conferma reciproca — incompatibile con la scalabilità orizzontale e con la tolleranza ai guasti già stabilite come principi cardine (Infrastructure). Il pattern Saga, pur introducendo una finestra di inconsistenza temporanea (mitigata comunicando chiaramente lo stato "in elaborazione" quando pertinente), è l'unica scelta coerente con il resto dell'architettura.

---

## 9. Business Brain Update

### 9.1 Quando nasce nuova conoscenza

Ogni Domain Event con contenuto rilevante per la conoscenza aziendale (praticamente ogni evento tranne quelli puramente tecnici di sistema) genera un aggiornamento: nuovo nodo/arco nel Knowledge Graph (Modulo 3, sezione 5), eventuale nuovo embedding (Modulo 3, sezione 6) — sempre in modo asincrono rispetto alla transazione originale (sezione 2.2).

### 9.2 Aggiornamento vs archiviazione

Coerente col principio "mai sovrascrivere" già ribadito in ogni documento: un aggiornamento crea sempre una nuova versione con validità temporale, la precedente è marcata conclusa (archiviata logicamente), mai eliminata a meno di un obbligo normativo esplicito (Domain Model, sezione 8.3).

### 9.3 Coerenza con il Domain Model

Il Business Brain non ha mai una propria verità divergente da quella degli Aggregate Root — se un'interrogazione al Knowledge Graph restituisse un dato che risultasse incoerente con lo stato attuale del database transazionale (possibile per un breve intervallo data la natura asincrona dell'aggiornamento, sezione 9.1), il sistema tratta sempre il database transazionale come fonte di verità superiore, e questo scarto viene monitorato come metrica di salute (Osservabilità, sezione 13) — un ritardo di ingestione troppo esteso è un'anomalia da correggere, non uno stato accettabile a lungo termine.

---

## 10. Memory Update — ciclo di vita runtime della memoria (Modulo 3, sezione 4, qui a livello di comportamento)

### 10.1 Consolidamento

La memoria personale e di team (Modulo 3) non si aggiorna ad ogni singola osservazione: un processo di **consolidamento periodico** (non in tempo reale) valuta se un pattern osservato più volte merita di diventare una voce di memoria persistita — evita che un singolo comportamento anomalo isolato venga scambiato per una preferenza stabile.

### 10.2 Come si evitano duplicazioni

Prima di scrivere una nuova voce di memoria (personale, di team, strategica), il processo di consolidamento verifica l'esistenza di una voce semanticamente equivalente già presente (tramite la stessa ricerca per similarità del Vector Platform) — se esiste, la aggiorna/rafforza invece di crearne una seconda, coerente col principio di deduplicazione già visto per Party/Product nel Domain Model, qui esteso alla memoria stessa.

### 10.3 Eliminazione e retention runtime

L'eliminazione (su richiesta esplicita, Settings) è un'operazione sincrona e immediata per la memoria personale (l'utente deve vedere l'effetto subito, requisito di fiducia); per la memoria aziendale/strategica, l'eliminazione segue invece il processo più cauto già descritto nel Domain Model (soft delete, poi eliminazione reale solo per obbligo normativo).

---

## 11. Error Handling — comportamento per categoria di errore

| Categoria | Rilevazione | Gestione | Comunicazione all'utente |
|---|---|---|---|
| Timeout | Superamento soglia dichiarata (sez. 3.3) | Retry se non distruttivo, altrimenti compensazione (sez. 8.3) | "Sto impiegando più tempo del previsto..." poi esito o errore esplicito |
| Errore AI (modello non risponde/qualità insufficiente) | Model Router (Modulo 3, sez. 8.3) | Fallback automatico a modello alternativo | Trasparente se il fallback ha successo; altrimenti dichiarazione esplicita di incertezza |
| Errore Tool | Verifica esito (sez. 6.1) | Retry per errori transitori, mai per errori di validazione | Messaggio coerente con Error Model (API Contract, sez. 6) |
| Errore rete | Timeout di connessione | Retry con backoff, circuit breaker se il servizio remoto è costantemente irraggiungibile (per non continuare a sovraccaricarlo) | Distinzione esplicita "problema nostro" vs "problema del servizio esterno" quando identificabile (Product Bible Finance, sez. 14) |
| Errore database | Connessione o vincolo violato | Transazione abortita e ritentata se transitorio; se un invariante è violato, mai un retry (l'errore si ripeterebbe identico) | Messaggio specifico se l'errore è un invariante di business noto (es. Invoice immutabile) |
| Errore Event Bus | Fallimento di pubblicazione | Il Transactional Outbox garantisce che l'evento non si perda: ritentato dal processo di relay finché non pubblicato con successo | Nessun impatto diretto sull'utente se la transazione locale è comunque riuscita |
| Errore autenticazione | Token non valido/scaduto | Richiesta di nuova autenticazione (refresh automatico se possibile, sez. 2.2 API Contract) | Messaggio chiaro, mai un errore generico "qualcosa è andato storto" |
| Errore autorizzazione | RBAC/Scope/soglia di autonomia negativa | Nessun retry (non si risolverebbe da solo) | Messaggio esplicito sul motivo (coerente con Explainability, mai un 403 muto) |

### 11.1 Principio comune a ogni riga della tabella

Ogni errore, indipendentemente dalla categoria, attraversa sempre le stesse quattro fasi (rilevazione → gestione → logging → comunicazione) — nessuna categoria di errore ha un percorso "speciale" che salta il logging o la comunicazione, coerente con Auditability ed Explainability come principi non negoziabili in nessuna circostanza, inclusi gli scenari di guasto.

---

## 12. Concorrenza

### 12.1 Richieste simultanee sullo stesso Aggregate Root

Locking ottimistico come default (verifica di versione al momento della scrittura, non un lock pessimistico che bloccherebbe altre richieste in attesa) — coerente con la scalabilità: un lock pessimistico esteso degraderebbe le performance sotto carico concorrente reale. Un conflitto rilevato (due scritture concorrenti sulla stessa versione) genera un errore esplicito 409 (API Contract, sezione 1.5) restituito al chiamante, che decide se ritentare con i dati aggiornati.

### 12.2 Modifiche concorrenti umane vs AI

Se un utente umano e un Agent tentano di modificare lo stesso Aggregate Root nello stesso istante, non esiste priorità automatica dell'uno sull'altro — vince chi commette la transazione per primo secondo il locking ottimistico (sezione 12.1), l'altro riceve il conflitto e, se è l'Agent, la Reasoning Pipeline decide se ritentare con i dati aggiornati o segnalare il conflitto all'utente (coerente col principio "controllo umano sempre vincente": l'Agent non forza mai la propria scrittura ignorando un conflitto rilevato).

### 12.3 Sincronizzazione tra passi di un piano multi-agente

Già descritta in sezione 5.3 — qui si aggiunge: se due passi paralleli dello stesso piano tentano di scrivere sullo stesso Aggregate Root (caso che il Planning Engine dovrebbe idealmente evitare in fase di costruzione del piano, ma che il runtime deve comunque gestire in sicurezza), si applica lo stesso locking ottimistico generale, mai un trattamento privilegiato per il fatto di appartenere allo stesso piano.

---

## 13. Performance — strategie runtime

### 13.1 Caching

A più livelli (coerente con Modulo 3, Cost Engine, e Infrastructure, Cache AI): risposta intera per richieste identiche recenti, risultati intermedi di un piano in esecuzione (riuso nella stessa richiesta), dati di riferimento a bassa variabilità (es. anagrafica prodotti) con invalidazione guidata da eventi, mai a tempo fisso.

### 13.2 Batching

Operazioni della stessa natura verso lo stesso servizio esterno (es. più embedding da generare) sono accorpate in un'unica chiamata quando il servizio lo supporta, invece di N chiamate singole — riduce sia la latenza aggregata sia il costo (Modulo 3, sezione 15).

### 13.3 Lazy loading

Il Context Engine (Modulo 3) recupera solo i dati effettivamente necessari per la fase corrente di ragionamento, non l'intero grafo di relazioni di un'entità in anticipo "per sicurezza" — coerente con la compressione del contesto già descritta, qui applicata come strategia di performance oltre che di qualità del prompt.

### 13.4 Parallelizzazione

Passi indipendenti di un piano (sezione 3.2, grafo di dipendenza) sono sempre eseguiti in parallelo quando non esiste una dipendenza dichiarata tra loro — mai una sequenzialità di default "per semplicità" quando il grafo dimostra che due passi potrebbero procedere insieme.

### 13.5 Streaming come strategia di performance percepita

Anche quando il tempo totale di elaborazione non si riduce, mostrare progressivamente lo stato (Modulo 3, indicatori "Sto cercando...", "Sto ragionando...") riduce la latenza *percepita* — una scelta di UX resa possibile solo da un'architettura runtime che pubblica eventi di avanzamento in tempo reale (API Contract, sezione 9), non un artificio di interfaccia sconnesso dal backend.

---

## 14. Osservabilità runtime

### 14.1 Trace end-to-end di un'intera richiesta complessa

Un singolo `trace_id` attraversa: Request Orchestration, ogni Bounded Context coinvolto, ogni componente AI Platform attivato, ogni Tool eseguito, ogni evento pubblicato e consumato — permette di rispondere con precisione a "perché questa richiesta ha impiegato 8 secondi?" identificando esattamente quale fase ha contribuito quanto.

### 14.2 Metriche runtime specifiche (oltre a quelle già di Infrastructure e AI Platform)

Tempo medio per fase del lifecycle (sezione 2.1), tasso di attivazione di compensazioni Saga (sezione 8.2 — un tasso crescente è un segnale di instabilità in un'integrazione specifica da indagare), tasso di conflitti di concorrenza (sezione 12.1 — utile per capire se un Aggregate Root specifico è un punto di contesa che meriterebbe un ripensamento del proprio confine).

### 14.3 Diagnostica distribuita

Ogni fallimento runtime (sezione 11) è correlabile, tramite `correlation_id`, a tutti gli altri eventi/chiamate dello stesso flusso — un SRE che investiga un incidente non deve mai ricostruire manualmente la sequenza da log sparsi in servizi diversi.

---

## 15. Scenari completi

### 15.1 Creazione di un nuovo cliente

Utente compila form (o lo chiede in Chat) → Execution Pipeline: validazione schema → validazione business (verifica duplicati, Domain Model sezione 3.3) → creazione Aggregate Party + proiezione Customer (transazione locale ACID, un solo Bounded Context) → pubblicazione `CustomerCreated` (Transactional Outbox) → risposta immediata all'utente → **asincrono:** Business Brain crea il nodo nel Knowledge Graph, Notification valuta se generare una notifica (probabilmente no, evento a basso impatto), Analytics aggiorna il proprio storico.

### 15.2 Emissione di una fattura

Da un Order confermato → Execution Pipeline in Finance: validazione (l'Order esiste ed è nello stato corretto) → creazione Invoice in stato Bozza → transizione a Emessa (transazione ACID locale, invariante verificato: mai modificabile dopo) → pubblicazione `InvoiceIssued` → **Saga a valle:** Documents genera il PDF (reagendo all'evento), CRM aggiorna lo storico cliente, Business Brain aggiorna la memoria operativa — se la generazione del PDF fallisse, non compensa l'emissione della fattura (che resta valida e immutabile, essendo un documento fiscale), ma genera un'anomalia da correggere manualmente (rigenerazione PDF), esempio di una compensazione che non è "annullamento" ma "correzione mirata".

### 15.3 Riordino automatico del magazzino

`StockLevelChanged` sotto soglia (Inventory) → Inventory Agent si attiva (reazione a evento, sezione 5.1) → Context Engine recupera storico vendite, lead time fornitore, forecast → invoca (tramite Tool) verifica liquidità presso Finance Agent (chiamata sincrona interna tra agenti, non un evento — perché la risposta è necessaria immediatamente per costruire la proposta, non un fatto da notificare in futuro) → Confidence Engine valuta l'affidabilità della proposta → proposta mostrata all'utente (livello di autonomia 2, Preparazione) → **se approvata:** Tool Execution crea il Purchase Order → pubblica `PurchaseOrderCreated` → Business Brain aggiorna.

### 15.4 Domanda complessa alla Chat AI

Coerente col Modulo 3, sezione 11, qui a livello runtime: Request Orchestration classifica come richiesta AI complessa → Context Engine (parallelo: Knowledge Graph + Vector Platform + Memory Engine) → Prompt Orchestrator compila → Model Router seleziona modello di ragionamento avanzato → generazione con RAG (fonti verificate, sezione 7 Modulo 3) → Confidence Engine → se azione richiesta, Tool Execution con verifica autorizzazioni → risposta in streaming con fasi di stato visibili (sezione 13.5).

### 15.5 Workflow composto da più AI Agent

Planning Engine scompone in sotto-task → Multi-Agent Coordinator assegna (es. Sales Agent + Inventory Agent in parallelo, essendo indipendenti) → sincronizzazione al punto in cui entrambi gli esiti sono necessari per il passo successivo (es. generazione preventivo finale) → se un agente supera il timeout (sezione 5.5), il piano viene rivisto (Modulo 3, sezione 10.3) invece di attendere indefinitamente — es. procede con un'assunzione dichiarata esplicitamente invece del dato mancante, segnalata come tale nella confidenza finale.

### 15.6 Errore durante un'operazione distribuita

Order confermato → riserva Stock riesce → generazione Invoice fallisce per un errore non transitorio (es. dati fiscali del cliente incompleti, un errore di validazione che un retry non risolverebbe) → Saga attiva compensazione: la riserva di Stock viene rilasciata (nuovo evento `StockReservationReleased`, non una modifica diretta al record originale) → l'Order torna a uno stato che richiede intervento (non "confermato" pulito, ma "in attesa di correzione dati fiscali") → notifica esplicita all'utente responsabile con motivo chiaro e azione suggerita (completare i dati fiscali mancanti).

### 15.7 Ripristino automatico dopo un guasto

Un nodo applicativo smette di rispondere agli health check (Infrastructure, sezione 4.4) → orchestratore lo rimuove dal bilanciamento e ne crea uno nuovo → le richieste in corso su quel nodo al momento del guasto: quelle già confermate a livello di transazione locale sono intatte (mai perse, per costruzione ACID); quelle in corso non ancora confermate vengono ritentate dal client secondo idempotenza (API Contract) senza duplicare effetti → il Multi-Agent Coordinator, se un'esecuzione di agente era in corso su quel nodo, la considera fallita per timeout (sezione 5.5) e applica la stessa logica di ripresa/fallimento già descritta, **senza trattamento speciale per il fatto che la causa sia stata un guasto infrastrutturale invece di un errore applicativo** — stessa gestione uniforme, coerente col principio che il fallimento è sempre un caso previsto (principio 4).

---

## 16. Evoluzione

- **Milioni di richieste contemporanee:** ogni fase del lifecycle (sezione 2) e ogni pattern qui descritto (Saga, locking ottimistico, caching) sono già pensati per operare senza stato condiviso tra istanze — la crescita del volume è assorbita dall'autoscaling infrastrutturale (Modulo 4) senza richiedere modifiche al comportamento qui descritto.
- **Nuovi AI Agent, nuovi Tool, nuovi modelli:** si inseriscono nei meccanismi generici già descritti (attivazione per evento, Tool Execution generico, Model Router) — questo documento non ha mai fatto riferimento a un agente o Tool specifico nel descrivere il *meccanismo*, solo negli scenari di esempio (sezione 15), quindi l'aggiunta di nuovi non richiede una revisione del comportamento runtime.
- **Nuove modalità di esecuzione distribuita:** il pattern Saga (sezione 8) è già la base per qualunque futura composizione multi-servizio più complessa — un'evoluzione naturale (es. Saga con passi condizionali più sofisticati) estende il pattern, non lo sostituisce.

---

## Conclusione

### Principi runtime definitivi
1. La risposta all'utente non aspetta mai l'aggiornamento della memoria/Business Brain — sono fasi disaccoppiate per costruzione.
2. Consistenza forte solo dentro un singolo Aggregate Root; ogni operazione multi-contesto è una Saga con compensazione esplicita, mai una transazione distribuita a blocco.
3. Il fallimento è sempre un caso prima-classe: ogni pipeline ha un percorso di errore documentato quanto il percorso di successo.
4. Nessuna categoria di errore salta mai logging o comunicazione all'utente, inclusi i guasti infrastrutturali.
5. Un conflitto di concorrenza tra un umano e un Agent si risolve con le stesse regole di un conflitto tra due utenti umani — nessuna priorità automatica dell'AI.

### Decisioni prese
- Locking ottimistico come meccanismo di concorrenza di default, mai pessimistico salvo eccezioni motivate future.
- Pattern Saga con compensazione esplicita per ogni operazione multi-Bounded Context, mai 2PC.
- Cancellazione cooperativa degli agenti (mai violenta a metà esecuzione).

### Decisioni rimandate
- I valori numerici esatti di timeout per categoria di operazione (da calibrare con dati reali di produzione, coerente con quanto già rimandato nel Modulo 3).
- Casi limite di Saga con più di tre passi e dipendenze condizionali complesse — trattati qui nel caso generale, da approfondire con esempi concreti quando emergeranno dai moduli applicativi ancora da progettare.

### Dipendenze con Domain Model, API Contract, AI Platform e Infrastructure
Questo documento non introduce alcuna nuova entità, evento, componente cognitivo o risorsa infrastrutturale — orchestra nel tempo esclusivamente ciò che i quattro documenti precedenti hanno già definito, rendendo esplicito il comportamento dinamico che li lega.

### Impatto sul Physical Database Schema
Il locking ottimistico (sezione 12.1) richiede una colonna di versione esplicita su ogni tabella di Aggregate Root; il pattern Saga richiede una tabella di stato per ogni istanza di Saga in corso (quali passi completati, quali compensazioni eventualmente necessarie) — dettaglio da formalizzare nel modulo di schema fisico quando affrontato.

### Impatto sul backend
Ogni servizio deve implementare il ciclo a nove fasi (sezione 4.1) in modo uniforme — una libreria condivisa per l'Execution Pipeline generica (non riscritta diversamente da ogni team di Bounded Context) è la raccomandazione più importante di questo documento a livello implementativo.

### Impatto sul frontend e mobile
Il client deve gestire esplicitamente lo stato "operazione in corso di compensazione/correzione" (sezione 15.6) come stato di prima classe nell'interfaccia, non solo "successo" o "errore" — coerente con la UX già progettata nella Product Bible per gli stati intermedi, qui confermata come necessità architetturale e non solo di design.

### Linee guida per gli sviluppatori
Ogni nuovo endpoint o Tool deve dichiarare esplicitamente, fin dalla progettazione, se le proprie operazioni sono confinate a un solo Aggregate Root (consistenza forte) o attraversano più contesti (richiede Saga con compensazione dichiarata) — questa domanda va posta in fase di design, mai scoperta durante l'implementazione, perché cambia radicalmente il pattern da usare.

---

## Prossimo modulo (in attesa di approvazione)

Ti ripropongo ancora la scelta, ormai rimasta in sospeso per diversi moduli: **schema fisico del database**, ripresa della **Product Bible con HR**, oppure **Security & Compliance**. In alternativa, se preferisci, posso suggerirti io una priorità: a questo punto dell'Engineering Bible, lo schema fisico del database è probabilmente il passo più naturale, perché Domain Model, API Contract e questo documento runtime hanno già accumulato diversi dettagli (colonna di versione, tabelle di stato Saga, partizionamento eventi) che troverebbero lì la propria collocazione concreta — ma la scelta resta tua.
