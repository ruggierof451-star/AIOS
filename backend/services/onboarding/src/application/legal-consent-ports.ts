import type { DomainEvent } from '@aios/eventing';
import { LegalDocumentType } from '../domain/legal-document-types';
import { LegalDocumentAcceptance } from '../domain/legal-document-acceptance.entity';

export type { DomainEvent };

export interface LegalDocumentVersionInfo {
  documentType: LegalDocumentType;
  version: number;
  contentUrl: string;
  effectiveFrom: Date;
}

export interface LegalDocumentRepository {
  getCurrentVersion(documentType: LegalDocumentType): Promise<LegalDocumentVersionInfo | null>;
  getAllCurrentVersions(): Promise<LegalDocumentVersionInfo[]>;
}

export interface LegalDocumentAcceptanceRepository {
  save(acceptance: LegalDocumentAcceptance): Promise<void>;
}

export class LegalDocumentVersionMissingError extends Error {
  constructor(documentType: LegalDocumentType) {
    super(
      `Nessuna versione corrente pubblicata per il documento '${documentType}' — errore di configurazione, non un problema dell'utente.`,
    );
    this.name = 'LegalDocumentVersionMissingError';
  }
}
