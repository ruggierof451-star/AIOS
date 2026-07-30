import { describe, it, expect } from 'vitest';
import { generateUuidV7, isValidUuid } from '../uuid';

describe('generateUuidV7', () => {
  it('genera un UUID nel formato standard con trattini', () => {
    const id = generateUuidV7();
    expect(isValidUuid(id)).toBe(true);
  });

  it('imposta correttamente il nibble di versione a 7', () => {
    const id = generateUuidV7();
    const versionNibble = id.split('-')[2][0];
    expect(versionNibble).toBe('7');
  });

  it('imposta correttamente la variante RFC 4122 (10xx)', () => {
    const id = generateUuidV7();
    const variantNibble = id.split('-')[3][0];
    expect(['8', '9', 'a', 'b']).toContain(variantNibble.toLowerCase());
  });

  it('genera identificatori unici su generazioni multiple', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateUuidV7()));
    expect(ids.size).toBe(1000);
  });

  it('genera identificatori ordinabili lessicograficamente nel tempo', () => {
    const first = generateUuidV7();
    // Piccola attesa per garantire un timestamp diverso in millisecondi
    const later = generateUuidV7();
    // Il componente temporale è nei primi 12 caratteri hex (prime due sezioni):
    // un id generato dopo deve essere >= lessicograficamente sulla parte
    // temporale (non garantito byte-per-byte se generati nello stesso ms,
    // ma non deve mai essere strettamente minore).
    const firstTime = first.split('-').slice(0, 2).join('');
    const laterTime = later.split('-').slice(0, 2).join('');
    expect(laterTime >= firstTime).toBe(true);
  });
});

describe('isValidUuid', () => {
  it('accetta un UUID ben formato', () => {
    expect(isValidUuid('018f1e2a-7b3c-7def-8abc-123456789abc')).toBe(true);
  });

  it('rifiuta una stringa senza trattini', () => {
    expect(isValidUuid('018f1e2a7b3c7def8abc123456789abc')).toBe(false);
  });

  it('rifiuta una stringa vuota', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('rifiuta un UUID con segmenti di lunghezza errata', () => {
    expect(isValidUuid('018f1e2a-7b3c-7def-8abc-123')).toBe(false);
  });
});
