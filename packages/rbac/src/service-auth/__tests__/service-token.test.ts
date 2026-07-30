import { describe, it, expect } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { ServiceTokenIssuer, ServiceTokenVerifier, InvalidServiceTokenError } from '../service-token';

const SECRET = 'test-service-secret-non-usare-in-produzione';

describe('ServiceTokenIssuer + ServiceTokenVerifier', () => {
  it('firma un token verificabile con lo stesso secret', () => {
    const issuer = new ServiceTokenIssuer(SECRET);
    const verifier = new ServiceTokenVerifier(SECRET);

    const token = issuer.sign('organization-service');
    const claims = verifier.verify(token);

    expect(claims.service).toBe('organization-service');
  });

  it('rifiuta un token firmato con un secret diverso', () => {
    const token = jwt.sign({ service: 'organization-service' }, 'secret-sbagliato');
    const verifier = new ServiceTokenVerifier(SECRET);
    expect(() => verifier.verify(token)).toThrow(InvalidServiceTokenError);
  });

  it('rifiuta un token scaduto', () => {
    const token = jwt.sign({ service: 'organization-service' }, SECRET, { expiresIn: -10 });
    const verifier = new ServiceTokenVerifier(SECRET);
    expect(() => verifier.verify(token)).toThrow(InvalidServiceTokenError);
  });

  it('rifiuta un token privo del claim service', () => {
    const token = jwt.sign({ sub: 'qualcos-altro' }, SECRET);
    const verifier = new ServiceTokenVerifier(SECRET);
    expect(() => verifier.verify(token)).toThrow(InvalidServiceTokenError);
  });

  it('rifiuta una stringa non JWT', () => {
    const verifier = new ServiceTokenVerifier(SECRET);
    expect(() => verifier.verify('non-un-token-valido')).toThrow(InvalidServiceTokenError);
  });
});
