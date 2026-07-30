import { WorkspaceServiceClient } from '../application/ports';

export class HttpWorkspaceClient implements WorkspaceServiceClient {
  constructor(private readonly baseUrl: string) {}

  async createWorkspace(params: {
    organizationId: string;
    name: string;
    userAccessToken: string;
  }): Promise<{ workspaceId: string }> {
    const response = await fetch(`${this.baseUrl}/api/v1/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.userAccessToken}`,
        // Causa reale del 403 trovato nella Sprint Review (v1.14): senza
        // questo header, AuthMiddleware di Workspace non risolve alcun
        // grant (vedi packages/rbac/src/middleware/auth.middleware.ts —
        // risolve i grant SOLO se X-Organization-Id è presente), quindi
        // PermissionGuard rifiuta `workspace.create` anche se l'utente ha
        // già il ruolo Admin assegnato correttamente nel passo precedente
        // dell'orchestrazione. Non un problema di RBAC, di permessi
        // mancanti, o del token — solo di questo header mai impostato.
        'X-Organization-Id': params.organizationId,
      },
      body: JSON.stringify({ organizationId: params.organizationId, name: params.name }),
    });

    if (!response.ok) {
      throw new Error(`Workspace ha risposto ${response.status} alla creazione.`);
    }

    const body = (await response.json()) as { data?: { workspaceId?: string } };
    const workspaceId = body.data?.workspaceId;
    if (!workspaceId) {
      throw new Error('Risposta di Workspace priva di workspaceId.');
    }
    return { workspaceId };
  }
}
