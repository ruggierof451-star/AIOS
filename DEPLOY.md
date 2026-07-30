# Pubblicare AIOS

Guida operativa: frontend su Vercel, backend su Railway, Postgres gestito.

---

## Perché adesso il login dà 404

L'errore **non arriva dal backend**: arriva da Next. Il proxy in
`apps/web/next.config.mjs` instrada `/api/v1/*` verso `AIOS_GATEWAY_URL`, e senza quella
variabile ricade su `http://localhost:3000` — che sul server di Vercel non esiste. Next non
trova nulla da proxare e risponde 404.

Ci sono quindi **due cose da fare**, in quest'ordine: pubblicare il backend, e poi dire al
frontend dove trovarlo.

---

## Passo 0 — Una volta sola, in locale: generare le migration

Il repository non contiene ancora migration Prisma, quindi in produzione il database
resterebbe **vuoto**: le tabelle non verrebbero create e ogni login fallirebbe.

Vanno generate una volta sola sulla tua macchina, con Postgres locale avviato:

```bash
docker compose up -d
pnpm install
pnpm db:migrate          # crea packages/domain-model/prisma/migrations/
git add packages/domain-model/prisma/migrations
git commit -m "Migration iniziale"
```

Da qui in avanti la produzione applica le stesse migration da sola: il servizio Identity ha
`preDeployCommand: npx prisma migrate deploy` nel suo `railway.json`.

**Solo Identity applica le migration**, di proposito: se lo facessero tutti e sette,
partirebbero in parallelo sulla stessa base dati.

---

## Passo 1 — Postgres

Su Railway: **New → Database → PostgreSQL**. Railway espone `DATABASE_URL`; nei servizi usa il
riferimento `${{Postgres.DATABASE_URL}}` invece di incollare la stringa, così ruota da sola se
cambia.

---

## Passo 2 — Gli otto servizi

### Perché Railway non li ricrea da solo

Va detto chiaramente, perché è una fonte di frustrazione: **nessun file in questo repository
può far creare a Railway otto servizi**. Sono fatti della piattaforma, non nostri:

- `railway.json` **configura un solo servizio**. Non è un formato che ne descrive più d'uno.
- Il rilevamento automatico dei monorepo JavaScript avviene **solo dalla pagina di creazione
  progetto** (`railway.com/new`), al primo import. Se cancelli i servizi dentro un progetto che
  esiste già, quel passaggio non si ripete: aggiungere un servizio da GitHub ne crea **uno**.
- Il percorso del file di configurazione **non segue la Root Directory**: va indicato assoluto
  dalla radice del repository, con la barra iniziale.

Da qui due strade.

### Strada A — Riprovare l'import automatico (veloce, non garantita)

Da `railway.com/new` → **Deploy from GitHub repo** → seleziona il repository. Railway rileva il
workspace pnpm e propone un servizio per ogni package deployabile, leggendo il `railway.json`
alla radice di ciascuno.

Il limite: crea un **progetto nuovo**, quindi il Postgres che hai già resta nell'altro. Ha senso
solo se accetti di ricreare anche il database, o di collegare quello esistente al progetto nuovo.

### Strada B — Otto servizi nel progetto che hai già (consigliata)

Mantiene il Postgres dov'è. Sono dieci minuti, e funziona sempre.

Per **ognuno** degli otto: **New → GitHub Repo** → stesso repository → poi **Settings**:

| Servizio | Config as code (percorso assoluto) | Porta |
|---|---|---|
| `gateway` | `/backend/gateway/railway.json` | 3000 |
| `identity` | `/backend/services/identity/railway.json` | 3001 |
| `administration` | `/backend/services/administration/railway.json` | 3002 |
| `organization` | `/backend/services/organization/railway.json` | 3003 |
| `workspace` | `/backend/services/workspace/railway.json` | 3004 |
| `onboarding` | `/backend/services/onboarding/railway.json` | 3005 |
| `eventing` | `/backend/services/eventing/railway.json` | 3006 |
| `web` | `/apps/web/railway.json` | 3100 |

**Tre regole da non sbagliare:**

1. **Lascia la Root Directory vuota** (cioè la radice del repository). I Dockerfile copiano i
   package condivisi del monorepo (`@aios/domain-model`, `@aios/api-contract`, `@aios/eventing`):
   restringendo la root alla cartella del servizio, il build non li troverebbe.
2. **Il percorso del config è assoluto e inizia con `/`**. È la nota della documentazione
   Railway: quel campo non segue la Root Directory.
3. **Solo `gateway` e `web` vanno esposti pubblicamente.** Gli altri sei restano sulla rete
   privata — è la ragione per cui esiste un Gateway.

Il nome del servizio su Railway è libero, ma conviene usare quelli della tabella: i riferimenti
fra variabili (`${{identity.RAILWAY_PRIVATE_DOMAIN}}`) li usano.

### Ricostruzioni inutili: già evitate

Ogni `railway.json` dichiara i propri `watchPatterns`: un push che tocca solo `apps/web` non
ricostruisce i sette servizi backend, e una modifica a un singolo servizio non tocca gli altri.
I `packages/**` condivisi sono invece osservati da tutti i servizi backend, perché li usano
davvero.

### Nota su Infrastructure as Code

Railway ha introdotto un IaC vero (`.railway/railway.ts` + `railway config plan/apply`) che
descrive **l'intero progetto** — servizi, database, variabili — in un solo file, ed è
letteralmente ciò che serve per ricreare tutto da codice.

Non è la strada che questa guida propone, per due ragioni oneste: è dichiarato **sperimentale**
dalla documentazione stessa (v0, DSL soggetto a cambiare), e un servizio **non può essere
gestito da entrambi i sistemi** — adottarlo significa rimuovere tutti gli otto `railway.json` e
riscriverli in TypeScript. Quando l'IaC uscirà dallo stato sperimentale sarà il momento giusto
per migrare, e la migrazione è documentata e reversibile.

## Passo 3 — Variabili d'ambiente

Elenco completo e commentato in `.env.production.example`. Il minimo indispensabile:

**Su tutti e sette i servizi backend**

| Variabile | Valore |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | `openssl rand -base64 48` — **identico su tutti**, altrimenti un token emesso da Identity risulta non valido altrove |
| `SERVICE_JWT_SECRET` | un secondo segreto, **diverso dal primo**: se coincidessero, un token utente rubato varrebbe come token di servizio |
| `NODE_ENV` | `production` |

**Solo sul Gateway**

| Variabile | Valore |
|---|---|
| `AIOS_CORS_ORIGINS` | `https://tuo-frontend.vercel.app` — senza barra finale |
| `IDENTITY_SERVICE_URL` | `http://${{identity.RAILWAY_PRIVATE_DOMAIN}}:3001` |
| `ORGANIZATION_SERVICE_URL` | `http://${{organization.RAILWAY_PRIVATE_DOMAIN}}:3003` |
| `WORKSPACE_SERVICE_URL` | `http://${{workspace.RAILWAY_PRIVATE_DOMAIN}}:3004` |
| `ADMINISTRATION_SERVICE_URL` | `http://${{administration.RAILWAY_PRIVATE_DOMAIN}}:3002` |
| `ONBOARDING_SERVICE_URL` | `http://${{onboarding.RAILWAY_PRIVATE_DOMAIN}}:3005` |

Non impostare `PORT`: la inietta Railway, e i servizi la leggono già.

---

## Passo 4 — Il frontend

Puoi tenerlo su **Vercel** (com'è adesso) oppure spostarlo su Railway come ottavo servizio: il
`Dockerfile` e il `railway.json` di `apps/web` ci sono per entrambe le strade.

In tutti e due i casi serve una variabile, ed è **quella la cui assenza produce il 404 al
login**:

Su Vercel: **Settings → Environment Variables**. Su Railway: scheda **Variables** del servizio
`web`.

| Variabile | Valore |
|---|---|
| `AIOS_GATEWAY_URL` | l'URL pubblico del Gateway, es. `https://aios-gateway.up.railway.app` |
| `ANTHROPIC_API_KEY` | la chiave per la conversazione di AIOS |

Poi **Redeploy**: `next.config.mjs` legge quella variabile **al momento della build**, quindi
cambiarla senza un nuovo deploy non ha alcun effetto. È l'errore più facile da fare qui.

Se metti il web su Railway, ricordati anche di aggiungere il suo dominio a `AIOS_CORS_ORIGINS`
del Gateway.

---

## Passo 5 — Il primo utente

Il seed di sviluppo crea utenti demo, ma in produzione **non va eseguito**: creerebbe account
con password nota. Registra il primo utente dall'interfaccia, che esercita anche il Primo
Incontro completo (sessione → consenso legale → provisioning di organizzazione, ruoli e spazio).

---

## Verifica, in ordine

```bash
# 1. Il Gateway risponde
curl https://tuo-gateway.up.railway.app/health

# 2. Identity risponde attraverso il Gateway (non direttamente)
curl -X POST https://tuo-gateway.up.railway.app/api/v1/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"email":"non@esiste.local","password":"qualsiasi"}'
# Atteso: 401 con envelope { data:null, error:{...} }.
# Se ricevi 404, il Gateway non instrada: controlla *_SERVICE_URL.
# Se ricevi un errore CORS dal browser, controlla AIOS_CORS_ORIGINS.

# 3. Il frontend raggiunge il backend
# Apri il sito, prova a registrarti: la registrazione fa due chiamate
# (register poi token) e poi apre il Primo Incontro.
```

---

## Cosa NON è stato fatto, e perché

**Cookie httpOnly.** Sono nella tua lista, ma sono in conflitto diretto con «non modificare il
frontend»: oggi il frontend invia `Authorization: Bearer`, e passare ai cookie richiede di
cambiarlo. In più, con frontend e backend su domini diversi (Vercel ↔ Railway) i cookie
sarebbero *cross-site*: servirebbero `SameSite=None; Secure`, CORS con credenziali e una difesa
CSRF — più fragile del Bearer, non più sicuro, in questa topologia. Se in futuro il frontend
finisse sullo stesso dominio del Gateway, allora i cookie diventerebbero la scelta migliore ed è
il momento giusto per farli.

**Logout con revoca dei refresh token.** Il refresh token viene salvato ma non ancora invalidato
lato server: resta valido fino alla scadenza. Sta già fra i limiti dichiarati in `MOCKS.md`.

**Rinnovo automatico del token.** `POST /api/v1/auth/refresh` esiste e funziona, ma il client non
lo chiama ancora su 401: alla scadenza si torna alla schermata di accesso.
