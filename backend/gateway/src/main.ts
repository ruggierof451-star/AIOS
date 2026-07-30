import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { GatewayModule } from './gateway.module';
import { buildRouteTable } from './route-table';
import { loadRootEnv } from '@aios/domain-model';

// Deve eseguire prima di qualunque lettura di process.env più sotto in
// questo file (inclusa quella dentro i provider NestJS, valutata quando
// il modulo viene istanziato) — vedi
// packages/domain-model/src/shared/load-env.ts per il motivo per cui
// ogni servizio ora carica l'ambiente in questo modo esplicito.
loadRootEnv();

/**
 * Origini ammesse per le chiamate dal browser.
 *
 * Perché serve: apps/web parla col Gateway attraverso il proxy di Next,
 * quindi per lui il CORS non esiste. Qualunque ALTRO client browser —
 * un'anteprima statica, una pagina di prova, un futuro dominio separato
 * per il frontend — viene invece bloccato dal browser prima ancora che la
 * richiesta parta, se il Gateway non dichiara le origini permesse.
 *
 * RISCHIO RESIDUO DICHIARATO: senza `AIOS_CORS_ORIGINS` impostata,
 * riflettiamo l'origine della richiesta (equivalente pratico di "tutte").
 * È accettabile in sviluppo perché l'autenticazione è a Bearer token in
 * header — non a cookie — quindi il browser non allega credenziali da
 * solo e una pagina terza non può agire a nome dell'utente senza avere
 * già il token. In produzione la variabile va impostata con l'elenco
 * esplicito dei domini: `AIOS_CORS_ORIGINS=https://app.aios.it`.
 */
function origineAmmessa(): string[] | boolean {
  const configurate = process.env.AIOS_CORS_ORIGINS;
  if (!configurate || configurate.trim().length === 0) return true;
  return configurate
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);

  app.enableCors({
    origin: origineAmmessa(),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id', 'X-Correlation-Id'],
    // Nessun cookie: i token viaggiano in Authorization, quindi non
    // serve (e non vogliamo) `credentials: true` con origine riflessa.
    credentials: false,
    maxAge: 600,
  });

  const expressApp = app.getHttpAdapter().getInstance();

  const routes = buildRouteTable();
  for (const route of routes) {
    expressApp.use(
      route.pathPrefix,
      createProxyMiddleware({
        target: route.target,
        changeOrigin: true,
        // CAUSA DEL BUG (verificata, non ipotizzata): Express rimuove il
        // segmento di mount (`route.pathPrefix`) da `req.url` PRIMA di
        // invocare questo middleware — comportamento documentato di
        // `app.use(mountPath, middleware)`, non un difetto di
        // http-proxy-middleware. Senza questa riga, una richiesta a
        // `/api/v1/auth/register` arriva al servizio a valle come
        // `/register`, che Identity (routing su `@Controller('api/v1/auth')`)
        // non riconosce, restituendo 404. `pathRewrite` ricostruisce il
        // percorso originale completo ri-anteponendo il prefisso tolto.
        pathRewrite: (path) => `${route.pathPrefix}${path}`,
        on: {
          proxyReq: (proxyReq, req) => {
            const correlationId = (req as { headers: Record<string, string> }).headers['x-correlation-id'];
            if (correlationId) proxyReq.setHeader('x-correlation-id', correlationId);
          },
        },
      }),
    );
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  // Ascolto esplicito su 0.0.0.0: in un container (Docker, Railway,
  // Render) l'interfaccia di loopback non è raggiungibile dall'esterno.
  // Node userebbe comunque tutte le interfacce, ma dichiararlo evita che
  // una modifica futura lo restringa senza che nessuno se ne accorga.
  await app.listen(port, '0.0.0.0');
  console.log(`[gateway] in ascolto sulla porta ${port}`);
  console.log('[gateway] routing configurato:', routes.map((r) => `${r.pathPrefix} → ${r.target}`).join(', '));
  const origini = origineAmmessa();
  console.log(
    '[gateway] CORS:',
    origini === true
      ? 'origine riflessa (sviluppo) — imposta AIOS_CORS_ORIGINS in produzione'
      : (origini as string[]).join(', '),
  );
}

bootstrap().catch((err) => {
  console.error('[gateway] Errore fatale all\'avvio:', err);
  process.exit(1);
});
