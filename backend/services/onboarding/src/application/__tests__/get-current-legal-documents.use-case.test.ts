import { describe, it, expect } from 'vitest';
import { GetCurrentLegalDocumentsUseCase } from '../get-current-legal-documents.use-case';
import { LegalDocumentRepository, LegalDocumentVersionInfo } from '../legal-consent-ports';

class FakeLegalDocumentRepository implements LegalDocumentRepository {
  constructor(private readonly versions: LegalDocumentVersionInfo[]) {}
  async getCurrentVersion(documentType: string) {
    return this.versions.find((v) => v.documentType === documentType) ?? null;
  }
  async getAllCurrentVersions() {
    return this.versions;
  }
}

describe('GetCurrentLegalDocumentsUseCase', () => {
  it('restituisce tutte le versioni correnti dal repository', async () => {
    const versions: LegalDocumentVersionInfo[] = [
      { documentType: 'TERMS_OF_SERVICE', version: 1, contentUrl: 'https://x/tos', effectiveFrom: new Date() },
      { documentType: 'PRIVACY_POLICY', version: 2, contentUrl: 'https://x/privacy', effectiveFrom: new Date() },
    ];
    const useCase = new GetCurrentLegalDocumentsUseCase(new FakeLegalDocumentRepository(versions));

    const result = await useCase.execute();

    expect(result).toEqual(versions);
  });
});
