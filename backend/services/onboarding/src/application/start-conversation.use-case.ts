import { ConversationSession } from '../domain/conversation-session.entity';
import { ConversationSessionStore } from './ports';

export interface StartConversationInput {
  userId: string;
}

export interface StartConversationOutput {
  conversationId: string;
}

export class StartConversationUseCase {
  constructor(private readonly sessionStore: ConversationSessionStore) {}

  async execute(input: StartConversationInput): Promise<StartConversationOutput> {
    const session = ConversationSession.start({ userId: input.userId });

    await this.sessionStore.saveWithEvent(session, {
      eventType: 'ConversationSessionStarted',
      aggregateId: session.id,
      payload: { schema_version: 1, conversation_id: session.id, user_id: session.userId },
    });

    return { conversationId: session.id };
  }
}
