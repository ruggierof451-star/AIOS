# AIOS Engineering Bible
## Modulo 1 — Domain Model & Data Architecture

**Stato:** Bozza per approvazione
**Dipende da:** Architettura Tecnica (Step 1), Costituzione, Product Bible (Home → Inventory)
**Serie:** Nuovo filone documentale, parallelo alla Product Bible — qui si progetta la struttura concettuale dei dati, non l'esperienza utente
**Prossimo modulo dopo approvazione:** API Contract & Event Catalog (definizione puntuale di ogni endpoint e schema evento) oppure prosecuzione della Product Bible (HR) — da confermare

---

## Nota di metodo

Questo documento userà, per necessità di rigore, terminologia di Domain-Driven Design (Bounded Context, Aggregate Root, Value Object, Domain Event). Non è un vezzo accademico: è lo stesso linguaggio con cui, nello Step 1, abbiamo motivato la scelta di organizzare il backend per domini di business e non per tipo tecnico — questo documento è la messa a terra concettuale di quella scelta, la mappa da cui Backend Engineer e Database Engineer deriveranno schema fisico e servizi senza dover reinterpretare decisioni già prese nella Product Bible.

---

## 1. Principi architetturali che governano ogni scelta di questo documento

1. **Un Bounded Context per ogni dominio di business reale**, non per convenienza tecnica — i confini rispecchiano dove il linguaggio e le regole cambiano (es. "cliente" in CRM e "cliente" in Finance condividono l'identità ma hanno regole e responsabilità diverse: questo è gestito con un pattern esplicito, sezione 2.4).
2. **Ogni Aggregate Root è l'unico punto di scrittura consistente per il proprio confine** — nessuna scrittura diretta a un'entità interna a un aggregato che bypassi la radice.
3. **Ogni evento di dominio è il contratto primario tra Bounded Context**, non le chiamate dirette — coerente con l'Event Bus dello Step 1 e col Business Brain della Costituzione.
4. **Multi-tenancy è un attributo di primo livello di ogni entità**, mai un filtro aggiunto a posteriori.
5. **Nulla si cancella per davvero senza un motivo esplicito e un log** — coerente col principio di auditability già stabilito in Finance e Inventory (Product Bible).

---

## 2. Bounded Context — mappa generale

```
┌───────────┐   ┌───────────┐   ┌───────────┐
│ Identity  │   │ Workspace │   │Organization│
└─────┬─────┘   └─────┬─────┘   └─────┬─────┘
      └───────────────┼───────────────┘
                       │  (fondamenta condivise da tutto il resto)
      ┌────────────────┼────────────────┐
      │                │                │
┌─────▼─────┐   ┌──────▼─────┐   ┌──────▼─────┐
│    CRM     │   │  Finance   │   │ Inventory  │   ... HR, Documents, Calendar
└─────┬─────┘   └──────┬─────┘   └──────┬─────┘
      │                │                │
      └────────────────┼────────────────┘
                        │ eventi
              ┌─────────▼──────────┐
              │   AI PLATFORM       │  (Business Brain, Agent Orchestrator,
              │  (Business Brain)   │   Prompt Orchestrator — Costituzione)
              └─────────┬──────────┘
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
┌─────▼─────┐   ┌───────▼──────┐   ┌──────▼─────┐
│ Automation │   │ Notification │   │ Marketplace │
└───────────┘   └──────────────┘   └────────────┘
                        │
              ┌─────────▼──────────┐
              │  Administration     │  (trasversale: audit, billing, RBAC)
              └────────────────────┘
```

Per ciascuno dei quindici Bounded Context, di seguito: responsabilità, confini, relazioni/dipendenze, eventi prodotti e consumati.

### 2.1 Identity

**Responsabilità:** rappresentare "chi" — persone fisiche che accedono al sistema, indipendentemente da quale azienda (tenant) stiano usando in un dato momento. **Confine:** non conosce ruoli o permessi specifici di un'azienda (quello è responsabilità di Workspace/Administration) — conosce solo l'identità autenticabile.
**Dipende da:** nessuno (è tra i contesti più a monte).
**Eventi prodotti:** `UserRegistered`, `UserAuthenticated`, `UserMfaEnabled`, `UserSuspended`.
**Eventi consumati:** nessuno strutturalmente necessario — è un contesto "sorgente".

### 2.2 Workspace

**Responsabilità:** rappresentare il contesto attivo di lavoro di un utente (Costituzione, sezione 6) — quale Organization è selezionata, quale ruolo effettivo, quali moduli visibili.
**Confine:** non contiene dati di business, solo stato di sessione/contesto.
**Dipende da:** Identity, Organization.
**Eventi prodotti:** `WorkspaceSwitched`, `WorkspacePreferencesUpdated`.
**Eventi consumati:** `UserRoleChanged` (da Administration), per invalidare un Workspace quando i permessi effettivi cambiano.

### 2.3 Organization

**Responsabilità:** rappresentare l'azienda cliente (tenant) — la radice di tutto l'isolamento multi-tenant (sezione 6).
**Confine:** possiede l'anagrafica aziendale, la struttura di sedi/dipartimenti, il piano di abbonamento attivo; non possiede dati operativi di business (quelli vivono nei rispettivi Bounded Context, sempre riferiti a un `organization_id`).
**Dipende da:** nessuno.
**Eventi prodotti:** `OrganizationCreated`, `OrganizationPlanChanged`, `BranchAdded`, `DepartmentCreated`.
**Eventi consumati:** nessuno strutturalmente necessario.

### 2.4 Il pattern "Identità condivisa, rappresentazione locale" per Cliente/Fornitore/Persona

Prima di procedere ai contesti applicativi, fisso un pattern trasversale che risolve un'ambiguità evidente: "Cliente Rossi Srl" esiste concettualmente sia in CRM sia in Finance sia in Documents. **Non è la stessa entità duplicata**: esiste un'unica identità anagrafica canonica (Bounded Context **Organization** più precisamente un sotto-contesto "Party/Anagrafica condivisa", che gestisce persone giuridiche e fisiche esterne all'azienda cliente stessa), e ogni Bounded Context applicativo (CRM, Finance...) mantiene una **proiezione locale** di quell'identità con gli attributi e le regole di sua competenza (in CRM: Relationship Score, pipeline; in Finance: condizioni di pagamento, storico fatture). Le proiezioni sono collegate dallo stesso identificatore canonico, mai copie indipendenti che potrebbero divergere silenziosamente — questo è il meccanismo tecnico dietro a ciò che nel Modulo CRM (Product Bible) era descritto come "il Business Brain collega automaticamente le entità".

### 2.5 CRM

**Responsabilità:** relazioni commerciali, pipeline, lead, opportunità, attività commerciali (Product Bible, Modulo 4).
**Confine:** possiede la logica di pipeline/scoring; non possiede la logica finanziaria del preventivo (margine, condizioni di pagamento) — la condivide con Finance tramite il pattern dell'oggetto Preventivo come aggregato condiviso (sezione 2.4 applicata anche agli oggetti transazionali, non solo alle anagrafiche — vedi sezione 5, Aggregate Root Quote).
**Dipende da:** Organization (anagrafica condivisa), Identity (assegnazione a un utente).
**Eventi prodotti:** `LeadCreated`, `LeadScored`, `OpportunityStageChanged`, `QuoteRequested`, `CustomerRelationshipScoreUpdated`.
**Eventi consumati:** `InvoicePaid` (da Finance, per aggiornare lo storico pagamenti nel Relationship Score), `StockLevelChanged` (da Inventory, per la disponibilità mostrata durante la creazione di un'offerta).

### 2.6 Finance

**Responsabilità:** preventivi (condiviso, sezione 2.4), fatture, pagamenti, cash flow, costi, margini (Product Bible, Modulo 5).
**Confine:** unico Bounded Context autorizzato a emettere un documento fiscale immutabile (Fattura) — nessun altro contesto può generare quell'evento.
**Dipende da:** Organization, CRM (per il collegamento ordine→fattura), Inventory (per il costo dei prodotti nel calcolo margine).
**Eventi prodotti:** `InvoiceIssued`, `PaymentReceived`, `PaymentOverdue`, `CashFlowForecastUpdated`, `MarginAnomalyDetected`.
**Eventi consumati:** `OrderConfirmed` (da CRM/Inventory), `PurchaseOrderCreated` (da Inventory, per il fabbisogno di cassa previsto).

### 2.7 Inventory

**Responsabilità:** prodotti, giacenze, movimenti, fornitori, riordino (Product Bible, Modulo 6).
**Confine:** possiede la verità fisica delle giacenze; non possiede il margine (calcolato in collaborazione con Finance, non duplicato qui).
**Dipende da:** Organization, Finance (verifica liquidità prima di proporre un riordino), CRM (peso delle opportunità aperte nel forecast di consumo).
**Eventi prodotti:** `StockLevelChanged`, `ReorderSuggested`, `SupplierDelayed`, `PurchaseOrderCreated`, `InventoryDiscrepancyDetected`.
**Eventi consumati:** `OrderConfirmed` (da CRM, per scaricare/prenotare quantità), `CashFlowForecastUpdated` (da Finance, per calibrare la prudenza delle proposte di riordino).

### 2.8 HR

**Responsabilità:** dipendenti, ferie/permessi, formazione, performance (modulo Product Bible successivo, non ancora dettagliato in UX ma già necessario qui per completezza del modello).
**Confine:** possiede dati fortemente sensibili (categoria "dati del personale" — vedi Storage, sezione 13) con regole di accesso più severe di ogni altro contesto.
**Dipende da:** Organization, Identity (un dipendente è spesso anche un utente del sistema, ma le due identità restano concettualmente distinte: un fornitore esterno può essere un utente senza essere un dipendente).
**Eventi prodotti:** `EmployeeHired`, `LeaveRequested`, `LeaveApproved`, `PerformanceReviewCompleted`.
**Eventi consumati:** nessuno strutturalmente necessario dai contesti applicativi principali — HR è relativamente isolato per costruzione, coerente con la sensibilità dei suoi dati.

### 2.9 Documents

**Responsabilità:** archiviazione, OCR, indicizzazione, firma digitale, versioning documentale (materiale di prodotto originario, AIOS Docs).
**Confine:** non "possiede" il significato di business di un documento (una fattura resta di competenza di Finance) — possiede il file, i suoi metadati, la sua estrazione testuale/semantica e il suo collegamento verso l'entità di business pertinente.
**Dipende da:** ogni altro contesto può allegare un documento (relazione trasversale, non gerarchica).
**Eventi prodotti:** `DocumentUploaded`, `DocumentSigned`, `DocumentExpiringSoon`.
**Eventi consumati:** eventi da ogni contesto che genera un documento derivato (es. `InvoiceIssued` da Finance genera automaticamente il documento PDF corrispondente in Documents).

### 2.10 Calendar

**Responsabilità:** eventi, meeting, scadenze, task — il "quando" trasversale a tutta la piattaforma.
**Confine:** non genera esso stesso attività di business (una scadenza fattura non nasce qui, nasce in Finance e viene *proiettata* qui come evento di calendario).
**Dipende da:** riceve da ogni contesto che genera scadenze/appuntamenti.
**Eventi prodotti:** `EventScheduled`, `ReminderTriggered`.
**Eventi consumati:** `PaymentOverdue`, `LeaveApproved`, `OpportunityFollowUpDue` — ogni evento con una componente temporale rilevante da altri contesti.

### 2.11 Analytics

**Responsabilità:** aggregazione, KPI, dashboard cross-modulo, forecast di alto livello.
**Confine:** **sola lettura per costruzione** — non genera mai eventi che modificano lo stato di altri contesti, consuma soltanto.
**Dipende da:** tutti i contesti applicativi.
**Eventi prodotti:** nessuno (per principio) — al massimo notifiche interne di ricalcolo completato, non eventi di dominio.
**Eventi consumati:** praticamente ogni evento di business rilevante, instradato verso ClickHouse (Step 1) per l'aggregazione.

### 2.12 AI Platform (Business Brain)

**Responsabilità:** Knowledge Graph, memoria vettoriale, Event Log, Agent Orchestrator, Prompt Orchestrator, motore di autorizzazioni AI — l'intera Costituzione, qui formalizzata come Bounded Context a sé.
**Confine:** non possiede dati di business originali (quelli restano di proprietà del contesto applicativo che li ha generati) — possiede la loro rappresentazione collegata/vettorizzata e lo stato di ragionamento degli agenti.
**Dipende da:** ogni contesto applicativo (è il consumatore universale di eventi).
**Eventi prodotti:** `KnowledgeUpdated`, `AgentActionProposed`, `AgentActionExecuted`, `AgentActionFailed`.
**Eventi consumati:** letteralmente ogni evento di dominio pubblicato da qualunque altro contesto (Costituzione, sezione 1.2, ciclo di ingestione).

### 2.13 Automation (AIOS Flow)

**Responsabilità:** regole, trigger, workflow — sia quelli creati visualmente sia quelli creati in linguaggio naturale dalla Chat (Product Bible, Modulo 2, sezione 10).
**Confine:** non esegue direttamente azioni di business — orchestra chiamate verso i Tool degli altri contesti (stessa distinzione già stabilita nella Costituzione tra Agent Orchestrator "chi deve rispondere" e Prompt Orchestrator "con quale contesto").
**Dipende da:** AI Platform (per le automazioni create conversazionalmente), ogni contesto applicativo (come bersaglio delle azioni).
**Eventi prodotti:** `WorkflowTriggered`, `WorkflowCompleted`, `WorkflowFailed`.
**Eventi consumati:** qualunque evento configurato come trigger da un utente (es. `StockLevelChanged` per un'automazione di riordino).

### 2.14 Notification

**Responsabilità:** il Notification Center (Product Bible, Modulo 3, sezione 7) — raccolta, categorizzazione (Emergenza/Anomalia/Opportunità/Suggerimento/Informazione), calcolo del punteggio di impatto.
**Confine:** non genera contenuto proprio — trasforma eventi di altri contesti in notifiche categorizzate.
**Dipende da:** tutti i contesti applicativi.
**Eventi prodotti:** `NotificationCreated`, `NotificationRead`.
**Eventi consumati:** eventi marcati come rilevanti per notifica da ciascun contesto (es. `MarginAnomalyDetected`, `SupplierDelayed`).

### 2.15 Marketplace

**Responsabilità:** plugin, agenti custom, template, gestione del ciclo di certificazione (Costituzione, sezione 8).
**Confine:** un plugin installato **non è un Bounded Context a sé** dal punto di vista del Domain Model core — è un consumatore/produttore esterno che si collega tramite l'API pubblica versionata, con un manifest che dichiara esplicitamente eventi prodotti/consumati, verificato in fase di certificazione.
**Dipende da:** Administration (billing delle transazioni plugin), AI Platform (se il plugin introduce un agente custom).
**Eventi prodotti:** `PluginInstalled`, `PluginCertified`, `PluginSuspended`.
**Eventi consumati:** nessuno strutturalmente fisso — dipende dal manifest di ogni plugin.

### 2.16 Administration

**Responsabilità:** RBAC (sezione 7), billing/abbonamento, audit log trasversale (sezione 11), impostazioni di sicurezza (SSO, MFA).
**Confine:** trasversale per natura — non è "un modulo tra gli altri" ma l'infrastruttura di governo condivisa da tutti.
**Dipende da:** Identity, Organization.
**Eventi prodotti:** `RoleAssigned`, `PermissionChanged`, `AuditEntryCreated`, `SubscriptionUpdated`.
**Eventi consumati:** ogni evento di modifica dati rilevante ai fini di audit (sezione 11) — di fatto, un consumatore universale come AI Platform, ma con scopo di conformità invece che di conoscenza.

---

## 3. Entità principali (selezione ragionata, non esaustiva per costruzione — il modello è estensibile per definizione)

Per ciascuna: scopo, ciclo di vita, attributi principali, relazioni, regole di business, eventi generati/ricevuti, collegamento con Business Brain e AI Agent.

### 3.1 Party (anagrafica condivisa — sezione 2.4)

**Scopo:** rappresentare un'entità esterna (azienda o persona) con cui l'Organization ha una relazione, indipendentemente dal ruolo (cliente, fornitore, entrambi contemporaneamente — un'azienda può esserlo).
**Ciclo di vita:** Creato → Arricchito nel tempo → (mai eliminato per davvero, solo archiviato — sezione 11, soft delete) .
**Attributi principali:** ragione sociale o nome, Partita IVA/Codice Fiscale (Value Object, sezione 4), indirizzi (Value Object), contatti.
**Relazioni:** proiezioni locali in CRM (Customer), Finance (Debtor/Creditor), Inventory (Supplier) — stesso Party, ruoli diversi.
**Regole di business:** un Party non può essere eliminato se ha documenti fiscali collegati (Fattura) — solo archiviato.
**Eventi generati:** `PartyCreated`, `PartyMerged` (deduplicazione, coerente col pattern già visto in CRM/Inventory con conferma esplicita).
**Business Brain:** ogni Party è un nodo centrale del Knowledge Graph, con archi verso ogni entità che lo referenzia in qualunque contesto.
**AI Agent:** letto da Sales Agent, Finance Agent, Inventory Agent; modificato (proposta, mai diretto) solo tramite Tool dedicati con conferma umana per i campi anagrafici core (Costituzione, sezione 2.1).

### 3.2 Customer (proiezione CRM di Party)

**Scopo:** rappresentare la relazione commerciale specifica.
**Attributi principali:** Relationship Score (calcolato, non memorizzato come input manuale — è una vista derivata persistita per performance, ricalcolata ad ogni evento rilevante), segmento/tag, referente principale.
**Relazioni:** molti-a-molti con Contact (persona fisica) nel tempo (Product Bible CRM, sezione 4.4).
**Eventi generati:** `CustomerRelationshipScoreUpdated`.
**Eventi ricevuti:** `InvoicePaid`, `PaymentOverdue` da Finance.

### 3.3 Opportunity

**Scopo:** rappresentare una trattativa commerciale in corso.
**Ciclo di vita:** Creata → Fasi di pipeline (configurabili per Organization) → Vinta/Persa/Archiviata.
**Attributi principali:** valore stimato, probabilità di chiusura (calcolata), fase corrente, data di chiusura prevista.
**Regole di business:** una Opportunity vinta genera obbligatoriamente un Order (transizione di stato che crea un'entità in un altro Bounded Context — gestita tramite evento, mai una chiamata diretta tra aggregati di contesti diversi).
**Eventi generati:** `OpportunityCreated`, `OpportunityStageChanged`, `OpportunityWon`, `OpportunityLost`.

### 3.4 Quote (Preventivo) — Aggregate condiviso CRM/Finance

**Scopo:** l'oggetto esplicitamente descritto nel Product Bible (CRM sezione 3.1, Finance sezione 3.1) come "stesso oggetto, due punti di vista".
**Attributi principali:** righe (prodotto, quantità, prezzo, sconto), margine calcolato, stato (Bozza/Inviato/Accettato/Rifiutato/Scaduto), versione (storico modifiche — Product Bible Finance, sezione 3.2).
**Regola di business chiave:** il servizio di calcolo margine (già citato come "componente condiviso da costruire una sola volta" nel Product Bible) è invocato da questo aggregato, non duplicato.
**Eventi generati:** `QuoteCreated`, `QuoteRevised`, `QuoteAccepted`.
**AI Agent:** il Sales Agent propone la creazione/modifica; il Finance Agent verifica il margine prima che una proposta sia mostrata come "pulita" (Costituzione, sezione 2.3, coerente col Product Bible Inventory sezione 7.3 per lo stesso pattern di verifica incrociata).

### 3.5 Order

**Scopo:** rappresentare un impegno commerciale confermato (da Opportunity vinta o Quote accettato).
**Relazioni:** genera `Invoice` (Finance) e riserva quantità in `Stock` (Inventory) — tramite eventi, non chiamate dirette.
**Eventi generati:** `OrderConfirmed`, `OrderShipped`, `OrderCancelled`.

### 3.6 Invoice

**Scopo:** documento fiscale.
**Ciclo di vita:** Bozza (modificabile) → Emessa (**immutabile per costruzione**, Product Bible Finance sezione 4.1) → Pagata/Scaduta/Insoluta → eventuale Nota di Credito collegata (mai una modifica diretta).
**Regola di business invariante:** nessuna operazione di scrittura è permessa su un'Invoice con stato "Emessa" — l'unico modo di correggerla è un nuovo aggregato CreditNote collegato per riferimento.
**Eventi generati:** `InvoiceIssued`, `InvoicePaid`, `InvoiceOverdue`.

### 3.7 Product

**Scopo:** anagrafica di un articolo, con varianti come entità collegate (Product Bible Inventory, sezione 3.2).
**Attributi principali:** SKU, categoria, costo (storico, Value Object Money), prezzo.
**Relazioni:** uno-a-molti con Stock (per sede), molti-a-molti con Supplier (con Value Object per condizioni specifiche di ciascun fornitore — prezzo, lead time).
**Eventi generati:** `ProductCreated`, `ProductMerged` (deduplicazione).

### 3.8 Stock (Giacenza)

**Scopo:** rappresentare la quantità fisica disponibile di un Product in una sede specifica.
**Regola di business invariante:** una Stock non può avere quantità negativa persistita come stato valido — un tentativo di scarico che la porterebbe sotto zero genera un'anomalia bloccante (Product Bible Inventory, sezione 13), non uno stato negativo salvato.
**Eventi generati:** `StockLevelChanged`, `StockDiscrepancyDetected`.

### 3.9 Employee (HR)

**Scopo:** rappresentare il rapporto di lavoro, distinto dall'Identity (un dipendente può non avere mai effettuato login, un utente può non essere un dipendente — es. consulente esterno).
**Attributi principali:** dati fortemente sensibili (categoria protetta, sezione 13) — mansione, reparto, dati contrattuali.
**Eventi generati:** `EmployeeHired`, `EmployeeRoleChanged`, `EmployeeTerminated`.

### 3.10 Conversation e Message (AI Platform / Chat)

**Scopo:** persistere lo scambio conversazionale (Product Bible Chat, sezione 2.2) — non solo per continuità UX ma come fonte di eventi per il Business Brain quando un messaggio introduce nuova conoscenza (Costituzione, sezione 5, "la Chat è anche punto di ingresso di conoscenza").
**Attributi principali:** partecipanti, agente/i coinvolti per messaggio, fonti consultate (riferimento, non copia — sezione 2.4 applicato anche qui).
**Eventi generati:** `ConversationStarted`, `AgentResponseGenerated`, `ToolInvoked`.

### 3.11 AgentAction

**Scopo:** l'unità di audit fondamentale per ogni azione di un AI Agent (Costituzione, sezione 5.4, "tracciabilità obbligatoria").
**Attributi principali:** agente, Tool invocato, dati usati (riferimento), livello di autonomia applicato, esito, se e da chi è stata approvata.
**Regola di business invariante:** mai modificabile dopo la creazione — un `AgentAction` è di fatto un evento persistito con struttura ricca, non un'entità con stato mutabile.

---

## 4. Value Object

| Value Object | Perché non è un'entità |
|---|---|
| **Money** (importo + valuta) | Non ha identità propria né ciclo di vita — due importi di €100 sono intercambiabili, non due oggetti distinti da tracciare singolarmente |
| **Address** | Definito interamente dai suoi componenti (via, città, CAP) — se cambia anche un solo componente, concettualmente è un indirizzo diverso, non lo stesso oggetto modificato |
| **Email**, **PhoneNumber** | Validati per formato, confrontabili per valore, senza identità propria |
| **DateRange** | Coppia di date con invarianti proprie (inizio ≤ fine), riutilizzato ovunque serva un periodo (es. forecast a intervallo, Product Bible Finance) |
| **Currency**, **Percentage** | Puri valori con regole di formattazione/calcolo, mai identità |
| **TaxInformation** (P.IVA/Codice Fiscale + regime fiscale) | Attributo descrittivo di un Party, non un'entità con propria evoluzione indipendente |
| **ConfidenceLevel** (Alta/Media/Bassa) | Il Value Object che formalizza la scelta esplicita di non usare percentuali finte (Product Bible Chat, sezione 8.2) — usato ovunque un output AI dichiari la propria affidabilità |
| **AutonomyThreshold** (azione + soglia + livello) | La riga elementare della matrice di autorizzazioni AI (Costituzione, sezione 5.2) — un Value Object, non un'entità, perché non ha identità propria al di fuori della combinazione che rappresenta |

**Perché questa distinzione conta architetturalmente:** i Value Object non richiedono una tabella con chiave surrogata e storico proprio — sono tipicamente colonne o strutture incorporate nell'entità che li contiene, il che semplifica lo schema fisico derivato da questo modello (prossimo modulo dell'Engineering Bible).

---

## 5. Aggregate Root

Un Aggregate Root è l'unico punto di ingresso per la scrittura consistente di un insieme di entità/value object che devono cambiare insieme. Elenco dei principali, con invarianti:

| Aggregate Root | Contiene | Invariante principale |
|---|---|---|
| **Party** | Indirizzi, contatti, informazioni fiscali | Non eliminabile se referenziato da documenti fiscali |
| **Opportunity** | Fasi, attività collegate | Non può saltare direttamente a "Vinta" senza passare per le fasi intermedie configurate |
| **Quote** | Righe, versioni | Una nuova versione non sovrascrive la precedente, la storicizza sempre |
| **Order** | Righe ordine, stato spedizione | Non modificabile in quantità dopo la conferma senza generare un evento di rettifica esplicito |
| **Invoice** | Righe fattura | Immutabile dopo l'emissione (sezione 3.6) — l'invariante più rigido di tutto il modello |
| **Stock** | Movimenti collegati per sede | Mai persistita con quantità negativa (sezione 3.8) |
| **Employee** | Storico ruoli, richieste ferie | Dati visibili solo secondo il RBAC più severo della piattaforma (sezione 7.4) |
| **Conversation** | Messaggi, azioni agente collegate | I messaggi non sono mai eliminabili singolarmente per integrità della cronologia decisionale, solo l'intera conversazione può essere archiviata |

---

## 6. Domain Events — catalogo e impatti

Formato per ogni evento: quando nasce, produttore, consumatori principali, impatto su Business Brain/Agent/Automazioni.

| Evento | Nasce quando | Produttore | Consumatori principali | Impatto Business Brain | Impatto Automazioni |
|---|---|---|---|---|---|
| `CustomerCreated` | Un nuovo Party diventa Customer in CRM | CRM | AI Platform, Notification | Nuovo nodo nel Knowledge Graph | Può attivare automazioni di onboarding |
| `InvoiceIssued` | Una fattura passa a stato Emessa | Finance | Documents (genera PDF), AI Platform, CRM (aggiorna storico) | Aggiorna memoria operativa del cliente | Può attivare automazioni di notifica al cliente |
| `PaymentReceived` | Riconciliazione conferma un incasso | Finance | CRM (Relationship Score), AI Platform | Aggiorna puntualità pagamenti nel profilo cliente | Può chiudere un'automazione di sollecito attiva |
| `InventoryUpdated` (= `StockLevelChanged`) | Ogni movimento di magazzino | Inventory | Finance (valore magazzino), CRM (disponibilità), AI Platform | Aggiorna stato fisico nel Knowledge Graph | Trigger primario per il Riordino Intelligente |
| `SupplierDelayed` | Consegna registrata oltre la data prevista | Inventory | Notification, AI Platform | Aggiorna performance storica fornitore | Trigger per automazioni di allerta (Product Bible Inventory, sezione 9) |
| `EmployeeHired` | Nuovo Employee creato | HR | AI Platform, Notification | Nuovo nodo, con restrizioni di accesso immediate | Automazioni di onboarding HR |
| `DocumentSigned` | Firma digitale completata | Documents | Il contesto di origine del documento (es. Finance per un contratto), AI Platform | Il documento diventa fonte consultabile nella memoria semantica | Può sbloccare un passo di workflow in attesa |
| `WorkflowCompleted` | Un'automazione termina con successo | Automation | Notification, AI Platform (per apprendimento su cosa funziona) | Registrato come esito nella Decision Memory | — |

**Principio di progettazione degli eventi:** ogni evento è **immutabile e append-only** (Costituzione, Event Log) — nessun evento viene mai modificato dopo la pubblicazione; una correzione genera un nuovo evento compensativo, mai una riscrittura, coerente con l'invariante di Invoice (sezione 3.6) esteso a livello di principio generale.

---

## 7. Multi-tenancy e RBAC

### 7.1 Gerarchia Organization → Branch → Department → Team

```
Organization (tenant radice)
   └─ LegalEntity (per gruppi con più società, Product Bible Costituzione già anticipava le gerarchie)
        └─ Branch (sede fisica)
             └─ Department (reparto)
                  └─ Team (gruppo di lavoro informale, non gerarchico)
```

Non ogni Organization usa tutti i livelli — una piccola impresa ha Organization → (nessuna sotto-struttura); un gruppo Enterprise usa la gerarchia completa. Il modello supporta entrambi senza rami condizionali nel codice applicativo, semplicemente con livelli opzionali.

### 7.2 Isolamento dei dati

Ogni entità porta `organization_id` come attributo obbligatorio non nullo, protetto da Row-Level Security (Step 1, sezione 14) — questo documento conferma e non ridiscute quella decisione, la eredita come vincolo di ogni Aggregate Root definito qui.

### 7.3 RBAC — User, Role, Permission, Policy, Scope, Resource

- **User** appartiene a Identity (sezione 2.1), non a Organization direttamente.
- **Role** è definito per Organization (es. "Commerciale" in Azienda A può avere permessi leggermente diversi da "Commerciale" in Azienda B, se personalizzato) ma con Role di sistema predefiniti non modificabili come base di partenza.
- **Permission** è un'azione su una Resource (es. `finance.invoice.approve`).
- **Policy** combina Role + Permission + **Scope** (es. "solo i propri clienti assegnati" — lo Scope è ciò che rende possibile il RBAC granulare già descritto nei moduli CRM/Finance/Inventory della Product Bible, es. "Commerciale vede solo i propri clienti").
- **Resource** è ogni Aggregate Root definito in questo documento — il RBAC non opera su tabelle fisiche, opera sugli stessi confini concettuali già stabiliti.

### 7.4 Il caso HR — RBAC più severo per categoria di dato, non solo per ruolo

A differenza degli altri contesti, HR introduce una dimensione aggiuntiva di Scope: non solo "quali Employee" ma "quali attributi di un Employee" (dati contrattuali vs dati anagrafici base) — un manager può vedere che un dipendente ha richiesto ferie senza vedere la sua retribuzione. Questo richiede che la Policy in HR sia definibile a livello di singolo attributo, non solo di intera Resource — unica eccezione esplicita al modello RBAC generale, motivata dalla sensibilità del dato.

---

## 8. Come il Domain Model alimenta il Business Brain

### 8.1 Creazione della memoria

Ogni Domain Event pubblicato (sezione 6) genera, tramite il servizio di ingestione (Costituzione, sezione 1.2): una riga nell'Event Log (immutabile), un aggiornamento del Knowledge Graph (nuovo nodo o nuova relazione), ed eventualmente un embedding nella memoria semantica se l'evento porta contenuto testuale rilevante (es. il corpo di un'email, non un evento puramente numerico come `StockLevelChanged`).

### 8.2 Aggiornamento e versionamento

Il Knowledge Graph non sovrascrive mai una relazione precedente — una relazione che cambia (es. un Contact che si sposta da un'azienda a un'altra, Product Bible CRM sezione 4.4) viene marcata come "conclusa" con una data di fine e ne viene creata una nuova, mantenendo lo storico completo navigabile (coerente col principio "mai eliminare, sempre storicizzare" già visto per Quote, sezione 3.4).

### 8.3 Eliminazione — solo per obblighi normativi espliciti

L'unica eliminazione reale (non soft delete) ammessa nel Business Brain è quella richiesta da un obbligo normativo esplicito (es. diritto all'oblio GDPR su un contatto persona fisica) — gestita come procedura dedicata e tracciata essa stessa in Audit Log (sezione 11), mai come conseguenza automatica di un'eliminazione applicativa ordinaria.

---

## 9. Come gli AI Agent interagiscono con il modello dati

### 9.1 Nessun accesso diretto (principio già stabilito, qui formalizzato a livello di modello)

Un Agent non esegue mai una query diretta su un Aggregate Root — invoca sempre un Tool (Costituzione, sezione 2.1) che internamente rispetta RBAC (sezione 7) e le Policy di Scope come farebbe una richiesta utente equivalente. Questo significa che **un Tool AI e un endpoint API usato da un utente umano condividono lo stesso livello di autorizzazione sottostante**, mai un canale privilegiato per l'AI.

### 9.2 Quali eventi ascolta ciascun agente

Ogni Agent (catalogo Costituzione + estensione Chat) dichiara esplicitamente, nel proprio manifest interno (stesso principio di dichiarazione esplicita dei plugin Marketplace, Costituzione sezione 8.2, qui esteso agli agenti nativi per coerenza), quali Domain Event ascolta — il Sales Agent ascolta `StockLevelChanged` per verificare disponibilità durante un preventivo, non ascolta `EmployeeHired` perché irrilevante al suo dominio.

### 9.3 Coerenza mantenuta

Poiché ogni scrittura passa sempre per l'Aggregate Root pertinente (sezione 5) indipendentemente da chi la richiede (utente o Agent tramite Tool), non esiste un percorso di scrittura "più veloce ma meno sicuro" riservato all'AI — la coerenza delle invarianti (es. Invoice immutabile, Stock mai negativo) è garantita allo stesso modo per ogni origine della richiesta.

---

## 10. Come il Domain Model alimenta AIOS Flow

Qualunque Domain Event può essere configurato come trigger (Product Bible, ogni modulo sezione Automazioni) — tecnicamente, Automation si iscrive all'Event Bus (Step 1) con gli stessi eventi già catalogati in sezione 6, nessun evento "speciale" creato solo per le automazioni. Le regole create (sia visualmente sia in linguaggio naturale) sono persistite come proprio Aggregate Root (`WorkflowDefinition`), distinto dall'esecuzione (`WorkflowRun`, con stato ed esito) — la distinzione tra definizione e istanza di esecuzione è ciò che permette l'annullamento (un `WorkflowRun` in corso può essere interrotto senza toccare la definizione che ha generato altre esecuzioni parallele).

---

## 11. Audit, Versioning, Soft Delete

### 11.1 Audit Log

Trasversale a ogni Bounded Context (Administration, sezione 2.16): ogni comando che modifica un Aggregate Root genera una entry con chi, cosa, quando, valori prima/dopo — indipendentemente dal fatto che il comando provenga da un utente umano o da un Agent (coerente con sezione 9.3).

### 11.2 Versioning

Applicato esplicitamente agli Aggregate Root il cui storico ha valore di business diretto (Quote, sezione 3.4) o normativo (Employee, contratti); per gli altri, l'Audit Log stesso funge da cronologia sufficiente senza necessità di un meccanismo di versioning applicativo dedicato — non ogni entità necessita dello stesso livello di storicizzazione esplicita, per non appesantire inutilmente lo schema.

### 11.3 Soft Delete e Restore

Ogni Aggregate Root supporta uno stato "Archiviato" (soft delete) invece di un'eliminazione fisica immediata — l'eliminazione fisica reale avviene solo dopo un periodo di retention configurabile (Step 1, sezione 16, Backup) o per un obbligo normativo esplicito (sezione 8.3). Il Restore da stato Archiviato è sempre possibile entro quella finestra, con propria voce di Audit Log.

---

## 12. Storage — classificazione e collocazione

| Tipo di dato | Dove | Perché (richiamo allo Step 1) |
|---|---|---|
| Dati transazionali (Aggregate Root, sezione 5) | PostgreSQL, multi-tenant con RLS | Integrità referenziale, transazioni ACID |
| Documenti/file (PDF, immagini, allegati) | Object storage (S3-compatibile) | Non adatto a un database relazionale, costo/scalabilità |
| Log applicativi e di sistema | Grafana Loki (Step 1) | Volume alto, retention breve, non richiede query relazionali |
| Event Log (Business Brain) | Kafka (stream) + Postgres (persistenza query-abile) | Sia flusso continuo sia interrogabilità storica |
| Memoria vettoriale | pgvector → Vector DB dedicato alla scala | Ricerca semantica, non relazionale per natura |
| Dati analitici aggregati | ClickHouse | Query aggregate su volumi enormi senza appesantire Postgres transazionale |
| Cache di sessione/Workspace | Redis | Bassa latenza, dati non permanenti per natura |
| Backup | Storage ridondante multi-region (Step 1, sezione 16) | Continuità operativa, conformità |

---

## 13. Evoluzione — perché questo modello regge dieci anni senza riprogettazioni

- **Centinaia di moduli:** ogni nuovo modulo è un nuovo Bounded Context che si collega tramite Domain Event, mai tramite dipendenza diretta su un altro Aggregate Root — il costo di aggiungerne uno resta costante, non cresce con il numero di moduli esistenti.
- **Migliaia di plugin:** l'architettura a manifest (Costituzione, sezione 8) tratta ogni plugin come un consumatore/produttore esterno di eventi già catalogati, mai come un'estensione del Domain Model core.
- **Milioni di utenti, decine di milioni di documenti:** la separazione di storage per tipo di dato (sezione 12) permette di scalare ogni tecnologia indipendentemente (es. object storage per documenti non è vincolato dalla capacità di Postgres).
- **Migliaia di AI Agent:** ogni agente aggiuntivo è un nuovo consumatore di eventi esistenti (sezione 9.2), mai una modifica al modello dati sottostante.
- **Nuove normative:** il pattern di soft delete + eliminazione reale solo per obbligo esplicito (sezione 11.3) è già predisposto per accogliere nuovi requisiti (es. normative diverse in nuovi mercati) come configurazione, non come ristrutturazione.
- **Nuovi modelli AI:** il Domain Model non conosce quale modello linguistico è in uso (principio model-agnostic, Costituzione sezione 4.2) — un cambio di modello non tocca in alcun modo le entità qui definite.

---

## Conclusione

### Principi architetturali definitivi
1. Ogni Bounded Context ha confini definiti dal linguaggio di business, mai da convenienza tecnica.
2. Un'identità condivisa (Party) con proiezioni locali per contesto, mai dati duplicati che possono divergere.
3. Gli eventi di dominio sono immutabili e append-only, sempre — una correzione è un nuovo evento, mai una riscrittura.
4. Nessuna scrittura di un AI Agent bypassa mai le stesse regole di autorizzazione di un utente umano.
5. L'eliminazione fisica reale è l'eccezione, riservata a obblighi normativi espliciti — il default è sempre l'archiviazione reversibile.

### Decisioni prese
- Quote come Aggregate condiviso esplicito tra CRM e Finance, non duplicato.
- HR isolato con Scope a livello di singolo attributo, unica eccezione al modello RBAC generale.
- Analytics come Bounded Context a sola lettura per costruzione, mai produttore di eventi di dominio.

### Decisioni rimandate
- Lo schema fisico esatto (tabelle, indici, partizionamento) — oggetto del prossimo modulo tecnico.
- Il contratto puntuale di ogni singolo endpoint API e lo schema JSON di ogni evento — oggetto del modulo "API Contract & Event Catalog" proposto in apertura.

### Rischi individuati e punti critici
- **Il pattern Party/proiezioni locali richiede disciplina di sviluppo rigorosa:** un team che, per fretta, duplica un attributo anagrafico direttamente in un contesto applicativo invece di referenziare Party introduce esattamente il problema di divergenza che il pattern vuole evitare — da mitigare con linee guida di code review esplicite, non solo con la documentazione.
- **Il confine tra soft delete e obbligo normativo di cancellazione reale (sezione 8.3, 11.3)** richiede una procedura legale chiara prima dello sviluppo, non durante — rischio di ambiguità se non formalizzato per tempo con consulenza legale specifica per ogni mercato di espansione.
- **La crescita del numero di Domain Event ascoltati dal Business Brain** (sezione 9.2) richiede, a scala, un meccanismo di prioritizzazione dell'ingestione per non creare colli di bottiglia — accennato nello Step 1 (costo di inferenza AI su larga scala) ma da approfondire tecnicamente nel prossimo modulo.

### Dipendenze con tutta la Product Bible
Ogni entità qui definita è la base dati diretta delle schermate progettate nei Moduli 1–6 della Product Bible — nessuna nuova entità è stata introdotta che non fosse già implicita in quei documenti; questo modulo formalizza e collega ciò che era già stato descritto a livello di esperienza utente.

### Impatto sul database fisico
Il prossimo modulo tecnico dovrà tradurre ogni Aggregate Root in schema Postgres con Row-Level Security (Step 1), ogni Value Object in tipo composito o colonne incorporate, ogni relazione di storico (sezione 8.2) in tabelle con validità temporale esplicita (`valid_from`/`valid_to`).

### Impatto sulle API
Ogni Aggregate Root espone un'API coerente con le sue invarianti (es. l'API di Invoice non esporrà mai un endpoint di modifica per una fattura Emessa) — il contratto API deve rispecchiare le regole di business definite qui, non reintrodurle a livello di controller.

### Impatto sullo sviluppo backend
Ogni Bounded Context corrisponde a un modulo NestJS (Step 1) con confine di codice netto — nessun modulo deve importare direttamente un repository di dati di un altro contesto, solo eventi.

### Impatto sullo sviluppo frontend e mobile
Nessun impatto diretto immediato (questo documento è concettuale), ma ogni componente riutilizzabile già identificato nella Product Bible (Scheda Cliente, Catalogo Prodotti, pannello Insight) troverà qui la propria fonte dati coerente in ogni piattaforma client, senza differenze di modello tra web, desktop e mobile.

---

## Prossimo modulo (in attesa di approvazione)

Due possibilità, a tua scelta: proseguire l'Engineering Bible con **API Contract & Event Catalog** (schema puntuale di ogni endpoint ed evento), oppure tornare alla Product Bible con il modulo **HR** già in coda. Fammi sapere quale preferisci.
