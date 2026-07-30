# AIOS — Documento di Architettura Tecnica
## Step 1 — Fondamenta della piattaforma

**Versione:** 1.0 — Bozza per approvazione
**Autore:** CTO / Lead Architect / Head of Product (ruolo simulato)
**Stato:** In attesa di approvazione prima dello Step 2

---

## Premessa metodologica

Prima di entrare nel dettaglio, fisso i tre vincoli che guidano ogni scelta tecnica di questo documento, perché ogni decisione successiva discende da questi:

1. **AIOS è multi-tenant fin dal primo giorno.** Non esiste una versione "single company" da cui migrare dopo: il modello dati, l'autenticazione e l'infrastruttura sono pensati per migliaia di aziende clienti da subito.
2. **L'AI non è una feature, è il livello centrale.** Questo significa che l'architettura dati deve essere progettata perché ogni evento aziendale sia leggibile e collegabile dal motore AI, non aggiunta come integrazione a posteriori.
3. **Una sola fonte di verità, quattro superfici.** Web, Desktop, iOS e Android sono client diversi sopra la stessa API e lo stesso modello dati — non quattro prodotti separati che si somigliano.

---

## 1. Architettura generale del software

AIOS è organizzato come un **sistema a livelli con un nucleo cognitivo condiviso**, non come un monolite né come un insieme scoordinato di microservizi indipendenti.

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                            │
│  Web (Next.js) · Desktop (Tauri) · iOS · Android         │
└───────────────────────┬───────────────────────────────────┘
                         │  API Gateway (REST + eventi)
┌───────────────────────▼───────────────────────────────────┐
│  APPLICATION LAYER — servizi di dominio (moduli AIOS)     │
│  CRM · Sales · Finance · Inventory · HR · Documents · ... │
└───────────────────────┬───────────────────────────────────┘
                         │  Event Bus (async)
┌───────────────────────▼───────────────────────────────────┐
│  BUSINESS BRAIN — nucleo cognitivo condiviso              │
│  Knowledge Graph · Memoria vettoriale · Agent Orchestrator│
└───────────────────────┬───────────────────────────────────┘
                         │
┌───────────────────────▼───────────────────────────────────┐
│  DATA LAYER — Postgres (multi-tenant) · Vector DB · Cache │
└─────────────────────────────────────────────────────────┘
```

**Perché questa forma e non un monolite:** un monolite sarebbe più veloce da avviare, ma AIOS ha moduli con cicli di rilascio e carichi molto diversi (Finance cambia raramente ed è critico per la correttezza; Chat AI cambia ogni settimana ed è tollerante a errori occasionali). Separarli permette di scalarli e rilasciarli indipendentemente.

**Perché non "puri" microservizi indipendenti:** un'architettura a microservizi pura, senza un nucleo condiviso, ricrea esattamente il problema che AIOS vuole risolvere per i suoi clienti — dati frammentati tra sistemi che comunicano male. Per questo introduciamo il **Business Brain** come livello obbligatorio attraverso cui ogni modulo pubblica e legge eventi: non è un modulo tra gli altri, è l'infrastruttura che li rende coerenti.

**Pattern architetturale:** Domain-Driven Design (DDD) per la suddivisione dei moduli, Event-Driven Architecture per la comunicazione, CQRS solo dove il carico di lettura/scrittura lo giustifica (es. Analytics, Insight), non applicato ovunque per evitare complessità inutile.

---

## 2–4. Tecnologie, linguaggi e framework consigliati

| Livello | Scelta consigliata | Alternativa considerata | Perché questa scelta |
|---|---|---|---|
| Linguaggio backend | **TypeScript** (Node.js) | Go, Java/Kotlin | Un solo linguaggio condiviso tra frontend e backend riduce il context-switching del team e velocizza l'assunzione di sviluppatori nella fase iniziale. Go resta un'opzione per servizi ad altissimo throughput (es. ingestion eventi) in una fase successiva. |
| Framework backend | **NestJS** | Express puro, Fastify | NestJS impone struttura modulare, dependency injection e testabilità fin da subito — fondamentale con decine di moduli di dominio. Express da solo lascerebbe troppa libertà, con rischio di incoerenza tra team diversi. |
| Frontend web | **Next.js (React) + TypeScript** | Vue/Nuxt, SvelteKit | Ecosistema maturo, server-side rendering per performance e SEO sulla parte marketing, enorme disponibilità di sviluppatori. |
| Styling / Design System | **Tailwind CSS + design tokens custom** | CSS-in-JS puro | Tailwind con token centralizzati permette coerenza visiva tra web, desktop (stessa codebase) e futuri moduli di terze parti. |
| Mobile | **React Native (Expo)** | Flutter, nativo puro (Swift/Kotlin) | Condivide logica e componenti con il web React, dimezzando il lavoro di manutenzione. Flutter è tecnicamente valido ma introduce Dart, un secondo linguaggio da presidiare. Il nativo puro viene riconsiderato per moduli specifici (es. Voice AI, notifiche push avanzate) dove serve accesso hardware profondo. |
| Desktop | **Tauri** | Electron | Tauri produce binari molto più leggeri (Rust invece di un intero Chromium+Node duplicato) e ha una superficie di attacco più piccola. Electron resta l'alternativa se serve velocità di sviluppo massima nei primi mesi, sacrificando peso e sicurezza. |
| AI / ML layer | **Python** (orchestrazione agenti, pipeline RAG) | Node.js puro | L'ecosistema AI (LangChain/LlamaIndex, librerie di embedding, valutazione modelli) è molto più maturo in Python. Il servizio Python espone API interne consumate dal backend NestJS: non serve riscrivere tutto in un solo linguaggio, serve isolare bene i confini. |
| Database primario | **PostgreSQL** | MySQL, MongoDB | Postgres offre Row-Level Security nativa (fondamentale per multi-tenancy), estensioni per vettori (pgvector), solidità transazionale per dati finanziari. MongoDB verrebbe scelto solo per sotto-domini con schema molto variabile (es. log grezzi), non come DB primario. |
| Vector DB | **pgvector (fase iniziale) → Weaviate/Pinecone (scala)** | Solo servizio esterno dedicato fin da subito | Iniziare con pgvector evita di gestire un sistema distribuito in più per un volume dati che, nei primi mesi, non lo giustifica. Si migra a un vector DB dedicato quando la memoria per singolo cliente supera soglie che degradano le performance di Postgres. |
| Cache / code / eventi | **Redis + Kafka** (o SQS/SNS su AWS) | RabbitMQ | Kafka per il flusso di eventi ad alto volume del Business Brain (ogni azione genera un evento), Redis per cache e code a bassa latenza. RabbitMQ è più semplice ma meno adatto a un volume di eventi che cresce con ogni nuovo cliente e modulo. |
| Analytics / BI interna | **ClickHouse** | Postgres con viste materializzate | Quando AIOS Insight dovrà aggregare milioni di eventi per cliente, un database colonnare dedicato evita di appesantire il database transazionale principale. |

---

## 5. Database — modello e strategia

Tre categorie di dati, tre strategie:

1. **Dati transazionali (Postgres):** clienti, ordini, fatture, utenti, permessi. Fonte di verità, integrità referenziale forte, transazioni ACID.
2. **Dati semantici (pgvector → Vector DB dedicato):** rappresentazioni vettoriali di documenti, email, conversazioni — usate dal Business Brain per la ricerca semantica e il contesto fornito agli agenti AI.
3. **Dati analitici (ClickHouse):** eventi storici aggregati per dashboard, KPI, forecasting. Scritti in modo asincrono, mai letti in tempo reale dai flussi critici.

**Schema multi-tenant:** ogni tabella transazionale porta una colonna `tenant_id` (azienda cliente), protetta da **Row-Level Security** di Postgres — non è il codice applicativo a "ricordarsi" di filtrare per tenant, è il database stesso a impedire l'accesso incrociato anche in caso di bug applicativo. Questo è un dettaglio di sicurezza critico: un errore di un singolo sviluppatore non deve mai poter esporre dati di un'azienda a un'altra.

---

## 6. Cloud Infrastructure

- **Provider:** AWS o GCP (entrambi validi; AWS ha ecosistema più maturo per PMI europee, GCP ha BigQuery/Vertex AI più integrati). Raccomandazione: **AWS**, con region primaria in Europa (Francoforte o Milano) per conformità GDPR e latenza per il mercato italiano.
- **Orchestrazione container:** Kubernetes (EKS) per i servizi di dominio, con possibilità di scalare orizzontalmente ogni modulo in modo indipendente.
- **Infrastructure as Code:** Terraform, per rendere l'infrastruttura versionata, riproducibile e auditabile — requisito che diventa non negoziabile quando arrivano clienti Enterprise che chiedono cloud dedicato.
- **CDN:** CloudFront per asset statici e la parte marketing del sito.

---

## 7–8. Backend e Frontend

**Backend:** organizzato per **domini di business**, non per "tipo tecnico" (non "controllers/services/models" trasversali, ma un modulo NestJS per CRM, uno per Finance, uno per Inventory, ciascuno con la propria struttura interna coerente). Ogni modulo espone:
- API REST verso i client
- Eventi pubblicati sull'Event Bus verso il Business Brain
- Eventi consumati da altri moduli quando serve reagire (es. Inventory reagisce a un evento "Ordine confermato" pubblicato da Sales)

**Frontend web:** Next.js con architettura a **feature modules**, design system condiviso (componenti, token di colore/spaziatura/tipografia) usato identicamente su web e desktop, dato che il desktop (Tauri) incapsula la stessa applicazione web.

---

## 9–10. Mobile e Desktop

**Mobile (iOS + Android):** React Native con Expo permette un'unica codebase per entrambe le piattaforme, con moduli nativi isolati (Swift/Kotlin) solo dove serve accesso hardware specifico (notifiche push avanzate, integrazione Voice AI, biometria). Questo riduce drasticamente il costo di manutenzione rispetto a due team nativi separati, al prezzo di una piccola perdita di rifinitura nativa che va monitorata con attenzione (in linea con lo standard qualitativo richiesto, non è accettabile un'app "ibrida" che si sente tale).

**Desktop:** Tauri incapsula la stessa applicazione web con un runtime nativo leggero (Rust), garantendo notifiche di sistema, accesso file locali (utile per import/export documenti) e un'icona nel dock/taskbar, senza pagare il costo in peso e sicurezza di Electron.

---

## 11–13. Autenticazione, gestione utenti, gestione aziende

**Autenticazione:** OAuth 2.0 / OpenID Connect come standard, JWT a vita breve + refresh token per le sessioni, **SSO via SAML** per i clienti Enterprise che lo richiedono, **MFA obbligatoria** per ruoli amministrativi.

**Gestione utenti:** modello a **ruoli + permessi granulari** (RBAC come base, con eccezioni puntuali gestibili via ABAC per casi come "questo commerciale vede solo i propri clienti"). Ogni utente appartiene a una o più Organizzazioni (aziende), con un ruolo per organizzazione — una persona può lavorare per due aziende clienti di AIOS con permessi diversi in ciascuna.

**Gestione aziende:** entità "Organization" come radice del multi-tenancy, con supporto nativo a **multi-sede** e, per i piani Enterprise, **gerarchie di organizzazioni** (gruppo con più società controllate che condividono alcuni dati e ne isolano altri).

---

## 14. Multi-tenancy — la decisione più importante di questo documento

Tre strategie possibili:

1. **Database separato per cliente** — isolamento massimo, costo operativo altissimo (migrazioni ×N clienti), non scalabile oltre poche centinaia di clienti.
2. **Schema separato per cliente nello stesso database** — isolamento buono, ma la gestione di migliaia di schemi diventa complessa da amministrare.
3. **Schema condiviso con `tenant_id` + Row-Level Security** — isolamento garantito a livello di database, scalabilità alta, complessità operativa bassa.

**Scelta:** opzione 3 come default per i piani Starter e Professional, con **opzione di database/cloud dedicato riservata al piano Enterprise** (che già oggi, nel posizionamento commerciale di AIOS, prevede "Dedicated Cloud / On-Prem"). Questo allinea perfettamente l'architettura tecnica al modello di pricing già definito.

---

## 15–17. Sicurezza, Backup, Logging

**Sicurezza:** crittografia in transito (TLS 1.3 ovunque) e a riposo (AES-256 sul database), gestione segreti centralizzata (AWS Secrets Manager o HashiCorp Vault — mai variabili d'ambiente in chiaro nei repository), audit log immutabile per ogni azione sensibile, penetration test periodici prima di ogni major release, conformità OWASP Top 10 verificata in CI.

**Backup:** strategia 3-2-1 (tre copie, due supporti diversi, una fuori sede), backup incrementali continui + snapshot giornalieri, **Point-in-Time Recovery** su Postgres per poter ripristinare lo stato esatto di un'azienda cliente a un minuto specifico in caso di errore operativo, retention minima 30 giorni (90 per il piano Enterprise).

**Logging:** logging strutturato (JSON) con **correlation ID** che segue una richiesta attraverso tutti i moduli coinvolti — essenziale per debuggare un flusso come "email → preventivo → CRM → magazzino" che attraversa quattro servizi diversi. Centralizzato su stack tipo Grafana Loki + Grafana per dashboard operative.

---

## 18–19. Performance e Scalabilità

- Cache a più livelli: CDN per asset statici, Redis per query frequenti (es. dashboard), cache applicativa per risposte AI ripetute con lo stesso contesto.
- Scalabilità orizzontale di ogni modulo tramite Kubernetes (autoscaling basato su CPU/memoria e, per i moduli AI, su coda di richieste in attesa).
- Percorso di scalabilità del database: si parte da un'istanza Postgres verticale ben dimensionata, con **read replica** quando il carico di lettura (dashboard, Analytics) supera quello di scrittura; lo sharding per `tenant_id` resta un'opzione futura da attivare solo quando i numeri lo richiedono davvero, non implementata prematuramente.

---

## 20. Architettura dell'Intelligenza Artificiale — il Business Brain

Questo è il cuore differenziante di AIOS, quindi merita il maggior dettaglio.

**Tre componenti:**

1. **Knowledge Graph** (su Postgres, con estensione per grafi o modellazione relazionale esplicita): rappresenta le relazioni tra entità — cliente, ordine, prodotto, fattura, decisione — permettendo di rispondere a domande complesse ("mostrami i clienti con margine sopra il 25% che non hanno ricevuto un'offerta negli ultimi 6 mesi") senza dover interrogare manualmente decine di tabelle.

2. **Memoria vettoriale** (pgvector → vector DB dedicato): ogni documento, email, conversazione viene trasformato in embedding e reso ricercabile semanticamente. Alimenta il **RAG (Retrieval-Augmented Generation)**: quando un utente fa una domanda in linguaggio naturale, il sistema recupera prima i dati rilevanti dal Knowledge Graph e dalla memoria vettoriale, poi li passa al modello linguistico per generare una risposta ancorata ai dati reali dell'azienda — non "inventata" dal modello.

3. **Agent Orchestrator**: coordina gli agenti specializzati (Sales Agent, Finance Agent, ecc.) descritti nel materiale di prodotto. Ogni agente ha accesso solo agli strumenti e ai dati del proprio dominio; l'orchestratore decide quali agenti coinvolgere per una richiesta e in che ordine.

**Scelta strategica importante: layer "model-agnostic".** L'architettura non deve legare AIOS a un solo fornitore di modelli linguistici. Si progetta un livello di astrazione che permette di usare Claude, GPT o altri modelli in modo intercambiabile a seconda del task (un modello per la generazione di testo, eventualmente un altro più economico per classificazioni semplici), sia per motivi di costo che per non dipendere da un singolo fornitore.

**Guardrail:** ogni azione automatizzata passa attraverso un livello di controllo configurabile dall'azienda cliente (i "livelli di autonomia" già descritti nel materiale di prodotto: solo analisi → suggerimento → esecuzione previa approvazione → automazione completa). Questo non è solo una scelta di prodotto, è anche un requisito architetturale: ogni agente deve esporre un'azione come "proposta" prima di eseguirla, con un passaggio esplicito di conferma tracciato in audit log.

---

## 21–22. Comunicazione tra moduli e struttura delle API

**Tra moduli interni:** Event Bus (Kafka) per comunicazione asincrona (un modulo pubblica "OrdineConfermato", altri moduli reagiscono senza accoppiamento diretto), più chiamate sincrone dirette via gRPC per i pochi casi che richiedono una risposta immediata (es. verifica disponibilità a magazzino durante la creazione di un preventivo).

**Verso i client (web/desktop/mobile) e verso l'esterno (partner, Marketplace):** API REST versionata (`/v1/`, `/v2/`) documentata con OpenAPI, autenticata via OAuth2, con **rate limiting** per piano di abbonamento. Webhook in uscita per notificare sistemi esterni di eventi rilevanti. Un livello GraphQL viene valutato in una fase successiva per i casi in cui i client necessitano di query molto flessibili (es. dashboard personalizzabili), ma non è necessario al lancio.

---

## 23–25. Organizzazione del codice, Git, Ambienti

**Organizzazione del codice:** **monorepo** (gestito con Nx o Turborepo) contenente backend, frontend web, mobile e desktop. Motivazione: con quattro superfici client che condividono design system, tipi TypeScript e logica di validazione, un monorepo evita la duplicazione e garantisce che un cambiamento (es. una nuova regola di validazione su un campo) si propaghi ovunque in un solo commit. Il monorepo è organizzato con confini di dominio chiari (non è un incentivo a scrivere codice accoppiato).

**Repository Git:** strategia **trunk-based development** con feature flag per funzionalità in lavorazione, invece di lunghi feature branch — riduce il rischio di merge complessi tipico di un progetto con molti moduli in sviluppo parallelo. Ogni merge in main passa da CI obbligatoria (test, lint, build).

**Ambienti:** tre ambienti separati — **Development** (per ogni sviluppatore/feature), **Staging** (identico a produzione, usato per QA e demo interne prima del rilascio), **Production**. Deploy automatizzato via pipeline CI/CD, con possibilità di rollback immediato e feature flag per attivare gradualmente nuove funzionalità solo per un sottoinsieme di clienti pilota.

---

## 26. Piano di sviluppo completo — le fasi

| Fase | Obiettivo | Contenuto tecnico principale |
|---|---|---|
| **Fase 0 — Fondamenta** | Infrastruttura pronta, zero funzionalità di prodotto | Repository monorepo, CI/CD, autenticazione, multi-tenancy, ambienti Dev/Staging/Prod, design system base |
| **Fase 1 — MVP** | Primo valore utilizzabile da clienti pilota | CRM, Email AI, Preventivi AI, Dashboard base, Business Brain v1 (Knowledge Graph minimo) |
| **Fase 2 — Consolidamento** | Piattaforma commerciale stabile | Magazzino, Finance, Workflow AI, prima versione mobile e desktop |
| **Fase 3 — Intelligenza estesa** | Il Business Brain diventa il differenziale reale | Memoria vettoriale completa, Agent Orchestrator, Insight con raccomandazioni motivate |
| **Fase 4 — Ecosistema** | Apertura a terzi | API pubbliche, Marketplace, SDK per sviluppatori |
| **Fase 5 — Enterprise** | Grandi clienti | Cloud dedicato, SSO avanzato, compliance estesa, SLA garantiti |

Ogni fase corrisponde a uno o più "step" successivi di questo documento, che tratteremo singolarmente previa tua approvazione.

---

## Problemi futuri da tenere presenti fin da ora

Anche se non richiedono azione immediata, segnalo qui — per completezza, come richiesto — i rischi tecnici che l'architettura sopra dovrà affrontare più avanti:

- **Costo dei modelli AI su larga scala:** con migliaia di aziende clienti, il costo di inferenza diventa una voce significativa; da qui la scelta di un layer model-agnostic e cache delle risposte.
- **Rumorosità del Knowledge Graph:** più dati entrano, più serve un meccanismo di "igiene dei dati" (deduplicazione, gestione di informazioni contraddittorie) per non degradare la qualità dei suggerimenti AI nel tempo.
- **Isolamento dei tenant sotto carico:** un cliente Enterprise con volumi enormi non deve poter degradare le performance per i clienti Starter sullo stesso database condiviso — da qui l'opzione di cloud dedicato per Enterprise.
- **Coerenza tra le quattro superfici client:** mantenere web, desktop, iOS e Android sincronizzati nel tempo richiede disciplina nel monorepo e test end-to-end multipiattaforma fin dall'inizio, non aggiunti in un secondo momento.

---

## Prossimo step (in attesa di approvazione)

Con questo documento approvato, lo **Step 2** naturale è la progettazione dettagliata del **modello dati completo** (schema Postgres, entità core, relazioni) oppure, in alternativa, la progettazione UX/UI dei flussi principali — dimmi tu quale preferisci affrontare per primo prima che io proceda.
