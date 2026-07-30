import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  processOutboxBatch,
  computeBackoffMs,
  OutboxEventRow,
  OutboxReader,
  EventBusProducer,
  RetryQueueWriter,
  DeadLetterWriter,
} from '../outbox-relay.logic';

function buildRow(overrides: Partial<OutboxEventRow> = {}): OutboxEventRow {
  return {
    id: 'evt-1',
    aggregateId: 'agg-1',
    eventType: 'OrganizationCreated',
    eventVersion: 1,
    payload: { organization_id: 'agg-1' },
    organizationId: 'agg-1',
    correlationId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

class FakeOutboxReader implements OutboxReader {
  public marked: string[] = [];
  constructor(private rows: OutboxEventRow[]) {}
  async findUnpublished(): Promise<OutboxEventRow[]> {
    return this.rows;
  }
  async markPublished(id: string): Promise<void> {
    this.marked.push(id);
    this.rows = this.rows.filter((r) => r.id !== id);
  }
}

class FakeRetryQueueWriter implements RetryQueueWriter {
  public entries: Array<{ eventId: string; consumerName: string; error: string; nextRetryAt: Date }> = [];
  async recordFailure(params: { eventId: string; consumerName: string; error: string; nextRetryAt: Date }) {
    this.entries.push(params);
  }
}

class FakeDeadLetterWriter implements DeadLetterWriter {
  public entries: Array<{ eventId: string; consumerName: string; eventType: string; payload: Record<string, unknown>; failureReason: string; attemptsMade: number }> = [];
  async moveToDeadLetter(params: {
    eventId: string;
    consumerName: string;
    eventType: string;
    payload: Record<string, unknown>;
    failureReason: string;
    attemptsMade: number;
  }) {
    this.entries.push(params);
  }
}

describe('computeBackoffMs', () => {
  it('raddoppia il ritardo ad ogni tentativo (1s, 2s, 4s, 8s, 16s)', () => {
    expect(computeBackoffMs(1)).toBe(1000);
    expect(computeBackoffMs(2)).toBe(2000);
    expect(computeBackoffMs(3)).toBe(4000);
    expect(computeBackoffMs(4)).toBe(8000);
    expect(computeBackoffMs(5)).toBe(16000);
  });
});

describe('processOutboxBatch', () => {
  let deadLetterWriter: FakeDeadLetterWriter;
  let retryQueueWriter: FakeRetryQueueWriter;
  let attemptCounts: Map<string, number>;

  beforeEach(() => {
    deadLetterWriter = new FakeDeadLetterWriter();
    retryQueueWriter = new FakeRetryQueueWriter();
    attemptCounts = new Map();
  });

  it('pubblica con successo un evento e lo marca come pubblicato', async () => {
    const reader = new FakeOutboxReader([buildRow()]);
    const producer: EventBusProducer = { send: vi.fn().mockResolvedValue(undefined) };

    const result = await processOutboxBatch({
      reader,
      producer,
      retryQueueWriter,
      deadLetterWriter,
      attemptCounts,
    });

    expect(result.published).toBe(1);
    expect(reader.marked).toEqual(['evt-1']);
  });

  it('invia sul topic derivato dal tipo di evento', async () => {
    const reader = new FakeOutboxReader([buildRow({ eventType: 'InvoiceIssued' })]);
    const sendSpy = vi.fn().mockResolvedValue(undefined);
    const producer: EventBusProducer = { send: sendSpy };

    await processOutboxBatch({ reader, producer, retryQueueWriter, deadLetterWriter, attemptCounts });

    expect(sendSpy).toHaveBeenCalledWith('aios.events.InvoiceIssued', expect.anything());
  });

  it('registra un fallimento nella retry queue sotto la soglia massima di tentativi', async () => {
    const reader = new FakeOutboxReader([buildRow()]);
    const producer: EventBusProducer = { send: vi.fn().mockRejectedValue(new Error('broker offline')) };

    const result = await processOutboxBatch({ reader, producer, retryQueueWriter, deadLetterWriter, attemptCounts });

    expect(result.failed).toBe(1);
    expect(retryQueueWriter.entries).toHaveLength(1);
    expect(retryQueueWriter.entries[0].error).toBe('broker offline');
    expect(deadLetterWriter.entries).toHaveLength(0);
  });

  it('sposta in dead letter dopo aver raggiunto il numero massimo di tentativi', async () => {
    const reader = new FakeOutboxReader([buildRow()]);
    const producer: EventBusProducer = { send: vi.fn().mockRejectedValue(new Error('errore persistente')) };

    // Simula 4 fallimenti precedenti già registrati (il quinto tentativo
    // in questa chiamata deve far scattare la dead letter, MAX_ATTEMPTS = 5).
    attemptCounts.set('evt-1', 4);

    const result = await processOutboxBatch({ reader, producer, retryQueueWriter, deadLetterWriter, attemptCounts });

    expect(result.deadLettered).toBe(1);
    expect(deadLetterWriter.entries).toHaveLength(1);
    expect(deadLetterWriter.entries[0].attemptsMade).toBe(5);
    expect(attemptCounts.has('evt-1')).toBe(false); // ripulito dopo la dead letter
  });

  it('elabora più eventi indipendentemente (uno fallisce, l\'altro riesce)', async () => {
    const reader = new FakeOutboxReader([
      buildRow({ id: 'evt-ok' }),
      buildRow({ id: 'evt-ko' }),
    ]);
    const producer: EventBusProducer = {
      send: vi.fn().mockImplementation(async (_topic, event: OutboxEventRow) => {
        if (event.id === 'evt-ko') throw new Error('fallito apposta');
      }),
    };

    const result = await processOutboxBatch({ reader, producer, retryQueueWriter, deadLetterWriter, attemptCounts });

    expect(result.published).toBe(1);
    expect(result.failed).toBe(1);
    expect(reader.marked).toEqual(['evt-ok']);
  });
});
