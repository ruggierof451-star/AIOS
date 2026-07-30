import { PrismaClient } from '@prisma/client';
import { PrismaOutboxEventPublisher } from '@aios/eventing';
import { PrismaConversationSessionRepository } from './prisma-conversation-session.repository';
import { PrismaLegalDocumentRepository } from './prisma-legal-document.repository';
import { PrismaLegalDocumentAcceptanceRepository } from './prisma-legal-document-acceptance.repository';

/**
 * A differenza di ProvisionNewTenantUseCase (ports.ts,
 * ConversationSessionStore — transazione breve per singolo passo,
 * necessaria per non tenere bloccata una connessione durante chiamate
 * HTTP lente verso altri servizi), qui non c'è alcuna chiamata esterna:
 * leggere le versioni correnti, scrivere N accettazioni, aggiornare la
 * sessione, pubblicare gli eventi sono tutte operazioni locali sullo
 * stesso database — un'unica transazione è quindi corretta e
 * appropriata, coerente con `runOrganizationUnitOfWork` (Organization,
 * Milestone 2).
 *
 * `PrismaConversationSessionRepository` è riusato qui esattamente
 * com'è, costruito con il client transazionale di QUESTA transazione —
 * nessuna duplicazione di logica di persistenza della sessione.
 */
export async function runLegalConsentUnitOfWork<T>(
  prisma: PrismaClient,
  work: (ctx: {
    sessionRepository: PrismaConversationSessionRepository;
    legalDocumentRepository: PrismaLegalDocumentRepository;
    acceptanceRepository: PrismaLegalDocumentAcceptanceRepository;
    eventPublisher: PrismaOutboxEventPublisher;
  }) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const sessionRepository = new PrismaConversationSessionRepository(tx);
    const legalDocumentRepository = new PrismaLegalDocumentRepository(tx);
    const acceptanceRepository = new PrismaLegalDocumentAcceptanceRepository(tx);
    const eventPublisher = new PrismaOutboxEventPublisher(tx);
    return work({ sessionRepository, legalDocumentRepository, acceptanceRepository, eventPublisher });
  });
}
