import { PrismaClientOrTx } from '@aios/eventing';
import { LegalDocumentType } from '../domain/legal-document-types';
import { LegalDocumentRepository, LegalDocumentVersionInfo } from '../application/legal-consent-ports';
import { REQUIRED_LEGAL_DOCUMENT_TYPES } from '../domain/legal-document-types';

export class PrismaLegalDocumentRepository implements LegalDocumentRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async getCurrentVersion(documentType: LegalDocumentType): Promise<LegalDocumentVersionInfo | null> {
    const record = await this.prisma.legalDocumentVersion.findFirst({
      where: { documentType, isCurrent: true },
    });
    if (!record) return null;
    return {
      documentType: record.documentType as LegalDocumentType,
      version: record.version,
      contentUrl: record.contentUrl,
      effectiveFrom: record.effectiveFrom,
    };
  }

  async getAllCurrentVersions(): Promise<LegalDocumentVersionInfo[]> {
    const results: LegalDocumentVersionInfo[] = [];
    for (const documentType of REQUIRED_LEGAL_DOCUMENT_TYPES) {
      const version = await this.getCurrentVersion(documentType);
      if (version) results.push(version);
    }
    return results;
  }
}
