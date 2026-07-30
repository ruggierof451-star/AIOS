import { createServer, type Server } from 'node:http';

/**
 * Health check del worker Eventing.
 *
 * Questo servizio non è un'API: è un relay che legge l'outbox e pubblica
 * gli eventi. Non avendo endpoint HTTP, su una piattaforma di deploy
 * risulterebbe "vivo" solo perché il processo non è morto — che non è la
 * stessa cosa di "sta lavorando".
 *
 * Questo server minimo (modulo `http` nativo, nessuna dipendenza)
 * risponde 200 finché il relay ha completato un ciclo di recente, e 503
 * quando è fermo da troppo tempo: così un health check dice qualcosa di
 * vero invece di essere un timbro.
 */

const TOLLERANZA_MS = 60_000;

let ultimoCiclo = Date.now();

/** Da chiamare a ogni ciclo riuscito del relay. */
export function segnalaCicloRelay(): void {
  ultimoCiclo = Date.now();
}

export function avviaHealthServer(porta = Number(process.env.PORT ?? 3006)): Server {
  const server = createServer((req, res) => {
    if (req.url !== '/health') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }
    const fermoDa = Date.now() - ultimoCiclo;
    const inSalute = fermoDa < TOLLERANZA_MS;
    res.writeHead(inSalute ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: inSalute ? 'ok' : 'stale',
        service: 'eventing',
        ultimo_ciclo_ms_fa: fermoDa,
        timestamp: new Date().toISOString(),
      }),
    );
  });
  server.listen(porta, '0.0.0.0');
  return server;
}
