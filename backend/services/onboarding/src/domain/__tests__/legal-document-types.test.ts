import { describe, it, expect } from 'vitest';
import { LegalDocumentTypes, REQUIRED_LEGAL_DOCUMENT_TYPES } from '../legal-document-types';

describe('LegalDocumentTypes (registro)', () => {
  it('non ha due chiavi con lo stesso valore stringa', () => {
    const values = Object.values(LegalDocumentTypes);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('REQUIRED_LEGAL_DOCUMENT_TYPES non contiene duplicati', () => {
    const unique = new Set(REQUIRED_LEGAL_DOCUMENT_TYPES);
    expect(unique.size).toBe(REQUIRED_LEGAL_DOCUMENT_TYPES.length);
  });

  it('ogni tipo richiesto è una chiave valida del registro', () => {
    const validValues = new Set(Object.values(LegalDocumentTypes));
    for (const type of REQUIRED_LEGAL_DOCUMENT_TYPES) {
      expect(validValues.has(type)).toBe(true);
    }
  });
});
