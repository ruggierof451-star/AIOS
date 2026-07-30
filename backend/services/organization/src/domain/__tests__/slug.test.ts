import { describe, it, expect } from 'vitest';
import { normalizeSlug } from '../slug';

describe('normalizeSlug', () => {
  it('converte in minuscolo', () => {
    expect(normalizeSlug('Rossi Srl')).toBe('rossi-srl');
  });

  it('rimuove gli accenti', () => {
    expect(normalizeSlug('Caffè Perù')).toBe('caffe-peru');
  });

  it('sostituisce sequenze non alfanumeriche con un singolo trattino', () => {
    expect(normalizeSlug('Rossi & Bianchi   S.r.l.')).toBe('rossi-bianchi-s-r-l');
  });

  it('rimuove i trattini iniziali e finali', () => {
    expect(normalizeSlug('  -Rossi Srl!!-  ')).toBe('rossi-srl');
  });

  it('tronca a una lunghezza massima ragionevole', () => {
    const longName = 'a'.repeat(200);
    const result = normalizeSlug(longName);
    expect(result.length).toBeLessThanOrEqual(80);
  });

  it('restituisce una stringa vuota per un input privo di caratteri alfanumerici', () => {
    expect(normalizeSlug('!!!')).toBe('');
  });
});
