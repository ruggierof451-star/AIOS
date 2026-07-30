import { loadRootEnv } from '@aios/domain-model';
import { PrismaClient } from '@prisma/client';
import { processOutboxBatch } from './outbox-relay.logic';
import {
  PrismaOutboxReader,
  PrismaRetryQueueWriter,
  PrismaDeadLetterWriter,
} from './prisma-relay.repositories';
import { KafkaEventBusProducer } from './kafka-event-bus.producer';
import { avviaHealthServer, segnalaCicloRelay } from './health.server';

// Deve eseguire prima di qualunque uso di PrismaClient/process.env più
// sotto in questo file — vedi packages/domain-model/src/shared/load-env.ts
// per il motivo per cui ogni servizio ora carica l'ambiente in questo modo.
loadRootEnv();

const POLL_INTERVAL_MS = 2000;

/**
 * Loop del relay Outbox → Event Bus. Processo a sé stante (non un
 * endpoint HTTP) — coerente con Infrastructure Modulo 4, sezione 6.3:
 * "un processo di relay separato legge le righe con published_at = null".
 */
async function main() {
  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
  const prisma = new PrismaClient();
  const producer = new KafkaEventBusProducer(brokers);

  const reader = new PrismaOutboxReader(prisma);
  const retryQueueWriter = new PrismaRetryQueueWriter(prisma);
  const deadLetterWriter = new PrismaDeadLetterWriter(prisma);

  // Stato in-memory dei tentativi per questo processo. Nota di scope
  // dichiarata: se il processo viene riavviato, il conteggio dei
  // tentativi riparte da zero per gli eventi ancora in atteso — accettabile
  // per questa milestone (un evento non viene comunque mai perso, solo
  // ritentato più volte del previsto in casi rari di riavvio), ma un
  // miglioramento naturale futuro è persistere il conteggio in
  // RetryQueueEntry stessa invece che solo in memoria.
  const attemptCounts = new Map<string, number>();

  console.log(`[eventing] relay avviato — polling ogni ${POLL_INTERVAL_MS}ms, broker: ${brokers.join(',')}`);

  // Health check HTTP: distingue "processo vivo" da "relay che lavora".
  const health = avviaHealthServer();

  let shuttingDown = false;
  process.on('SIGTERM', () => {
    shuttingDown = true;
    health.close();
  });
  process.on('SIGINT', () => {
    shuttingDown = true;
    health.close();
  });

  while (!shuttingDown) {
    try {
      const result = await processOutboxBatch({
        reader,
        producer,
        retryQueueWriter,
        deadLetterWriter,
        attemptCounts,
      });
      segnalaCicloRelay();

      if (result.published + result.failed + result.deadLettered > 0) {
        console.log(
          `[eventing] batch: pubblicati=${result.published} falliti=${result.failed} dead-letter=${result.deadLettered}`,
        );
      }
    } catch (err) {
      // Un errore nel loop stesso (es. Postgres temporaneamente
      // irraggiungibile) non deve terminare il processo — logga e riprova
      // al prossimo ciclo.
      console.error('[eventing] errore nel ciclo del relay:', err);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  console.log('[eventing] arresto in corso...');
  await producer.disconnect();
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[eventing] Errore fatale all\'avvio del relay:', err);
  process.exit(1);
});
