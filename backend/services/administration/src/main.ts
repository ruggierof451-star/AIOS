import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AdministrationModule } from './administration.module';
import { loadRootEnv } from '@aios/domain-model';

// Deve eseguire prima di qualunque lettura di process.env più sotto in
// questo file (inclusa quella dentro i provider NestJS, valutata quando
// il modulo viene istanziato) — vedi
// packages/domain-model/src/shared/load-env.ts per il motivo per cui
// ogni servizio ora carica l'ambiente in questo modo esplicito.
loadRootEnv();

async function bootstrap() {
  const app = await NestFactory.create(AdministrationModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
  // Ascolto esplicito su 0.0.0.0: in un container (Docker, Railway,
  // Render) l'interfaccia di loopback non è raggiungibile dall'esterno.
  // Node userebbe comunque tutte le interfacce, ma dichiararlo evita che
  // una modifica futura lo restringa senza che nessuno se ne accorga.
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[administration] servizio in ascolto sulla porta ${port}`);
}

bootstrap().catch((err) => {
  console.error('[administration] Errore fatale all\'avvio:', err);
  process.exit(1);
});
