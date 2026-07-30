# AIOS — Artificial Intelligence Operating System

Monorepo principale della piattaforma. Questo file è il punto di ingresso per chiunque
si unisca al progetto: spiega la struttura, lo stack e come avviare l'ambiente locale.

**Prima di scrivere una sola riga di codice, leggi `/docs`.** Contiene l'intera
documentazione architetturale approvata (Product Bible + Engineering Bible). Ogni
scelta implementativa in questo repository deve poter essere ricondotta a una
decisione già presa lì — se non lo è, è un bug di processo, non una libertà.

**Prima di progettare qualunque nuova Epic o Feature, leggi anche
`docs/architecture/AIOS-Product-Constitution.md`.** Non va confusa con
`docs/02-costituzione.md` (documento tecnico su Business Brain/AI Agents/
Memoria) — la Product Constitution è il documento di principi permanenti
sul comportamento del prodotto ("AIOS è un collaboratore, non un
software"), a cui ogni Epic futura va confrontata prima di essere
progettata.

---

## Prisma — dove sta lo schema e perché la generazione è automatica

`@prisma/client`, appena installato, **non contiene il client**: contiene uno stub che non
esporta né `PrismaClient` né `Prisma`. Quelle esportazioni nascono solo quando
`prisma generate` legge lo schema e scrive il client dentro `node_modules`. Senza quel passo
`pnpm install` riesce, il typecheck di `apps/web` (che non usa Prisma) riesce, e poi
`pnpm build` fallisce su ogni servizio backend.

### Dove sta lo schema: dichiarato una volta sola

`packages/domain-model/package.json` contiene la configurazione canonica:

```json
"prisma": { "schema": "prisma/schema.prisma" }
```

È configurazione **stabile**, non un preview feature. Da qui in poi nessun comando ha bisogno
di `--schema=...`, e quindi **nessun percorso viaggia come argomento di shell** — che era la
causa del fallimento su Windows: se la cartella del progetto contiene uno spazio
(`AIOS 1.3.4`, `OneDrive - Azienda`, un cognome), `cmd.exe` spezza l'argomento e Prisma riceve
un frammento di percorso, rispondendo con un messaggio fuorviante sul preview feature
`prismaSchemaFolder`.

Comandi corretti, da qualunque cartella e su qualunque sistema:

```bash
pnpm --filter @aios/domain-model run generate
pnpm --filter @aios/domain-model exec prisma studio
```

### Due garanzie indipendenti

1. **`postinstall`** (`scripts/postinstall.js`): dopo `pnpm install` crea `.env` da
   `.env.example` se manca — senza mai sovrascriverne uno esistente — verifica che lo schema
   sia un **file** e non una cartella, e genera il client. La CLI viene invocata con Node
   direttamente, senza shell, con `cwd` sul package dello schema: gli argomenti restano argv
   letterali su Windows, macOS, Linux e Vercel.
2. **Pipeline Turbo**: il task `generate` precede `build`, `dev`, `test` e `typecheck` di ogni
   package che dipende da `@aios/domain-model` — cioè tutti quelli che usano Prisma. Serve a
   chi installa con `--ignore-scripts`, in CI, e su Vercel quando `node_modules` arriva dalla
   cache e il `postinstall` non viene rieseguito.

Il task ha `cache: false` di proposito: l'esito finisce in `node_modules`, che Turbo non
traccia. Una cache "positiva" su un albero senza client sarebbe una trappola silenziosa.

---

## Struttura del monorepo

```
aios/
├── apps/                    Applicazioni client (ciò che l'utente finale apre)
│   ├── web/                 Next.js — applicazione web principale
│   ├── desktop/             Tauri — incapsula l'app web per macOS/Windows/Linux
│   └── mobile/              React Native (Expo) — iOS e Android
│
├── backend/                 Servizi applicativi, un modulo per Bounded Context
│   ├── services/            Un servizio per contesto (Domain Model, Modulo 1)
│   │   ├── identity/         │ organization/      │ workspace/
│   │   ├── administration/   │ onboarding/        │ eventing/  (relay Outbox→Event Bus)
│   │   ├── crm/               │ finance/           │ inventory/
│   │   ├── hr/                 │ documents/         │ calendar/
│   │   ├── analytics/          │ automation/        │ notification/
│   │   ├── marketplace/
│   └── gateway/              API Gateway — autenticazione, rate limit, routing
│                             (mai logica di business qui, vedi API Contract sez. 11.1)
│
├── ai-platform/             I componenti cognitivi (AI Platform Architecture, Modulo 3)
│   ├── prompt-orchestrator/  context-engine/       memory-engine/
│   ├── knowledge-graph/      vector-platform/      model-router/
│   ├── multi-agent-coordinator/  planning-engine/  tool-execution-engine/
│   ├── confidence-engine/    safety-engine/        cost-engine/
│   └── agents/               Un agente per dominio (sales, finance, inventory,
│                             hr, executive, compliance — Costituzione, catalogo agenti)
│
├── packages/                Librerie condivise da più app/servizi
│   ├── domain-model/         Tipi ed entità del Domain Model, condivisi ovunque
│   ├── api-contract/         Envelope, error model, tipi delle richieste/risposte
│   ├── event-schemas/        Schema JSON di ogni Domain Event (Event Catalog)
│   ├── design-system/        Token di colore/tipografia/spaziatura (Design System)
│   ├── ui-components/        Componenti React condivisi web + desktop
│   ├── config/               Configurazioni condivise (ESLint, TS, Prettier)
│   └── utils/                Utility generiche senza dipendenze di dominio
│
├── infrastructure/          Infrastructure as Code (Engineering Bible Modulo 4)
│   ├── terraform/            Un modulo per componente cloud, un ambiente per directory
│   ├── docker/                Dockerfile e configurazioni per servizi containerizzati
│   ├── kubernetes/            Manifest base + overlay per ambiente
│   └── scripts/               Script di provisioning/manutenzione infrastrutturale
│
├── docs/                    Tutta la documentazione architetturale approvata
│                             (Product Bible, Engineering Bible) — fonte di verità
│
├── scripts/                 Script di sviluppo trasversali (setup locale, seed dati)
├── tools/                   Strumenti interni (generatori di codice, CLI di supporto)
│
├── tests/                   Test che attraversano più servizi
│   ├── e2e/                  Scenari completi (Runtime Modulo 5, sezione 15)
│   ├── contract/              Verifica che ogni servizio rispetti l'API Contract
│   └── integration/           Test di integrazione tra 2+ servizi
│
├── .github/workflows/       Pipeline CI/CD (Infrastructure Modulo 4, sezione 14)
│
├── docker-compose.yml       Ambiente di sviluppo locale (Postgres+pgvector, Redis,
│                             Redpanda, MinIO, ClickHouse)
├── package.json             Workspace root (pnpm + Turborepo)
├── turbo.json                Orchestrazione build/test/lint del monorepo
├── tsconfig.base.json        Configurazione TypeScript condivisa
└── .env.example              Variabili d'ambiente necessarie (copia in .env)
```

### Perché un monorepo (richiamo alla motivazione già in Step 1)

Backend, AI Platform, web, desktop e mobile condividono tipi, design system e logica
di validazione. Un monorepo garantisce che una modifica (es. un nuovo campo in
un'entità del Domain Model) si propaghi ovunque in un solo commit, invece di essere
sincronizzata manualmente tra repository separati.

### Perché `backend/` e `ai-platform/` sono separati, non uno dentro l'altro

Riflette la separazione di responsabilità già stabilita nell'AI Platform Architecture
(Modulo 3): i servizi applicativi conoscono le regole di business, i componenti
cognitivi orchestrano il ragionamento. Un servizio applicativo non importa mai
direttamente codice da `ai-platform/` — comunica solo tramite l'API Contract
(HTTP/eventi), mai un import diretto tra i due alberi.

---

## Come avviare AIOS in locale — sequenza unica supportata

```bash
# 1. Installa le dipendenze di tutto il monorepo
pnpm install

# 2. Copia le variabili d'ambiente
cp .env.example .env
# In particolare: SERVICE_JWT_SECRET deve essere valorizzato (autenticazione
# service-to-service, Feature 2.1) — senza, Organization/Workspace/
# Administration/Onboarding non si avviano, con un errore esplicito in console.

# 3. Avvia SOLO l'infrastruttura (Postgres, Redis, Redpanda, MinIO, ClickHouse)
docker compose up -d --build

# 4. Applica lo schema al database (crea la prima migrazione, non interattivo)
pnpm db:migrate

# 4bis. SOLO se il database aveva già organizzazioni create prima della
# Feature 2.1: esegui una tantum il backfill (nome/slug non ancora
# popolati altrimenti — la lettura di quelle organizzazioni fallisce
# deliberatamente finché non lo esegui).
pnpm db:backfill-2.1

# 5. Popola dati demo (Organization, Workspace, utenti Admin/Manager/Employee)
pnpm db:seed

# 6. Avvia tutti i servizi applicativi in modalità sviluppo (hot-reload)
pnpm dev
```

**Perché i servizi applicativi non sono nel `docker compose up`:** per lo sviluppo
quotidiano girano nativamente via `pnpm dev` (Turborepo), con hot-reload
immediato — nessun rebuild di immagini Docker ad ogni modifica al codice.
Il `docker-compose.yml` di default avvia solo l'infrastruttura di supporto.

Una volta che `pnpm dev` è attivo, i servizi sono raggiungibili su:

- Identity: `http://localhost:3001`
- Administration: `http://localhost:3002`
- Organization: `http://localhost:3003`
- Workspace: `http://localhost:3004`
- Onboarding — percorso pubblico `/api/v1/first-meeting` (Feature 2.1): `http://localhost:3005`
- Gateway (punto di ingresso unico, proxato verso gli altri): `http://localhost:3000`

Ogni servizio espone `/health` senza prefisso — va sempre chiamato sulla sua
porta diretta, mai tramite il Gateway (che instrada solo i prefissi `/api/v1/*`).

Utenti demo creati dal seed (password identica per tutti: `DemoPassword123!`):
`admin@demo.aios.local`, `manager@demo.aios.local`, `employee@demo.aios.local`.

### Versione completamente containerizzata (opzionale, non per lo sviluppo quotidiano)

Se vuoi verificare un avvio interamente in container (più vicino a produzione,
ma senza hot-reload):

```bash
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d --build
```

In questo caso **non eseguire `pnpm dev` in parallelo**: userebbe le stesse porte
già occupate dai container applicativi. Il Gateway containerizzato risponde su
`http://localhost:8080`.

Vedi `docs/development-environment.md` per i requisiti software completi e la
risoluzione dei problemi comuni.

---

## Stack tecnologico (riferimento rapido — dettaglio motivato in `docs/tech-stack.md`)

| Livello | Scelta |
|---|---|
| Frontend web | Next.js + React + TypeScript + Tailwind |
| Desktop | Tauri (incapsula l'app web) |
| Mobile | React Native (Expo) |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL (+ pgvector) |
| Vector DB (a scala) | Weaviate/Pinecone (valutazione in corso, vedi Step 1) |
| Event Bus | Kafka (Redpanda in locale) |
| Cache | Redis |
| Object Storage | S3-compatibile (MinIO in locale) |
| Analytics | ClickHouse |
| ORM | Prisma (motivato in `docs/tech-stack.md`) |
| Autenticazione | OAuth 2.1 / OIDC |
| Testing | Vitest (unit/integration), Playwright (e2e) |
| Observability | OpenTelemetry + Grafana Loki |
| CI/CD | GitHub Actions |

---

## Regole non negoziabili per chi contribuisce

1. Nessun import diretto tra lo schema dati di un servizio e quello di un altro — solo tramite API o eventi (Domain Model, sezione 1).
2. Nessun Tool AI accede al database — solo tramite l'API pubblica, come qualunque client (AI Platform Modulo 3, sezione 12.5).
3. Ogni endpoint segue l'envelope di risposta unico definito nell'API Contract — nessuna eccezione "per questa volta".
4. Se una decisione presa durante lo sviluppo contraddice un documento in `/docs`, si segnala e si propone una correzione — non si reinterpreta silenziosamente la documentazione.
