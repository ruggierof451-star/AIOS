# AIOS — Guida di Test: Feature 2.1 "First Meeting Foundation"

Accompagna `AIOS-FirstMeeting.postman_collection.json` + `AIOS-FirstMeeting.postman_environment.json`.

## Prerequisiti

1. `pnpm install` → `pnpm --filter @aios/domain-model run generate` → `pnpm build` (compilazione pulita).
2. `docker compose up -d --build` (infrastruttura).
3. `pnpm db:migrate` → **se il database aveva già organizzazioni da prima di Feature 2.1**, subito dopo: `pnpm db:backfill-2.1`.
4. `pnpm db:seed`.
5. `.env` deve avere `SERVICE_JWT_SECRET` valorizzato — senza, Organization/Workspace/Administration/Onboarding non si avviano.
6. `pnpm dev`.
7. Importa collection + ambiente in Postman, seleziona l'ambiente "AIOS — Feature 2.1 First Meeting (Local)".

## Sequenza — cartella per cartella

### 0. Health Check
Esegui tutte e sei le richieste. Ogni servizio deve rispondere `200 { status: "ok" }` **sulla propria porta diretta**, non attraverso il Gateway — nessuno di questi endpoint è instradato tramite `{{baseUrl}}` perché `/health` non ha il prefisso `/api/v1/...` che la tabella di routing del Gateway riconosce.

### 1. Setup — Nuovo Utente
Registra un utente nuovo, diverso dal demo seminato — così l'organizzazione creata da questo test è sempre riconoscibile e non entra in conflitto con l'organizzazione demo o con esecuzioni precedenti. Salva automaticamente `accessToken` e `userId`.

### 2. First Meeting — Flusso Completo
Le sette richieste, in ordine, verificano l'intero percorso (Feature 2.2, Incremento 1): avvio sessione, lettura dei documenti legali correnti, **un tentativo di provisioning senza consenso — atteso 409, verifica che il vincolo sia realmente applicato e non solo documentato**, registrazione del consenso (tutti e quattro i documenti in un'unica chiamata), provisioning vero e proprio (che orchestra Organization → Administration → Workspace), lettura dello stato (tutti e quattro i passi, incluso `legal_consent_given`, devono risultare `COMPLETED`), e una richiamata del provisioning con lo stesso `conversationId` per confermare che non crea una seconda organizzazione anche in condizioni normali.

**Verifica aggiuntiva manuale**, dopo aver eseguito questa cartella: interroga `GET {{baseUrl}}/api/v1/organizations` (con lo stesso `accessToken`) e conta quante organizzazioni compaiono con il nome "Azienda di Prova Sprint Review" — deve essere **esattamente una**.

### 3. Sicurezza — Test Negativi
Queste due richieste chiamano Administration **direttamente**, bypassando il Gateway, senza alcun header di autenticazione service-to-service. Entrambe devono rispondere **401**. Se una risponde 500, è una regressione da segnalare immediatamente — indica che un errore di verifica del token non viene tradotto correttamente in un'eccezione HTTP gestita.

## Verifica degli eventi (fuori da Postman — richiede accesso diretto al database)

Dopo aver eseguito la cartella 2, connettiti al database e interroga:

```sql
SELECT event_type, payload->>'schema_version' AS schema_version, created_at
FROM eventing.outbox_events
ORDER BY created_at DESC
LIMIT 10;
```

Attesi, dal più recente al più vecchio: `ConversationSessionProvisioningCompleted`, `WorkspaceCreated`, `ConversationSessionRolesProvisioned`, `ConversationSessionOrganizationProvisioned`, `OrganizationCreated`, `LegalDocumentAccepted` ×4 (uno per ciascun documento: TERMS_OF_SERVICE, PRIVACY_POLICY, AI_USAGE_CONSENT, DPA), `ConversationSessionStarted` — tutti con `schema_version = 1`.

## Test manuale: ripresa dopo un'interruzione (non automatizzabile in Postman da solo)

1. Esegui "Avvia sessione" (cartella 2, prima richiesta) per ottenere un `conversationId` fresco — **non eseguire ancora il Provisioning**.
2. Ferma Administration: `docker compose stop administration` (o interrompi il processo nativo se usi `pnpm dev`).
3. Esegui manualmente una richiesta `POST {{baseUrl}}/api/v1/first-meeting/provision` con questo `conversationId` — atteso: **500**, `retryable: true`. L'Organization risulta comunque creata (verificabile via `GET /api/v1/organizations`).
4. Riavvia Administration.
5. Ripeti la stessa richiesta con **lo stesso** `conversationId` — atteso: **201**, successo completo. Verifica che il numero di organizzazioni non sia aumentato rispetto al passo 3 — la ripresa ha completato il provisioning esistente, non ne ha creato uno nuovo.

## Nota su Milestone 1

La collection di Milestone 1 (`AIOS-Milestone1.postman_collection.json`) ha ancora l'health check di Identity instradato tramite `{{baseUrl}}/api/v1/auth/health` — un errore noto, mai corretto, segnalato già in una revisione precedente. Questa nuova collection non ripete l'errore. Se vuoi, posso correggere anche quella collection nello stesso passaggio.
