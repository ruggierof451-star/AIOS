# CHANGELOG

## AIOS 1.3.10 — 2026-08-01

**`prisma migrate deploy` falliva: manca OpenSSL nelle immagini Alpine.**

```
Prisma failed to detect the libssl/openssl version
Error: Could not parse schema engine response: SyntaxError: Unexpected token 'E'...
```

### Causa

Le immagini `node:*-alpine` recenti **non includono più il pacchetto `openssl`**. Senza,
Prisma non riesce a rilevare la versione di libssl, ripiega su `openssl-1.1.x` — che su Alpine
3.17+ non esiste — e il motore dello schema non riesce a caricarsi. Il `SyntaxError` è una
conseguenza, non la causa: Prisma si aspetta JSON dal motore e riceve un messaggio d'errore
testuale.

Lo schema era corretto, come avevi verificato: il problema era nell'immagine.

### Correzione

1. **`apk add --no-cache openssl libc6-compat`** in ogni stage che parte da `node:20-alpine`,
   in tutti e otto i Dockerfile — sia `base` (da cui derivano `deps` e `build`, dove gira
   `prisma generate`) sia `runtime` (dove gira `prisma migrate deploy`).
   Devono averlo **entrambi**: se il rilevamento di libssl dà esiti diversi fra i due stage, il
   client viene generato per un target e il deploy ne pretende un altro — un secondo errore,
   con un messaggio ancora più fuorviante.
2. **`binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`** nel `generator` dello schema:
   il target di produzione è ora dichiarato invece che dedotto. `native` resta per le macchine
   di sviluppo (macOS, Windows, glibc).

### Valutato e scartato

Passare a `node:20-slim` (Debian, che include OpenSSL) è la via che Prisma stesso suggerisce ed
elimina l'intera classe di problemi musl. Non l'ho scelta perché cambierebbe la libc sotto a
**bcrypt**, modulo nativo già compilato per musl, su otto immagini e senza poter fare un
`docker build` di verifica qui. Con un deploy che sta finalmente avanzando, la correzione
mirata è lo scambio giusto; il passaggio a Debian resta un'opzione ragionevole da valutare a
freddo.

### Verifiche

24 controlli: `openssl` presente in ogni stage base di tutti e otto i Dockerfile, schema ancora
strutturalmente valido (20 modelli e 9 enum, tutti con `@@schema`, nessuno schema usato e non
dichiarato), `provider` e `url` invariati, e nessuna regressione sulle correzioni di 1.3.8 e
1.3.9 (copia del postinstall, albero pnpm conservato, `WORKDIR` dentro il workspace). Gli 11
pacchetti backend ricompilano puliti.

---

## AIOS 1.3.9 — 2026-08-01

**Correzione di runtime: i servizi partivano e morivano al primo `require`.**

La build Docker passava, ma all'avvio:

```
Error: Cannot find module 'reflect-metadata'
```

### Causa

pnpm non installa una copia delle dipendenze dentro ogni package: crea **symlink relativi**
verso il negozio virtuale in `node_modules/.pnpm` alla radice del workspace. Lo stage runtime
copiava solo `<servizio>/node_modules`, portandosi via i symlink ma non ciò a cui puntano.

Riguardava **tutti e otto** i servizi, non solo il Gateway. E aveva un secondo effetto non
ancora emerso: anche il **client Prisma generato** vive nel negozio, quindi ogni servizio che
tocca il database sarebbe morto per lo stesso motivo, con un errore diverso e più confuso.

### Correzione

Lo stage runtime conserva l'intero albero (`COPY --from=build /repo /repo`) e la cartella di
lavoro resta **dentro** il workspace (`WORKDIR /repo/<servizio>`): i symlink di pnpm sono
relativi, quindi la posizione conta quanto il contenuto. È la stessa disposizione con cui la
build è riuscita — ciò che funzionava nello stage precedente funziona qui per costruzione.

Scartato `pnpm deploy`, che pure sarebbe la via ufficiale: ha comportamenti diversi fra pnpm 9
e 10 e ricostruisce `node_modules` dal negozio, con il rischio concreto di perdere il client
Prisma generato. Fra due strade non verificabili in questo ambiente ho scelto quella che non
può fallire per costruzione.

**Costo accettato e dichiarato**: l'immagine contiene anche le dipendenze di sviluppo. È
affidabilità sopra dimensione — la potatura è un'ottimizzazione da fare quando il deploy è
verde e se ne può misurare l'effetto.

### Altro

- `EXPOSE 3006` aggiunto al worker Eventing, che ora ha un health server e prima non esponeva
  nulla.
- Identity continua a copiare lo schema Prisma accanto al servizio: `prisma migrate deploy` del
  `preDeployCommand` cerca `./prisma/schema.prisma` nella cartella corrente.

### Verifiche

Riprodotta la struttura a symlink di pnpm e provati entrambi i comportamenti: copiando solo
`<servizio>/node_modules` il processo muore nel module loader; conservando l'albero parte.
Più 26 controlli di coerenza: dipendenze interne copiate in ogni immagine, `WORKDIR` dentro il
workspace, `EXPOSE` corretto, `startCommand` di `railway.json` allineato al `CMD`.

---

## AIOS 1.3.8 — 2026-08-01

Versione completa e coerente, che sostituisce integralmente 1.3.7. Contiene tutto ciò che era
stato consegnato negli incrementi 18-21 e che nel repository non era mai arrivato:

- **`apps/web/Dockerfile`** — mancava del tutto: senza, il frontend non è costruibile come
  immagine. Include già la correzione del postinstall.
- **Correzione del postinstall in tutte e otto le immagini** (`COPY scripts/postinstall.js` +
  `AIOS_SKIP_POSTINSTALL` prima di `pnpm install`) — l'errore
  `Cannot find module '/repo/scripts/postinstall.js'` riguardava ogni Dockerfile, non solo il
  Gateway.
- **Otto `railway.json`** con builder, health check, `watchPatterns` e — solo su Identity —
  l'applicazione delle migration.
- **`.env.production.example`** e **`DEPLOY.md`**.
- **`next@^14.2.35`** (la 14.2.5 bloccava il deploy per una vulnerabilità HIGH).

Le voci sotto documentano ogni incremento nel dettaglio.

---

# Changelog

Cronologia delle milestone di sviluppo funzionale di AIOS. Le fasi di
bootstrap del monorepo (struttura, Docker, Prisma, pnpm/Turbo) precedono
questo changelog e sono documentate in `docs/` (Product Bible + Engineering
Bible) e nella cronologia della conversazione di sviluppo.

---

## Incremento 21: il postinstall rompeva la build di tutte le immagini

**Data:** 2026-07-30

Segnalato da un build Railway fallito sul Gateway:

```
Error: Cannot find module '/repo/scripts/postinstall.js'
```

### Causa, e portata più ampia della segnalazione

Regressione introdotta dall'Incremento 16, quando ho aggiunto il `postinstall` alla radice.
Negli stage `deps` dei Dockerfile si copiano solo i manifest e poi si esegue `pnpm install` —
che ora invoca `node scripts/postinstall.js`, file che a quel punto nell'immagine non esiste.

**Non riguardava solo il Gateway**: tutti e sette i Dockerfile del backend hanno la stessa
struttura e sarebbero falliti allo stesso modo. Corretti tutti e otto (incluso `apps/web`).

### Perché non `--ignore-scripts`

Sarebbe la correzione di una riga, ed è sbagliata: **`bcrypt` è un modulo nativo** nelle
dipendenze della radice, e senza il proprio script di installazione il binding non viene
compilato. Il servizio Identity partirebbe e fallirebbe al primo login con un errore di
binding mancante — un problema peggiore di quello risolto, e più difficile da diagnosticare.

`apps/web` usava proprio `--ignore-scripts`: rimosso anche lì, per non lasciare due
comportamenti diversi nello stesso repository.

### La correzione

In ogni stage `deps`, subito dopo la copia dei manifest della radice:

```dockerfile
COPY scripts/postinstall.js scripts/
ENV AIOS_SKIP_POSTINSTALL=1
```

Si copia **il solo file**, non l'intera cartella `scripts/`: è piccolo e cambia di rado, quindi
il livello di cache resta stabile — copiare tutta la cartella avrebbe invalidato l'installazione
delle dipendenze a ogni modifica di uno script qualsiasi.

E `scripts/postinstall.js` riconosce ora `AIOS_SKIP_POSTINSTALL` ed esce subito. Dentro
un'immagine le due cose che fa sono **entrambe sbagliate**:

- creare `.env` da `.env.example` cuocerebbe credenziali di sviluppo dentro l'immagine;
- generare il client Prisma è già compito dello stage di build, che lo fa esplicitamente nel
  momento in cui lo schema è realmente presente.

La scelta è dichiarata dal Dockerfile con una variabile, non dedotta dallo script guardando un
file mancante: chi legge il Dockerfile vede perché.

La variabile vive solo negli stage `deps` e `build`; lo stage `runtime` riparte da
un'immagine pulita, quindi non finisce in produzione.

### Verifiche

Ordine delle istruzioni controllato in tutti e otto i Dockerfile (copia e variabile precedono
sempre `pnpm install`, nessun `--ignore-scripts` in una riga eseguita) e i tre comportamenti
dello script provati davvero: senza variabile e senza schema si ferma con un messaggio
esplicito; con la variabile esce subito senza fare nulla; su una macchina di sviluppo procede
alla generazione.

---

## Incremento 20: Next.js alla versione sicura (deploy bloccato da Railway)

**Data:** 2026-07-30

Railway bloccava il deploy segnalando una vulnerabilità HIGH in `next@14.2.5`.

### Aggiornamento

`apps/web/package.json`: `next` da `14.2.5` a **`^14.2.35`**.

Il vincolo passa da versione esatta a caret di proposito: `14.2` è l'ultima minor della linea 14,
quindi `^14.2.35` significa esattamente «l'ultima patch della 14.2» e nient'altro. Con una linea
che riceve solo correzioni di sicurezza, bloccare la patch esatta obbliga a rincorrerla a mano
ogni volta che ne esce una.

`react` e `react-dom` restano su `^18.3.1`: la linea 14.x richiede React 18, e alzarli
richiederebbe il salto di major di Next.

### Il fatto che va detto: la 14.x è in end-of-life

Verificato sulle fonti ufficiali, non a memoria: **Next.js 14 è arrivato a fine vita il 26
ottobre 2025**, e `14.2.35` (11 dicembre 2025) è la sua **ultima patch**. La versione stabile
corrente è la 16.x.

Conseguenza concreta: questo aggiornamento sblocca il deploy oggi, ma alla prossima
vulnerabilità della linea 14 **non ci sarà una patch da installare**. La migrazione a 15/16 non
è un miglioramento facoltativo, è debito con una scadenza.

### Cosa costerebbe uscirne — misurato, non stimato

- **Due file**: `app/(app)/spazi/[slug]/page.tsx` e `app/(app)/clienti/[slug]/page.tsx` usano
  `params: { slug: string }`, che dalla 15 è una `Promise` e va atteso.
- **React 19**: `react`, `react-dom`, `@types/react`, `@types/react-dom`. Nel codice si usano
  solo `useState/useEffect/useRef/useCallback/useMemo`, tutte invariate.
- **Nessuna API rimossa**: zero occorrenze di `next/router`, `getServerSideProps`,
  `getStaticProps` o API `unstable_`.

Superficie piccola, ma **non verificabile da qui**: senza rete non posso installare la 16 né
eseguire `next build`. Consegnare un salto di major non provato a un progetto già bloccato in
deploy sarebbe stato uno scambio pessimo, quindi la migrazione resta un passo separato da fare
con la build sotto gli occhi.

### Limiti dichiarati

- **`pnpm-lock.yaml` non esiste in questa copia del repository** e non è generabile senza rete:
  va rigenerato con `pnpm install` e committato insieme a `package.json`, altrimenti il
  lockfile resta indietro rispetto al manifest.
- **Nessun commit**: questa copia non è un repository git.

Verificato: il typecheck di `apps/web` resta a zero errori dopo la modifica.

---

## Incremento 19: configurazione Railway per otto servizi

**Data:** 2026-07-30

Segnalato: dopo aver cancellato e ricreato i servizi, Railway non rileva più il monorepo e crea
un solo servizio, chiedendo il percorso del file di configurazione.

### Il fatto che va detto, non aggirato

**Nessun file in questo repository può far creare a Railway otto servizi.** Verificato sulla
documentazione ufficiale, non a memoria:

- `railway.json` configura **un solo servizio** per definizione;
- il rilevamento automatico dei monorepo avviene **solo dalla pagina di creazione progetto**, al
  primo import: dentro un progetto esistente, aggiungere un servizio ne crea uno;
- il percorso del file di configurazione **non segue la Root Directory** e va indicato assoluto
  dalla radice del repository.

La procedura corretta è quindi manuale — otto servizi, stesso repository, percorso assoluto del
config — ed è ora documentata passo per passo in `DEPLOY.md`, con le tre regole facili da
sbagliare: Root Directory **vuota** (i Dockerfile copiano i package condivisi del monorepo),
percorso del config **assoluto**, e solo Gateway e Web esposti pubblicamente.

### Due lacune reali del repository, corrette

1. **Il servizio Web non era deployabile**: `apps/web` non aveva né `Dockerfile` né
   `railway.json`. Aggiunti entrambi. Il Dockerfile installa con `--ignore-scripts` — il
   postinstall della radice genera il client Prisma, che a `apps/web` non serve — e riceve
   `AIOS_GATEWAY_URL` come **argomento di build**, perché `next.config.mjs` la legge al momento
   della build e non a runtime.
2. **Ogni push ricostruiva tutti i servizi**: aggiunti `watchPatterns` a tutte e otto le
   configurazioni. Una modifica ad `apps/web` non tocca più i sette backend; una modifica a un
   singolo servizio non tocca gli altri; i `packages/**` condivisi restano osservati da tutti i
   servizi backend, perché li usano davvero.

Corretto anche il dominio dello `$schema`: `railway.app` → `railway.com`.

### Infrastructure as Code: valutato e rimandato, con motivo

Railway ha introdotto un IaC vero (`.railway/railway.ts` + `railway config plan/apply`) che
descrive l'intero progetto in un solo file — letteralmente ciò che servirebbe qui. Non adottato
ora per due ragioni: la documentazione lo dichiara **sperimentale** (v0, DSL soggetto a
cambiare), e un servizio **non può essere gestito da entrambi i sistemi**, quindi adottarlo
significa rimuovere tutti gli otto `railway.json` e riscriverli in TypeScript. La migrazione è
documentata e reversibile: sarà il passo giusto quando l'IaC uscirà dallo stato sperimentale.

---

## Incremento 18: backend pubblicabile — la causa del 404 in produzione

**Data:** 2026-07-30

### Il 404 non veniva dal backend

`apps/web/next.config.mjs` proxa `/api/v1/*` verso `AIOS_GATEWAY_URL` e **ricade su
`http://localhost:3000`** se la variabile manca. Su Vercel quell'indirizzo non esiste: Next non
trova nulla da proxare e risponde 404. Il backend non era rotto — **non era pubblicato da
nessuna parte**.

### Problemi trovati e corretti

1. **Ascolto implicito sull'interfaccia.** I sei servizi HTTP e il Gateway facevano
   `app.listen(port)`. Node usa comunque tutte le interfacce, ma in un container la cosa non
   va lasciata implicita: ora è `app.listen(port, '0.0.0.0')` ovunque.
2. **Il worker Eventing non aveva alcun health check** — non è un servizio HTTP, quindi una
   piattaforma lo avrebbe considerato "vivo" solo perché il processo non è morto. Aggiunto
   `health.server.ts`: server nativo minimo che risponde **200 solo se il relay ha completato un
   ciclo negli ultimi 60 secondi**, e 503 quando è fermo. Un health check che dice qualcosa di
   vero invece di essere un timbro.
3. **Nessuna configurazione di deploy.** Aggiunti sette `railway.json` con builder Dockerfile,
   percorso del Dockerfile relativo alla **radice** del repository (il contesto di build deve
   vedere i package condivisi del monorepo), health check, politica di riavvio.
4. **Migration in produzione.** `preDeployCommand: npx prisma migrate deploy` **solo su
   Identity**: se lo facessero tutti e sette partirebbero in parallelo sulla stessa base dati.
5. **Il seed poteva girare in produzione**, creando utenti con password nota. Ora si rifiuta di
   partire se `NODE_ENV=production`.
6. **Nessuna documentazione delle variabili.** Aggiunti `.env.production.example` (commentato
   variabile per variabile, raggruppato per servizio) e `DEPLOY.md` (guida operativa completa).

### Cosa era già a posto

Gateway con CORS da `AIOS_CORS_ORIGINS`, routing interamente da variabili d'ambiente, porte da
`PORT`, sette Dockerfile multi-stage, `docker-compose.yml` + `docker-compose.services.yml`,
health endpoint sui cinque servizi HTTP, autenticazione a JWT con refresh token e token di
servizio separati.

### Non fatto, e perché — non dimenticanze

- **Cookie httpOnly**: in conflitto diretto con «non modificare il frontend», che invia
  `Authorization: Bearer`. E con frontend e backend su domini diversi (Vercel ↔ Railway) i
  cookie sarebbero cross-site: `SameSite=None; Secure`, CORS con credenziali e difesa CSRF —
  più fragile del Bearer in questa topologia, non più sicuro.
- **Revoca dei refresh token al logout** e **rinnovo automatico su 401**: già dichiarati fra i
  limiti noti in `MOCKS.md`, non regressioni introdotte qui.
- **Migration iniziale**: non generabile senza un database. Richiede un `pnpm db:migrate` in
  locale una volta sola, documentato come Passo 0 di `DEPLOY.md`.

### Verifiche

Tutti gli undici pacchetti del backend ricompilano puliti dopo le modifiche. Verifica d'insieme
di 41 controlli sulla configurazione di deploy: Dockerfile e `railway.json` per tutti e sette i
servizi, percorsi di build dalla radice, health check, unicità del servizio che migra, ascolto
su `0.0.0.0`, CORS e routing da variabili, protezione del seed.

**Limite dichiarato**: un deploy reale non è verificabile da qui. Niente rete, quindi nessun
`docker build`, nessun `pnpm install`, nessuna chiamata a Railway.

---

## Incremento 17: Prisma su Windows — nessun percorso più come argomento di shell

**Data:** 2026-07-30

Segnalato da un test reale su Windows: `pnpm install` falliva nel `postinstall` con

```
Error: Could not load --schema from provided path:
"prismaSchemaFolder" preview feature must be enabled
```

### La causa, che non era Prisma

Il messaggio è fuorviante: Prisma lo emette quando ciò che riceve in `--schema` non è un file
di schema. Lo schema del progetto è invece **valido** — verificato: 20 modelli e 9 enum, tutti
con `@@schema`, tutti gli schema dichiarati nel datasource, parentesi bilanciate.

Il problema era nel mio `postinstall`: invocavo `prisma generate --schema=<percorso assoluto>`
con `shell: true` su Windows. **Se il percorso del progetto contiene uno spazio**, `cmd.exe`
spezza l'argomento e Prisma riceve un frammento. E uno spazio c'è quasi sempre: `AIOS 1.3.4`,
`OneDrive - Azienda`, un cognome nella cartella utente.

### La correzione: eliminare la classe di problema

Non un rimedio al caso specifico — **nessun percorso viaggia più come argomento**:

1. **Lo schema è dichiarato una volta sola**, in `packages/domain-model/package.json`:
   `"prisma": { "schema": "prisma/schema.prisma" }`. Configurazione stabile, nessun preview
   feature. Da qui gli script del package perdono `--schema=...`: `generate`, `migrate` e
   `migrate:deploy` diventano comandi puliti.
2. **La CLI è invocata con Node direttamente**, senza shell, risolvendo il suo entry point da
   `prisma/package.json`. Senza shell gli argomenti restano argv letterali su ogni sistema.
   `cwd` punta al package dello schema: `cwd` è un'opzione strutturata, mai interpretata da una
   shell, quindi spazi, parentesi e backslash sono irrilevanti.
3. **Ripiego** sulla CLI da PATH se la risoluzione fallisce — anche lì senza alcun argomento
   che sia un percorso.
4. **Controllo esplicito** che lo schema sia un *file* e non una cartella, con un messaggio in
   italiano che spiega il preview feature invece di lasciarlo dire a Prisma.

### Cosa ho verificato davvero

Riprodotto il caso reale: copia del progetto in una cartella chiamata
`/tmp/AIOS 1.3.5 (prova)` — **spazi e parentesi**, come su Windows — e una finta CLI Prisma che
si comporta come quella vera (legge `prisma.schema` dal `package.json` più vicino e cerca il
file). Tre rami provati:

- **CLI risolta da node_modules**: `argv` esattamente `["generate"]`, `cwd` sul package,
  schema risolto dalla configurazione canonica. Uscita 0.
- **Ripiego su PATH**: stesso `cwd`, nessun argomento di percorso. Uscita 0.
- **Schema sostituito da una cartella**: uscita 1 con il messaggio esplicativo.

Più la verifica d'insieme: 13 controlli su radice, `domain-model`, `turbo.json` e dipendenze —
tutti positivi.

### Limite dichiarato, invariato

`pnpm install` e `pnpm build` **non sono eseguibili in questo ambiente**: niente rete, quindi
né pacchetti né motori Prisma. Ho riprodotto fedelmente il meccanismo che falliva, non
l'installazione vera.

---

## Incremento 16: `pnpm build` — la generazione del client Prisma mancava del tutto

**Data:** 2026-07-30

Segnalato da un build locale fallito: `pnpm install` OK, `typecheck` di `apps/web` OK,
`pnpm build` in errore con `Module "@prisma/client" has no exported member 'PrismaClient'`.
E `pnpm prisma generate` rispondeva `Command "prisma" not found`.

### La causa reale, unica per entrambi i sintomi

**Nel monorepo non esisteva alcun `postinstall`.** `@prisma/client` appena installato è uno
stub senza esportazioni: `PrismaClient` e `Prisma` nascono solo dopo `prisma generate`. Nessuno
lo eseguiva mai.

I due sintomi erano lo stesso problema visto da due lati: il client non generato (build) e la
CLI non raggiungibile dalla radice (tentativo di rimedio manuale). E la sequenza era
ingannevole di proposito: `apps/web` non usa Prisma, quindi il suo typecheck passava e sembrava
che tutto fosse a posto.

### Correzione su tre livelli, indipendenti fra loro

1. **`scripts/postinstall.js`** — dopo `pnpm install`: crea `.env` da `.env.example` se manca
   (mai sovrascrivendone uno esistente) e genera il client. In caso di fallimento esce con
   codice diverso da zero e stampa il comando da lanciare a mano, invece di lasciare un albero
   silenziosamente rotto.
   *Perché alla radice e non in `packages/domain-model`*: pnpm non garantisce l'ordine fra i
   `postinstall` dei workspace, e la generazione deve avvenire **dopo** la creazione di `.env`,
   perché il datasource legge `env("DATABASE_URL")`.
2. **Pipeline Turbo** — nuovo task `generate` (di `@aios/domain-model`) inserito come
   `^generate` nelle dipendenze di `build`, `dev`, `test`, `test:contract`, `test:e2e` e
   `typecheck`. Verificato che **tutti e sette** i package che importano `@prisma/client`
   dipendono da `@aios/domain-model`: la dipendenza topologica li copre senza eccezioni.
   `cache: false` di proposito — l'esito finisce in `node_modules`, che Turbo non traccia, e una
   cache positiva su un albero senza client sarebbe una trappola silenziosa.
3. **CLI `prisma` nelle devDependencies della radice** — così `pnpm exec prisma …` funziona da
   dove è naturale lanciarlo. Prima era dichiarata solo nei singoli package.

### Cosa ho verificato davvero

Eseguito `scripts/postinstall.js` per intero, in tutti e quattro i percorsi:
`.env` creato quando manca · `.env` esistente **non** sovrascritto · fallimento della
generazione che esce con codice 1 e messaggio azionabile · successo che invoca
`prisma generate` con il percorso assoluto corretto e esce 0.

Verificati inoltre: validità JSON di `package.json` e `turbo.json`, esistenza dello script
`generate` chiamato dal task Turbo, schema Prisma bilanciato, e che ogni package che importa
`@prisma/client` lo dichiari fra le proprie dipendenze (tutti e sette).

### Limite dichiarato

`pnpm install` e `pnpm build` **non sono eseguibili in questo ambiente**: non c'è rete, quindi
niente scaricamento dei pacchetti né dei motori Prisma. La verifica end-to-end è la tua.

---

## Incremento 15: build pulita — due errori TypeScript, non uno

**Data:** 2026-07-30

Segnalato da un deploy Vercel fallito.

### L'errore riportato

`<Rete catena={attiva?.catena} />` con `exactOptionalPropertyTypes: true`.

**Causa reale**: `catena?: readonly string[]` e `catena?: readonly string[] | undefined` non
sono la stessa cosa sotto quel flag. La prima dice *"può essere omessa"*; la seconda *"può
essere omessa **oppure** valere esplicitamente `undefined`"*. Nel JSX serve la seconda, perché
`attiva?.catena` passa `undefined` quando non c'è nulla a fuoco.

**Correzione**: props estratte in un'interfaccia `ReteProps` con `| undefined` esplicito e il
commento che spiega la differenza. Nessun workaround: niente `any`, niente cast, niente flag
disattivati, nessuna modifica al comportamento. L'alternativa (spread condizionale a ogni
chiamata, o un valore di ripiego inventato dal chiamante) avrebbe spostato sul chiamante una
complessità che appartiene al contratto del componente.

### Il secondo errore, trovato mentre verificavo

`components/rete.tsx`, in `impulso()`: `p1`/`p2` vengono letti da un indice, quindi sono
`| undefined` per `noUncheckedIndexedAccess`. Il controllo `if (!p1 || !p2) return` restringe il
tipo, ma **dentro la chiusura `muovi()` quel restringimento non è garantito** e dipende dalla
versione di TypeScript. Corretto estraendo i quattro numeri prima di creare la chiusura: nessun
dubbio di versione, e più leggibile.

Questo errore non era nel messaggio di Vercel: sarebbe emerso al giro successivo.

### Come l'ho verificato invece di dedurlo

`apps/web` non è compilabile in questo ambiente (serve `node_modules`, niente rete). Ho
costruito un banco di prova con stub minimi di `react`, `next/link`, `next/navigation`,
`next/font/google`, `next/server` — larghi sugli elementi DOM, **stretti su ciò che conta**:
le nostre props, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`.

Risultato: **39 file controllati, 0 errori**. E soprattutto la controprova, perché un test che
non può fallire non vale nulla: reintrodotti entrambi gli errori uno alla volta, il banco li ha
individuati entrambi.

### Rischio di deploy separato, documentato

`next.config.mjs` proxa `/api/v1/*` verso `AIOS_GATEWAY_URL` e **ricade su
`http://localhost:3000`** se la variabile manca. La build passa lo stesso: è a runtime che ogni
chiamata fallisce su un server di deploy. Aggiunta in `apps/web/README.md` la tabella delle
variabili necessarie (`AIOS_GATEWAY_URL`, `ANTHROPIC_API_KEY`) e la nota sul CORS del Gateway.

### Regressioni

Ricontrollati tutti gli undici pacchetti del backend dopo le modifiche ai testi: compilano
puliti.

---

## Incremento 14: l'Organismo portato nell'app reale

**Data:** 2026-07-30

La direzione approvata (Plancia → Organismo) entra in `apps/web`: non più solo anteprima.

### La rete non sta più dietro il testo

Segnalato due volte con screenshot. Ora vive in un **pannello proprio**
(`components/rete.tsx` + `.pannello-rete`), sotto il pensiero e sopra l'asse del tempo: non si
sovrappone a nessuna parola. Le etichette dei nodi restano invisibili finché il nodo non è
vivo o a rischio — niente muro di testo sullo sfondo.

### Impalcatura

`rail` (sole icone, si allarga al passaggio) · `centro` · `flusso`. I nomi non sono moduli ma
parti di un organismo: Plancia, Cervello, Flussi, Denaro, Relazioni, Materia, Memoria, Tempo,
Persone, Segnali, Innesti, Regole — mappati sulle rotte esistenti, senza rompere nulla.

### Il Flusso è collegato al motore vero

`components/flusso.tsx` unisce due cose: i battiti che AIOS produce da solo (osservazioni ogni
5,2 s, scoperte e cambi di idea ogni 21 s) **e la conversazione reale** — stesso
`ConversationEngine`, stessi strumenti con approvazione, stessa voce. Non è una finta chat.

### Interconnessione

Mettere a fuoco una situazione nella Plancia cambia insieme: la rete traccia il ragionamento
con un impulso che percorre la catena, i vitali non coinvolti si spengono, gli eventi dell'asse
non pertinenti sbiadiscono.

### Altro

- Utente: **Fabio Ruggiero** (`FR`) ovunque, inclusi i testi dei dati e il contesto della
  conversazione LLM.
- `NomeAzienda` recuperato nel rail: mostra l'organizzazione creata davvero nel Primo Incontro.
- Rimosso codice morto dopo il cambio di impalcatura: `menu-laterale.tsx`, `aios-strip.tsx`,
  `numero-animato.tsx`, `icona.tsx`, `perche.tsx`. Verificato che ogni import residuo risolva.

### Limite dichiarato

Questo incremento **non è stato compilato** qui: `apps/web` richiede `node_modules` e in questo
ambiente non c'è rete. Verificati staticamente: bilanciamento di tutti i file, import risolti,
direttive `'use client'` dove servono, nessun componente orfano. La prima compilazione reale è
`pnpm --filter @aios/web dev`.

---

## Incremento 13: riformulazione dell'interfaccia + Automazioni, Integrazioni, Impostazioni

**Data:** 2026-07-30

Richiesta diretta dopo la prima esecuzione reale: *"non mi fa impazzire il front end, me lo
immaginavo diverso — riformula le sezioni, aggiungi un menu, qualche animazione"*. Il giudizio
è del Product Owner e arriva dopo aver visto il prodotto girare: vale più di qualunque
argomento sulla purezza del design precedente.

### Cosa cambia nell'impalcatura

- **Menu laterale con tre gruppi dichiarati**: PRINCIPALE (Oggi, Brain, Automazioni), SPAZI (i
  sette moduli), SISTEMA (Integrazioni, Impostazioni). Fisso su desktop, pannello che scorre da
  sinistra su telefono. Sostituisce la barra a tre tab.
  *Nota*: avevo rimosso il menu dei moduli sostenendo che fosse "DNA da gestionale". La
  correzione è giusta — la gerarchia si può dichiarare senza sembrare un ERP, ed è quello che
  fanno i gruppi con le icone e i contatori.
- **Icone SVG a tratto disegnate sullo stesso spessore** (`components/icona.tsx`), non glifi di
  testo presi a prestito.
- **Barra alta** con indicatore "AIOS sta lavorando" a onde animate, ricerca, notifiche, avatar.
- **Profondità**: alone ambientale sopra il contenuto, superfici che si sollevano al passaggio,
  bordo che si accende, filo luminoso sotto le intestazioni di sezione.
- **Movimento con criterio**: entrata a cascata del contenuto, barra attiva del menu che cresce,
  barra del tempo restituito che si riempie, numeri che salgono
  (`components/numero-animato.tsx`). Tutto sotto `prefers-reduced-motion`.

### Tre sezioni nuove

- **Automazioni** (`lib/mock/automazioni.ts`): per ognuna quanto tempo restituisce, lo storico
  delle esecuzioni **con gli errori veri**, e dove c'è un *miglioramento che AIOS propone da sé*
  ("su 9 solleciti ne hai approvati 9 senza modifiche: sotto i € 2.000 posso mandarli da solo").
- **Integrazioni** (19): ogni riga dice **cosa sbloccherebbe**, non cos'è. Nessuna è collegata e
  lo stato lo dichiara — «pronta» significa costruita e in attesa di credenziali, non attiva.
- **Impostazioni**: dodici aree ordinate per quanto cambiano il comportamento di AIOS.

### Altro

- Nome azienda dell'interfaccia: **AIOS SRL**.
- Rimosso `components/header-nav.tsx`, non più importato da nessuno: codice morto.
- Il verificatore dei simboli delle anteprime aveva un secondo falso positivo (finestra di
  ricerca troppo corta per dichiarazioni con valori JSON lunghi). Reso indipendente dalla
  lunghezza e ri-verificato per controprova che individui ancora il bug originale.

---

## Incremento 12: correzione dell'autenticazione (rotta sbagliata e registrazione senza token)

**Data:** 2026-07-30

Segnalato dalla prima esecuzione reale del frontend contro il backend avviato: `/accesso`
chiamava `POST /api/v1/auth/login` e riceveva **404**.

### Due bug, non uno

1. **Rotta inesistente.** Identity espone `POST /api/v1/auth/token`, non `/login` — il metodo
   del controller si chiama `login`, il percorso no. Corretto in `lib/api/auth.ts`.
2. **Bug più insidioso, trovato mentre correggevo il primo.** `POST /api/v1/auth/register`
   restituisce `{ userId, email }` e **nessun token**. Il codice precedente faceva
   `salvaToken(risultato.accessToken)` su una risposta che quel campo non lo contiene: salvava
   `undefined`, e subito dopo il Primo Incontro rimbalzava alla schermata di accesso senza
   spiegazione. La registrazione ora concatena `register` → `token`, come richiede il backend.

### Terza discrepanza trovata

Il form accettava password da 8 caratteri, ma `RegisterUserUseCase` ne richiede **almeno 10,
con lettere e numeri**. Una password di 9 caratteri sarebbe passata la validazione del browser
per essere poi rifiutata dal server. Ora il requisito è verificato nel client e **scritto sotto
il campo**, invece di essere scoperto con un errore.

### Verifica aggiunta

Dopo login e registrazione il frontend chiama `GET /api/v1/auth/me`: distingue *"token
ricevuto"* da *"token accettato dal backend"*, che altrimenti si scoprirebbe solo alla prima
chiamata protetta. La stessa verifica è nell'anteprima di prova, che ora mostra email e stato
dell'utente autenticato.

### Causa a monte, e cosa cambia

I contratti del Primo Incontro li avevo letti uno per uno nel codice; quelli di Identity li
avevo **dedotti**. La collection Postman usava già `/token` correttamente: bastava guardarla.
Da qui in avanti, ogni percorso e ogni forma di risposta va verificata alla fonte — controller
e casi d'uso — anche quando il nome sembra ovvio.

### Limite dichiarato

Il refresh token viene ora salvato (`lib/api/client.ts`), ma il rinnovo automatico su 401 non è
implementato: alla scadenza dell'access token si torna all'accesso. Registrato in `MOCKS.md`.

---

## Incremento 11: CORS sul Gateway, accesso dalla rete locale, e un limite del browser da conoscere

**Data:** 2026-07-30

### CORS sul Gateway

`backend/gateway/src/main.ts` — `enableCors` con origini configurabili via
`AIOS_CORS_ORIGINS` (elenco separato da virgole). Serviva: `apps/web` parla col Gateway
attraverso il proxy di Next e quindi non incontra CORS, ma **qualunque altro client browser**
veniva bloccato prima ancora di inviare la richiesta.

**Rischio residuo dichiarato**: senza la variabile impostata riflettiamo l'origine della
richiesta, equivalente pratico di "tutte". Accettabile in sviluppo perché l'autenticazione è a
Bearer token in header e non a cookie — il browser non allega credenziali da solo. In
produzione la variabile va impostata con i domini espliciti. Scritto nel commento del codice e
nel log di avvio del Gateway.

Verificato: Gateway compila e nessuno degli altri dieci pacchetti è regredito. Lo stub di
verifica è stato completato con `enableCors` (era una lacuna dello stub, non del codice).

### Accesso dalla rete locale

`apps/web` ha un nuovo script `dev:lan` (`next dev -p 3100 -H 0.0.0.0`) per raggiungere il
frontend da un altro dispositivo della stessa rete. È il modo corretto di provare il backend
da telefono: la pagina è HTTP e le chiamate passano dal proxy, quindi stessa origine.

### Un limite del browser che va documentato, non aggirato

Una pagina servita in **HTTPS non può chiamare un indirizzo `http://`**: il browser lo blocca
come contenuto misto, prima di CORS e indipendentemente dalla configurazione del server. I
visualizzatori HTML in-app servono le pagine in HTTPS, quindi **nessuna anteprima statica
aperta lì potrà mai parlare con un backend locale**. Non è un difetto da correggere: è una
regola del browser.

Conseguenza pratica adottata: l'anteprima di prova (`aios-prova-backend-reale.html`) ora
**diagnostica da sé il proprio contesto** all'apertura, dice se potrà funzionare e indica i due
percorsi che funzionano, invece di far cercare cause sbagliate. Il precedente messaggio
d'errore elencava tre cause possibili e ometteva proprio questa.

---

## Frontend — Incremento 10: il Primo Incontro, collegato al backend reale

**Data:** 2026-07-30

Chiude un debito aperto dall'inizio della fase frontend: gli endpoint della Feature 2.1
(sessione, provisioning) e della Feature 2.2 Inc. 1 (consenso legale) erano costruiti e
verificati in Sprint Review, ma non avevano mai avuto un'interfaccia davanti.

`app/primo-incontro/page.tsx` + `lib/api/first-meeting.ts` — quattro chiamate reali in
sequenza, nell'ordine che il server impone:

1. `POST /api/v1/first-meeting/sessions`
2. `GET /api/v1/first-meeting/legal-documents` — le 4 versioni correnti
3. `POST /api/v1/first-meeting/legal-consent`
4. `POST /api/v1/first-meeting/provision` — Organization + ruoli + Workspace

**L'ordine non è una convenzione del client**: il provisioning risponde 409 se il consenso
non risulta registrato per quella sessione. Qui lo rispettiamo invece di aggirarlo, e la
collection Postman contiene il test negativo che lo dimostra.

### Scelte di prodotto

- **Non è un wizard**, nemmeno nel linguaggio (Product Constitution): AIOS chiede il minimo
  che non può indovinare — il nome dell'azienda — e spiega perché.
- **Consenso granulare, non "accetto tutto"**: quattro caselle separate, ognuna con una frase
  in italiano che dice cosa comporta. Su AI_USAGE_CONSENT: "senza questo non posso ragionare
  su nulla".
- **La rivelazione mostra gli identificativi veri** presi dal database (organizationId,
  workspaceId), e dichiara subito dopo che i dati dei moduli sono invece un esempio. Reale è
  chi sei e qual è la tua organizzazione; simulato è cosa c'è dentro.
- **Onestà sui segnaposto**: l'interfaccia dice che i testi legali collegati sono segnaposto,
  mentre la registrazione del consenso è reale e tracciata con IP e user agent.

### Coerenza

- Dopo la **registrazione** si va al Primo Incontro; dopo il **login** si entra direttamente
  (chi ha già un'organizzazione non ripete l'incontro).
- `components/nome-azienda.tsx` mostra nell'header il nome dell'organizzazione creata
  davvero, con ricaduta sul nome demo se non c'è.

### Credenziali di prova

Il seed crea `admin@demo.aios.local`, `manager@demo.aios.local`,
`employee@demo.aios.local` — password `DemoPassword123!` per tutti. Istruzioni complete in
`apps/web/README.md`.

---

## Frontend — Incremento 9: il Brain espanso

**Data:** 2026-07-30

`lib/mock/brain.ts` + riscrittura di `app/(app)/brain/page.tsx`. Il Brain smette di essere un
riepilogo di stato e diventa il posto dove si guarda AIOS pensare.

### Sei cose che un elenco non può mostrare

1. **Un ragionamento passo per passo** — "perché ti ho proposto di cambiare fornitore invece
   di chiedere uno sconto a Metalsud": ho visto → ho collegato → ho calcolato → **ho scartato**
   → quindi. Il passo scartato è mostrato barrato, con il motivo ("l'hai già chiesto nel 2025 e
   hanno concesso l'1,5%: lo spazio di trattativa è stretto"). È la differenza tra pensare e
   produrre output.
2. **L'incertezza dichiarata e spiegata**: confidenza 82%, e sotto il perché non è più alta —
   i tempi di consegna del fornitore alternativo sono letti dal sito, non verificati, e "sui
   ricambi urgenti quei 2 giorni possono costarti più dei € 340 al mese".
3. **Le relazioni come catene leggibili** invece di un grafo di puntini: quattro anelli con le
   frecce, e in fondo l'effetto concreto ("hai servito 2 clienti in più nella stessa giornata").
4. **Gli obiettivi e la loro tensione**: quattro obiettivi con stato e metodo, più un blocco
   dedicato a *cosa fa quando due si scontrano* — incassare prima contro non perdere il
   cliente — e la regola di risoluzione, con il collegamento al caso Bellini in corso.
5. **Dove ha cambiato idea**: prima barrato, ora in evidenza, e cosa l'ha fatto cambiare.
6. **Le decisioni con gli esiti veri, inclusa una SBAGLIATA**: il 9 luglio ha segnalato Fontana
   come cliente in ritardo, era un falso allarme, e da quell'errore è nata la regola del 14
   luglio. In fondo, **cosa non sa** — quattro buchi dichiarati, incluso "sugli altri 11 clienti
   inattivi sto zitto".

Le ultime due sezioni sono deliberate: un sistema che espone i propri errori e i propri limiti
è l'unico di cui si possa ragionevolmente decidere quanto fidarsi, caso per caso.

### Correzione

Un errore di battitura ("scESO") era rientrato copiando un testo già corretto in `spazi.ts`.
Corretto e verificato: zero occorrenze residue.

---

## Frontend — Incremento 8: notifiche intelligenti

**Data:** 2026-07-30

`lib/mock/notifiche.ts` + `components/notifiche.tsx`, dietro una campanella nell'header
(stesso schema della ricerca) che mostra un numero **solo** quando qualcosa richiede davvero
l'utente.

### Costruito al rovescio, ed è questo il punto

Un centro notifiche normale elenca ciò che ti è stato detto: è un'altra schermata. Qui la
prima cosa che leggi è **quante cose AIOS ha deciso di non dirti** — 47 oggi — raggruppate
per motivo, ognuna con la regola che l'ha silenziata: "AUTOMAZIONE AUTONOMA", "SOGLIA ·
REGOLA TUA DEL 12 MAGGIO", "IMPARATO IL 14 LUGLIO · 11 CONFERME".

Tre conseguenze progettuali, tutte visibili nell'interfaccia:

1. **Ogni interruzione porta un "perché adesso"**, non solo un "cosa". Su Metalsud: "te l'ho
   detto stamattina e non ieri sera perché prima volevo finire il confronto con gli altri due
   fornitori, così arrivi con i conti già fatti".
2. **AIOS si dà un tetto e lo dichiara**: 3 interruzioni al giorno, oggi 3 usate. "Un collega
   che ti chiama dieci volte al giorno non è utile, è un problema in più."
3. **La soglia è correggibile**: "Non chiamarmi per questo" rimuove l'interruzione e mostra
   l'apprendimento — la stessa meccanica propone → correggi → diventa regola tua già usata
   altrove.

Il criterio è scritto in chiaro nel pannello (quando chiama, quando non chiama), perché una
promessa di non disturbare che non si può verificare è solo una frase di marketing.

---

## Frontend — Incremento 7: CRM — la scheda cliente a 360°

**Data:** 2026-07-30

`lib/mock/clienti.ts` + `app/(app)/clienti/[slug]/page.tsx` — quattro clienti che AIOS
conosce a fondo: Bellini, Fontana, Verdi Logistics, Nervi.

### La scelta che la separa da un CRM

L'ordine degli elementi *è* la tesi del prodotto, e un CRM tradizionale fa l'esatto
contrario:

1. **Il giudizio di AIOS in prima persona**, prima di qualunque numero. Su Bellini apre con
   "il ritardo di adesso non mi preoccupa e ti dico perché"; su Verdi con "qui c'è un rischio
   concreto, e non è sui pagamenti".
2. **Affidabilità e rischio mai come punteggio nudo**: sempre livello + ragionamento +
   confidenza. Su Verdi l'affidabilità è "Media" con confidenza **61%**, e la spiegazione dice
   che non è un giudizio negativo ma "una misura onesta di quanto poco li conosco ancora".
   Un collega di cui fidarsi dichiara anche cosa non sa.
3. **La storia unificata** dove email, ordini, fatture, telefonate, WhatsApp e incontri stanno
   insieme — e **le azioni di AIOS stanno in mezzo**, marcate con un pallino pieno: si vede il
   collega dentro la storia del cliente, non in una scheda a parte.
4. **La memoria specifica**, che distingue "IMPARATO · 9 CONFERME" da "ME L'HAI DETTO TU".
5. **Cosa mi aspetto**, con il perché: su Bellini un ordine tra il 1 e il 4 agosto intorno ai
   € 2.800, "ha ordinato a inizio mese 11 volte su 12", e la disponibilità già verificata.

### Coerenza dell'ecosistema

- `RigaSpazio` ha ora un `href` opzionale: le righe degli spazi diventano navigabili senza
  duplicare il renderer condiviso.
- `VoceIndice` ha un `href` opzionale, e i quattro clienti lo usano: cercare "bellini" nella
  ricerca globale (⌘K) porta **direttamente sulla scheda 360**, non sulla lista generica.
  Un solo indice, destinazioni precise.

---

## Frontend — Incremento 6: ricerca globale

**Data:** 2026-07-30

Una sola barra per clienti, fatture, documenti, articoli, appuntamenti, memoria del Brain e
automazioni. `components/ricerca-globale.tsx`, aperta con ⌘K / Ctrl+K su desktop e con la
lente nell'header su telefono (dove la scorciatoia non esiste — il brief chiede esperienze
progettate per il dispositivo, non ridotte).

### Le due scelte che la rendono parte dell'ecosistema

1. **Stesso indice della conversazione.** La ricerca interroga `cercaNellIndice` di
   `lib/mock/indice.ts`, esattamente come lo strumento `cerca` che AIOS usa da sé: quello che
   AIOS trova e quello che trovi tu non possono divergere. Un solo indice, mai due verità.
2. **L'ultima riga è sempre "Chiedi ad AIOS".** La ricerca per parole non risponde a domande
   vere ("chi devo chiamare oggi"): quella riga passa la domanda alla conversazione
   onnipresente tramite un evento, senza farti riscrivere nulla. E quando non c'è nessuna
   corrispondenza, quella riga **non è un vuoto ma la risposta giusta** — l'intestazione
   diventa "nessuna corrispondenza, ma posso ragionarci".

Navigazione da tastiera completa (↑↓ ↵ esc), risultati raggruppati per tipo, e su desktop il
piede con le scorciatoie.

### Correzione trovata durante l'integrazione

Il listener dell'evento `aios-chiedi` in `AiosStrip` era registrato senza array di
dipendenze: si smontava e rimontava a **ogni carattere digitato** nella casella della chat
(`bozza` cambia a ogni keystroke → nuovo render → nuovo listener). Corretto con un ref che
mantiene sempre la versione aggiornata di `invia`, così il listener si registra una volta
sola. Il blocco è stato anche spostato dopo la dichiarazione di `invia` per rispettare
l'ordine di inizializzazione.

---

## Frontend — Incremento 5: la chat che ESEGUE (strumenti + approvazione)

**Data:** 2026-07-30

Il salto da "AIOS risponde" a "AIOS fa". La conversazione ora usa strumenti reali: cerca da
sé nei dati dell'azienda e propone azioni concrete.

### L'architettura che conta: due classi di strumenti

- **LETTURA** (`cerca`, `scheda_cliente`): eseguite subito dal server, in ciclo, finché AIOS
  ha finito di informarsi. Guardare non cambia nulla, e un collega che chiede permesso per
  leggere è inutile.
- **AZIONE** (`invia_sollecito`, `approva_riordino`, `sposta_appuntamento`, `scrivi_email`):
  **il server si rifiuta di eseguirle.** Interrompe il ciclo e restituisce una richiesta di
  approvazione; l'azione avviene solo in una chiamata successiva, dopo l'ok esplicito.

Questa è la parte importante: il pattern "propone → approvi → esegue" della Product
Constitution diventa un **fatto meccanico**, non una promessa scritta nel prompt. Anche se
il modello decidesse di agire di sua iniziativa, il codice non glielo permette. Un rifiuto
viene rimandato al modello come esito, con l'istruzione di non riproporre la stessa cosa.

### File

- `lib/mock/indice.ts` — 31 voci interrogabili (clienti, fatture, documenti, articoli,
  appuntamenti, memoria del Brain, automazioni). **Un solo indice** per lo strumento `cerca`
  e per la futura ricerca globale ⌘K: così i due non potranno divergere.
- `lib/conversation/strumenti.ts` — schemi degli strumenti, classe (lettura/azione),
  esecutori delle letture e riepiloghi in italiano da mostrare in conversazione.
- `app/api/chat/route.ts` — ciclo strumenti (max 4 giri, poi dichiara il limite invece di
  inventare), gestione dell'approvazione, envelope invariato.
- `lib/conversation/engine.ts` — contratto ampliato: `{ testo, passi, azioni, messaggi }`.
  Lo storico torna al client come blob opaco da rimandare: il componente non deve conoscere
  il formato interno dei messaggi.
- `components/aios-strip.tsx` — mostra **in chiaro i passi** che AIOS ha fatto da sé
  ("Ho cercato X in azienda") e le card "SERVE IL TUO OK" con il testo esatto che partirebbe.

### Rischio residuo dichiarato

Un'azione approvata oggi viene confermata e tracciata, ma **non produce ancora un effetto
reale** (nessuna email parte): i moduli non hanno API di scrittura. È in `MOCKS.md`. La
catena decisionale è però già quella definitiva: quando arriveranno le API, si sostituisce
l'esecutore, non il modello di interazione.

---

## Frontend — Incremento 4: voce e le sette viste dei moduli

**Data:** 2026-07-30

### Voce (reale, non simulata)

`lib/conversation/voce.ts` — ascolto (voce → testo) e parlato (testo → voce) con le API
vocali native del browser: nessun servizio esterno, nessun costo per minuto, l'audio del
riconoscimento non lascia il dispositivo. Nel pannello: microfono con stato "TI ASCOLTO" e
trascrizione in tempo reale mentre parli, più un interruttore per far rispondere AIOS a voce.

Limiti dichiarati e gestiti nel codice, non nascosti: il riconoscimento non esiste su
Firefox né in alcune webview in-app — la UI **interroga** `ascoltoDisponibile()` e nasconde
il microfono invece di mostrare un pulsante che non funziona; gli errori del microfono
(permesso negato, nessun parlato, rete assente) hanno messaggi in italiano che dicono cosa
fare.

### Le sette viste dei moduli

`lib/mock/spazi.ts` + `app/(app)/spazi/[slug]/page.tsx` — Finanza, Clienti, Magazzino,
Documenti, Calendario, Persone, Analytics. Una sola forma dati e **un solo renderer
condiviso** (Product Bible: "ogni modulo condivide lo stesso design e la stessa memoria"),
contenuti specifici per ciascuno. In ogni modulo AIOS apre parlando in prima persona di cosa
sta facendo lì dentro, e dove ha senso propone una decisione approvabile
(`components/decisione.tsx`, con perché + confidenza + apprendimento visibile).

### Correzioni

- `.spazio` è diventato un `<Link>`: senza una regola dedicata avrebbe ereditato il colore
  dei link e l'intera scheda sarebbe diventata azzurra. Corretto in `globals.css`.
- Aggiunto `color-scheme: dark` e il fondo anche su `html`: elimina il lampo bianco al primo
  paint e rende scuri i controlli nativi.

---

## Frontend — Incremento 3: conversazione REALE con AIOS

**Data:** 2026-07-30

Prima intelligenza non simulata del prodotto. La striscia AIOS onnipresente apre un
pannello di conversazione (nessuna voce "Chat" nel menu, coerente con il brief V3) le cui
risposte vengono da un LLM vero, non da script preregistrati.

- `lib/conversation/engine.ts` — interfaccia `ConversationEngine`: il confine dietro cui
  vive l'intelligenza. Oggi punta a `/api/chat`, domani potrà puntare al backend senza
  toccare i componenti.
- `app/api/chat/route.ts` — route server: la chiave API resta server-side, mai nel browser.
  Risponde con l'envelope `{ data, error, meta }` come il resto della piattaforma; errori
  espliciti e attuabili (chiave mancante, motore non raggiungibile) invece di risposte finte.
- `lib/conversation/contesto.ts` — il contesto aziendale di AIOS: clienti, crediti,
  magazzino, automazioni e **le regole imparate da Marco**. Dati simulati, ragionamento reale.
  Vincoli espliciti nel prompt: non inventare numeri, dire quando non si sa, chiedere
  approvazione prima di agire, parlare in prima persona come collega.
- `components/aios-strip.tsx` — pannello con storico, indicatore "sto pensando", spunti
  iniziali, invio con Enter, chiusura con Esc; su desktop centrato a larghezza fissa.
- `next.config.mjs` — il rewrite verso il Gateway ristretto da `/api/*` a `/api/v1/*`, così
  la route locale `/api/chat` non può mai essere proxata al backend.

**Configurazione**: `cp apps/web/.env.local.example apps/web/.env.local` e inserire
`ANTHROPIC_API_KEY`. Senza chiave la conversazione dichiara l'errore invece di simulare.

### Decisioni progettuali assunte

**La chiamata all'LLM vive in una route server di Next, non nel backend NestJS.** Motivo:
serve una conversazione reale subito per la finestra di gennaio, e il frontend è la
superficie in sviluppo attivo; la chiave resta comunque fuori dal browser. Quando la
conversazione dovrà *orchestrare azioni* sui moduli e non solo rispondere, il posto giusto
diventa il backend — l'interfaccia `ConversationEngine` è progettata esattamente per
rendere quello spostamento indolore. Proposta, in attesa di ratifica.

---

## Frontend — Incremento 1: `apps/web` (Oggi, Brain, Spazi, Accesso)

**Data:** 2026-07-30

Prima superficie visibile di AIOS (fase demo-first, obiettivo gennaio): Next.js in `apps/web` (workspace già previsto), design system approvato tramite anteprime V1→V4 (dark, ciano/viola, monospace per i dati; mobile-first). Home come briefing e non dashboard ("Mentre non c'eri" / "Da decidere insieme" / "Prossime ore", numeri in secondo piano), Brain con perché+confidenza, Spazi narrati per attività, striscia AIOS onnipresente. **Accesso collegato alle API reali** (Identity via Gateway, envelope `@aios/api-contract`, proxy Next senza CORS, porta 3100); tutto il resto simulato e dichiarato in `apps/web/MOCKS.md`. Regola: dati finti sì, intelligenza finta no — l'input conversazionale è isolato e marcato per la sostituzione con il ConversationEngine reale (ottobre).

---

## Feature 2.2 — First Conversation, Incremento 1: Consenso Legale

**Data:** 2026-07-26

### Obiettivo

Primo incremento della Feature 2.2: nessuna Organization può più essere creata senza un consenso legale registrato, versionato e dimostrabile. È il prerequisito che rende lecito tutto ciò che la conversazione raccoglierà negli incrementi successivi.

### Funzionalità implementate

- **Nuovo Bounded Context concettuale "Legal"** (schema Postgres `legal`, dentro `onboarding-service` — vedi ADR-0001): `LegalDocumentVersion` (documenti versionati) e `LegalDocumentAcceptance` (append-only, mai modificata né cancellata).
- **Quattro documenti richiesti, consensi distinti**: Termini di Servizio, Privacy Policy, Consenso uso AI, DPA — mai un unico "accetto tutto" (GDPR richiede consenso specifico per finalità distinte).
- **`GET /api/v1/first-meeting/legal-documents`**: versioni correnti da mostrare prima di chiedere il consenso.
- **`POST /api/v1/first-meeting/legal-consent`**: registra l'accettazione di tutti e quattro in un'unica chiamata, con IP e user agent per la dimostrabilità.
- **Vincolo applicato nell'orchestratore, non solo nel controller**: `ProvisionNewTenantUseCase` rifiuta con `LegalConsentRequiredError` (HTTP 409) se il passo `legal_consent_given` non risulta completato — vale anche per una ripresa dopo un'interruzione.
- **Riuso del Conversation Step Registry** (Feature 2.1, Incremento 7): il consenso è un passo generico come gli altri, nessuna nuova infrastruttura di stato.

### Nuove tabelle / schema Prisma

Nuovo schema `legal`: `legal_document_versions`, `legal_document_acceptances`.

### Nuovi eventi di dominio

`LegalDocumentAccepted` (uno per documento accettato), conforme alla convenzione fissata nell'Incremento 6 (nome dell'aggregate reale, payload `snake_case`, `schema_version`).

### Istruzioni di aggiornamento

`pnpm db:migrate` (nuovo schema `legal`) seguito da `pnpm db:seed` — il seed pubblica le versioni iniziali dei quattro documenti con `contentUrl` **segnaposto**, da sostituire con i testi legali reali prima di qualunque rilascio pubblico.

### Breaking change

`POST /api/v1/first-meeting/provision` ora richiede che il consenso sia già stato registrato per quella sessione — una chiamata senza consenso riceve 409 invece di procedere. Le sessioni già provisionate prima di questo incremento non sono toccate (il ramo di idempotenza precede il controllo, deliberatamente).

---

## Correzioni post-consegna — Sprint Review manuale di Feature 2.1

**Data:** 2026-07-26

Trovate dall'esecuzione manuale reale del flusso (non dalla verifica statica, che compila il codice ma non ne osserva il comportamento a runtime).

- **`AuthMiddleware` restituiva 500 invece di 401** su un token JWT non valido/scaduto — lanciava `InvalidAccessTokenError` come `Error` semplice, mai tradotto in un'eccezione HTTP gestita. Bug preesistente alla Feature 2.1, mai esercitato da alcun test precedente. Aggiunto anche un log diagnostico lato server in `JwtVerifier` che preserva la distinzione originale di `jsonwebtoken` (token scaduto vs firma non valida), persa dal catch-all esistente.
- **`HttpWorkspaceClient` non impostava l'header `X-Organization-Id`** chiamando `POST /api/v1/workspaces` — `AuthMiddleware` risolve i grant solo se questo header è presente; senza, procede silenziosamente con un array vuoto, e `PermissionGuard` rifiuta `workspace.create` con 403 indipendentemente dai permessi realmente assegnati. Il provisioning falliva sempre, per ogni utente, esclusivamente al passo Workspace. Corretto impostando l'header con l'`organizationId` già disponibile nell'orchestratore. `PermissionGuard` distingue ora esplicitamente, nel proprio messaggio di errore, "nessun contesto di organizzazione fornito" da "permesso realmente mancante" — la stessa ambiguità che ha reso questo bug più lento da diagnosticare.
- Aggiunti i test mancanti che avrebbero dovuto intercettare entrambi i problemi: `auth.middleware.test.ts`, `permission.guard.test.ts` (nessuno dei due esisteva prima), e test dedicati per tutti e tre i client HTTP di Onboarding (`http-workspace-client.test.ts`, `http-organization-client.test.ts`, `http-administration-client.test.ts`) — verificano esplicitamente quali header ciascuno imposta, non solo che l'orchestratore chiami il client fittizio giusto.

---

## Feature 2.1 — First Meeting Foundation

**Data:** 2026-07-26

### Obiettivo

Fondamenta tecniche per il primo incontro tra AIOS e l'imprenditore (Epic 2):
creazione automatica dell'ambiente (Organization + ruoli di default +
Workspace) al termine della futura conversazione di onboarding, e una
struttura dati genuinamente estensibile per tracciare qualunque attività
futura (import, inizializzazione AI, Business Brain...), non solo il
provisioning. Costruita per incrementi piccoli e verificabili, ciascuno
approvato singolarmente.

### Funzionalità implementate

- **Allineamento del modello Organization**: nuovi campi anagrafici/fiscali/
  di localizzazione, slug immutabile generato automaticamente e disambiguato
  in caso di collisione, enum `Plan` esteso (FREE/STARTER/PROFESSIONAL/
  BUSINESS/ENTERPRISE), vero enum `status` (ACTIVE/SUSPENDED/ARCHIVED/
  DELETED — quest'ultimo riservato a future procedure amministrative, non
  raggiungibile dal normale flusso utente). Ciclo di vita: `DELETE
  /organizations/:id` archivia (reversibile), mai elimina definitivamente.
- **Autenticazione service-to-service**: token di servizio firmati (JWT,
  secret dedicato `SERVICE_JWT_SECRET`, separato da quello dei token
  utente), `ServiceAuthGuard` + `@AllowServices(...)` per proteggere ogni
  endpoint interno — chiude un rischio esplicitamente accettato in una fase
  precedente (endpoint interni raggiungibili senza autenticazione).
- **Nuovo servizio `onboarding-service`** (percorso pubblico
  `/api/v1/first-meeting`, mai "onboarding" nel linguaggio rivolto
  all'utente): orchestratore del provisioning automatico dell'ambiente,
  con ripresa sicura di un provisioning interrotto a metà.
- **`ConversationSession` + `ConversationStep`**: il punto in cui AIOS
  conserva lo stato del primo incontro — modello a passi dinamici
  (chiave stringa, non un campo dedicato per attività, non un enum),
  pensato per crescere a "decine di attività diverse" senza richiedere una
  migration per ognuna. `Conversation Step Registry` (`conversation-steps.ts`)
  centralizza le chiavi ufficiali per evitare incoerenze terminologiche,
  senza introdurre rigidità nello schema.
- **Convenzione definitiva sugli eventi di dominio**: `DomainEvent`
  consolidato in un'unica implementazione condivisa (`@aios/eventing`, prima
  ridichiarata in modo indipendente in tre servizi); nome evento sempre
  `<NomeAggregate><VerboAlPassato>` (mai un termine di prodotto);
  `schema_version` nel payload di ogni evento.

### Nuove tabelle / schema Prisma

- `organization.organizations`: nuovi campi (vedi sopra).
- Nuovo schema `onboarding`: `conversation_sessions`, `conversation_steps`.

### Nuove variabili d'ambiente

- `SERVICE_JWT_SECRET` — richiesta da Organization, Workspace, Administration, Onboarding.
- `ORGANIZATION_SERVICE_URL`, `WORKSPACE_SERVICE_URL`, `ONBOARDING_SERVICE_URL` — URL interni per l'orchestrazione.

### Istruzioni di aggiornamento

Su un database con organizzazioni già esistenti da prima di questa Feature:
`pnpm db:migrate` seguito obbligatoriamente da `pnpm db:backfill-2.1` (una
tantum) — senza, la lettura di quelle organizzazioni fallisce
deliberatamente finché il backfill non viene eseguito. Copiare
`SERVICE_JWT_SECRET` da `.env.example` in `.env` prima di riavviare
qualunque servizio.

### Breaking changes

Nessuno a livello di contratto HTTP osservabile per gli endpoint già
testati in Milestone 1/2. `DELETE /organizations/:id` cambia
implementazione interna (da soft-delete a vera archiviazione reversibile)
ma restituisce lo stesso comportamento HTTP (stessa stringa di permesso
`organization.archive`, stesso codice di conflitto se richiamato due volte).

### Checklist finale

- [x] Codice completo, per tutti e sette gli incrementi
- [x] Test scritti (unit test per ogni entità/caso d'uso/guard nuovo o modificato)
- [x] Compilazione reale verificata (`tsc`, produzione e con test inclusi, tutti gli undici pacchetti/servizi)
- [ ] Test eseguiti realmente in ambiente Docker/Postman — piano completo in `AIOS-Feature-2.1-Sprint-Review.md`, da eseguire nell'ambiente reale
- [x] Nuove dipendenze verificate (audit automatico import↔package.json)
- [x] Migration documentate, incluso il passo di backfill una tantum
- [x] Documentazione aggiornata (questo file + ROADMAP.md; README/RBAC README/convenzioni eventi/Engineering Bible pianificati separatamente)


## Milestone 1 — Sistema di Autenticazione: endpoint protetto

**Data:** 2026-07-24

### Obiettivo

Primo incremento funzionale dopo il bootstrap stabile. Identity aveva già
registrazione, login, refresh token, hash password e validazioni (costruiti
durante il bootstrap) — mancava l'unico elemento esplicitamente richiesto e
non ancora presente: un endpoint realmente protetto da autenticazione.

### Funzionalità implementate

- `GET /api/v1/auth/me` — restituisce il profilo dell'utente autenticato
  (id, email, stato MFA, stato account). Richiede un access token JWT
  valido nell'header `Authorization: Bearer <token>`.
- `JwtAuthGuard` — Guard NestJS dedicato, distinto dal `PermissionGuard` di
  `@aios/rbac` usato da Organization/Workspace: qui serve solo un JWT
  valido (verificato con lo stesso `TokenService` che Identity usa per
  emetterlo), nessuna chiamata di rete verso Administration per risolvere
  permessi — Identity resta fonte di verità di se stessa per
  l'autenticazione.
- `GetCurrentUserUseCase` — caso d'uso applicativo, riusa `UserRepository`
  già esistente.

### Bug corretti

Nessuno — nessun bug preesistente ha impedito lo sviluppo di questa
funzionalità.

### File principali modificati

- `backend/services/identity/src/application/get-current-user.use-case.ts` (nuovo)
- `backend/services/identity/src/api/jwt-auth.guard.ts` (nuovo)
- `backend/services/identity/src/api/auth.controller.ts` (aggiunto endpoint `/me`)
- `backend/services/identity/src/infrastructure/identity-use-case.factory.ts`
  (aggiunti i metodi `verifyAccessToken` e `getCurrentUser`)
- `backend/services/identity/src/identity.module.ts` (registrato `JwtAuthGuard`)

### Nuove dipendenze installate

Nessuna — l'endpoint riusa `@nestjs/common` e il `TokenService` già
dipendenze esistenti di Identity.

### Modifiche al database

Nessuna. Nessuna nuova migrazione Prisma richiesta da questa milestone.

### Breaking changes

Nessuno. Nessun endpoint esistente è stato modificato nel comportamento.

### Istruzioni di aggiornamento

Nessuna azione richiesta oltre alla normale sequenza di avvio (vedi
README.md). Nessuna nuova variabile d'ambiente, nessuna nuova dipendenza da
installare.

### Checklist finale

- [x] Codice completo
- [x] Test scritti (unit test per `GetCurrentUserUseCase` e `JwtAuthGuard`)
- [x] Compilazione reale verificata (`tsc`, exit code 0)
- [ ] Test eseguiti realmente (vitest non disponibile in questo ambiente di
      sviluppo — da eseguire nell'ambiente reale, vedi report della milestone)
- [x] Nessuna nuova dipendenza da verificare
- [x] Nessuna migrazione da applicare
- [x] Documentazione aggiornata (questo file + ROADMAP.md)
