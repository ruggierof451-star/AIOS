import { PrismaClientOrTx } from '@aios/eventing';
import { LegalDocumentAcceptance } from '../domain/legal-document-acceptance.entity';
import { LegalDocumentAcceptanceRepository } from '../application/legal-consent-ports';

/**
 * Un solo metodo, `save`, che internamente è sempre un `create` — mai
 * un `upsert` o un `update`. Un'accettazione non si corregge: se serve
 * registrarne una nuova (es. una versione successiva del documento), è
 * una nuova riga, mai una modifica di quella esistente.
 */
export class PrismaLegalDocumentAcceptanceRepository implements LegalDocumentAcceptanceRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async save(acceptance: LegalDocumentAcceptance): Promise<void> {
    const props = acceptance.toPersistence();
    await this.prisma.legalDocumentAcceptance.create({
      data: {
        id: props.id,
        userId: props.userId,
        conversationId: props.conversationId,
        documentType: props.documentType,
        documentVersion: props.documentVersion,
        acceptedAt: props.acceptedAt,
        ipAddress: props.ipAddress,
        userAgent: props.userAgent,
      },
    });
  }
}
