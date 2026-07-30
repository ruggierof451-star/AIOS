# AIOS Engineering Bible
## Modulo 2 — API Contract & Event Catalog

**Stato:** Bozza per approvazione
**Dipende da:** Architettura Tecnica (Step 1), Domain Model & Data Architecture
**Prossimo modulo dopo approvazione:** da concordare (schema fisico del database, oppure ripresa della Product Bible con HR)

---

## Nota di metodo

Ogni Bounded Context del Domain Model (Modulo 1) diventa qui una superficie API con lo stesso confine — non troverai un endpoint che attraversa due contesti senza passare da un evento, per lo stesso principio già stabilito: **le API sono la proiezione esterna degli stessi confini interni**, non un livello che li ignora per comodità.

---

## 1. Struttura generale

### 1.1 Versionamento

`/api/v1/...` — il numero di versione è nel path, mai solo in un header (più esplicito per chi consuma l'API, incluso un plugin di terze parti che legge la documentazione una sola volta). Una nuova versione maggiore (`v2`) nasce solo per cambi che rompono la compatibilità; ogni aggiunta non distruttiva (nuovo campo opzionale, nuovo endpoint) avviene dentro la versione corrente — coerente col principio Backward Compatibility.

### 1.2 Naming convention

Risorse al plurale, minuscolo, kebab-case per path multi-parola: `/api/v1/customers`, `/api/v1/purchase-orders`. Verbi HTTP standard (GET/POST/PATCH/DELETE) per operazioni CRUD; azioni che non sono CRUD puro (es. "accetta preventivo") sono sotto-risorse verbali esplicite: `POST /api/v1/quotes/{id}/accept` — mai un parametro nascosto dentro un body PATCH generico che renderebbe l'intento implicito invece che esplicito nell'URL.

### 1.3 Formato risposta — envelope unico per ogni endpoint

```json
{
  "data": { },
  "meta": {
    "request_id": "req_9f8a...",
    "correlation_id": "corr_1a2b...",
    "trace_id": "trace_7c3d...",
    "version": "v1",
    "timestamp": "2027-03-14T09:12:00Z"
  },
  "pagination": null,
  "error": null
}
```

**Perché un unico envelope anche quando non serve tutto:** un client (web, mobile, plugin) scrive un solo parser, non uno diverso per ogni endpoint — coerente col principio Zero Ambiguity. `error` è sempre `null` in caso di successo e `data` è sempre `null` in caso di errore, mai entrambi popolati contemporaneamente.

### 1.4 Correlation ID, Request ID, Trace ID — a cosa serve ciascuno

- **request_id**: univoco per questa singola chiamata HTTP, generato dal server, utile per il supporto tecnico ("mandami il request_id dell'errore").
- **correlation_id**: attraversa più chiamate che appartengono allo stesso flusso utente (es. tutte le chiamate generate da un'unica richiesta in Chat che coinvolge tre Tool) — generato al primo punto di ingresso e propagato.
- **trace_id**: usato internamente per l'osservabilità distribuita (sezione 12), spesso coincide tecnicamente con lo standard OpenTelemetry, non necessariamente esposto al client finale ma sempre presente nei log.

### 1.5 Codici HTTP — uso disciplinato, non creativo

| Codice | Uso |
|---|---|
| 200 | Successo con corpo di risposta |
| 201 | Risorsa creata (con header `Location`) |
| 202 | Accettato per elaborazione asincrona (es. un Tool AI a lunga esecuzione) |
| 204 | Successo senza corpo (es. DELETE) |
| 400 | Errore di validazione del client |
| 401 | Non autenticato |
| 403 | Autenticato ma non autorizzato (RBAC/Scope, Modulo 1 sezione 7) |
| 404 | Risorsa non trovata o non visibile per il richiedente (mai distinguere questi due casi nella risposta, per non rivelare l'esistenza di dati non autorizzati — coerente col Modulo Navigazione, Product Bible, sezione 5.6) |
| 409 | Conflitto (es. tentativo di modificare un'Invoice Emessa, violazione di un invariante del Modulo 1) |
| 422 | Richiesta sintatticamente valida ma semanticamente non processabile |
| 429 | Rate limit superato |
| 500/503 | Errore del server, mai usato per errori di validazione o business |

---

## 2. Autenticazione

### 2.1 OAuth 2.1 come base

Coerente con lo Step 1: Authorization Code Flow con PKCE per client web/mobile/desktop, Client Credentials Flow per integrazioni server-to-server e plugin del Marketplace. Nessun Implicit Flow (deprecato in OAuth 2.1, superficie di attacco superiore).

### 2.2 JWT e Refresh Token

Access token JWT a vita breve (15 minuti), refresh token a vita più lunga (30 giorni, rotante: ogni uso di un refresh token ne genera uno nuovo e invalida il precedente — mitiga il furto di refresh token silenzioso). Il JWT porta `organization_id` e `workspace_id` correnti come claim, così ogni servizio a valle può applicare RLS (Domain Model, sezione 7.2) senza una query aggiuntiva.

### 2.3 MFA e SSO

MFA obbligatoria per ruoli con permessi amministrativi (coerente Step 1, sezione 11); SSO via SAML/OIDC per clienti Enterprise, con mapping esplicito tra i Ruoli del provider di identità esterno e i Role di AIOS (Modulo 1, sezione 7.3) — mai un mapping implicito "a sensazione" in fase di configurazione.

### 2.4 API Key e Service Account

Per integrazioni server-to-server semplici (non OAuth completo) sono ammesse API Key con scope limitato, sempre associate a un **Service Account** (non a un utente umano — un utente che lascia l'azienda non deve mai invalidare un'integrazione che tecnicamente "girava sul suo account personale", errore comune da evitare per costruzione).

### 2.5 Rotazione, scadenza, revoca

Ogni credenziale (API Key, refresh token, client secret di un plugin) ha una scadenza massima configurabile e un meccanismo di revoca immediata che si propaga entro secondi a tutti i nodi (tramite invalidazione in Redis, non attesa della scadenza naturale del JWT in circolazione — per questo l'access token, pur firmato, viene anche verificato contro una blacklist a bassa latenza per le revoche urgenti, es. un dipendente licenziato).

---

## 3. API per Bounded Context (rappresentative, non esaustive per costruzione)

Per ogni contesto: endpoint principali con lo schema completo per uno di essi come esempio guida, gli altri in forma sintetica per non appesantire il documento con ripetizioni meccaniche dello stesso pattern.

### 3.1 CRM — esempio completo guida

**`POST /api/v1/customers`**

Request:
```json
{
  "party": { "legal_name": "Rossi Srl", "tax_id": "IT01234567890" },
  "segment": "strategic",
  "assigned_to_user_id": "usr_123"
}
```

Response (201):
```json
{
  "data": {
    "id": "cust_789",
    "party_id": "party_456",
    "relationship_score": null,
    "segment": "strategic",
    "created_at": "2027-03-14T09:12:00Z"
  },
  "meta": { "...": "vedi 1.3" }
}
```

- **Validazioni:** `tax_id` verificato per formato nazionale; `assigned_to_user_id` deve appartenere alla stessa Organization (verifica cross-contesto tramite chiamata interna a Identity, mai una join diretta al database di Identity — Modulo 1, principio di confine).
- **Errori possibili:** 400 (formato P.IVA non valido), 409 (Party già esistente con stesso tax_id — propone deduplicazione, non crea un duplicato silenzioso, coerente col Product Bible CRM sezione 3.3).
- **Permessi richiesti:** `crm.customer.create`.
- **Eventi generati:** `CustomerCreated` (sezione 5).
- **Idempotenza:** richiede header `Idempotency-Key`; una richiesta ripetuta con la stessa chiave entro 24 ore restituisce la risposta originale senza creare un secondo record — essenziale perché un client mobile con connessione instabile non crei clienti duplicati per un semplice doppio invio.
- **Rate limit:** 100 richieste/minuto per Organization su questo endpoint (i limiti di scrittura sono più stringenti di quelli di lettura in tutta la piattaforma).

**Altri endpoint CRM (forma sintetica):**
`GET /api/v1/customers/{id}` · `PATCH /api/v1/customers/{id}` · `GET /api/v1/opportunities?stage=negotiation` · `POST /api/v1/opportunities/{id}/win` (genera `OpportunityWon` → Order) · `POST /api/v1/quotes` · `POST /api/v1/quotes/{id}/accept`.

### 3.2 Finance (sintetico, stesso pattern)

`POST /api/v1/invoices` (da un Order, mai creazione libera di righe fuori contesto senza riferimento) · `GET /api/v1/invoices/{id}` · **nessun `PATCH /api/v1/invoices/{id}` per una fattura Emessa** (409 esplicito se tentato, coerente con l'invariante del Modulo 1, sezione 3.6) · `POST /api/v1/invoices/{id}/credit-notes` · `GET /api/v1/cash-flow/forecast?horizon=90d`.

### 3.3 Inventory (sintetico)

`GET /api/v1/products/{id}/stock` · `POST /api/v1/stock-movements` (mai un `PATCH` diretto su una giacenza — ogni cambiamento è un movimento tracciato, coerente col Modulo 1 sezione 3.8) · `POST /api/v1/purchase-orders` · `GET /api/v1/suppliers/{id}/performance`.

### 3.4 HR (sintetico, con nota di sicurezza specifica)

`GET /api/v1/employees/{id}` — **risposta filtrata per campo secondo lo Scope del richiedente** (Modulo 1, sezione 7.4): un manager riceve un sotto-insieme di campi rispetto a un utente HR, stesso endpoint, payload diverso per costruzione, non per omissione lato client.

### 3.5 Documents, Calendar, Analytics, Automation, Notification, Marketplace, Administration

Stesso pattern di confine già illustrato: ogni endpoint di scrittura genera l'evento corrispondente del catalogo (sezione 5); Analytics espone solo endpoint `GET` per costruzione (Modulo 1, sezione 2.11 — nessun `POST/PATCH/DELETE` esiste nemmeno come possibilità tecnica in quel contesto).

### 3.6 Identity, Workspace, Organization

`POST /api/v1/auth/token`, `POST /api/v1/auth/refresh` (Identity) · `POST /api/v1/workspace/switch` (Workspace, genera `WorkspaceSwitched`) · `GET /api/v1/organization/branches` (Organization).

---

## 4. Standard JSON — dettaglio dei campi trasversali

### 4.1 Timestamps

Sempre ISO 8601 UTC (`2027-03-14T09:12:00Z`), mai formati locali — la conversione al fuso orario dell'utente è responsabilità del client, mai del server, per evitare ambiguità in un sistema multi-tenant con aziende in fusi orari diversi.

### 4.2 Pagination (dentro l'envelope quando presente)

```json
"pagination": {
  "cursor": "eyJpZCI6ImN1c3RfNzg5In0=",
  "next_cursor": "eyJpZCI6ImN1c3RfNzk1In0=",
  "has_more": true,
  "limit": 50
}
```

### 4.3 Links

Per risorse con navigazione naturale (es. una fattura collegata a un ordine): `"links": { "order": "/api/v1/orders/ord_123" }` — sempre URL relativi alla stessa API version, mai URL assoluti hardcoded che romperebbero cambiando dominio.

---

## 5. Event Catalog

### 5.1 Formato standard di un evento

```json
{
  "event_id": "evt_a1b2c3",
  "event_type": "InvoiceIssued",
  "event_version": 1,
  "organization_id": "org_456",
  "correlation_id": "corr_1a2b",
  "produced_at": "2027-03-14T09:12:00Z",
  "producer": "finance-service",
  "payload": { }
}
```

### 5.2 Dettaglio dei tre eventi più critici (esempio guida, gli altri seguono lo stesso schema)

**`InvoiceIssued`**
```json
"payload": {
  "invoice_id": "inv_001",
  "customer_id": "cust_789",
  "order_id": "ord_123",
  "amount": { "value": 4200.00, "currency": "EUR" },
  "due_date": "2027-04-13",
  "line_items": [ { "product_id": "prod_55", "quantity": 500, "unit_price": 8.40 } ]
}
```
- **Consumatori:** Documents (genera PDF), AI Platform (aggiorna Knowledge Graph), CRM (storico), Notification.
- **Campi obbligatori:** `invoice_id`, `customer_id`, `amount`, `due_date`. **Opzionali:** `order_id` (una fattura può, in casi limite, non derivare da un ordine tracciato — es. importazione di dati storici in migrazione).
- **Ordine di pubblicazione:** sempre dopo la persistenza transazionale dell'Invoice (mai un evento "ottimistico" pubblicato prima della certezza di scrittura — pattern Transactional Outbox, Step 1).
- **Idempotenza:** `event_id` univoco, i consumatori deduplicano su questo campo — un evento consegnato due volte (possibile in un sistema a "almeno una consegna" come Kafka) non deve produrre doppio effetto.
- **Retry e Dead Letter Queue:** un consumatore che fallisce ritenta con backoff esponenziale fino a 5 tentativi; oltre, l'evento finisce in una Dead Letter Queue dedicata per contesto, con allerta automatica al team tecnico — mai un evento perso silenziosamente.
- **Correlazione:** collegato a `OrderConfirmed` tramite `order_id` e allo stesso `correlation_id` se generato nello stesso flusso.

**`StockLevelChanged`**
```json
"payload": {
  "product_id": "prod_55",
  "branch_id": "branch_01",
  "previous_quantity": 520,
  "new_quantity": 20,
  "movement_type": "outbound",
  "reference": { "type": "order", "id": "ord_123" }
}
```
Consumatori: Finance (valore magazzino), CRM (disponibilità), AI Platform (trigger per Riordino Intelligente, Product Bible Inventory sezione 5).

**`AgentActionExecuted`**
```json
"payload": {
  "agent": "sales_agent",
  "tool": "create_quote",
  "autonomy_level": 3,
  "approved_by_user_id": "usr_123",
  "input_summary": "Preventivo 250 unità Alpha per cust_789",
  "result": { "quote_id": "quote_998" },
  "confidence_level": "high"
}
```
Questo evento **è di per sé la unità di Audit Log** per le azioni AI (Modulo 1, sezione 3.11) — non genera un secondo record di audit separato, è esso stesso il record, pubblicato sia sull'Event Bus sia persistito immutabile.

### 5.3 Catalogo sintetico degli altri eventi principali

`CustomerCreated`, `LeadScored`, `OpportunityStageChanged`, `QuoteAccepted`, `OrderConfirmed`, `PaymentReceived`, `SupplierDelayed`, `EmployeeHired`, `DocumentSigned`, `WorkflowCompleted`, `KnowledgeUpdated` — ciascuno segue lo stesso schema di sezione 5.1 con payload specifico del proprio dominio, coerente con la tabella impatti già definita nel Modulo 1, sezione 6.

---

## 6. Error Model

### 6.1 Struttura unica dell'errore

```json
"error": {
  "code": "INVOICE_IMMUTABLE",
  "message_user": "Questa fattura è già stata emessa e non può essere modificata.",
  "message_technical": "Attempted PATCH on Invoice in status ISSUED",
  "severity": "warning",
  "retryable": false,
  "suggestion": "Per correggere una fattura emessa, crea una nota di credito collegata.",
  "trace_id": "trace_7c3d..."
}
```

### 6.2 Perché due messaggi distinti (utente vs tecnico)

Il `message_user` è scritto secondo i principi della AI Personality e del Design System della Product Bible (diretto, mai colpevolizzante, propone un'alternativa quando esiste — stesso registro comunicativo della Chat AI, qui esteso agli errori API che un frontend mostrerà direttamente). Il `message_technical` è per i log e il supporto, mai mostrato a un utente finale.

### 6.3 Codici errore — namespace per contesto

`INVOICE_IMMUTABLE`, `STOCK_NEGATIVE_REJECTED`, `CUSTOMER_DUPLICATE_DETECTED`, `AUTONOMY_THRESHOLD_EXCEEDED` (quando un Tool AI tenta un'azione oltre la soglia configurata, Modulo 1 sezione 9.1) — codici stabili nel tempo (mai rinominati, solo deprecati con periodo di transizione, coerente col principio Backward Compatibility) perché un client potrebbe fare branching logico su di essi.

---

## 7. Pagination e Filtering

### 7.1 Cursor-based, non offset-based

Coerente con la scalabilità richiesta (offset-based degrada su tabelle grandi) — il cursore è opaco (base64 di un identificatore interno), mai un numero di pagina che il client possa costruire arbitrariamente.

### 7.2 Filtri strutturati

Query string per filtri semplici: `GET /api/v1/invoices?status=overdue&amount_gte=10000`. Per filtri complessi (più condizioni combinate), un endpoint dedicato `POST /api/v1/invoices/search` con un body strutturato — mai una query string illeggibile con dieci parametri concatenati.

### 7.3 Ricerca semantica

`POST /api/v1/search` (trasversale, dietro la Ricerca Universale del Modulo Navigazione) accetta linguaggio naturale nel body e instrada internamente al Business Brain (Modulo 1, sezione 8) — endpoint distinto dai filtri strutturati dei singoli contesti, mai mescolato con essi, per chiarezza di contratto (un client sa sempre se sta facendo una query strutturata o una ricerca interpretata).

---

## 8. Webhook

### 8.1 Registrazione

`POST /api/v1/webhooks` con URL di destinazione ed elenco di `event_type` sottoscritti — un plugin o un'integrazione esterna riceve solo gli eventi a cui si è esplicitamente iscritto, mai un firehose indifferenziato.

### 8.2 Firma e sicurezza

Ogni payload webhook è firmato con HMAC-SHA256 usando un secret condiviso al momento della registrazione, verificabile dal destinatario nell'header `X-AIOS-Signature` — previene spoofing di eventi falsi verso un'integrazione.

### 8.3 Retry

Stessa politica di backoff esponenziale della sezione 5.2, con un massimo configurabile di tentativi prima di marcare il webhook come "in errore" e notificare l'amministratore dell'integrazione (mai un fallimento silenzioso indefinito).

### 8.4 Versioning

Un webhook dichiara la versione di payload che si aspetta (`event_version`, sezione 5.1) — un cambio di schema non distruttivo non richiede azione, un cambio distruttivo richiede una nuova versione dell'evento con periodo di transizione in cui entrambe coesistono.

---

## 9. Streaming

### 9.1 Quando SSE, quando WebSocket

**Server-Sent Events** per flussi unidirezionali server→client a bassa complessità: stato di elaborazione AI in Chat (Product Bible, Modulo 2, sezione 2.7 — "Sto cercando...", "Sto ragionando..."), avanzamento di un workflow (Modulo Automation). **WebSocket** solo dove serve bidirezionalità reale a bassa latenza (es. una futura funzionalità collaborativa in tempo reale su un documento condiviso) — la scelta di default è sempre SSE per la sua semplicità operativa, WebSocket è l'eccezione motivata caso per caso.

### 9.2 Notifiche live

Il Notification Center (Product Bible, Modulo 3, sezione 7) riceve aggiornamenti via SSE su un canale per Organization, non per singolo utente — il filtro per permessi/visibilità avviene lato server prima dell'invio, mai lato client dopo aver ricevuto dati non autorizzati.

---

## 10. AI Tool Contract

### 10.1 Struttura di ogni Tool

```json
{
  "tool_name": "create_quote",
  "description": "Crea un preventivo per un cliente esistente",
  "input_schema": {
    "customer_id": "string, required",
    "line_items": "array, required",
    "discount_percent": "number, optional, default 0"
  },
  "output_schema": { "quote_id": "string", "margin_percent": "number" },
  "required_permission": "crm.quote.create",
  "min_autonomy_level_for_auto_execution": 3,
  "audit_mandatory": true,
  "reversible": true,
  "rollback_window_seconds": 30
}
```

### 10.2 Perché ogni Tool è validato due volte

Una volta a livello di schema input/output (coerente con Zero Ambiguity — un Tool non riceve mai un payload che non rispetta il proprio contratto dichiarato), una seconda volta a livello di business (le stesse regole invarianti del Domain Model, es. un `create_invoice` non potrà mai produrre una fattura con importo negativo, indipendentemente da cosa l'AI "creda" di dover fare).

### 10.3 Audit obbligatorio, sempre

Ogni invocazione di Tool genera `AgentActionExecuted` (o `AgentActionFailed`) indipendentemente dall'esito — non esiste un Tool "silenzioso" che agisce senza lasciare traccia, coerente con la Costituzione (sezione 5.4).

---

## 11. Security

### 11.1 RBAC e Scope enforcement — dove avviene, esattamente

Sempre a livello di servizio applicativo (dentro il Bounded Context, non nell'API Gateway) per le regole di Scope granulare (es. "solo i propri clienti assegnati") — l'API Gateway (Step 1) applica solo autenticazione e rate limiting di primo livello, mai la logica di business dei permessi, per non duplicare quella logica in due posti che potrebbero divergere nel tempo.

### 11.2 Rate limiting e anti-abuse

Limiti differenziati per tipo di operazione (lettura più permissiva, scrittura più stringente, sezione 3.1) e per piano di abbonamento (Enterprise ha limiti più alti) — un superamento restituisce 429 con header `Retry-After`, mai un blocco silenzioso senza indicazione di quando ritentare.

### 11.3 Replay protection

Ogni richiesta firmata (webhook, sezione 8.2; Service Account, sezione 2.4) porta un timestamp verificato contro una finestra di tolleranza (5 minuti) — richieste fuori finestra sono rifiutate anche se la firma è tecnicamente valida, per prevenire replay di richieste intercettate.

### 11.4 Encryption

TLS 1.3 in transito su ogni chiamata (Step 1, confermato qui senza ridiscuterlo), payload di eventi contenenti dati sensibili (es. HR) cifrati anche a livello applicativo prima della pubblicazione su Kafka, non solo a livello di trasporto — doppio strato per la categoria di dati più sensibile della piattaforma.

---

## 12. Osservabilità

### 12.1 Logging strutturato

Ogni log porta `trace_id`, `correlation_id`, `organization_id` (mai un log privo di contesto tenant, essenziale per il debug in un sistema multi-tenant) — formato JSON, centralizzato su Grafana Loki (Step 1).

### 12.2 Tracing distribuito

Standard OpenTelemetry — ogni chiamata che attraversa più servizi (es. una richiesta Chat che coinvolge Prompt Orchestrator, due Tool e il Business Brain) genera un'unica traccia navigabile end-to-end, essenziale per diagnosticare la latenza di un flusso multi-agente.

### 12.3 Metriche

Per ogni endpoint: latenza (p50/p95/p99), tasso di errore, throughput — con soglie di allerta automatica quando un endpoint degrada, prima che diventi un problema visibile agli utenti.

---

## 13. Testabilità

Per ogni endpoint, quattro livelli obbligatori prima del rilascio: **unit test** (logica di validazione isolata), **integration test** (interazione reale con database di test), **contract test** (verifica che la risposta rispetti esattamente lo schema JSON dichiarato in questo documento — impedisce che un'implementazione diverga silenziosamente dal contratto pubblicato), **end-to-end test** (flusso completo attraverso più Bounded Context per gli scenari critici, es. Quote → Order → Invoice → Stock). I casi limite obbligatori per ogni endpoint di scrittura: input al limite di validazione, tentativo di violare un invariante (es. modificare un'Invoice Emessa), richiesta duplicata con stessa Idempotency-Key.

---

## 14. Linee guida per gli sviluppatori

- **Naming:** inglese per ogni identificatore tecnico (endpoint, campi JSON, nomi evento), italiano riservato ai soli messaggi utente (`message_user`) — coerente con uno sviluppo che dovrà attrarre talenti internazionali nel tempo.
- **Deprecazione:** un endpoint deprecato resta funzionante per un periodo minimo di 12 mesi con header `Deprecation` e `Sunset` (standard IETF), mai rimosso senza preavviso pubblicato.
- **Compatibilità:** aggiungere un campo opzionale non è mai un cambio distruttivo; rimuovere o rinominare un campo lo è sempre — regola semplice ma non negoziabile per gli sviluppatori.
- **Estensioni future:** ogni schema JSON lascia deliberatamente spazio a campi aggiuntivi non dichiarati (i client devono ignorare campi sconosciuti, mai fallire su di essi) — regola di "tolerant reader" applicata sistematicamente.

---

## 15. Evoluzione

- **Milioni di utenti:** il rate limiting per Organization (non globale) e la cache Redis (Step 1) isolano il carico di un tenant enorme dagli altri — nessuna richiesta di ridisegno dell'API al crescere del numero di utenti, solo di infrastruttura.
- **Migliaia di plugin:** ogni plugin consuma la stessa identica API pubblica versionata usata dai client nativi (principio già stabilito nella Product Bible, "nessun Tool esclusivo della UI grafica", qui esteso: nessuna API esclusiva del frontend nativo) — non serve una "API per plugin" separata da mantenere in parallelo.
- **Centinaia di AI Agent:** ogni nuovo agente usa Tool già catalogati (sezione 10) o ne dichiara di nuovi seguendo lo stesso schema — l'aggiunta di un agente non richiede mai una modifica al contratto API sottostante.
- **Nuovi modelli AI, espansione internazionale:** nessun impatto sul contratto API — sono decisioni che vivono sotto l'astrazione model-agnostic (Costituzione) e nella localizzazione dei soli `message_user` (sezione 6.2), mai nello schema tecnico.

---

## Conclusione

### Principi architetturali definitivi
1. Un solo envelope di risposta, un solo formato di errore, ovunque nella piattaforma — zero eccezioni endpoint per endpoint.
2. Ogni scrittura è idempotente per costruzione, non per convenzione lasciata all'implementazione.
3. RBAC e Scope si applicano sempre a livello di servizio di dominio, mai duplicati nell'API Gateway.
4. Ogni azione di un AI Agent è, essa stessa, il proprio record di audit — non un log separato dall'evento di business.
5. Nessuna API esclusiva per i client nativi: un plugin di terze parti e l'app mobile ufficiale condividono lo stesso contratto.

### Decisioni prese
- Cursor-based pagination come standard unico, mai offset-based.
- SSE come default per lo streaming, WebSocket come eccezione motivata.
- Namespace di error code stabili nel tempo, mai rinominati.

### Decisioni rimandate
- Il catalogo JSON Schema completo di ogni singolo evento (qui mostrati solo i più critici come esempio guida) — da completare come allegato tecnico man mano che ogni Bounded Context viene implementato.
- La policy esatta di rate limit per piano di abbonamento (numeri specifici) — materia commerciale da confermare con il piano tariffario definitivo, non di sola architettura.

### Dipendenze con il Domain Model
Ogni endpoint e ogni evento qui descritto è la proiezione diretta di un Aggregate Root o Domain Event già catalogato nel Modulo 1 — nessuna nuova entità introdotta, solo il suo contratto di comunicazione esterno.

### Impatto sul database fisico
Il pattern Transactional Outbox (sezione 5.2) richiede una tabella dedicata per evento non ancora pubblicato, letta da un processo di relay verso Kafka — dettaglio implementativo da formalizzare nel modulo di schema fisico.

### Impatto sul backend
Ogni Bounded Context (Modulo 1) espone il proprio modulo NestJS con controller allineati 1:1 a questo contratto — nessuna logica di interpretazione libera lasciata al singolo team di sviluppo.

### Impatto sul frontend e mobile
Un solo client HTTP condiviso (generato o mantenuto a mano) può interpretare l'intero envelope (sezione 1.3) in modo identico su web, desktop e mobile — riduzione concreta di duplicazione di codice tra le tre piattaforme.

### Impatto sul Business Brain
Il Transactional Outbox e l'Event Catalog sono la fonte diretta dell'Event Log della Costituzione — nessuna differenza tra "l'evento che il backend pubblica" e "l'evento che il Business Brain ingerisce", stesso oggetto.

### Linee guida per l'implementazione
Costruire per primi l'envelope di risposta, il formato errore e il meccanismo di idempotenza come libreria condivisa trasversale a ogni servizio backend — sono gli elementi con il più alto costo di correzione se implementati in modo incoerente da team diversi dopo che lo sviluppo è già iniziato.

---

## Prossimo modulo (in attesa di approvazione)

Due possibilità: proseguire l'Engineering Bible con lo **schema fisico del database** (tabelle, indici, partizionamento — la traduzione concreta del Domain Model e di questo contratto API in Postgres), oppure tornare alla Product Bible con il modulo **HR** rimasto in sospeso. Fammi sapere come preferisci procedere.
