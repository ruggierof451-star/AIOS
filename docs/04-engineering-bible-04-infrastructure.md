# AIOS Engineering Bible
## Modulo 4 — Infrastructure & Cloud Platform Architecture

**Stato:** Bozza per approvazione
**Dipende da:** Architettura Tecnica (Step 1), Domain Model, API Contract & Event Catalog, AI Platform Architecture
**Prossimo modulo dopo approvazione:** da concordare

---

## Nota di metodo — la relazione con la scelta cloud dello Step 1

Nello Step 1 avevamo raccomandato AWS come provider di riferimento. Questo documento non ritratta quella raccomandazione, ma la tratta correttamente per quello che è: **una decisione di implementazione**, distinta dall'**architettura**, che deve restare descrivibile in termini di pattern (container, orchestrazione, object storage, message bus) validi su qualunque cloud moderno o anche on-premise per i clienti Enterprise che lo richiedono (coerente col piano Enterprise "Dedicated Cloud / On-Prem" già definito commercialmente). Ogni sezione userà quindi terminologia di pattern, con l'implementazione AWS di riferimento citata solo come esempio, mai come dipendenza architetturale.

---

## 1. Principi infrastrutturali

1. **Cloud Agnostic per architettura, non per convenienza dichiarata a parole** — ogni componente di questo documento deve poter essere rimappato su un provider diverso sostituendo solo l'implementazione, mai il modello concettuale.
2. **Zero Trust come default, non come eccezione** — nessuna chiamata tra servizi è implicitamente fidata per il solo fatto di essere "interna alla rete".
3. **Ogni componente applicativo è stateless per default** — lo stato vive esplicitamente negli strati di persistenza dedicati (sezione 5), mai nella memoria di un'istanza di servizio, condizione necessaria per lo scaling orizzontale e il self-healing.
4. **I carichi AI sono isolati dai carichi applicativi per costruzione** — coerente con quanto già anticipato nel Modulo 3 (AI Platform Architecture), qui reso infrastruttura concreta.

---

## 2. Architettura generale — i livelli e il flusso di una richiesta

### 2.1 Livelli

```
┌─────────────────────────────────────────────────────────┐
│  EDGE LAYER — CDN, DNS, protezione DDoS                   │
├─────────────────────────────────────────────────────────┤
│  ENTRY LAYER — API Gateway, Load Balancer                 │
├─────────────────────────────────────────────────────────┤
│  APPLICATION LAYER — servizi di dominio (container)        │
│  (un deployment per Bounded Context, Engineering Bible 1)  │
├─────────────────────────────────────────────────────────┤
│  AI LAYER — servizi cognitivi (isolati, GPU-aware)         │
│  (Model Router, Vector Platform, Knowledge Graph...)       │
├─────────────────────────────────────────────────────────┤
│  MESSAGING LAYER — Event Bus, code, stream processing      │
├─────────────────────────────────────────────────────────┤
│  DATA LAYER — Postgres, Vector DB, ClickHouse, Redis,      │
│               Object Storage                               │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Flusso di una richiesta end-to-end (esempio: domanda in Chat che richiede un Tool)

```
Client (web/desktop/mobile)
   → Edge Layer (CDN per asset statici, la chiamata API prosegue)
   → Entry Layer (API Gateway: autenticazione, rate limit — API Contract sez. 11.1)
   → Application Layer (servizio del Bounded Context pertinente riceve la richiesta,
     es. il servizio Chat/Conversation)
   → AI Layer (Reasoning Pipeline, Modulo 3 — chiamate a Context Engine, Model Router)
   → Messaging Layer (se l'azione genera un Domain Event, pubblicato sull'Event Bus)
   → Application Layer (il Bounded Context di destinazione consuma l'evento,
     es. Inventory reagisce a un OrderConfirmed)
   → Data Layer (persistenza in ogni strato pertinente)
   → risposta che risale fino al client, spesso via streaming (API Contract sez. 9)
     per mostrare stato di elaborazione in tempo reale
```

Ogni freccia di questo flusso attraversa un confine di rete esplicito, verificato secondo Zero Trust (sezione 13) — nessun salto è "gratuito" dal punto di vista della sicurezza solo perché interno all'infrastruttura.

---

## 3. Container Platform

### 3.1 Perché container e non VM dedicate per servizio

Un container incapsula un servizio (un modulo NestJS di un Bounded Context, Step 1) con le proprie dipendenze in un'unità immutabile e riproducibile — condizione necessaria per l'autoscaling rapido (avviare una nuova istanza richiede secondi, non i minuti di una VM) e per la coerenza tra ambienti (sezione 14: stessa immagine da sviluppo a produzione, mai una ricostruzione diversa per ambiente).

### 3.2 Immagini e registry

Ogni immagine è versionata immutabilmente (stesso principio già visto per eventi e template di prompt: mai sovrascritta, ogni build è una nuova versione taggata), conservata in un registry privato con scansione automatica delle vulnerabilità prima che un'immagine possa essere promossa verso staging o produzione — nessuna immagine con vulnerabilità note (sopra una soglia di gravità configurata) raggiunge produzione senza un'eccezione esplicita e motivata.

### 3.3 Isolamento e gestione risorse

Ogni container dichiara limiti espliciti di CPU/memoria (mai "senza limite", che rischierebbe di far degradare l'intero nodo condiviso per un servizio che consuma più del previsto) — un servizio che tenta di superare il proprio limite viene isolato/riavviato dall'orchestratore (sezione 4), non lasciato libero di impattare i vicini.

### 3.4 Autoscaling a livello di container

Ogni servizio scala orizzontalmente in base a metriche proprie (CPU, numero di richieste in coda, per i servizi AI anche la coda di richieste di inferenza — Modulo 3, Cost Engine) — non un unico criterio di scaling uniforme per tutta la piattaforma, perché un servizio Finance e un servizio di generazione AI hanno pattern di carico strutturalmente diversi.

---

## 4. Orchestrazione

### 4.1 Cluster e nodi

Pool di nodi separati per tipo di carico (coerente col principio "AI isolata dal resto"): **nodi applicativi** (CPU-ottimizzati, per i servizi di dominio) e **nodi AI** (con accesso a GPU quando richiesto da inferenza locale, o comunque isolati anche se l'inferenza è verso un servizio esterno, per non far competere il traffico AI con quello applicativo sulla stessa rete/nodo).

### 4.2 Scheduling

L'orchestratore assegna ogni container al pool di nodi appropriato in base a etichette dichiarate dal servizio stesso (`workload-type: application` vs `workload-type: ai-cognitive`) — nessuna assegnazione manuale caso per caso, la regola è dichiarativa e uniforme.

### 4.3 Service discovery e bilanciamento

Ogni servizio è raggiungibile tramite un nome logico stabile (mai un indirizzo IP diretto, che cambierebbe ad ogni riavvio di istanza) risolto dall'orchestratore verso l'istanza sana più disponibile — il bilanciamento tiene conto anche della salute del servizio (health check attivo), non solo della distribuzione del carico.

### 4.4 Rolling update, rollback, self-healing

Un nuovo rilascio sostituisce le istanze gradualmente (poche alla volta), verificando la salute di ogni nuova istanza prima di procedere con le successive — se una nuova istanza fallisce l'health check, il rollout si ferma automaticamente e le istanze già aggiornate vengono ripristinate alla versione precedente **senza intervento umano manuale nella fase di emergenza immediata** (l'intervento umano avviene dopo, per la diagnosi). Un'istanza che smette di rispondere agli health check in qualunque momento (non solo durante un rilascio) viene automaticamente terminata e ricreata dall'orchestratore — self-healing come comportamento di base, non un'eccezione per i soli rilasci.

### 4.5 Crescita senza downtime

Coerente con 4.4: l'aggiunta di capacità (nuovi nodi, nuove istanze) non richiede mai un arresto del servizio esistente — è un'estensione, mai una sostituzione bloccante.

---

## 5. Storage — strategia di persistenza (estensione infrastrutturale di Step 1 e Modulo 3)

| Tipologia | Ruolo | Requisiti | Replica |
|---|---|---|---|
| Database transazionale (Postgres) | Aggregate Root, fonte di verità (Domain Model) | Bassa latenza in scrittura, integrità ACID | Primario + repliche di lettura, failover automatico |
| Knowledge Graph (su Postgres/estensione a grafo) | Relazioni tra entità (Modulo 3) | Query di attraversamento rapide | Stessa strategia del database transazionale, con indici dedicati |
| Vector Database | Memoria semantica (Modulo 3) | Ricerca per similarità a bassa latenza su volumi crescenti | Cluster dedicato, scalabilità orizzontale indipendente dal database transazionale |
| Object Storage | Documenti, allegati, immagini | Alta durabilità, costo contenuto per volumi enormi | Replica geografica multi-zona per default |
| File Storage (temporaneo) | File in elaborazione (es. OCR in corso) | Bassa latenza, non necessita alta durabilità a lungo termine | Locale al servizio di elaborazione, effimero |
| Cache (Redis) | Sessioni, Workspace, cache di risposta (Modulo 3, Cost Engine) | Bassissima latenza | Cluster con failover, dati non critici se persi (rigenerabili) |
| Session Store | Stato di Workspace attivo (Costituzione) | Persistenza breve, alta disponibilità | Stesso cluster Redis, namespace dedicato |
| Log | Osservabilità (sezione 11) | Alto volume in scrittura, retention configurabile | Storage a basso costo ottimizzato per scrittura sequenziale |
| Backup | Continuità operativa (sezione 9) | Immutabilità, isolamento dal sistema primario | Multi-region, air-gapped per la copia più critica |
| Analytics Storage (ClickHouse) | Aggregazioni di business (Product Bible Analytics) | Query aggregate veloci su volumi enormi | Cluster distribuito, non richiede la stessa durabilità estrema del database transazionale (è derivato, ricostruibile) |

**Principio guida della tabella:** ogni tipo di dato ha requisiti di durabilità, latenza e costo diversi — usare un'unica tecnologia per tutto costringerebbe a un compromesso peggiore per ciascuno; questa classificazione, già introdotta nel Domain Model (sezione 12), qui riceve i requisiti infrastrutturali specifici (SLA di replica, strategia di failover) per ciascuna.

---

## 6. Messaggistica — il backbone asincrono

### 6.1 Event Bus e Message Queue — quando l'uno, quando l'altra

**Event Bus** (stream, tipo Kafka) per eventi di dominio che più consumatori devono poter leggere indipendentemente e potenzialmente ri-processare nel tempo (Business Brain, Analytics, Automation — tutti leggono lo stesso evento per scopi diversi). **Message Queue** (punto-punto) per comandi di lavoro con un solo destinatario e consumo distruttivo (es. un task di elaborazione OCR in coda) — distinzione netta per non forzare un unico paradigma su due bisogni diversi.

### 6.2 Ordering

Gli eventi relativi alla stessa entità (stesso `aggregate_id`) sono garantiti in ordine di pubblicazione (partizionamento dello stream per chiave di entità) — eventi di entità diverse non hanno garanzia di ordine reciproco, né ne hanno bisogno.

### 6.3 Retry, Dead Letter Queue, Event Replay

Coerente con l'API Contract (sezione 5.2): backoff esponenziale, DLQ dopo N tentativi falliti con allerta automatica. In aggiunta qui, a livello infrastrutturale: capacità di **replay** di uno stream storico (utile per ricostruire lo stato del Knowledge Graph dopo un bug corretto, o per popolare un nuovo consumatore che si aggiunge in futuro) — richiede una retention dello stream sufficientemente lunga (non solo pochi giorni), decisione di costo bilanciata contro il beneficio di poter "riprocessare la storia" quando necessario.

### 6.4 Idempotenza a livello infrastrutturale

Ogni consumatore di evento verifica l'`event_id` (API Contract, sezione 5.1) contro un log di eventi già processati prima di applicare l'effetto — la garanzia "almeno una consegna" del message bus (tipica di sistemi come Kafka) diventa così, a livello applicativo, "esattamente un effetto", requisito già dichiarato nell'API Contract e qui supportato infrastrutturalmente.

---

## 7. AI Infrastructure

### 7.1 Isolamento dal backend applicativo

Coerente col principio 1.4: i servizi cognitivi (Modulo 3) girano su pool di risorse dedicati, con la propria capacità di scaling indipendente — un picco di richieste conversazionali intense non deve degradare la capacità di risposta di Finance o CRM, e viceversa un picco applicativo non deve rallentare l'inferenza AI.

### 7.2 GPU Cluster e scheduling dei modelli

Se AIOS ospita inferenza propria (oltre a modelli esterni via API, Modulo 3 Model Router), un pool GPU dedicato con scheduling che assegna i carichi in base a priorità dichiarata (una richiesta conversazionale interattiva ha priorità più alta di un ricalcolo batch della memoria strategica) — mai un'unica coda indifferenziata dove un job batch pesante può far attendere una richiesta interattiva dell'utente.

### 7.3 Model Registry

Infrastruttura di supporto al Model Router (Modulo 3, sezione 8): un registro versionato di quali modelli sono disponibili, le loro caratteristiche tecniche (finestra di contesto, costo), e il loro stato di salute operativa in tempo reale — il Model Router legge da qui, non da configurazione statica, per poter reagire a un modello degradato senza richiedere un nuovo rilascio di codice.

### 7.4 Cache AI

Livello di cache dedicato (distinto dalla cache Redis generale) per risposte/embedding riutilizzabili (Modulo 3, Cost Engine sezione 15.2) — separato perché i pattern di accesso e le politiche di invalidazione sono specifiche del dominio cognitivo, non generiche come una cache di sessione.

### 7.5 Vector Platform e Knowledge Graph — infrastruttura dedicata

Entrambi su cluster propri, scalabili indipendentemente dal database transazionale (sezione 5) — un'azienda con un volume enorme di documenti storici non deve richiedere di scalare l'intero database Postgres, solo il cluster vettoriale pertinente.

### 7.6 Isolamento dei carichi AI per tenant

Un tenant Enterprise con un volume di richieste AI molto più alto della media non deve poter degradare la qualità del servizio AI per i tenant Starter sulla stessa infrastruttura condivisa — quota e rate limiting (API Contract, sezione 11.2) applicati anche a livello infrastrutturale sui servizi cognitivi, non solo sull'API pubblica esterna.

---

## 8. Scalabilità

### 8.1 Orizzontale come default, verticale come eccezione

Ogni servizio applicativo e cognitivo scala aggiungendo istanze (orizzontale) — lo scaling verticale (istanza più potente) è riservato a componenti che per natura non si distribuiscono facilmente (es. il nodo primario di scrittura di Postgres, prima che una strategia di read replica/sharding intervenga secondo il percorso già delineato nello Step 1).

### 8.2 Isolamento dei tenant sotto carico

Coerente con 7.6, esteso a tutta la piattaforma: i limiti per Organization (non globali) garantiscono che nessun singolo tenant possa, involontariamente o meno, degradare l'esperienza degli altri — principio già citato nello Step 1 come rischio da mitigare, qui reso meccanismo infrastrutturale concreto (rate limiting, quote di risorse per tenant a livello di orchestrazione).

### 8.3 Gestione dei picchi

Autoscaling predittivo dove possibile (pattern di carico storicamente noti, es. inizio settimana lavorativa) combinato con autoscaling reattivo per eventi imprevisti — mai affidarsi solo al reattivo, che ha sempre un ritardo minimo di attivazione che in un picco improvviso può degradare temporaneamente l'esperienza.

---

## 9. Disponibilità

### 9.1 Obiettivi (senza legarli a un fornitore specifico)

Alta disponibilità per i servizi applicativi core (obiettivo di uptime nel range enterprise standard, il numero esatto è materia commerciale già anticipata nel materiale di prodotto come "99.99% obiettivo" per il piano Enterprise, non ridiscusso qui), con degradazione elegante per i componenti non critici (es. un rallentamento del Model Router in caso di sovraccarico del provider di inferenza esterno non deve bloccare l'intera piattaforma — la Chat può segnalare un ritardo invece di un errore totale).

### 9.2 Failover

Ogni componente critico (database primario, Event Bus, API Gateway) ha un percorso di failover automatico verso una replica/istanza secondaria, con un tempo di rilevamento e commutazione misurato e monitorato (Osservabilità, sezione 11) — mai un failover "teorico" mai testato realmente (vedi sezione 9.4).

### 9.3 Ridondanza geografica

Almeno due zone di disponibilità all'interno della region primaria (Europa, coerente con Step 1) per ogni componente critico; per i clienti Enterprise con requisiti di continuità più stringenti, opzione di replica multi-region (coerente col piano "Cloud dedicato" già commercialmente definito).

### 9.4 Test periodici di failover — non solo teoria

Coerente col principio Disaster Recovery: un failover non testato periodicamente in condizioni controllate (simulazione di guasto pianificata, non solo in caso di incidente reale) è, di fatto, un failover di cui non si conosce realmente l'affidabilità — pianificare esercitazioni periodiche è parte integrante di questa architettura, non un'aggiunta opzionale successiva.

---

## 10. Backup e Disaster Recovery

### 10.1 Strategia (estensione operativa di Step 1)

3-2-1 confermato: tre copie, due supporti/tecnologie diverse, una copia isolata (air-gapped o comunque non raggiungibile dagli stessi percorsi di accesso del sistema primario, per resistere anche a uno scenario di compromissione delle credenziali di produzione, non solo a un guasto hardware).

### 10.2 Continuità specifica del Business Brain

Il Knowledge Graph e la memoria vettoriale (Modulo 3) richiedono una strategia di backup distinta dal database transazionale puro: **sono ricostruibili in parte dall'Event Log** (replay, sezione 6.3) ma un ripristino completo solo da replay sarebbe lento su volumi grandi — quindi anche questi strati hanno snapshot propri, non solo l'affidamento teorico alla ricostruibilità da eventi.

### 10.3 Recovery Point Objective e Recovery Time Objective

Definiti per categoria di dato secondo la classificazione di sezione 5: il database transazionale (dati finanziari, coerente con l'accuratezza richiesta nel Modulo Finance) ha gli obiettivi più stringenti di tutta la piattaforma; i dati analitici derivati (ClickHouse) tollerano un RPO/RTO più ampio perché ricostruibili dalla fonte transazionale in caso di perdita.

### 10.4 Ripristino dei dati — sempre con audit

Ogni operazione di restore (Domain Model, sezione 11.3, "Restore da stato Archiviato") a livello di singola entità applicativa è distinta da un disaster recovery infrastrutturale completo — quest'ultimo genera comunque una voce di audit di sistema, mai un ripristino silenzioso di cui non resta traccia di quando e perché è avvenuto.

---

## 11. Osservabilità

### 11.1 I tre pilastri, coerenti con API Contract sezione 12 e Modulo 3 sezione 16, qui a livello infrastrutturale

Logging centralizzato per ogni componente (applicativo e cognitivo), tracing distribuito end-to-end (stesso `trace_id` dalla richiesta client fino all'ultimo servizio coinvolto), metriche con soglie di allerta automatiche.

### 11.2 Dashboard operative distinte per pubblico

Una dashboard per SRE/DevOps (salute infrastrutturale: CPU, memoria, latenza di rete, stato dei cluster) distinta da quella AI Engineer (Modulo 3, qualità delle risposte, costo per richiesta) distinta da quella di business (Product Bible Analytics) — stesso principio già visto nel Modulo 3: pubblici diversi, dashboard diverse, mai un'unica vista che tenta di servire tutti male.

### 11.3 Alert — instradamento per gravità

Un'anomalia infrastrutturale critica (es. il database primario non risponde) genera un'allerta immediata al team di guardia (on-call); un degrado non critico (es. latenza leggermente sopra la media su un endpoint secondario) genera una segnalazione a bassa priorità aggregata — stesso principio di prioritizzazione già visto nel Notification Center della Product Bible, qui applicato al monitoraggio tecnico.

---

## 12. Sicurezza operativa — Zero Trust

### 12.1 Gestione dei segreti

Nessun segreto (chiave API, credenziale database) in variabili d'ambiente in chiaro o nel codice — sempre in un vault dedicato (Step 1), con accesso concesso a runtime solo al servizio specifico che ne ha bisogno, mai a un intero ambiente indiscriminatamente.

### 12.2 Identità dei servizi e autenticazione tra microservizi

Ogni servizio ha una propria identità crittografica (certificato/token di servizio), verificata ad ogni chiamata interna — **nessuna chiamata tra servizi è fidata per il solo fatto di provenire dalla rete interna**: è il cuore operativo del principio Zero Trust, distinto dall'autenticazione utente (API Contract, sezione 2) che riguarda invece l'accesso dall'esterno.

### 12.3 Segmentazione della rete

Ogni livello architetturale (sezione 2.1) è in un segmento di rete distinto con regole esplicite su quali comunicazioni sono permesse (es. il livello Data non accetta mai connessioni dirette dall'Edge Layer, solo dall'Application/AI Layer) — segmentazione che riflette l'architettura logica, non una rete piatta con regole aggiunte a posteriori.

### 12.4 Cifratura

In transito (TLS 1.3 ovunque, confermato da Step 1) e a riposo su ogni strato di storage (sezione 5), con gestione delle chiavi di cifratura separata dai dati stessi (mai la chiave nello stesso luogo del dato cifrato).

### 12.5 Auditing infrastrutturale

Distinto dall'Audit Log applicativo (Domain Model, sezione 11): ogni accesso amministrativo all'infrastruttura stessa (un DevOps che si connette a un nodo, una modifica a una regola di rete) è tracciato con lo stesso rigore — l'infrastruttura non è "fuori" dal perimetro di auditability solo perché non è un'azione di business.

---

## 13. Ambienti

### 13.1 I quattro livelli

**Sviluppo** (per singolo sviluppatore/feature, dati sintetici), **Test** (automatizzato, eseguito ad ogni commit), **Staging** (identico a produzione per configurazione, usato per QA manuale e demo interne prima del rilascio — Step 1, confermato qui), **Produzione**.

### 13.2 Ambienti temporanei per feature (Preview Environment)

Per feature complesse che beneficiano di un ambiente isolato di verifica prima del merge (es. un cambiamento sostanziale al Prompt Orchestrator), un ambiente temporaneo generato automaticamente dalla pipeline (sezione 14) e distrutto automaticamente alla chiusura della feature — evita che Staging diventi un collo di bottiglia condiviso conteso tra più feature in sviluppo parallelo.

### 13.3 Coerenza tra ambienti

La stessa immagine container (sezione 3.2) promossa da Test a Staging a Produzione, mai ricostruita diversamente per ciascun ambiente — le uniche differenze legittime tra ambienti sono configurazione (variabili, non codice) e scala (meno istanze in Staging che in Produzione).

---

## 14. Deployment

### 14.1 Pipeline

Commit → build immagine → test automatizzati (API Contract, sezione 13) → scansione sicurezza (sezione 3.2) → deploy automatico in Staging → validazione (automatica + eventuale approvazione umana per rilasci maggiori) → deploy in Produzione.

### 14.2 Canary Release

Per servizi ad alto rischio di regressione (in particolare i servizi cognitivi del Modulo 3, dove un cambiamento di prompt o di routing può avere effetti sottili) — una piccola percentuale di traffico reale instradata alla nuova versione, con monitoraggio attivo delle metriche di qualità (Modulo 3, sezione 16.3) prima di estendere il rilascio al 100% del traffico.

### 14.3 Blue/Green Deployment

Per servizi dove un canary graduale è meno pratico (es. un cambio di schema che richiede coerenza totale) — due ambienti paralleli completi, commutazione istantanea del traffico, con l'ambiente precedente mantenuto attivo per un rollback immediato in caso di problema.

### 14.4 Rollback

Sempre disponibile e testato (non solo teoricamente possibile) per ogni tipo di rilascio — coerente col principio già visto per i Tool (API Contract, sezione 10.1) e per il Prompt Orchestrator (Modulo 3, sezione 2.2): ogni cambiamento ha un percorso di ritorno esplicito.

### 14.5 Approvazioni

Rilasci di routine (fix minori, nuove feature non critiche) procedono automaticamente attraverso la pipeline; rilasci che toccano componenti critici (schema database, motore di autorizzazioni AI, Prompt Orchestrator in produzione) richiedono un'approvazione umana esplicita prima del passaggio a Produzione — stessa disciplina del "controllo umano sempre vincente" già vista in ogni documento precedente, qui applicata al processo di rilascio stesso.

---

## 15. Cost Management

### 15.1 Monitoraggio per componente e per tenant

Costo attribuito non solo per tipo di servizio ma, dove tecnicamente possibile, per Organization — permette di capire se un singolo tenant ha un profilo di costo anomalo rispetto al proprio piano di abbonamento, informazione utile sia per l'ottimizzazione tecnica sia per eventuali decisioni commerciali.

### 15.2 Ottimizzazione GPU

Le risorse GPU (sezione 7.2), tipicamente le più costose dell'infrastruttura, sono monitorate per tasso di utilizzo — uno scheduling che lascia GPU inattive per lunghi periodi è un segnale di sovradimensionamento da correggere, coerente col Cost Engine del Modulo 3 che opera a livello di scelta del modello, qui completato dal lato infrastrutturale dell'allocazione hardware.

### 15.3 Storage e traffico

Le policy di retention (log, sezione 5; eventi per replay, sezione 6.3) bilanciano esplicitamente il valore di conservare i dati più a lungo contro il costo dello storage — decisione rivista periodicamente sulla base dei dati reali di utilizzo, non fissata una volta per sempre.

### 15.4 Limiti come rete di sicurezza, non come restrizione punitiva

Ogni servizio ha un limite massimo di scaling configurato (un tetto oltre il quale l'autoscaling si ferma e genera un'allerta invece di continuare a crescere indefinitamente) — protegge da un costo fuori controllo causato da un bug (es. un ciclo di eventi che si autoalimenta) prima ancora che da un uso legittimo ma sottostimato in fase di pianificazione.

---

## 16. Evoluzione

- **Milioni di utenti, migliaia di aziende:** l'isolamento per tenant (sezione 8.2) e lo storage classificato per tipo (sezione 5) permettono di scalare ogni dimensione indipendentemente — nessun singolo collo di bottiglia architetturale cresce linearmente con ogni nuovo cliente.
- **Migliaia di AI Agent:** l'AI Layer isolato (sezione 7) assorbe la crescita del numero di agenti come crescita di carico sullo stesso tipo di infrastruttura, non come una nuova categoria di infrastruttura da introdurre.
- **Nuovi servizi:** ogni nuovo Bounded Context (Domain Model) si aggiunge come nuovo deployment nell'Application Layer, seguendo esattamente lo stesso pattern di containerizzazione/orchestrazione già stabilito — costo di aggiunta costante, non crescente.
- **Nuovi modelli AI:** assorbiti dal Model Registry (sezione 7.3) e dal pool GPU/inferenza esistente, coerente col Model Router del Modulo 3.
- **Espansione globale, nuovi data center:** la segmentazione di rete (sezione 12.3) e la strategia di regioni multiple (sezione 9.3) sono già progettate per aggiungere una nuova region come estensione dello stesso modello, non come un'architettura parallela da mantenere separatamente.

---

## Conclusione

### Principi infrastrutturali definitivi
1. Architettura descritta per pattern, mai per dipendenza da un singolo fornitore cloud.
2. Ogni servizio è stateless per default; lo stato vive sempre in uno strato di persistenza esplicito e classificato.
3. I carichi AI sono isolati dai carichi applicativi a ogni livello: rete, orchestrazione, costo.
4. Zero Trust significa che nessuna chiamata interna è implicitamente fidata, mai un'eccezione "per comodità".
5. Ogni cambiamento (rilascio, rollback, restore) ha un percorso di ritorno esplicito e testato, mai solo teorico.

### Decisioni prese
- Separazione netta Event Bus (stream, multi-consumatore) vs Message Queue (punto-punto) invece di un unico paradigma di messaggistica.
- Canary release per i servizi cognitivi, Blue/Green per cambi di schema — scelta del meccanismo di rilascio basata sul tipo di rischio, non uniforme per tutta la piattaforma.
- Cache AI dedicata, distinta dalla cache generale Redis.

### Decisioni rimandate
- I numeri esatti di SLA (percentuali di uptime, RPO/RTO in minuti) — da formalizzare in un documento di Service Level Agreement commerciale, distinto da questa architettura tecnica.
- La scelta definitiva tra inferenza AI ospitata internamente (GPU proprie) vs esclusivamente tramite provider esterni — materia di analisi costo/beneficio da condurre con dati reali di volume, non decidibile a tavolino in questa fase.

### Dipendenze con Domain Model, API Contract e AI Platform Architecture
Ogni Bounded Context del Domain Model corrisponde a un deployment nell'Application Layer; ogni evento dell'API Contract attraversa il Messaging Layer qui descritto; ogni componente del Modulo 3 (AI Platform) trova qui la propria collocazione infrastrutturale specifica (AI Layer, sezione 7).

### Impatto sul database fisico
Nessuna nuova entità richiesta — questo documento definisce dove e come i dati già modellati vengono fisicamente ospitati, replicati e protetti.

### Impatto sul backend
Ogni servizio backend deve essere progettato stateless fin dal primo sviluppo (principio 1.3), non adattato successivamente per essere scalabile — un vincolo di sviluppo da comunicare esplicitamente ai team fin dal primo sprint.

### Impatto sul frontend
Nessun impatto diretto sul codice frontend, ma la strategia di streaming (SSE, API Contract) richiede che l'infrastruttura di rete (Load Balancer, API Gateway) supporti correttamente connessioni a lunga durata, non solo richieste request-response brevi — dettaglio spesso sottovalutato che va verificato esplicitamente in fase di configurazione di rete.

### Impatto sulle applicazioni desktop e mobile
La gestione della connettività intermittente (in particolare mobile) richiede che l'infrastruttura lato server sia tollerante a riconnessioni frequenti dello stesso client — coerente con l'idempotenza già richiesta a livello di API Contract, qui è l'infrastruttura di rete/gateway a dover gestire correttamente le riconnessioni senza duplicare stato lato server.

### Linee guida operative per DevOps e SRE
Investire per primo nell'osservabilità (sezione 11) prima ancora di ottimizzare performance o costo — senza visibilità end-to-end, ogni successiva decisione di scaling o di ottimizzazione sarebbe basata su intuizione invece che su dati reali, esattamente l'errore che l'intera Engineering Bible ha cercato di evitare ad ogni livello precedente.

---

## Prossimo modulo (in attesa di approvazione)

Ti chiedo ancora una volta di scegliere la direzione: **schema fisico del database** (la traduzione diretta di Domain Model + questo documento in tabelle Postgres concrete), ripresa della **Product Bible con HR**, oppure un modulo dedicato a **Security & Compliance** (GDPR operativo, certificazioni, gestione delle richieste di cancellazione dati) che completerebbe il quadro di conformità accennato ma non ancora dettagliato in profondità.
