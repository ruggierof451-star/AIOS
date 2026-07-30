import { PrismaClient, Prisma } from '@prisma/client';
import type { JsonObject } from '@aios/domain-model';

/**
 * Accetta sia il client Prisma "normale" sia un client transazionale —
 * necessario per l'atomicità del pattern Transactional Outbox (Physical
 * Database Schema, sezione 5.1). Ogni servizio usa lo stesso schema
 * Prisma (packages/domain-model), quindi questo tipo e questa
 * implementazione sono validi per qualunque Bounded Context, non solo
 * per quello che li ha scritti per primo.
 */
export type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

/**
 * Forma unica e condivisa di un evento di dominio — prima era una forma
 * anonima ripetuta identica (ma non collegata) in questo file e in
 * Organization/Workspace/Onboarding, ciascuno con la propria
 * ridichiarazione. Un tipo nominato esportato da qui è l'unica fonte di
 * verità: ogni bounded context lo importa, nessuno lo ridichiara.
 *
 * `payload` deve sempre includere `schema_version` (convenzione
 * definitiva sulla nomenclatura degli eventi, Feature 2.1) — non
 * imposto qui a livello di tipo (payload resta un JsonObject generico,
 * per non introdurre un vincolo strutturale che ogni evento dovrebbe
 * rispettare in modo identico) ma è responsabilità di ogni publisher
 * applicativo includerlo.
 */
export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  organizationId?: string | null;
  correlationId?: string | null;
  payload: JsonObject;
}

export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

/**
 * Scrive l'evento nella tabella outbox (schema `eventing`, Physical
 * Database Schema sezione 5.1). L'istanza passata al costruttore DEVE
 * essere lo stesso client transazionale usato per salvare l'Aggregate
 * Root nello stesso caso d'uso — vedi il rispettivo unit-of-work.ts di
 * ogni servizio, che costruisce repository e publisher insieme dentro
 * la stessa `$transaction`.
 */
export class PrismaOutboxEventPublisher implements DomainEventPublisher {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        organizationId: event.organizationId ?? null,
        correlationId: event.correlationId ?? null,
        payload: event.payload,
      },
    });
  }
}
