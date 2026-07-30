import { OrganizationServiceClient } from '../application/ports';

export class HttpOrganizationClient implements OrganizationServiceClient {
  constructor(private readonly baseUrl: string) {}

  async createOrganization(params: { name: string; userAccessToken: string }): Promise<{ organizationId: string }> {
    const response = await fetch(`${this.baseUrl}/api/v1/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.userAccessToken}`,
      },
      body: JSON.stringify({ name: params.name }),
    });

    if (!response.ok) {
      throw new Error(`Organization ha risposto ${response.status} alla creazione.`);
    }

    const body = (await response.json()) as { data?: { organizationId?: string } };
    const organizationId = body.data?.organizationId;
    if (!organizationId) {
      throw new Error('Risposta di Organization priva di organizationId.');
    }
    return { organizationId };
  }
}
