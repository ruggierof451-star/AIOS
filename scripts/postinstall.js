/**
 * Cosa deve essere vero dopo `pnpm install`, e prima non lo era.
 *
 * ── Il problema di fondo ─────────────────────────────────────────────
 * `@prisma/client`, appena installato, NON contiene il client: contiene
 * uno stub che non esporta né `PrismaClient` né `Prisma`. Quelle
 * esportazioni nascono solo quando `prisma generate` legge lo schema e
 * scrive il client dentro node_modules. Senza questo passo, `pnpm install`
 * riesce, il typecheck di apps/web (che non usa Prisma) riesce, e poi
 * `pnpm build` fallisce su ogni servizio backend.
 *
 * ── Il problema della versione precedente, su Windows ────────────────
 * Invocavo `prisma generate --schema=<percorso assoluto>` con `shell:true`
 * su Windows. Se il percorso del progetto contiene uno spazio — ed è la
 * norma: "AIOS 1.3.4", "Fabio Ruggiero", "OneDrive - Azienda" — cmd.exe
 * spezza l'argomento e Prisma riceve un frammento di percorso. Da lì
 * l'errore fuorviante sul preview feature "prismaSchemaFolder", che Prisma
 * emette quando ciò che riceve non è un file di schema.
 *
 * ── La correzione ────────────────────────────────────────────────────
 * Nessun percorso viaggia più come argomento:
 *   1. lo schema è dichiarato una volta sola in
 *      packages/domain-model/package.json → "prisma": { "schema": ... },
 *      configurazione stabile, nessuna preview feature;
 *   2. la CLI viene eseguita con `cwd` su quel package — `cwd` è un'opzione
 *      strutturata, mai interpretata da una shell, quindi spazi e
 *      backslash sono irrilevanti;
 *   3. quando possibile la CLI è invocata con Node direttamente, senza
 *      shell: gli argomenti restano argv letterali su ogni sistema.
 *
 * JavaScript nativo e nessuna dipendenza: deve funzionare durante
 * l'installazione, quando non tutto è ancora pronto.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const radice = path.resolve(__dirname, '..');
const pacchettoSchema = path.join(radice, 'packages', 'domain-model');
const schema = path.join(pacchettoSchema, 'prisma', 'schema.prisma');

const log = (m) => console.log(`[postinstall] ${m}`);

// ── 1. L'ambiente deve esistere ──────────────────────────────────────
// `.env` è in .gitignore: su un clone pulito non c'è.
const env = path.join(radice, '.env');
const esempio = path.join(radice, '.env.example');
if (!fs.existsSync(env)) {
  if (fs.existsSync(esempio)) {
    fs.copyFileSync(esempio, env);
    log('creato .env da .env.example (un .env esistente non viene mai toccato)');
  } else {
    log('ATTENZIONE: mancano sia .env sia .env.example');
  }
}

// ── 2. Lo schema dev'essere un FILE ──────────────────────────────────
// Proprio il controllo che mancava: se qui ci fosse una cartella, Prisma
// chiederebbe il preview feature "prismaSchemaFolder". Meglio dirlo noi,
// con parole comprensibili.
if (!fs.existsSync(schema) || !fs.statSync(schema).isFile()) {
  console.error(
    `[postinstall] Lo schema Prisma non è un file leggibile:\n    ${schema}\n` +
      'Deve essere un singolo file schema.prisma. Una cartella richiederebbe\n' +
      'il preview feature "prismaSchemaFolder", che questo progetto non usa.',
  );
  process.exit(1);
}

// ── 3. Trovare la CLI senza dipendere dal PATH né dalla shell ────────
function trovaCliPrisma() {
  // a) risoluzione normale del modulo
  try {
    const pkg = require.resolve('prisma/package.json', { paths: [radice] });
    const bin = require(pkg).bin;
    const rel = typeof bin === 'string' ? bin : bin && bin.prisma;
    if (rel) return path.join(path.dirname(pkg), rel);
  } catch {
    /* alcuni pacchetti non espongono ./package.json: si prosegue */
  }
  // b) percorso classico dentro node_modules della radice
  const diretto = path.join(radice, 'node_modules', 'prisma', 'package.json');
  if (fs.existsSync(diretto)) {
    try {
      const bin = JSON.parse(fs.readFileSync(diretto, 'utf8')).bin;
      const rel = typeof bin === 'string' ? bin : bin && bin.prisma;
      if (rel) return path.join(path.dirname(diretto), rel);
    } catch {
      /* si prosegue con il piano c */
    }
  }
  return null;
}

log('genero il client Prisma dallo schema condiviso…');

const cli = trovaCliPrisma();
let esito;

if (cli && fs.existsSync(cli)) {
  // Nessuna shell: gli argomenti restano argv letterali. `cwd` porta
  // Prisma nel package che dichiara lo schema, quindi niente --schema.
  esito = spawnSync(process.execPath, [cli, 'generate'], {
    cwd: pacchettoSchema,
    stdio: 'inherit',
  });
} else {
  // Ripiego: la CLI dal PATH. Su Windows serve la shell per risolvere
  // `prisma.cmd`, ma non passiamo comunque nessun percorso.
  esito = spawnSync('prisma', ['generate'], {
    cwd: pacchettoSchema,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

if (esito.error || esito.status !== 0) {
  console.error(
    '\n[postinstall] La generazione del client Prisma è FALLITA.\n' +
      'Senza di essa i servizi backend non compilano: `@prisma/client` resta\n' +
      'privo di PrismaClient e Prisma. Puoi riprovare a mano con:\n\n' +
      '    pnpm --filter @aios/domain-model run generate\n',
  );
  process.exit(esito.status ?? 1);
}

log('client Prisma generato.');
