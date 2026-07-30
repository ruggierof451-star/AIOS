# AIOS — Web (`@aios/web`)

Il frontend di AIOS. Next.js (App Router), dentro il monorepo pnpm/Turborepo,
con lo stesso rigore TypeScript del backend (`strict`,
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).

## Versione di Next.js

Il progetto è su `next@^14.2.35` — la **ultima patch della linea 14**, che è in *end-of-life*
dal 26 ottobre 2025. Serve a soddisfare gli scanner di sicurezza (Railway blocca il deploy sotto
la 14.2.35), ma alla prossima vulnerabilità della 14.x non esisterà una patch.

La migrazione a Next 15/16 richiede: `params` atteso come `Promise` nelle due rotte dinamiche
(`spazi/[slug]`, `clienti/[slug]`) e il passaggio a React 19. Nessuna API rimossa è in uso.

## Avvio in locale

```bash
# 1. Dalla radice del monorepo (installa anche le nuove dipendenze web)
pnpm install

# 2. Backend avviato (serve per l'accesso reale):
docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev

# 3. Chiave per la conversazione reale di AIOS:
cp apps/web/.env.local.example apps/web/.env.local
#   → inserisci ANTHROPIC_API_KEY

# 4. In un altro terminale, il frontend:
pnpm --filter @aios/web dev
# → http://localhost:3100
```

Senza `ANTHROPIC_API_KEY` tutto il resto funziona, ma la conversazione
risponde con un errore esplicito invece di inventare: è voluto — la regola
del progetto è *dati finti sì, intelligenza finta no*.

## Provare il backend reale

Con backend avviato e `pnpm db:seed` eseguito, il seed crea tre utenti
(password uguale per tutti: `DemoPassword123!`):

| Email | Ruolo nell'organizzazione demo |
|---|---|
| `admin@demo.aios.local` | Admin |
| `manager@demo.aios.local` | Manager |
| `employee@demo.aios.local` | Employee |

Entrando con uno di questi si arriva direttamente in `/oggi`: hanno già
un'organizzazione, quindi il Primo Incontro non serve.

**Il percorso che esercita più backend** è invece registrarsi da zero:
`/accesso` → "Iniziamo" → email e password nuove → si viene portati in
`/primo-incontro`, che chiama *davvero*, in quest'ordine:

1. `POST /api/v1/auth/register` (Identity) — utente e token
2. `POST /api/v1/first-meeting/sessions` — apre la conversazione
3. `GET /api/v1/first-meeting/legal-documents` — le 4 versioni correnti
4. `POST /api/v1/first-meeting/legal-consent` — registra i consensi con IP e user agent
5. `POST /api/v1/first-meeting/provision` — Organization + ruoli + Workspace

Alla fine la schermata mostra gli **identificativi veri** presi dal
database. Da lì in avanti i dati dei moduli sono simulati (`MOCKS.md`), ma
l'utente, l'organizzazione, i ruoli e il consenso sono reali.

### Deploy (Vercel)

Il typecheck usa `exactOptionalPropertyTypes` e `noUncheckedIndexedAccess`, gli stessi del
backend: la build fallisce su cose che altrove passerebbero. È voluto.

```bash
pnpm --filter @aios/web typecheck   # deve uscire senza output
pnpm --filter @aios/web build
```

**Variabile obbligatoria in produzione.** `next.config.mjs` proxa `/api/v1/*` verso
`AIOS_GATEWAY_URL`; **senza quella variabile ricade su `http://localhost:3000`**, che su un
server di deploy non esiste. La build passa lo stesso — è a runtime che ogni chiamata fallisce.
Su Vercel va impostata, insieme a `ANTHROPIC_API_KEY` per la conversazione:

| Variabile | Valore |
|---|---|
| `AIOS_GATEWAY_URL` | l'indirizzo pubblico del Gateway, es. `https://api.tuo-dominio.it` |
| `ANTHROPIC_API_KEY` | la chiave per il motore della conversazione |

E il Gateway deve accettare l'origine del frontend: `AIOS_CORS_ORIGINS=https://tuo-dominio.it`.

### Provarlo dal telefono

Il modo che funziona è aprire **il frontend vero**, non un file HTML statico:

```bash
pnpm --filter @aios/web dev:lan    # espone la 3100 su tutta la rete locale
```

Poi dal telefono, sulla stessa WiFi, apri in Safari o Chrome:
`http://INDIRIZZO-DEL-COMPUTER:3100/accesso`
(l'indirizzo si trova con `ifconfig | grep 192` su Mac/Linux, `ipconfig` su Windows).

Funziona perché la pagina è servita in HTTP e le chiamate `/api/v1/*` passano dal proxy di
Next: **stessa origine**, quindi né CORS né problemi di contenuto misto.

**Perché una pagina HTML statica aperta in un visualizzatore in-app NON funziona**: quei
visualizzatori servono la pagina in HTTPS, e una pagina HTTPS non può chiamare un indirizzo
`http://` — il browser lo blocca come contenuto misto, prima di CORS e indipendentemente da
come è configurato il server. Nessuna modifica al backend può aggirarlo: è una regola del
browser. Se serve provare da un file statico, va servito in locale
(`python3 -m http.server 8080` nella sua cartella) e aperto su `http://localhost:8080`.

**Verifica che il vincolo del server esista davvero**: salta il consenso e
chiama il provisioning dalla collection Postman (`tests/postman/`) — deve
rispondere **409**, non creare l'organizzazione.

La porta è **3100** (la 3000 è del Gateway). Le chiamate `/api/*` vengono
proxate da Next verso il Gateway (`next.config.mjs`) — nessun CORS da
configurare, nessun host hardcoded nel client.

## Cosa è reale e cosa no

- **Reale**: registrazione e accesso (`/accesso`) via Identity/Gateway, e la
  **conversazione con AIOS** (LLM vero dietro `/api/chat`, chiave server-side).
- **Simulato**: tutto il resto — l'elenco completo e onesto è in `MOCKS.md`.

## Struttura

- `app/(app)/` — le viste con header + striscia AIOS: `oggi`, `brain`, `spazi`
- `app/accesso/` — login/registrazione (API reali)
- `app/primo-incontro/` — Primo Incontro: sessione, consenso legale, provisioning (API reali)
- `components/` — Perche (perché+confidenza), AiosStrip, HeaderNav, …
- `lib/api/` — client unico sull'envelope reale; `lib/mock/` — dati simulati
- `lib/conversation/` — `ConversationEngine` (confine sostituibile) + contesto aziendale
- `app/api/chat/` — route server della conversazione: la chiave API sta qui, mai nel browser
- `app/globals.css` — il design system (mobile-first, dalla anteprima V4 approvata)
