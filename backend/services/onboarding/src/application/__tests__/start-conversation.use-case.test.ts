import { describe, it, expect } from 'vitest';
import { StartConversationUseCase } from '../start-conversation.use-case';
import { ConversationSession } from '../../domain/conversation-session.entity';
import { ConversationSessionStore, DomainEvent } from '../ports';

class FakeConversationSessionStore implements ConversationSessionStore {
  public sessions = new Map<string, ConversationSession>();
  public savedEvents: DomainEvent[] = [];

  async findById(id: string): Promise<ConversationSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async saveWithEvent(session: ConversationSession, event: DomainEvent): Promise<void> {
    this.sessions.set(session.id, session);
    this.savedEvents.push(event);
  }
}

describe('StartConversationUseCase', () => {
  it('crea una nuova sessione IN_PROGRESS e la salva', async () => {
    const store = new FakeConversationSessionStore();
    const useCase = new StartConversationUseCase(store);

    const result = await useCase.execute({ userId: 'user-1' });

    const saved = await store.findById(result.conversationId);
    expect(saved).not.toBeNull();
    expect(saved?.userId).toBe('user-1');
    expect(saved?.status).toBe('IN_PROGRESS');
  });

  it('pubblica ConversationSessionStarted con schema_version', async () => {
    const store = new FakeConversationSessionStore();
    const useCase = new StartConversationUseCase(store);

    const result = await useCase.execute({ userId: 'user-1' });

    expect(store.savedEvents).toHaveLength(1);
    expect(store.savedEvents[0]?.eventType).toBe('ConversationSessionStarted');
    expect(store.savedEvents[0]?.aggregateId).toBe(result.conversationId);
    expect(store.savedEvents[0]?.payload.schema_version).toBe(1);
  });
});
