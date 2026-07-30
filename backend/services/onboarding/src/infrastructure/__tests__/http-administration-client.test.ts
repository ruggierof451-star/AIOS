import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpAdministrationClient } from '../http-administration-client';
import { ServiceTokenIssuer } from '@aios/rbac';

describe('HttpAdministrationClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it(
    "usa un token di servizio (X-Internal-Service-Token), MAI il JWT dell'utente — questo endpoint è protetto " +
      "da ServiceAuthGuard con @AllowServices('onboarding-service'), non da PermissionGuard: inoltrare qui il " +
      'JWT utente al posto del token di servizio produrrebbe comunque un 401, un bug diverso da quello di Workspace ma della stessa famiglia (credenziale sbagliata per il tipo di chiamata)',
    async () => {
      let capturedHeaders: Record<string, string> | undefined;
      global.fetch = vi.fn(async (_url: string, init?: { headers?: Record<string, string> }) => {
        capturedHeaders = init?.headers;
        return { ok: true, status: 201 } as Response;
      }) as unknown as typeof fetch;

      const issuer = new ServiceTokenIssuer('test-secret');
      const client = new HttpAdministrationClient('http://localhost:3002', issuer);
      await client.createDefaultRoles({ organizationId: 'org-1', ownerUserId: 'user-1' });

      expect(capturedHeaders?.['X-Internal-Service-Token']).toBeTypeOf('string');
      expect(capturedHeaders?.['Authorization']).toBeUndefined();
    },
  );

  it('lancia un errore leggibile se Administration risponde con un errore HTTP', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 401 })) as unknown as typeof fetch;
    const client = new HttpAdministrationClient('http://localhost:3002', new ServiceTokenIssuer('test-secret'));

    await expect(client.createDefaultRoles({ organizationId: 'org-1', ownerUserId: 'user-1' })).rejects.toThrow('401');
  });
});
