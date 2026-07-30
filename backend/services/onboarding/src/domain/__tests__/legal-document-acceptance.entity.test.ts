import { describe, it, expect } from 'vitest';
import { LegalDocumentAcceptance } from '../legal-document-acceptance.entity';
import { LegalDocumentTypes } from '../legal-document-types';

describe('LegalDocumentAcceptance', () => {
  it('crea un\'accettazione con i campi attesi', () => {
    const acceptance = LegalDocumentAcceptance.create({
      userId: 'user-1',
      conversationId: 'conv-1',
      documentType: LegalDocumentTypes.PRIVACY_POLICY,
      documentVersion: 1,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(acceptance.userId).toBe('user-1');
    expect(acceptance.conversationId).toBe('conv-1');
    expect(acceptance.documentType).toBe('PRIVACY_POLICY');
    expect(acceptance.documentVersion).toBe(1);
    expect(acceptance.ipAddress).toBe('127.0.0.1');
    expect(acceptance.userAgent).toBe('test-agent');
    expect(acceptance.acceptedAt).toBeDefined();
  });

  it('ipAddress e userAgent sono opzionali (null se non forniti)', () => {
    const acceptance = LegalDocumentAcceptance.create({
      userId: 'user-1',
      conversationId: 'conv-1',
      documentType: LegalDocumentTypes.TERMS_OF_SERVICE,
      documentVersion: 1,
    });

    expect(acceptance.ipAddress).toBeNull();
    expect(acceptance.userAgent).toBeNull();
  });

  it('ricostruisce correttamente da dati persistiti', () => {
    const original = LegalDocumentAcceptance.create({
      userId: 'user-1',
      conversationId: 'conv-1',
      documentType: LegalDocumentTypes.DPA,
      documentVersion: 2,
    });

    const reconstituted = LegalDocumentAcceptance.reconstitute(original.toPersistence());

    expect(reconstituted.id).toBe(original.id);
    expect(reconstituted.documentType).toBe(original.documentType);
    expect(reconstituted.documentVersion).toBe(original.documentVersion);
  });
});
