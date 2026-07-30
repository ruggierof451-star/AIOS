import { ServiceTokenIssuer } from '@aios/rbac';
import { AdministrationServiceClient } from '../application/ports';

/**
 * Chiamata service-to-service reale — firma il proprio token di
 * servizio ("onboarding-service", allowlisted su Administration per
 * questo endpoint specifico) ad ogni chiamata, mai un token statico
 * riutilizzato: coerente con la vita breve (5 minuti) già scelta per
 * questi token in @aios/rbac.
 */
export class HttpAdministrationClient implements AdministrationServiceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceTokenIssuer: ServiceTokenIssuer,
  ) {}

  async createDefaultRoles(params: { organizationId: string; ownerUserId: string }): Promise<void> {
    const serviceToken = this.serviceTokenIssuer.sign('onboarding-service');

    const response = await fetch(
      `${this.baseUrl}/api/v1/administration/organizations/${params.organizationId}/default-roles`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': serviceToken,
        },
        body: JSON.stringify({ ownerUserId: params.ownerUserId }),
      },
    );

    if (!response.ok) {
      throw new Error(`Administration ha risposto ${response.status} al provisioning dei ruoli di default.`);
    }
  }
}
