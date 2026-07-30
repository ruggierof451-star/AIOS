/**
 * Attende che Postgres accetti connessioni TCP prima di proseguire.
 *
 * Perché serve: `docker compose up -d --build` restituisce il controllo
 * alla shell non appena i container sono AVVIATI, non quando sono
 * REALMENTE pronti. In un ambiente pulito, con volumi appena creati,
 * Postgres può impiegare qualche secondo in più a essere pronto — senza
 * questa attesa, `pnpm db:migrate` o `pnpm dev` potrebbero partire un
 * istante troppo presto e fallire con un errore di connessione, in modo
 * intermittente e difficile da riprodurre.
 *
 * Implementazione volutamente minima: solo il modulo `net` nativo di
 * Node, nessuna nuova dipendenza.
 */

const net = require('node:net');

const HOST = process.env.WAIT_FOR_POSTGRES_HOST || 'localhost';
const PORT = parseInt(process.env.WAIT_FOR_POSTGRES_PORT || '5432', 10);
const TIMEOUT_MS = 30000;
const RETRY_DELAY_MS = 1000;

function tryConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: HOST, port: PORT });
    socket.setTimeout(2000);

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const start = Date.now();
  process.stdout.write(`[wait-for-postgres] Attendo ${HOST}:${PORT}...\n`);

  while (Date.now() - start < TIMEOUT_MS) {
    const ok = await tryConnect();
    if (ok) {
      process.stdout.write('[wait-for-postgres] Postgres pronto.\n');
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }

  process.stderr.write(
    `[wait-for-postgres] Postgres non raggiungibile su ${HOST}:${PORT} dopo ${TIMEOUT_MS / 1000}s.\n` +
      `Verifica che 'docker compose up -d --build' sia stato eseguito e che il container aios-postgres sia in stato Up.\n`,
  );
  process.exit(1);
}

main();
