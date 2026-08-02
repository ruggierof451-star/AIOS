/**
 * Controllo statico: ogni file che un'immagine deve eseguire, ci arriva?
 *
 * Nasce da un bug reale: `scripts/release.js` era nel repository e
 * collegato al `preDeployCommand`, ma nessun Dockerfile lo copiava. Il
 * deploy falliva con "Cannot find module '/repo/scripts/release.js'" —
 * un errore che nessuna compilazione, nessun typecheck e nessun test
 * poteva intercettare, perché il file esiste: semplicemente non è dove
 * verrà cercato.
 *
 * Qui si simula il contenuto di ogni immagine leggendo le istruzioni
 * COPY dei suoi stage, e si verifica che tutto ciò che i comandi di
 * railway.json invocano sia davvero presente.
 *
 * Si esegue con: node scripts/verifica-immagini.js
 */

const fs = require('node:fs');
const path = require('node:path');

const radice = path.resolve(__dirname, '..');

const SERVIZI = [
  'backend/gateway',
  'backend/services/identity',
  'backend/services/organization',
  'backend/services/workspace',
  'backend/services/administration',
  'backend/services/onboarding',
  'backend/services/eventing',
  'apps/web',
];

/** Percorsi (relativi alla radice del repo) copiati negli stage che confluiscono nel runtime. */
function contenutoImmagine(dockerfile) {
  const testo = fs.readFileSync(dockerfile, 'utf8');
  const copiati = [];
  let dentroRuntime = false;
  let runtimePrendeTutto = false;

  for (const riga of testo.split('\n')) {
    const t = riga.trim();
    if (/^FROM .* AS runtime\s*$/.test(t)) { dentroRuntime = true; continue; }
    if (/^FROM /.test(t)) { dentroRuntime = false; continue; }
    if (!t.startsWith('COPY ')) continue;

    if (dentroRuntime) {
      // COPY --from=build /repo /repo → il runtime eredita tutto lo stage build
      if (/--from=build\s+\/repo\s+\/repo/.test(t)) runtimePrendeTutto = true;
      continue;
    }
    // Stage base/deps/build: la sorgente è il primo argomento non-opzione
    const parti = t.replace(/^COPY\s+/, '').split(/\s+/).filter((p) => !p.startsWith('--'));
    if (parti.length >= 2) copiati.push(parti[0]);
  }
  return { copiati, runtimePrendeTutto };
}

/** Percorsi di file citati da un comando (assoluti /repo/... o relativi noti). */
function fileCitati(comando) {
  if (!comando) return [];
  return comando
    .split(/\s+/)
    .filter((p) => /^\/repo\/\S+\.(js|ts|mjs|cjs)$/.test(p) || /^[\w./-]+\.(js|mjs|cjs)$/.test(p))
    .map((p) => p.replace(/^\/repo\//, ''));
}

let problemi = 0;
for (const servizio of SERVIZI) {
  const dockerfile = path.join(radice, servizio, 'Dockerfile');
  const configRailway = path.join(radice, servizio, 'railway.json');
  if (!fs.existsSync(dockerfile) || !fs.existsSync(configRailway)) {
    console.error(`  ✗ ${servizio}: manca Dockerfile o railway.json`);
    problemi += 1;
    continue;
  }

  const { copiati, runtimePrendeTutto } = contenutoImmagine(dockerfile);
  const cfg = JSON.parse(fs.readFileSync(configRailway, 'utf8'));

  if (!runtimePrendeTutto) {
    console.error(`  ✗ ${servizio}: il runtime non eredita l'albero completo dallo stage build`);
    problemi += 1;
  }

  // Ogni file citato dai comandi dev'essere coperto da una COPY
  const daVerificare = [
    ...fileCitati(cfg.deploy && cfg.deploy.preDeployCommand).map((f) => ['preDeployCommand', f]),
    ...fileCitati(cfg.deploy && cfg.deploy.startCommand).map((f) => ['startCommand', f]),
  ];

  for (const [origine, file] of daVerificare) {
    // percorso relativo alla cartella di lavoro (es. dist/main.js): prodotto dalla build
    if (!file.startsWith('scripts/') && !file.startsWith('packages/') && !file.startsWith('backend/') && !file.startsWith('apps/')) {
      continue;
    }
    const copertoDaCopy = copiati.some(
      (src) => file === src || file.startsWith(src.replace(/\/$/, '') + '/'),
    );
    const esisteNelRepo = fs.existsSync(path.join(radice, file));
    if (!esisteNelRepo) {
      console.error(`  ✗ ${servizio}: ${origine} cita ${file}, che non esiste nel repository`);
      problemi += 1;
    } else if (!copertoDaCopy) {
      console.error(
        `  ✗ ${servizio}: ${origine} cita ${file}, presente nel repo ma MAI COPIATO nell'immagine`,
      );
      problemi += 1;
    }
  }

  // Gli script invocati a loro volta da release.js
  if ((cfg.deploy && cfg.deploy.preDeployCommand || '').includes('release.js')) {
    const rel = fs.readFileSync(path.join(radice, 'scripts', 'release.js'), 'utf8');
    for (const m of rel.matchAll(/'(scripts)',\s*'([\w.-]+)'/g)) {
      const file = `${m[1]}/${m[2]}`;
      const coperto = copiati.some((src) => file === src || file.startsWith(src.replace(/\/$/, '') + '/'));
      if (!coperto) {
        console.error(`  ✗ ${servizio}: release.js invoca ${file}, mai copiato nell'immagine`);
        problemi += 1;
      }
    }
  }

  if (problemi === 0 || true) {
    const stato = problemi === 0 ? '✓' : ' ';
    console.log(`  ${stato} ${servizio}`);
  }
}

if (problemi > 0) {
  console.error(`\n${problemi} problemi: alcune immagini non contengono ciò che devono eseguire.`);
  process.exit(1);
}
console.log('\nOgni file invocato dai comandi di deploy è presente nella sua immagine.');
