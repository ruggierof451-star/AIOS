import { describe, it, expect } from 'vitest';
import { ForbiddenException, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ServiceAuthGuard } from '../service-auth.guard';
import { ServiceTokenVerifier, InvalidServiceTokenError } from '../service-token';

/** ExecutionContext fittizio minimo — stesso pattern già usato per JwtAuthGuard (Identity). */
function buildContext(
  headers: Record<string, string | undefined>,
  allowedServices: string[] | undefined,
): ExecutionContext {
  const request = { headers };
  const handler = () => undefined;
  class FakeController {}
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => FakeController,
  } as unknown as ExecutionContext;
}

/** Reflector fittizio: restituisce sempre l'elenco fornito nel test. */
function buildReflector(allowedServices: string[] | undefined): Reflector {
  return {
    getAllAndOverride: () => allowedServices,
  } as unknown as Reflector;
}

class FakeVerifier {
  constructor(private readonly behavior: (token: string) => { service: string }) {}
  verify(token: string) {
    return this.behavior(token);
  }
}

describe('ServiceAuthGuard', () => {
  it('rifiuta se nessun @AllowServices è dichiarato (errore di configurazione, mai un default permissivo)', () => {
    const guard = new ServiceAuthGuard(buildReflector(undefined), new ServiceTokenVerifier('x'));
    const context = buildContext({}, undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rifiuta se l\'header X-Internal-Service-Token è assente', () => {
    const guard = new ServiceAuthGuard(buildReflector(['organization-service']), new ServiceTokenVerifier('x'));
    const context = buildContext({}, ['organization-service']);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('accetta un token valido emesso da un servizio nella lista consentita', () => {
    const fakeVerifier = new FakeVerifier(() => ({ service: 'organization-service' }));
    const guard = new ServiceAuthGuard(
      buildReflector(['organization-service']),
      fakeVerifier as unknown as ServiceTokenVerifier,
    );
    const context = buildContext({ 'x-internal-service-token': 'token-valido' }, ['organization-service']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rifiuta un servizio valido ma non presente nella lista consentita per questo endpoint', () => {
    const fakeVerifier = new FakeVerifier(() => ({ service: 'workspace-service' }));
    const guard = new ServiceAuthGuard(
      buildReflector(['organization-service']),
      fakeVerifier as unknown as ServiceTokenVerifier,
    );
    const context = buildContext({ 'x-internal-service-token': 'token-valido' }, ['organization-service']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('traduce un token non valido/scaduto in UnauthorizedException (401), mai un 500 — stessa lezione già imparata su JwtAuthGuard', () => {
    const fakeVerifier = new FakeVerifier(() => {
      throw new InvalidServiceTokenError();
    });
    const guard = new ServiceAuthGuard(
      buildReflector(['organization-service']),
      fakeVerifier as unknown as ServiceTokenVerifier,
    );
    const context = buildContext({ 'x-internal-service-token': 'token-scaduto' }, ['organization-service']);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
