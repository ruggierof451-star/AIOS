import { PrismaClient } from '@prisma/client';
import { PrismaOutboxEventPublisher } from '@aios/eventing';
import { ConversationSession } from '../domain/conversation-session.entity';
import { ConversationSessionStore, DomainEvent } from '../application/ports';
import { PrismaConversationSessionRepository } from './prisma-conversation-session.repository';

/**
 * Implementazione di ConversationSessionStore — vedi ports.ts per il
 * motivo per cui `saveWithEvent` apre una transazione breve e
 * indipendente ad ogni chiamata, invece di una transazione unica per
 * l'intera orchestrazione (che terrebbe una connessione Postgres
 * bloccata per tutta la durata di chiamate HTTP potenzialmente lente).
 */
export class PrismaConversationSessionStore implements ConversationSessionStore {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ConversationSession | null> {
    const repository = new PrismaConversationSessionRepository(this.prisma);
    return repository.findById(id);
  }

  async saveWithEvent(session: ConversationSession, event: DomainEvent): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const repository = new PrismaConversationSessionRepository(tx);
      const publisher = new PrismaOutboxEventPublisher(tx);
      await repository.save(session);
      await publisher.publish(event);
    });
  }
}
