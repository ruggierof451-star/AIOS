import { describe, it, expect } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../auth.middleware';
import { InvalidAccessTokenError, VerifiedAccessTokenClaims } from '../jwt-verifier';
import { GrantsResolver } from '../grants-resolver';
import { JwtVerifier } from '../jwt-verifier';
import type { AuthenticatedRequestUser } from '../../permission.guard';

class FakeJwtVerifier {
  constructor(private readonly behavior: (token: string) => VerifiedAccessTokenClaims) {}
  verify(token: string): VerifiedAccessTokenClaims {
    return this.behavior(token);
  }
}

class FakeGrantsResolver implements GrantsResolver {
  public calls: Array<{ userId: string; organizationId: string }> = [];
  async resolve(userId: string, organizationId: string) {
    this.calls.push({ userId, organizationId });
    return [{ action: 'organization.update' }];
  }
}

function buildReqResNext(headers: Record<string, string | undefined>) {
  const req = { headers } as unknown as Request & { user?: unknown };
  const res = {} as Response;
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };
  return { req, res, next, wasNextCalled: () => nextCalled };
}

describe('AuthMiddleware', () => {
  it('rifiuta con 401 se l\'header Authorization è assente', async () => {
    const verifier = new FakeJwtVerifier(() => ({ sub: 'user-1', email: 'a@b.it' }));
    const middleware = new AuthMiddleware(verifier as unknown as JwtVerifier, new FakeGrantsResolver());
    const { req, res, next } = buildReqResNext({});

    await expect(middleware.use(req, res, next)).rejects.toThrow(UnauthorizedException);
  });

  it('rifiuta con 401 se l\'header non inizia con "Bearer "', async () => {
    const verifier = new FakeJwtVerifier(() => ({ sub: 'user-1', email: 'a@b.it' }));
    const middleware = new AuthMiddleware(verifier as unknown as JwtVerifier, new FakeGrantsResolver());
    const { req, res, next } = buildReqResNext({ authorization: 'Token abc123' });

    await expect(middleware.use(req, res, next)).rejects.toThrow(UnauthorizedException);
  });

  it(
    'traduce un token non valido/scaduto in UnauthorizedException (401), MAI un errore semplice che diventerebbe un 500 — ' +
      'il bug trovato nella Sprint Review reale della Feature 2.1: prima di questa correzione, questo test avrebbe fallito ' +
      'con InvalidAccessTokenError propagato, non con UnauthorizedException',
    async () => {
      const verifier = new FakeJwtVerifier(() => {
        throw new InvalidAccessTokenError();
      });
      const middleware = new AuthMiddleware(verifier as unknown as JwtVerifier, new FakeGrantsResolver());
      const { req, res, next } = buildReqResNext({ authorization: 'Bearer token-scaduto-o-non-valido' });

      await expect(middleware.use(req, res, next)).rejects.toThrow(UnauthorizedException);
      await expect(middleware.use(req, res, next)).rejects.not.toThrow(InvalidAccessTokenError);
    },
  );

  it('con un token valido ma senza X-Organization-Id, popola request.user con grants vuoti e chiama next()', async () => {
    const verifier = new FakeJwtVerifier(() => ({ sub: 'user-1', email: 'a@b.it' }));
    const grantsResolver = new FakeGrantsResolver();
    const middleware = new AuthMiddleware(verifier as unknown as JwtVerifier, grantsResolver);
    const { req, res, next, wasNextCalled } = buildReqResNext({ authorization: 'Bearer token-valido' });

    await middleware.use(req, res, next);

    expect(wasNextCalled()).toBe(true);
    expect((req as Request & { user: AuthenticatedRequestUser }).user.userId).toBe('user-1');
    expect((req as Request & { user: AuthenticatedRequestUser }).user.grants).toEqual([]);
    expect(grantsResolver.calls).toHaveLength(0);
  });

  it('con un token valido e X-Organization-Id, risolve i grant per quella organizzazione e chiama next()', async () => {
    const verifier = new FakeJwtVerifier(() => ({ sub: 'user-1', email: 'a@b.it' }));
    const grantsResolver = new FakeGrantsResolver();
    const middleware = new AuthMiddleware(verifier as unknown as JwtVerifier, grantsResolver);
    const { req, res, next, wasNextCalled } = buildReqResNext({
      authorization: 'Bearer token-valido',
      'x-organization-id': 'org-1',
    });

    await middleware.use(req, res, next);

    expect(wasNextCalled()).toBe(true);
    expect((req as Request & { user: AuthenticatedRequestUser }).user.organizationId).toBe('org-1');
    expect((req as Request & { user: AuthenticatedRequestUser }).user.grants).toHaveLength(1);
    expect(grantsResolver.calls).toEqual([{ userId: 'user-1', organizationId: 'org-1' }]);
  });
});
