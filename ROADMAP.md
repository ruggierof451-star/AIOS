# Roadmap

Stato delle funzionalità di AIOS. Aggiornato ad ogni milestone.

## ✅ Funzionalità completate

### Bootstrap e infrastruttura
- Monorepo pnpm + Turborepo, struttura completa
- Docker Compose (Postgres+pgvector, Redis, Redpanda, MinIO, ClickHouse)
- Schema Prisma completo (Identity, Organization, Workspace, Administration, Eventing)
- Gateway con routing, rate limiting, correlation id, health check
- Relay Outbox → Event Bus con retry e Dead Letter Queue

### Identity (Sistema di Autenticazione)
- Registrazione utenti (con validazione password, deduplicazione email)
- Login (email + password, con supporto MFA/TOTP)
- Refresh token con rotazione
- Hash password (bcrypt)
- **Endpoint protetto: `GET /api/v1/auth/me`** (Milestone 1, 2026-07-24)

### Organization
- Creazione, aggiornamento, cambio piano, archiviazione (reversibile) organizzazione
- Anagrafica estesa: campi fiscali/di localizzazione, slug immutabile univoco
- Stato: ACTIVE/SUSPENDED/ARCHIVED/DELETED (quest'ultimo riservato a procedure amministrative future)
- Impostazioni libere (settings) per organizzazione

### Workspace
- Creazione workspace, membership, inviti (invito → accettazione)
- Rimozione membro, cambio ruolo

### Administration
- RBAC (Role, Permission, Policy, Scope)
- Audit log trasversale
- Provisioning dei ruoli di default per una nuova organizzazione

### Onboarding — First Meeting Foundation (Feature 2.1, 2026-07-26)
- Nuovo servizio `onboarding-service` (percorso pubblico `/api/v1/first-meeting`)
- Provisioning automatico dell'ambiente (Organization + ruoli + Workspace)
  con ripresa sicura dopo un'interruzione
- `ConversationSession`/`ConversationStep`: stato del primo incontro a passi
  dinamici, estensibile senza migration
- Autenticazione service-to-service (token di servizio firmati) su ogni
  endpoint interno di ogni servizio
- Convenzione definitiva per gli eventi di dominio dell'intero ecosistema

### Legal — Consenso Legale (Feature 2.2, Incremento 1, 2026-07-26)
- Documenti legali versionati (Termini, Privacy, Consenso AI, DPA)
- Accettazioni append-only con IP/user agent, mai modificabili né cancellabili
- Consenso obbligatorio prima della creazione di qualunque Organization

## 🚧 Funzionalità in sviluppo

Nessuna al momento — in attesa della prossima Feature (2.2).

## 📋 Funzionalità pianificate

### Identity
- Flusso di enrollment MFA (generazione secret + QR code) — verifica TOTP
  già presente, manca l'attivazione guidata
- Logout esplicito (revoca refresh token su richiesta)
- Recupero password

### Organization / Workspace
- Endpoint di lettura (GET) per Organization e Workspace, oggi solo
  scrittura (create/update/archive)

### Epic 2 — First Meeting (progettato, non ancora sviluppato oltre la Feature 2.2 Inc. 1)
- Business Discovery conversazionale (dipende da componenti AI Platform non ancora costruiti)
- Gestione documenti (visura camerale, OCR, logo)
- Importazione dati (CSV/Excel, connettori OAuth)
- Configurazione AI (preferenze, autonomia per dominio)

### Moduli applicativi non ancora iniziati (da Product Bible)
- CRM, Finance, Inventory, HR, Documents, Calendar, Analytics, Automation, Marketplace

### AI Platform
- Nessun componente ancora implementato (Prompt Orchestrator, Context
  Engine, Memory Engine, Knowledge Graph, Vector Platform, Model Router,
  Multi-Agent Coordinator, Planning Engine, Tool Execution Engine,
  Confidence Engine, Safety Engine, Cost Engine, agenti nativi)

### Frontend
- `apps/web`, `apps/desktop`, `apps/mobile` — struttura di cartelle
  presente, nessun codice ancora implementato
