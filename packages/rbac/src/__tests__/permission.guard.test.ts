import { describe, it, expect } from 'vitest';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard, AuthenticatedRequestUser } from '../permission.guard';

function buildContext(user: AuthenticatedRequestUser | undefined, body: unknown = {}): ExecutionContext {
  const request = { user, body, params: {} };
  const handler = () => undefined;
  class FakeController {}
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => FakeController,
  } as unknown as ExecutionContext;
}

function buildReflector(requiredAction: string | undefined): Reflector {
  return { getAllAndOverride: () => requiredAction } as unknown as Reflector;
}

describe('PermissionGuard', () => {
  it('permette l\'accesso se nessun permesso è richiesto per la rotta', () => {
    const guard = new PermissionGuard(buildReflector(undefined));
    const context = buildContext(undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rifiuta se request.user è assente', () => {
    const guard = new PermissionGuard(buildReflector('workspace.create'));
    const context = buildContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('permette l\'accesso se il grant richiesto è presente', () => {
    const guard = new PermissionGuard(buildReflector('workspace.create'));
    const user: AuthenticatedRequestUser = {
      userId: 'user-1',
      organizationId: 'org-1',
      grants: [{ action: 'workspace.create' }],
    };
    expect(guard.canActivate(buildContext(user))).toBe(true);
  });

  it('rifiuta con un messaggio generico se manca il permesso ma l\'organizationId è presente', () => {
    const guard = new PermissionGuard(buildReflector('workspace.create'));
    const user: AuthenticatedRequestUser = { userId: 'user-1', organizationId: 'org-1', grants: [] };

    try {
      guard.canActivate(buildContext(user));
      expect.fail('doveva lanciare ForbiddenException');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).message).not.toContain('X-Organization-Id');
    }
  });

  it(
    'rifiuta con un messaggio diagnostico specifico se organizationId è vuoto — ' +
      'il caso reale trovato nella Sprint Review v1.14 (HttpWorkspaceClient non impostava X-Organization-Id): ' +
      'prima di questa correzione, questo caso produceva lo stesso messaggio generico del caso sopra, ' +
      'rendendo indistinguibili "nessun contesto fornito" da "permesso davvero mancante"',
    () => {
      const guard = new PermissionGuard(buildReflector('workspace.create'));
      const user: AuthenticatedRequestUser = { userId: 'user-1', organizationId: '', grants: [] };

      try {
        guard.canActivate(buildContext(user));
        expect.fail('doveva lanciare ForbiddenException');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect((err as ForbiddenException).message).toContain('X-Organization-Id');
      }
    },
  );
});
