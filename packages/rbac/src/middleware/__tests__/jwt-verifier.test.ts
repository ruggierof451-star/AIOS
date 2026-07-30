import { describe, it, expect } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { JwtVerifier, InvalidAccessTokenError } from '../jwt-verifier';

const SECRET = 'test-secret-non-usare-in-produzione';

describe('JwtVerifier', () => {
  it('verifica correttamente un token firmato con lo stesso secret', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'mario@azienda.it' }, SECRET, {
      expiresIn: '15m',
    });
    const verifier = new JwtVerifier(SECRET);
    const claims = verifier.verify(token);
    expect(claims.sub).toBe('user-1');
    expect(claims.email).toBe('mario@azienda.it');
  });

  it('rifiuta un token firmato con un secret diverso', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'mario@azienda.it' }, 'secret-sbagliato');
    const verifier = new JwtVerifier(SECRET);
    expect(() => verifier.verify(token)).toThrow(InvalidAccessTokenError);
  });

  it('rifiuta un token scaduto', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'mario@azienda.it' }, SECRET, {
      expiresIn: -10, // già scaduto 10 secondi fa
    });
    const verifier = new JwtVerifier(SECRET);
    expect(() => verifier.verify(token)).toThrow(InvalidAccessTokenError);
  });

  it('rifiuta una stringa non JWT', () => {
    const verifier = new JwtVerifier(SECRET);
    expect(() => verifier.verify('non-un-token-valido')).toThrow(InvalidAccessTokenError);
  });
});
