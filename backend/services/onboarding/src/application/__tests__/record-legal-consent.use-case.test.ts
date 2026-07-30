import { describe, it, expect } from 'vitest';
import { RecordLegalConsentUseCase, ConversationSessionReadWrite, EventPublisher } from '../record-legal-consent.use-case';
import { ConversationSession } from '../../domain/conversation-session.entity';
import { ConversationSteps } from '../../domain/conversation-steps';
import { LegalDocumentAcceptance } from '../../domain/legal-document-acceptance.entity';
import {
  LegalDocumentRepository,
  LegalDocumentAcceptanceRepository,
  LegalDocumentVersionInfo,
  LegalDocumentVersionMissingError,
  DomainEvent,
} from '../legal-consent-ports';
import { ConversationSessionNotFoundError } from '../ports';

class FakeSessionRepository implements ConversationSessionReadWrite {
  public sessions = new Map<string, ConversationSession>();
  async findById(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async save(session: ConversationSession) {
    this.sessions.set(session.id, session);
  }
}

class FakeLegalDocumentRepository implements LegalDocumentRepository {
  constructor(private readonly versions: Map<string, LegalDocumentVersionInfo>) {}
  async getCurrentVersion(documentType: string) {
    return this.versions.get(documentType) ?? null;
  }
  async getAllCurrentVersions() {
    return Array.from(this.versions.values());
  }
}

function buildFullVersionMap(): Map<string, LegalDocumentVersionInfo> {
  const now = new Date();
  return new Map([
    ['TERMS_OF_SERVICE', { documentType: 'TERMS_OF_SERVICE' as const, version: 1, contentUrl: 'https://x/tos', effectiveFrom: now }],
    ['PRIVACY_POLICY', { documentType: 'PRIVACY_POLICY' as const, version: 1, contentUrl: 'https://x/privacy', effectiveFrom: now }],
    ['AI_USAGE_CONSENT', { documentType: 'AI_USAGE_CONSENT' as const, version: 1, contentUrl: 'https://x/ai', effectiveFrom: now }],
    ['DPA', { documentType: 'DPA' as const, version: 1, contentUrl: 'https://x/dpa', effectiveFrom: now }],
  ]);
}

class FakeAcceptanceRepository implements LegalDocumentAcceptanceRepository {
  public saved: LegalDocumentAcceptance[] = [];
  async save(acceptance: LegalDocumentAcceptance) {
    this.saved.push(acceptance);
  }
}

class FakeEventPublisher implements EventPublisher {
  public published: DomainEvent[] = [];
  async publish(event: DomainEvent) {
    this.published.push(event);
  }
}

describe('RecordLegalConsentUseCase', () => {
  it('rifiuta se la sessione non esiste', async () => {
    const useCase = new RecordLegalConsentUseCase(
      new FakeSessionRepository(),
      new FakeLegalDocumentRepository(buildFullVersionMap()),
      new FakeAcceptanceRepository(),
      new FakeEventPublisher(),
    );

    await expect(useCase.execute({ conversationId: 'non-esiste', userId: 'user-1' })).rejects.toThrow(
      ConversationSessionNotFoundError,
    );
  });

  it('registra un\'accettazione per ciascuno dei quattro documenti richiesti', async () => {
    const sessionRepository = new FakeSessionRepository();
    const session = ConversationSession.start({ userId: 'user-1' });
    await sessionRepository.save(session);
    const acceptanceRepository = new FakeAcceptanceRepository();

    const useCase = new RecordLegalConsentUseCase(
      sessionRepository,
      new FakeLegalDocumentRepository(buildFullVersionMap()),
      acceptanceRepository,
      new FakeEventPublisher(),
    );

    const result = await useCase.execute({ conversationId: session.id, userId: 'user-1' });

    expect(result.acceptedDocuments).toHaveLength(4);
    expect(acceptanceRepository.saved).toHaveLength(4);
    expect(acceptanceRepository.saved.every((a) => a.userId === 'user-1')).toBe(true);
  });

  it('segna il passo legal_consent_given sulla sessione', async () => {
    const sessionRepository = new FakeSessionRepository();
    const session = ConversationSession.start({ userId: 'user-1' });
    await sessionRepository.save(session);

    const useCase = new RecordLegalConsentUseCase(
      sessionRepository,
      new FakeLegalDocumentRepository(buildFullVersionMap()),
      new FakeAcceptanceRepository(),
      new FakeEventPublisher(),
    );

    await useCase.execute({ conversationId: session.id, userId: 'user-1' });

    const updated = await sessionRepository.findById(session.id);
    expect(updated?.isStepComplete(ConversationSteps.LEGAL_CONSENT_GIVEN)).toBe(true);
  });

  it('pubblica un evento LegalDocumentAccepted per ciascun documento, con schema_version', async () => {
    const sessionRepository = new FakeSessionRepository();
    const session = ConversationSession.start({ userId: 'user-1' });
    await sessionRepository.save(session);
    const eventPublisher = new FakeEventPublisher();

    const useCase = new RecordLegalConsentUseCase(
      sessionRepository,
      new FakeLegalDocumentRepository(buildFullVersionMap()),
      new FakeAcceptanceRepository(),
      eventPublisher,
    );

    await useCase.execute({ conversationId: session.id, userId: 'user-1' });

    expect(eventPublisher.published).toHaveLength(4);
    expect(eventPublisher.published.every((e) => e.eventType === 'LegalDocumentAccepted')).toBe(true);
    expect(eventPublisher.published.every((e) => e.payload.schema_version === 1)).toBe(true);
  });

  it('rifiuta se manca la versione corrente di un documento richiesto (errore di configurazione)', async () => {
    const sessionRepository = new FakeSessionRepository();
    const session = ConversationSession.start({ userId: 'user-1' });
    await sessionRepository.save(session);

    const incompleteVersions = buildFullVersionMap();
    incompleteVersions.delete('DPA');

    const useCase = new RecordLegalConsentUseCase(
      sessionRepository,
      new FakeLegalDocumentRepository(incompleteVersions),
      new FakeAcceptanceRepository(),
      new FakeEventPublisher(),
    );

    await expect(useCase.execute({ conversationId: session.id, userId: 'user-1' })).rejects.toThrow(
      LegalDocumentVersionMissingError,
    );
  });
});
