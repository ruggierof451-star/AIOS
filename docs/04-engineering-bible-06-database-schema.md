# AIOS Engineering Bible
## Modulo 6 — Physical Database Schema

**Stato:** Bozza per approvazione
**Dipende da:** Domain Model, API Contract & Event Catalog, AI Platform Architecture, Infrastructure, System Runtime & Execution Architecture
**Prossimo modulo dopo approvazione:** da concordare (Product Bible HR, oppure Security & Compliance)

---

## Nota di metodo

Questo documento traduce, senza reinterpretarlo, ciò che è già stato deciso: ogni Aggregate Root del Domain Model diventa qui una o più tabelle; ogni evento dell'API Contract trova la propria tabella di persistenza nell'Event Store; ogni meccanismo del Runtime (locking ottimistico, Saga) trova qui la colonna o la tabella che lo rende possibile fisicamente. Dove questo documento sembra introdurre qualcosa di nuovo, in realtà sta solo rendendo esplicito un dettaglio implementativo di una decisione già presa.

---

## 1. Architettura generale

### 1.1 Schema logico — un namespace Postgres per Bounded Context

Ogni Bounded Context (Domain Model, sezione 2) corrisponde a uno **schema Postgres** dedicato (`crm.*`, `finance.*`, `inventory.*`...) all'interno dello stesso database fisico — non database separati (che complicherebbero transazioni e backup unificati) ma namespace distinti che riflettono i confini logici già stabiliti, rendendo visivamente impossibile per uno sviluppatore fare una join diretta tra schema di contesti diversi senza che sia una scelta esplicita e visibile in fase di code review.

### 1.2 Naming convention

Tabelle al plurale snake_case (`customers`, `purchase_orders`); colonne snake_case; chiavi esterne nominate `<entità>_id` (`customer_id`, mai solo `id` per una FK, per evitare ambiguità in join complesse); timestamp sempre `created_at`/`updated_at` con timezone (coerente con l'API Contract, sempre UTC).

### 1.3 Strategia degli identificatori

**UUID v7** (non v4) come chiave primaria per ogni tabella di Aggregate Root — v7 incorpora un componente temporale ordinabile, che migliora la località dell'indice B-tree rispetto a un UUID v4 completamente casuale (problema noto di frammentazione dell'indice con UUID casuali su tabelle molto grandi), pur mantenendo i vantaggi di un ID generabile lato client senza round-trip al database e non enumerabile da un utente esterno (a differenza di un semplice intero auto-incrementante, che rivelerebbe il volume di record e permetterebbe di indovinare ID validi).

### 1.4 Convenzioni sulle chiavi esterne e cross-context

Una chiave esterna Postgres nativa (con vincolo di integrità referenziale reale) è usata **solo dentro lo stesso schema/Bounded Context** — un riferimento a un'entità di un altro contesto (es. una riga di Fattura che riferisce un `customer_id` di CRM) è memorizzato come colonna semplice **senza vincolo di FK Postgres tra schemi**, coerente col Domain Model (nessuna dipendenza diretta tra Aggregate Root di contesti diversi, solo tramite eventi) — l'integrità di questi riferimenti cross-context è garantita a livello applicativo (Tool Execution, Runtime) e verificata da controlli di coerenza periodici, non dal database stesso, per non introdurre un accoppiamento fisico che contraddirebbe il confine architetturale già stabilito.

---

## 2. Schema per Bounded Context — tabelle principali

Per ciascun contesto: tabelle chiave con colonne principali (selezione rappresentativa, non esaustiva per costruzione — coerente con l'estensibilità richiesta).

### 2.1 Identity

**`identity.users`**

| Colonna | Tipo | Vincoli |
|---|---|---|
| id | uuid | PK |
| email | text | UNIQUE, NOT NULL |
| password_hash | text | NOT NULL (null se solo SSO) |
| mfa_enabled | boolean | DEFAULT false |
| status | text | CHECK IN ('active','suspended') |
| created_at | timestamptz | NOT NULL |

Indice: `UNIQUE INDEX` su `email` (case-insensitive, via espressione `lower(email)`).

### 2.2 Organization

**`organization.organizations`**

| Colonna | Tipo | Vincoli |
|---|---|---|
| id | uuid | PK |
| legal_name | text | NOT NULL |
| plan | text | CHECK IN ('starter','professional','enterprise') |
| created_at | timestamptz | NOT NULL |

**`organization.branches`**, **`organization.departments`** — stessa struttura gerarchica (Domain Model, sezione 7.1), ciascuna con `organization_id` e, dove pertinente, `parent_id` per l'annidamento opzionale.

### 2.3 CRM

**`crm.parties`** (anagrafica condivisa, Domain Model sezione 2.4 — fisicamente collocata nello schema `crm` per semplicità pratica pur essendo concettualmente condivisa; altri contesti la referenziano per id senza FK nativa, sezione 1.4)

| Colonna | Tipo | Vincoli |
|---|---|---|
| id | uuid | PK |
| organization_id | uuid | NOT NULL, indice (sez. 4) |
| legal_name | text | NOT NULL |
| tax_id | text | UNIQUE per organization_id (vincolo composito) |
| archived_at | timestamptz | NULL = attivo (soft delete, sez. 8) |

**`crm.customers`** (proiezione locale)

| Colonna | Tipo | Vincoli |
|---|---|---|
| id | uuid | PK |
| party_id | uuid | FK → crm.parties, NOT NULL |
| organization_id | uuid | NOT NULL |
| relationship_score | numeric(5,2) | NULL finché non calcolato |
| segment | text | |
| version | integer | DEFAULT 1 (optimistic locking, sez. 7) |

**`crm.opportunities`**, **`crm.quotes`** (Aggregate condiviso con Finance, sezione 3), **`crm.quote_line_items`** (tabella secondaria dell'Aggregate Quote) — con `quotes.version` per lo storico versioni (Domain Model, sezione 3.4) distinto dal `version` di optimistic locking: qui servono **due colonne concettualmente diverse** — `revision_number` (versione di business, incrementata ad ogni modifica sostanziale visibile all'utente) e `lock_version` (versione tecnica per il locking, sezione 7) — mai confuse nella stessa colonna.

### 2.4 Finance

**`finance.invoices`**

| Colonna | Tipo | Vincoli |
|---|---|---|
| id | uuid | PK |
| organization_id | uuid | NOT NULL |
| customer_party_id | uuid | NOT NULL (riferimento a crm.parties, senza FK nativa) |
| order_id | uuid | NULL (riferimento a crm.orders) |
| status | text | CHECK IN ('draft','issued','paid','overdue') |
| amount_cents | bigint | NOT NULL (mai `numeric`/`float` per importi — interi in centesimi, pratica standard per evitare errori di arrotondamento in virgola mobile) |
| currency | char(3) | NOT NULL |
| issued_at | timestamptz | NULL finché in bozza |
| immutable | boolean | DEFAULT false, diventa true a `status='issued'` |

**Vincolo di invarianza a livello database, non solo applicativo:** un **trigger** (unico caso in cui questo documento prevede logica lato database invece che puramente applicativa) impedisce fisicamente un `UPDATE` su righe con `immutable = true` per le colonne economicamente rilevanti — motivazione: l'invariante "Invoice immutabile" (Domain Model, sezione 3.6) è così critico da meritare una seconda barriera indipendente dal codice applicativo, coerente col principio di ridondanza intenzionale sui punti di sicurezza/integrità più critici già visto più volte in questa Engineering Bible.

**`finance.credit_notes`**, **`finance.payments`**, **`finance.cash_flow_snapshots`** (quest'ultima per la persistenza dei forecast calcolati, con `scenario` come colonna: 'conservative'/'realistic'/'optimistic', coerente con la Product Bible).

### 2.5 Inventory

**`inventory.products`**, **`inventory.stock`** (per prodotto + sede, con `quantity` **mai negativo**: vincolo `CHECK (quantity >= 0)` a livello database, stessa logica di ridondanza intenzionale dell'invariante Invoice), **`inventory.stock_movements`** (append-only per costruzione — nessun `UPDATE`/`DELETE` concesso a livello di permessi database sul ruolo applicativo, solo `INSERT`, coerente con "ogni movimento tracciabile").

### 2.6 HR

**`hr.employees`** — colonne sensibili (retribuzione, dati contrattuali) in una tabella separata (`hr.employee_compensation`) dalla tabella anagrafica base (`hr.employees`), non per normalizzazione tecnica ma per poter applicare **permessi Postgres differenziati per tabella** (Domain Model, sezione 7.4 — Scope a livello di attributo tradotto qui in una separazione fisica che rende l'enforcement più robusto di un semplice filtro applicativo sulle colonne).

### 2.7 Documents

**`documents.files`** (metadati; il contenuto binario vive in Object Storage, Infrastructure sezione 5 — mai un file binario dentro Postgres), con `storage_key` come riferimento all'Object Storage, `extracted_text` per il contenuto testuale estratto (OCR), e `vector_id` come riferimento al Vector Platform (sezione 10).

### 2.8 Calendar, Analytics, Automation, Notification, Marketplace, Administration

Stesso pattern di schema dedicato; Analytics in particolare non ha tabelle transazionali proprie di rilievo in Postgres (i suoi dati vivono principalmente in ClickHouse, Infrastructure sezione 5) — solo una tabella di configurazione (`analytics.dashboard_configs`) per le preferenze di visualizzazione salvate.

---

## 3. Aggregate Root — persistenza e invarianti

| Aggregate Root | Tabella principale | Tabelle secondarie | Come si mantiene l'invariante |
|---|---|---|---|
| Party | `crm.parties` | `crm.party_addresses`, `crm.party_contacts` | Vincolo UNIQUE composito su `(organization_id, tax_id)` per prevenire duplicati a livello database, oltre al controllo applicativo (sezione Domain Model 3.3) |
| Quote | `crm.quotes` | `crm.quote_line_items`, `crm.quote_revisions` (storico) | Un `UPDATE` diretto sulle righe non è permesso al ruolo applicativo standard: ogni modifica passa da una funzione che scrive prima la revisione storica, poi aggiorna la riga corrente — enforcement tramite permessi di schema, non solo convenzione di codice |
| Invoice | `finance.invoices` | `finance.invoice_line_items`, `finance.credit_notes` | Trigger di immutabilità (sezione 2.4) |
| Stock | `inventory.stock` | `inventory.stock_movements` | `CHECK (quantity >= 0)`, aggiornamento di `stock.quantity` permesso solo tramite una funzione che inserisce contestualmente la riga di movimento corrispondente (mai un update isolato della sola giacenza senza il movimento che lo giustifica) |
| Employee | `hr.employees` | `hr.employee_compensation`, `hr.leave_requests` | Permessi differenziati per tabella (sezione 2.6) |

### 3.1 Version column per optimistic locking (Runtime, sezione 12.1)

Ogni tabella di Aggregate Root porta una colonna `lock_version integer NOT NULL DEFAULT 1`, incrementata ad ogni `UPDATE` tramite trigger o funzione applicativa condivisa (mai lasciata all'incremento manuale nel codice di ogni singolo servizio, per evitare che un servizio dimentichi di incrementarla) — un `UPDATE` che specifica una `lock_version` non più corrente restituisce zero righe modificate, condizione che il livello applicativo traduce nell'errore 409 già definito nell'API Contract.

---

## 4. Multi-tenancy fisica

### 4.1 organization_id come colonna obbligatoria universale

Ogni tabella con dati di business (praticamente tutte tranne le poche di configurazione globale di sistema) porta `organization_id uuid NOT NULL` — mai nullable, mai opzionale, per nessuna tabella, senza eccezioni.

### 4.2 Row-Level Security

Una policy RLS per schema (non per singola tabella ripetuta manualmente, ma tramite un meccanismo condiviso che si applica a ogni tabella con `organization_id`) che filtra automaticamente ogni query sulla base dell'`organization_id` corrente nella sessione database (impostato dal servizio applicativo all'inizio di ogni richiesta, coerente col JWT claim già descritto nell'API Contract, sezione 2.2) — **anche una query scritta con un bug che dimentica il filtro esplicito non può comunque restituire dati di un altro tenant**, perché il database stesso lo impedisce indipendentemente dal codice applicativo.

### 4.3 Indici dedicati

Ogni indice su colonne di ricerca frequente include `organization_id` come primo componente dell'indice composito (es. `INDEX (organization_id, status)` su `finance.invoices`, non solo `INDEX (status)`) — coerente con l'accesso quasi sempre filtrato per tenant, questo rende ogni query più efficiente sfruttando la selettività del tenant come primo filtro.

### 4.4 workspace_id — dove serve e dove no

A differenza di `organization_id`, `workspace_id` (Domain Model, sezione 2.2) non è replicato su ogni tabella di dati di business — appartiene solo alle tabelle di preferenze/sessione (`workspace.preferences`, cache Redis per lo stato attivo) perché è un concetto di contesto utente, non di appartenenza del dato stesso.

---

## 5. Event Store

### 5.1 Transactional Outbox

**`eventing.outbox`**

| Colonna | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| aggregate_id | uuid | Per il partizionamento/ordinamento (Infrastructure, sezione 6.2) |
| event_type | text | es. 'InvoiceIssued' |
| event_version | integer | |
| payload | jsonb | |
| organization_id | uuid | |
| created_at | timestamptz | |
| published_at | timestamptz | NULL finché non relayato su Kafka |

Scritta **nella stessa transazione locale** che modifica l'Aggregate Root (garanzia di atomicità: o entrambe le scritture riescono, o nessuna) — un processo di relay separato legge le righe con `published_at IS NULL`, le pubblica sull'Event Bus, e aggiorna `published_at` — mai pubblicazione diretta dal servizio applicativo verso Kafka nello stesso momento della scrittura dati (che introdurrebbe un rischio di incoerenza se una delle due operazioni riuscisse e l'altra no).

### 5.2 Domain Event Log (persistente, distinto dall'Outbox transitorio)

**`eventing.event_log`** — copia durevole di ogni evento pubblicato con successo, partizionata per mese e per `organization_id` (partizionamento composito, sezione 9) — è la fonte per il replay (Infrastructure, sezione 6.3) e per la ricostruzione storica.

### 5.3 Saga State

**`eventing.saga_instances`**

| Colonna | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| saga_type | text | es. 'OrderFulfillmentSaga' |
| current_step | text | |
| status | text | CHECK IN ('running','completed','compensating','failed') |
| state_data | jsonb | Dati necessari per riprendere/compensare |
| correlation_id | uuid | |

Coerente col Runtime (sezione 8.2) — questa tabella è la persistenza fisica che rende possibile la ripresa di una Saga interrotta.

### 5.4 Retry Queue e Dead Letter Queue

**`eventing.retry_queue`** (tentativi falliti in attesa di backoff, con `next_retry_at`), **`eventing.dead_letter_queue`** (eventi che hanno esaurito i tentativi, con `failure_reason` testuale per la diagnosi umana) — entrambe con retention più lunga della norma, perché sono esse stesse strumenti diagnostici oltre che operativi.

---

## 6. Business Brain — cosa resta relazionale, cosa no

| Tipo di memoria | Dove | Motivazione |
|---|---|---|
| Memoria operativa | Postgres (tabelle native del Bounded Context pertinente) | È semplicemente il dato transazionale recente, nessuna struttura dedicata separata |
| Memoria personale | `ai_platform.personal_memory` (Postgres, chiave-valore con `user_id`) | Volume contenuto per utente, accesso strutturato semplice |
| Memoria di team | `ai_platform.team_memory` (Postgres) | Stessa motivazione, scope diverso |
| Memoria aziendale (Knowledge Graph) | Postgres per la struttura a nodi/archi (sezione 8) + Vector Platform per il contenuto semantico | Le relazioni sono interrogabili efficacemente in Postgres con indici dedicati; il significato semantico richiede il motore vettoriale |
| Memoria documentale | Metadati in Postgres (`documents.files`), contenuto vettorizzato nel Vector Platform, file grezzo in Object Storage | Tre tecnologie per tre bisogni diversi (Domain Model, sezione 12) |
| Memoria strategica | ClickHouse (viste materializzate) | Volume e natura aggregata incompatibili con un accesso transazionale frequente |

---

## 7. Integrazione con il Vector Database

### 7.1 Identificatori condivisi

Ogni record vettorizzato porta, sia nel Vector Platform sia in Postgres, lo stesso identificatore (`vector_id`, generato come UUID al momento della vettorizzazione) — mai un ID generato indipendentemente nei due sistemi che richiederebbe una tabella di mapping separata soggetta a disallineamento.

### 7.2 Sincronizzazione

Un record Postgres che referenzia un `vector_id` lo fa in una colonna nullable (`documents.files.vector_id`) popolata in modo asincrono dal processo di vettorizzazione (coerente col Runtime, aggiornamento Business Brain sempre asincrono rispetto alla transazione originale) — finché nullo, il documento esiste ma non è ancora ricercabile semanticamente, stato normale e temporaneo, mai un errore.

### 7.3 Versioning

Un nuovo embedding per un documento aggiornato riceve un nuovo `vector_id`; il precedente resta referenziato da una tabella di storico (`documents.file_versions`) per query esplicite sullo stato passato — coerente col principio "mai sovrascrivere" ribadito in ogni documento di questa Bible.

---

## 8. Integrazione con il Knowledge Graph

### 8.1 Mapping nodi-tabelle

**`knowledge_graph.nodes`** (id, `entity_type`, `entity_id` — quest'ultimo il riferimento all'Aggregate Root originale nel proprio schema, senza FK nativa cross-schema per lo stesso motivo di sezione 1.4) e **`knowledge_graph.edges`** (`from_node_id`, `to_node_id`, `relationship_type`, `valid_from`, `valid_to` — quest'ultima coppia per il grafo temporale, AI Platform Modulo 3 sezione 5.2).

### 8.2 Consistenza

Un `edges.valid_to IS NULL` significa relazione ancora attiva; una nuova relazione che sostituisce la precedente imposta `valid_to = now()` sulla vecchia riga **nella stessa transazione** in cui inserisce la nuova — mai un intervallo temporale con sovrapposizione ambigua o con un buco (vincolo enforced applicativamente dalla funzione dedicata di scrittura del grafo, unico punto di scrittura ammesso su queste tabelle).

---

## 9. Audit

### 9.1 audit_log (trasversale, schema proprio)

**`administration.audit_log`**

| Colonna | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| organization_id | uuid | |
| actor_type | text | 'user' o 'agent' |
| actor_id | uuid | user_id o agent identifier |
| action | text | es. 'invoice.issue' |
| resource_type | text | |
| resource_id | uuid | |
| before_state | jsonb | NULL per creazioni |
| after_state | jsonb | |
| occurred_at | timestamptz | |

Popolata da un meccanismo condiviso (trigger generico parametrizzato per tabella, o middleware applicativo condiviso — decisione implementativa da confermare in fase di sviluppo, non cambia il contratto di questa tabella) invocato per ogni scrittura su ogni tabella marcata come "sensibile ad audit" (praticamente ogni tabella di Aggregate Root).

### 9.2 Change History vs Audit Log — quando servono entrambi

`audit_log` risponde a "chi ha fatto cosa, quando" con taglio di sicurezza/conformità; `change_history`, dove presente per un'entità specifica con valore di business diretto (es. `crm.quote_revisions`, sezione 3), risponde a "come si è evoluto questo specifico oggetto nel tempo" con taglio di business — le due tabelle non sono ridondanti, servono pubblici e domande diverse (stessa distinzione già introdotta nel Domain Model, sezione 11.2).

### 9.3 Soft Delete e Restore

Ogni tabella di Aggregate Root porta `archived_at timestamptz NULL` (mai una vera `DELETE` SQL per dati di business) — un `restore` è semplicemente `archived_at = NULL`, con la propria voce di audit_log. L'eliminazione fisica reale (Domain Model, sezione 8.3) è un processo batch separato, eseguito solo su richiesta esplicita e tracciata, mai automatico.

---

## 10. Performance

### 10.1 Indici per tabella (esempi rappresentativi)

`finance.invoices`: `(organization_id, status, due_date)` per le query di fatture scadute/in scadenza; `inventory.stock`: `(organization_id, product_id, branch_id)` come chiave di accesso primaria per la verifica disponibilità; `crm.parties`: indice GIN su una colonna `search_vector` (tsvector) per la ricerca testuale strutturata, distinta dalla ricerca semantica (Vector Platform).

### 10.2 Partizionamento

`eventing.event_log` partizionata per mese e per `organization_id` (sezione 5.2) — permette di eliminare/archiviare partizioni intere invecchiate senza un costoso `DELETE` riga per riga; `finance.invoices` e `inventory.stock_movements`, per i tenant a volume molto alto, candidate a partizionamento per `organization_id` quando i numeri reali lo giustificheranno (decisione rimandata, sezione "decisioni rimandate", perché prematura senza dati reali di volume).

### 10.3 Archiviazione

Dati oltre la finestra di retention operativa "calda" (Domain Model, memoria operativa vs storica, sezione 3) migrano a tabelle/partizioni "fredde" con storage più economico, ancora interrogabili ma non ottimizzate per accesso frequente — processo batch periodico, mai una migrazione che l'utente percepisce come perdita di accesso.

### 10.4 Compressione

Applicata a livello di partizione fredda (sezione 10.3) e ai payload `jsonb` di grandi dimensioni nell'Event Store, dove Postgres supporta la compressione nativa (TOAST) — nessuna azione manuale richiesta oltre la configurazione corretta dei parametri di storage per queste tabelle specifiche.

---

## 11. Concorrenza — collegamento diretto al documento Runtime

Ogni riga della sezione 12 del Modulo Runtime trova qui la propria implementazione fisica: `lock_version` (sezione 3.1) per l'optimistic locking; l'integrità referenziale nativa solo intra-schema (sezione 1.4) per non introdurre lock cross-context che comprometterebbero la scalabilità; le transazioni locali (mai distribuite a blocco, Runtime sezione 8.4) sono transazioni Postgres standard confinate a un solo schema nella quasi totalità dei casi.

---

## 12. Backup e retention

### 12.1 Requisiti tecnici vs politiche configurabili

**Tecnico, non negoziabile:** backup fisico continuo del database (Infrastructure, sezione 10) indipendente da qualunque configurazione di Organization. **Configurabile per Organization:** per quanto tempo un dato archiviato (soft delete) resta recuperabile prima dell'eliminazione fisica reale, quanto storico "caldo" vs "freddo" (sezione 10.3) — questa distinzione (Domain Model, sezione 8.3 e 11.3) è qui resa concreta: una tabella `administration.retention_policies` per Organization con i parametri configurabili, letta dai processi batch di archiviazione/eliminazione.

---

## 13. Evoluzione

- **Miliardi di record:** il partizionamento (sezione 10.2) e l'indicizzazione sempre con `organization_id` come primo componente (sezione 4.3) permettono di scalare senza degrado, dato che nessuna query "onesta" (che rispetta il pattern di accesso per tenant) necessita di scansionare l'intero database.
- **Migliaia di aziende:** lo schema per Bounded Context con RLS (sezione 4.2) non richiede alcuna modifica strutturale all'aumentare del numero di Organization — è lo stesso meccanismo per una decina o per centomila tenant.
- **Nuovi moduli:** un nuovo Bounded Context riceve un nuovo schema Postgres seguendo esattamente le stesse convenzioni (sezioni 1-4) — nessuna tabella esistente viene toccata.
- **Nuovi AI Agent:** non richiedono nuove tabelle applicative — consumano quelle esistenti tramite l'API (Runtime, Tool Execution), al più generano più righe in `administration.audit_log` e negli eventi.
- **Espansione internazionale:** la colonna `currency` (Finance) e l'assenza di assunzioni di formato specifiche per paese nelle colonne testuali (es. `tax_id` come testo libero validato applicativamente, non un formato rigido a livello di vincolo database) permettono di accogliere nuovi mercati senza migrazione strutturale, solo con nuova logica di validazione applicativa.

---

## 14. Linee guida implementative — ordine e dipendenze

| Ordine | Bounded Context | Dipendenze | Complessità | Rischio principale |
|---|---|---|---|---|
| 1 | Identity, Organization, Workspace | Nessuna | Bassa | Fondamenta — un errore qui si propaga ovunque, priorità a test rigorosi |
| 2 | Administration (RBAC, audit_log) | Identity, Organization | Media | Deve essere pronto prima di qualunque altro contesto applicativo, perché ogni tabella successiva dipende dal meccanismo RLS/audit qui stabilito |
| 3 | Eventing (Outbox, Event Log, Saga State) | Nessuna diretta, ma necessario prima di qualunque Bounded Context che pubblichi eventi | Alta | Il pattern Transactional Outbox è delicato da implementare correttamente — errori qui compromettono la garanzia di consistenza di tutta la piattaforma |
| 4 | CRM | 1, 2, 3 | Media | Party/Customer come primo caso reale del pattern anagrafica condivisa (sezione 2.4) — stabilisce il precedente per Finance/Inventory |
| 5 | Finance | 1, 2, 3, 4 (Quote condiviso) | Alta | Trigger di immutabilità Invoice — massima attenzione per l'irreversibilità di questa scelta una volta in produzione con dati reali |
| 6 | Inventory | 1, 2, 3, 4, 5 (verifica liquidità) | Media | Vincolo CHECK su quantità mai negativa da testare a fondo sotto concorrenza reale |
| 7 | HR | 1, 2 | Media | Separazione fisica delle tabelle sensibili (sezione 2.6) da verificare con audit di sicurezza dedicato prima del rilascio |
| 8 | AI Platform (Knowledge Graph, memorie) | Tutti i contesti applicativi già emettano eventi coerenti | Alta | Dipende dalla qualità dei dati già fluenti dagli altri contesti — non ha senso iniziare prima che almeno CRM e Finance siano stabili |
| 9 | Documents, Calendar, Analytics, Automation, Notification, Marketplace | Progressiva secondo le dipendenze applicative della Product Bible | Variabile | — |

---

## Conclusione

### Principi definitivi del database
1. Uno schema Postgres per Bounded Context, mai FK native tra schemi diversi — il confine architetturale è visibile anche fisicamente.
2. UUID v7 come chiave primaria ovunque, per bilanciare sicurezza (non enumerabile) e performance (ordinabile).
3. Gli invarianti più critici (Invoice immutabile, Stock mai negativo) hanno una seconda barriera a livello di database (trigger/CHECK), non solo applicativa.
4. Multi-tenancy garantita dal database stesso via RLS, mai affidata solo alla disciplina del codice applicativo.
5. Nessuna `DELETE` reale su dati di business salvo processo batch esplicito per obbligo normativo — il default è sempre soft delete.

### Decisioni prese
- Importi monetari sempre come interi in centesimi (`bigint`), mai `float`/`numeric` approssimabile.
- Separazione fisica delle tabelle HR sensibili per un enforcement di permessi più robusto del solo filtro applicativo.
- Un unico meccanismo condiviso (funzione/trigger comune) per l'incremento della colonna di lock_version, mai lasciato alla disciplina di ogni singolo servizio.

### Decisioni rimandate
- Il partizionamento per `organization_id` di Finance/Inventory oltre a quello già deciso per l'Event Log — da attivare solo quando dati reali di volume lo giustificheranno, non preventivamente.
- La scelta esatta tra trigger PL/pgSQL e funzione applicativa condivisa per l'audit_log automatico (sezione 9.1) — dettaglio implementativo da decidere con il team backend in fase di sviluppo.

### Dipendenze con Domain Model, API Contract, AI Platform, Infrastructure e Runtime
Ogni tabella qui descritta è la traduzione diretta di un Aggregate Root (Domain Model), ogni colonna di lock_version implementa un meccanismo già richiesto dal Runtime, ogni schema per Bounded Context rispecchia esattamente i confini già stabiliti — questo documento non ha preso alcuna decisione di business, solo di rappresentazione fisica.

### Impatto sul backend
Ogni servizio di dominio deve usare esclusivamente il proprio schema Postgres in scrittura diretta, mai scrivere nello schema di un altro contesto nemmeno per comodità — disciplina da imporre con permessi database reali (un ruolo Postgres per servizio con grant limitati al proprio schema), non solo con una convenzione di codice.

### Impatto sul frontend e mobile
Nessun impatto diretto (il frontend non parla mai direttamente al database, solo tramite API) — ma la struttura qui definita conferma che ogni endpoint API può essere implementato in modo efficiente con query dirette senza join cross-schema costose, coerente con le aspettative di performance già fissate nell'API Contract.

### Linee guida per la generazione delle migrazioni e dell'ORM
Ogni migrazione crea sempre tabelle con `organization_id`, `created_at`/`updated_at`, e — per gli Aggregate Root — `lock_version`/`archived_at` come colonne standard non opzionali, tramite un template di migrazione condiviso invece di scriverle a mano ogni volta (riduce il rischio che uno sviluppatore dimentichi una di queste colonne fondamentali). L'ORM scelto dal team backend deve supportare nativamente optimistic locking basato su colonna di versione e RLS trasparente (impostazione automatica della sessione con `organization_id` a ogni richiesta) — requisito da verificare nella scelta tecnica dello strumento, non un dettaglio secondario.

---

## Prossimo modulo (in attesa di approvazione)

Con lo schema fisico approvato, l'intera Engineering Bible ha ora una base tecnica end-to-end coerente, dall'architettura generale fino alla singola tabella. Ti chiedo di nuovo come preferisci proseguire: ripresa della **Product Bible con HR** (rimasta in sospeso da quattro moduli), un modulo di **Security & Compliance** dedicato, oppure un momento di verifica complessiva se preferisci rileggere l'insieme prima di continuare.
