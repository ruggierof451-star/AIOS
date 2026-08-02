/**
 * Comando di rilascio: quello che deve accadere sul database PRIMA che una
 * nuova versione inizi a servire traffico.
 *
 * Lo invoca il `preDeployCommand` del solo servizio Identity: se lo
 * facessero tutti e sette, partirebbero in parallelo sulla stessa base dati.
 *
 * Due passi:
 *   1. `prisma migrate deploy` — applica le migration mancanti. È
 *      idempotente: su un database già aggiornato non fa nulla.
 *   2. il seed dimostrativo, SOLO se AIOS_SEED_DEMO è impostata. Non è
 *      il comportamento predefinito perché crea utenti con password nota.
 *
 * Nessun percorso viene passato come argomento a una shell (stessa
 * precauzione di scripts/postinstall.js): si usa `cwd`, che è
 * un'opzione strutturata e non viene interpretata da nessuno.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const radice = path.resolve(__dirname, '..');
const pacchettoSchema = path.join(radice, 'packages', 'domain-model');

const log = (m) => console.log(`[release] ${m}`);

function eseguiConNode(binRelativo, argomenti, cwd) {
  let bin = null;
  try {
    const pkg = require.resolve(`${binRelativo}/package.json`, { paths: [radice] });
    const dichiarato = require(pkg).bin;
    const rel = typeof dichiarato === 'string' ? dichiarato : dichiarato && dichiarato[binRelativo];
    if (rel) bin = path.join(path.dirname(pkg), rel);
  } catch {
    /* si prova il percorso classico sotto */
  }
  if (!bin) {
    const diretto = path.join(radice, 'node_modules', binRelativo, 'package.json');
    if (fs.existsSync(diretto)) {
      const dichiarato = JSON.parse(fs.readFileSync(diretto, 'utf8')).bin;
      const rel =
        typeof dichiarato === 'string' ? dichiarato : dichiarato && dichiarato[binRelativo];
      if (rel) bin = path.join(path.dirname(diretto), rel);
    }
  }
  if (bin && fs.existsSync(bin)) {
    return spawnSync(process.execPath, [bin, ...argomenti], { cwd, stdio: 'inherit' });
  }
  // Ripiego: la CLI dal PATH, sempre senza percorsi come argomento.
  return spawnSync(binRelativo, argomenti, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

// ── 1. Migration ─────────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error('[release] DATABASE_URL non impostata: senza, non posso applicare le migration.');
  process.exit(1);
}

log('applico le migration…');
const migrazioni = eseguiConNode('prisma', ['migrate', 'deploy'], pacchettoSchema);
if (migrazioni.error || migrazioni.status !== 0) {
  console.error(
    '\n[release] `prisma migrate deploy` è FALLITO. Il rilascio si ferma qui: far partire i\n' +
      'servizi su uno schema non aggiornato produce errori peggiori e più difficili da leggere\n' +
      '(per esempio "The table identity.users does not exist" al primo login).\n',
  );
  process.exit(migrazioni.status ?? 1);
}
log('migration applicate.');

// ── 2. Seed dimostrativo, solo su richiesta ──────────────────────────
if (!['1', 'true'].includes(process.env.AIOS_SEED_DEMO ?? '')) {
  log('seed dimostrativo non richiesto (AIOS_SEED_DEMO non impostata) — salto.');
  process.exit(0);
}

log('AIOS_SEED_DEMO impostata: popolo gli utenti dimostrativi…');
const seed = eseguiConNode('tsx', [path.join(radice, 'scripts', 'seed-dev-db.ts')], radice);
if (seed.error || seed.status !== 0) {
  // Il seed che fallisce NON deve bloccare il rilascio: le migration sono
  // già applicate e l'applicazione è utilizzabile registrando un utente.
  console.error('[release] Il seed dimostrativo è fallito. Il rilascio prosegue comunque.');
  process.exit(0);
}
log('utenti dimostrativi pronti.');
