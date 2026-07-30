import { PermissionGrant } from '../permission-evaluator';
import { ServiceTokenIssuer } from '../service-auth/service-token';

export interface GrantsResolver {
  resolve(userId: string, organizationId: string): Promise<PermissionGrant[]>;
}

/**
 * Token di iniezione per GrantsResolver — necessario perché è
 * un'interfaccia (irrisolvibile da NestJS via riflessione automatica,
 * vedi commento in auth.middleware.ts). Ogni modulo che registra
 * AuthMiddleware deve fornire un provider con `provide: GRANTS_RESOLVER`,
 * non con la classe concreta come token.
 */
export const GRANTS_RESOLVER = Symbol('GRANTS_RESOLVER');

/**
 * Implementazione scelta per questa milestone: risoluzione dei grant ad
 * ogni richiesta, tramite chiamata HTTP all'API di Administration
 * (GET /api/v1/administration/users/:userId/grants).
 *
 * Alternativa non scelta (documentata in README.md, sezione "Decisione
 * presa"): grant incorporati nel JWT al login. Motivazione della scelta:
 * semplicità e correttezza immediata (i permessi sono sempre aggiornati,
 * mai serve invalidare un JWT quando un ruolo cambia) al costo di una
 * chiamata di rete in più per richiesta — accettabile per questa fase,
 * da rivedere se la latenza risultasse un problema misurato in produzione
 * (Cost Engine / Model Router applicano lo stesso principio "ottimizza
 * quando i dati reali lo richiedono, non prima").
 *
 * Nota: nessuna cache qui — un'aggiunta naturale (Redis, TTL breve) è
 * segnalata come miglioramento futuro, non implementata silenziosamente
 * come se fosse già presente.
 *
 * Feature 2.1 (autenticazione service-to-service): questo endpoint di
 * Administration è ora protetto da ServiceAuthGuard — ogni chiamata deve
 * portare un token di servizio firmato, altrimenti riceve 401 invece dei
 * grant. `callerServiceName` identifica chi sta chiamando (es.
 * "organization-service"), verificato lato Administration contro la
 * lista di chiamanti ammessi per quell'endpoint.
 */
export class HttpGrantsResolver implements GrantsResolver {
  constructor(
    private readonly administrationServiceBaseUrl: string,
    private readonly callerServiceName: string,
    private readonly serviceTokenIssuer: ServiceTokenIssuer,
  ) {}

  async resolve(userId: string, organizationId: string): Promise<PermissionGrant[]> {
    const url = `${this.administrationServiceBaseUrl}/api/v1/administration/users/${userId}/grants?organizationId=${organizationId}`;
    const serviceToken = this.serviceTokenIssuer.sign(this.callerServiceName);

    const response = await fetch(url, {
      headers: { 'X-Internal-Service-Token': serviceToken },
    });
    if (!response.ok) {
      // Fail-closed: se Administration non risponde (o rifiuta
      // l'autenticazione service-to-service), l'utente non ottiene
      // grant, mai un fallback permissivo (coerente con
      // PermissionEvaluator, "fail-closed, non fail-open").
      return [];
    }

    const body = (await response.json()) as { data?: { grants?: PermissionGrant[] } };
    return body.data?.grants ?? [];
  }
}
