# AIOS — Stack Tecnologico

Ogni scelta qui elencata deriva da una motivazione già espressa in `docs/01-architettura-tecnica.md`
(Step 1) o nell'Engineering Bible — questo documento le riunisce come riferimento
operativo rapido per chi imposta l'ambiente di sviluppo, senza ripetere per intero
il ragionamento originale (che resta la fonte di verità in caso di dubbio).

## Frontend Web

**Next.js + React + TypeScript.** Motivazione originale: Step 1, sezione 2–4 —
ecosistema maturo, SSR per la parte marketing, ampia disponibilità di sviluppatori.
**Styling:** Tailwind CSS con token del Design System (`packages/design-system`)
come unica fonte di colori/spaziature/tipografia — mai un valore hardcoded fuori
dai token, coerente con Product Bible, Modulo 0.

## Desktop

**Tauri.** Incapsula la stessa applicazione Next.js con un runtime Rust leggero.
Motivazione: Step 1, sezione 9 — binari più leggeri e superficie di attacco minore
di Electron. Il codice UI è condiviso al 100% con `apps/web`; `apps/desktop`
contiene solo il layer nativo (notifiche di sistema, accesso file locali).

## Mobile

**React Native con Expo.** Motivazione: Step 1, sezione 9 — condivisione di logica
e componenti con il web React. Moduli nativi isolati (Swift/Kotlin) solo dove
serve accesso hardware specifico (fotocamera per scansione codice a barre,
Product Bible Inventory sezione 4.4; notifiche push avanzate).

## Backend

**NestJS + TypeScript.** Motivazione: Step 1, sezione 2–4 — struttura modulare,
dependency injection, testabilità. Un modulo NestJS per Bounded Context
(`backend/services/*`), mai un monolite condiviso.

**ORM: Prisma.** Non esplicitamente scelto nei documenti architetturali precedenti —
**decisione tecnica di questa fase**, motivata da: supporto nativo a migrazioni
versionate (coerente con Physical Database Schema, sezione "linee guida per la
generazione delle migrazioni"), buon supporto TypeScript con tipi generati
automaticamente dallo schema (riduce la duplicazione tra `packages/domain-model`
e la definizione fisica delle tabelle). **Nota per il CTO/team:** questa non era
una decisione già presa nei documenti approvati — la segnalo esplicitamente
come nuova scelta implementativa invece di darla per scontata, come richiesto
dalle regole fondamentali di questa fase. Alternativa scartata: TypeORM
(meno maturo nel supporto a migrazioni complesse come il partizionamento
già previsto nello schema fisico).

## Database e persistenza

| Tecnologia | Ruolo | Motivazione (fonte) |
|---|---|---|
| PostgreSQL 16 + pgvector | Database transazionale + vector store iniziale | Step 1, sez. 5; Engineering Bible Modulo 6 |
| Redis | Cache, sessioni, Workspace attivo | Step 1, sez. 5 |
| Kafka (Redpanda in locale) | Event Bus | Step 1, sez. 2; Infrastructure Modulo 4, sez. 6 |
| ClickHouse | Analytics storage | Step 1, sez. 5; Infrastructure Modulo 4, sez. 5 |
| Object Storage S3-compatibile (MinIO in locale) | Documenti, allegati, immagini | Infrastructure Modulo 4, sez. 5 |
| Vector DB dedicato (Weaviate/Pinecone) | Solo a scala, quando pgvector non basta più | Step 1, sez. 5 — valutazione rimandata a dati reali di volume |

## AI Platform

**Nessun modello linguistico specifico hardcoded** — coerente col principio
Model Agnostic (Costituzione, AI Platform Modulo 3). Il Model Router
(`ai-platform/model-router`) legge da un Model Registry configurabile.
**Orchestrazione:** servizio Node.js/TypeScript dedicato per Prompt Orchestrator,
Context Engine, ecc. — non Python, per restare nello stesso linguaggio del
resto del backend dove possibile; eventuali componenti che beneficiano
dell'ecosistema Python (es. valutazione di modelli, pipeline di embedding
specifiche) restano isolati come servizi a sé con API interna, mai mescolati
nel codice TypeScript principale.

## Testing

**Vitest** per unit e integration test (backend e AI Platform) — scelto per
velocità e compatibilità nativa con TypeScript/ESM. **Playwright** per i test
end-to-end (`tests/e2e`), inclusi gli scenari completi descritti in
Runtime Modulo 5, sezione 15. **Contract testing** (`tests/contract`) verificato
contro gli schemi JSON dichiarati nell'API Contract (Modulo 2) — ogni servizio
deve passare questi test prima che una PR possa essere unita.

## Observability

**OpenTelemetry** per tracing distribuito (standard già citato in Infrastructure
Modulo 4 e Runtime Modulo 5). **Grafana Loki** per log centralizzati.
**Prometheus + Grafana** per metriche e dashboard operative.

## CI/CD

**GitHub Actions** (`.github/workflows/`). Pipeline: lint → typecheck → test →
build → contract test → scansione sicurezza immagini → deploy (Staging
automatico, Produzione con approvazione per componenti critici — coerente
con Infrastructure Modulo 4, sezione 14.5).

## Autenticazione

**OAuth 2.1 / OIDC**, JWT a vita breve + refresh token rotante — coerente con
API Contract, Modulo 2, sezione 2. Libreria: da valutare tra soluzioni gestite
(Auth0, Ory) vs implementazione propria sul servizio Identity — **decisione
rimandata**, non necessaria per questa milestone di fondamenta.
