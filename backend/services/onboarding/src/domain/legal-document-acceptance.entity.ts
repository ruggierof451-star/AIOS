/**
 * LegalDocumentAcceptance — un'accettazione è un fatto immutabile: nasce
 * una sola volta, non viene mai modificata né cancellata. Nessun metodo
 * di mutazione su questa classe — solo costruzione e lettura, coerente
 * con "nulla si cancella per davvero senza un motivo esplicito e un
 * log" (Domain Model, Modulo 1, principio 5) applicato qui nella sua
 * forma più stretta: qui non si cancella mai, nemmeno con un log.
 */

import { generateUuidV7 } from '@aios/domain-model';
import { LegalDocumentType } from './legal-document-types';

export interface LegalDocumentAcceptanceProps {
  id: string;
  userId: string;
  conversationId: string;
  documentType: LegalDocumentType;
  documentVersion: number;
  acceptedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export class LegalDocumentAcceptance {
  private constructor(private readonly props: LegalDocumentAcceptanceProps) {}

  static create(params: {
    userId: string;
    conversationId: string;
    documentType: LegalDocumentType;
    documentVersion: number;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): LegalDocumentAcceptance {
    return new LegalDocumentAcceptance({
      id: generateUuidV7(),
      userId: params.userId,
      conversationId: params.conversationId,
      documentType: params.documentType,
      documentVersion: params.documentVersion,
      acceptedAt: new Date(),
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  }

  static reconstitute(props: LegalDocumentAcceptanceProps): LegalDocumentAcceptance {
    return new LegalDocumentAcceptance(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get conversationId(): string {
    return this.props.conversationId;
  }

  get documentType(): LegalDocumentType {
    return this.props.documentType;
  }

  get documentVersion(): number {
    return this.props.documentVersion;
  }

  get acceptedAt(): Date {
    return this.props.acceptedAt;
  }

  get ipAddress(): string | null {
    return this.props.ipAddress;
  }

  get userAgent(): string | null {
    return this.props.userAgent;
  }

  toPersistence(): LegalDocumentAcceptanceProps {
    return { ...this.props };
  }
}
