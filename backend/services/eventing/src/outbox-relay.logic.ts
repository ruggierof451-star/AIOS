/**
 * Logica del relay Outbox → Event Bus (Physical Database Schema, sezione
 * 5.1; Infrastructure Modulo 4, sezione 6.3). Separata dal loop
 * infinito/Kafka reale (relay.worker.ts) per essere testabile con fake
 * in-memory, coerente con "ogni funzionalità implementata deve includere
 * unit test" anche per un worker infrastrutturale.
 */

import type { JsonObject } from '@aios/domain-model';

export interface OutboxEventRow {
  id: string;
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  payload: JsonObject;
  organizationId: string | null;
  correlationId: string | null;
  createdAt: Date;
}

export interface OutboxReader {
  findUnpublished(limit: number): Promise<OutboxEventRow[]>;
  markPublished(id: string): Promise<void>;
}

export interface EventBusProducer {
  send(topic: string, event: OutboxEventRow): Promise<void>;
}

export interface RetryQueueWriter {
  recordFailure(params: {
    eventId: string;
    consumerName: string;
    error: string;
    nextRetryAt: Date;
  }): Promise<void>;
}

export interface DeadLetterWriter {
  moveToDeadLetter(params: {
    eventId: string;
    consumerName: string;
    eventType: string;
    payload: JsonObject;
    failureReason: string;
    attemptsMade: number;
  }): Promise<void>;
}

const CONSUMER_NAME = 'outbox-relay';
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000;

/** Backoff esponenziale: 1s, 2s, 4s, 8s, 16s (API Contract, sezione 5.2). */
export function computeBackoffMs(attempt: number): number {
  return BASE_BACKOFF_MS * 2 ** (attempt - 1);
}

/**
 * Elabora un singolo batch di eventi non pubblicati. Ogni evento che
 * fallisce viene ritentato fino a MAX_ATTEMPTS volte (tracciato tramite
 * `attemptCounts`, passato dal chiamante per persistere lo stato tra le
 * chiamate); oltre la soglia, finisce nella Dead Letter Queue — mai un
 * evento perso silenziosamente.
 */
export async function processOutboxBatch(params: {
  reader: OutboxReader;
  producer: EventBusProducer;
  retryQueueWriter: RetryQueueWriter;
  deadLetterWriter: DeadLetterWriter;
  attemptCounts: Map<string, number>;
  topicResolver?: (eventType: string) => string;
  batchSize?: number;
}): Promise<{ published: number; failed: number; deadLettered: number }> {
  const {
    reader,
    producer,
    retryQueueWriter,
    deadLetterWriter,
    attemptCounts,
    topicResolver = (eventType) => `aios.events.${eventType}`,
    batchSize = 100,
  } = params;

  const rows = await reader.findUnpublished(batchSize);
  let published = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const row of rows) {
    const topic = topicResolver(row.eventType);
    const currentAttempt = (attemptCounts.get(row.id) ?? 0) + 1;

    try {
      await producer.send(topic, row);
      await reader.markPublished(row.id);
      attemptCounts.delete(row.id);
      published++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      attemptCounts.set(row.id, currentAttempt);

      if (currentAttempt >= MAX_ATTEMPTS) {
        await deadLetterWriter.moveToDeadLetter({
          eventId: row.id,
          consumerName: CONSUMER_NAME,
          eventType: row.eventType,
          payload: row.payload,
          failureReason: errorMessage,
          attemptsMade: currentAttempt,
        });
        attemptCounts.delete(row.id);
        deadLettered++;
      } else {
        await retryQueueWriter.recordFailure({
          eventId: row.id,
          consumerName: CONSUMER_NAME,
          error: errorMessage,
          nextRetryAt: new Date(Date.now() + computeBackoffMs(currentAttempt)),
        });
        failed++;
      }
    }
  }

  return { published, failed, deadLettered };
}
