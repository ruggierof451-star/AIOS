import { ConversationSession } from '../domain/conversation-session.entity';
import { ConversationSteps } from '../domain/conversation-steps';
import { LegalDocumentAcceptance } from '../domain/legal-document-acceptance.entity';
import { REQUIRED_LEGAL_DOCUMENT_TYPES } from '../domain/legal-document-types';
import { ConversationSessionNotFoundError } from './ports';
import {
  LegalDocumentRepository,
  LegalDocumentAcceptanceRepository,
  LegalDocumentVersionMissingError,
  DomainEvent,
} from './legal-consent-ports';

/**
 * Port minimo di lettura/scrittura della sessione necessario a questo
 * caso d'uso — non l'intero ConversationSessionStore (che esiste per
 * l'orchestratore di provisioning e la sua esigenza specifica di
 * transazioni brevi per passo, vedi ports.ts). Qui non serve: non ci
 * sono chiamate HTTP lente tra un salvataggio e l'altro, tutto avviene
 * in un'unica transazione locale (vedi
 * infrastructure/legal-consent-unit-of-work.ts) — la stessa
 * distinzione già motivata nell'Incremento 5/6.
 */
export interface ConversationSessionReadWrite {
  findById(id: string): Promise<ConversationSession | null>;
  save(session: ConversationSession): Promise<void>;
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export interface RecordLegalConsentInput {
  conversationId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RecordLegalConsentOutput {
  acceptedDocuments: Array<{ documentType: string; version: number }>;
}

/**
 * Registra l'accettazione di tutti i documenti legali richiesti
 * (domain/legal-document-types.ts) in un'unica operazione — coerente
 * con la progettazione UX già condivisa: un'unica card con più caselle
 * distinte nella First Conversation, non passi separati per ciascun
 * documento. Segna il passo generico `legal_consent_given` sulla
 * sessione, riusando lo stesso Conversation Step Registry già costruito
 * per il provisioning — nessuna nuova infrastruttura di stato, la
 * stessa già esistente applicata a una nuova attività.
 */
export class RecordLegalConsentUseCase {
  constructor(
    private readonly sessionRepository: ConversationSessionReadWrite,
    private readonly legalDocumentRepository: LegalDocumentRepository,
    private readonly acceptanceRepository: LegalDocumentAcceptanceRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: RecordLegalConsentInput): Promise<RecordLegalConsentOutput> {
    const session = await this.sessionRepository.findById(input.conversationId);
    if (!session) {
      throw new ConversationSessionNotFoundError();
    }

    const accepted: Array<{ documentType: string; version: number }> = [];

    for (const documentType of REQUIRED_LEGAL_DOCUMENT_TYPES) {
      const currentVersion = await this.legalDocumentRepository.getCurrentVersion(documentType);
      if (!currentVersion) {
        // Errore di configurazione (un documento richiesto senza una
        // versione pubblicata) — non un errore dell'utente. Interrompe
        // subito, prima di registrare un'accettazione parziale.
        throw new LegalDocumentVersionMissingError(documentType);
      }

      const acceptance = LegalDocumentAcceptance.create({
        userId: input.userId,
        conversationId: input.conversationId,
        documentType,
        documentVersion: currentVersion.version,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });

      await this.acceptanceRepository.save(acceptance);
      await this.eventPublisher.publish({
        eventType: 'LegalDocumentAccepted',
        aggregateId: acceptance.id,
        payload: {
          schema_version: 1,
          user_id: input.userId,
          conversation_id: input.conversationId,
          document_type: documentType,
          document_version: currentVersion.version,
        },
      });

      accepted.push({ documentType, version: currentVersion.version });
    }

    session.completeStep(ConversationSteps.LEGAL_CONSENT_GIVEN, {
      accepted_documents: accepted,
    });
    await this.sessionRepository.save(session);

    return { acceptedDocuments: accepted };
  }
}
