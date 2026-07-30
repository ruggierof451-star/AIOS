import { PrismaClient } from '@prisma/client';
import type { JsonObject } from '@aios/domain-model';
import { OutboxEventRow, OutboxReader, RetryQueueWriter, DeadLetterWriter } from './outbox-relay.logic';

export class PrismaOutboxReader implements OutboxReader {
  constructor(private readonly prisma: PrismaClient) {}

  async findUnpublished(limit: number): Promise<OutboxEventRow[]> {
    const rows = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      aggregateId: r.aggregateId,
      eventType: r.eventType,
      eventVersion: r.eventVersion,
      payload: r.payload as JsonObject,
      organizationId: r.organizationId,
      correlationId: r.correlationId,
      createdAt: r.createdAt,
    }));
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
  }
}

export class PrismaRetryQueueWriter implements RetryQueueWriter {
  constructor(private readonly prisma: PrismaClient) {}

  async recordFailure(params: {
    eventId: string;
    consumerName: string;
    error: string;
    nextRetryAt: Date;
  }): Promise<void> {
    await this.prisma.retryQueueEntry.create({
      data: {
        eventId: params.eventId,
        consumerName: params.consumerName,
        lastError: params.error,
        nextRetryAt: params.nextRetryAt,
      },
    });
  }
}

export class PrismaDeadLetterWriter implements DeadLetterWriter {
  constructor(private readonly prisma: PrismaClient) {}

  async moveToDeadLetter(params: {
    eventId: string;
    consumerName: string;
    eventType: string;
    payload: JsonObject;
    failureReason: string;
    attemptsMade: number;
  }): Promise<void> {
    await this.prisma.deadLetterEntry.create({
      data: {
        eventId: params.eventId,
        consumerName: params.consumerName,
        eventType: params.eventType,
        payload: params.payload,
        failureReason: params.failureReason,
        attemptsMade: params.attemptsMade,
      },
    });
  }
}
