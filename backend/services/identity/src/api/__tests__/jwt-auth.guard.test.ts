import { describe, it, expect } from 'vitest';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { IdentityUseCaseFactory } from '../../infrastructure/identity-use-case.factory';
import { TokenExpiredOrInvalidError } from '../../infrastructure/jwt-token.service';

/** ExecutionContext fittizio minimo — solo la parte HTTP usata dal guard. */
function buildContext(headers: Record<string, string | undefined>): ExecutionContext {
  const request: { headers: Record<string, string | undefined>; userId?: string } = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

/** Fake minimo della factory — implementa solo verifyAccessToken, l'unico metodo che il guard usa. */
class FakeUseCaseFactory {
  constructor(private readonly behavior: (token: string) => { sub: string; email: string }) {}
  verifyAccessToken(token: string) {
    return this.behavior(token);
  }
}

describe('JwtAuthGuard', () => {
  it('rifiuta se l\'header Authorization è assente', () => {
    const factory = new FakeUseCaseFactory(() => ({ sub: 'user-1', email: 'a@b.it' }));
    const guard = new JwtAuthGuard(factory as unknown as IdentityUseCaseFactory);
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rifiuta se l\'header non inizia con "Bearer "', () => {
    const factory = new FakeUseCaseFactory(() => ({ sub: 'user-1', email: 'a@b.it' }));
    const guard = new JwtAuthGuard(factory as unknown as IdentityUseCaseFactory);
    const context = buildContext({ authorization: 'Basic abc123' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('accetta un Bearer token valido e popola userId sulla request', () => {
    const factory = new FakeUseCaseFactory((token) => {
      expect(token).toBe('token-valido');
      return { sub: 'user-42', email: 'mario@azienda.it' };
    });
    const guard = new JwtAuthGuard(factory as unknown as IdentityUseCaseFactory);
    const request: { headers: Record<string, string>; userId?: string } = {
      headers: { authorization: 'Bearer token-valido' },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.userId).toBe('user-42');
  });

  it('traduce un token scaduto/non valido in UnauthorizedException (401), mai un 500', () => {
    const factory = new FakeUseCaseFactory(() => {
      throw new TokenExpiredOrInvalidError();
    });
    const guard = new JwtAuthGuard(factory as unknown as IdentityUseCaseFactory);
    const context = buildContext({ authorization: 'Bearer token-scaduto' });

    // Un guard esegue prima del metodo del controller: se lasciasse
    // propagare TokenExpiredOrInvalidError (un Error semplice, non un
    // HttpException), NestJS non saprebbe mapparlo e risponderebbe con
    // un 500 generico — mai raggiungendo il toHttpException() del
    // controller. Da qui la traduzione esplicita in UnauthorizedException,
    // che NestJS riconosce nativamente.
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
