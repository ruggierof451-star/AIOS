import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpWorkspaceClient } from '../http-workspace-client';

describe('HttpWorkspaceClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it(
    'imposta X-Organization-Id — causa reale del 403 trovato nella Sprint Review v1.14: senza questo header, ' +
      "AuthMiddleware di Workspace non risolve alcun grant e PermissionGuard rifiuta 'workspace.create' anche con il ruolo Admin già assegnato",
    async () => {
      let capturedHeaders: Record<string, string> | undefined;
      global.fetch = vi.fn(async (_url: string, init?: { headers?: Record<string, string> }) => {
        capturedHeaders = init?.headers;
        return {
          ok: true,
          status: 201,
          json: async () => ({ data: { workspaceId: 'ws-1' } }),
        } as Response;
      }) as unknown as typeof fetch;

      const client = new HttpWorkspaceClient('http://localhost:3004');
      await client.createWorkspace({ organizationId: 'org-1', name: 'Principale', userAccessToken: 'token-utente' });

      expect(capturedHeaders?.['X-Organization-Id']).toBe('org-1');
      expect(capturedHeaders?.['Authorization']).toBe('Bearer token-utente');
    },
  );

  it('restituisce workspaceId dalla risposta', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ data: { workspaceId: 'ws-xyz' } }),
    })) as unknown as typeof fetch;

    const client = new HttpWorkspaceClient('http://localhost:3004');
    const result = await client.createWorkspace({ organizationId: 'org-1', name: 'Principale', userAccessToken: 't' });

    expect(result.workspaceId).toBe('ws-xyz');
  });

  it('lancia un errore leggibile se Workspace risponde con un errore HTTP', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 403 })) as unknown as typeof fetch;
    const client = new HttpWorkspaceClient('http://localhost:3004');

    await expect(
      client.createWorkspace({ organizationId: 'org-1', name: 'Principale', userAccessToken: 't' }),
    ).rejects.toThrow('403');
  });

  it('lancia un errore se la risposta non contiene workspaceId', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 201, json: async () => ({ data: {} }) })) as unknown as typeof fetch;
    const client = new HttpWorkspaceClient('http://localhost:3004');

    await expect(
      client.createWorkspace({ organizationId: 'org-1', name: 'Principale', userAccessToken: 't' }),
    ).rejects.toThrow('workspaceId');
  });
});
