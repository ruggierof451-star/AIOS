import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpOrganizationClient } from '../http-organization-client';

describe('HttpOrganizationClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it(
    "inoltra il token utente ma NON necessita di X-Organization-Id — POST /api/v1/organizations non ha " +
      '@RequirePermission (creare la prima organizzazione non può richiedere un permesso in un\'organizzazione ' +
      "che non esiste ancora), quindi qui l'assenza dell'header è corretta, non lo stesso bug di Workspace",
    async () => {
      let capturedHeaders: Record<string, string> | undefined;
      global.fetch = vi.fn(async (_url: string, init?: { headers?: Record<string, string> }) => {
        capturedHeaders = init?.headers;
        return { ok: true, status: 201, json: async () => ({ data: { organizationId: 'org-1' } }) } as Response;
      }) as unknown as typeof fetch;

      const client = new HttpOrganizationClient('http://localhost:3003');
      await client.createOrganization({ name: 'Rossi Srl', userAccessToken: 'token-utente' });

      expect(capturedHeaders?.['Authorization']).toBe('Bearer token-utente');
    },
  );

  it('restituisce organizationId dalla risposta', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ data: { organizationId: 'org-abc' } }),
    })) as unknown as typeof fetch;

    const client = new HttpOrganizationClient('http://localhost:3003');
    const result = await client.createOrganization({ name: 'Rossi Srl', userAccessToken: 't' });

    expect(result.organizationId).toBe('org-abc');
  });

  it('lancia un errore leggibile se Organization risponde con un errore HTTP', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 401 })) as unknown as typeof fetch;
    const client = new HttpOrganizationClient('http://localhost:3003');

    await expect(client.createOrganization({ name: 'Rossi Srl', userAccessToken: 't' })).rejects.toThrow('401');
  });
});
