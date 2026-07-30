/**
 * Tabella di routing del Gateway (Infrastructure Modulo 4, sezione 2.1 —
 * Entry Layer). Ogni prefisso di path viene inoltrato al servizio
 * proprietario di quel Bounded Context — un solo posto in cui questa
 * mappa è dichiarata, mai duplicata o dedotta implicitamente altrove.
 */
export interface RouteRule {
  pathPrefix: string;
  target: string;
}

export function buildRouteTable(): RouteRule[] {
  return [
    { pathPrefix: '/api/v1/auth', target: process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3001' },
    {
      pathPrefix: '/api/v1/administration',
      target: process.env.ADMINISTRATION_SERVICE_URL ?? 'http://localhost:3002',
    },
    {
      pathPrefix: '/api/v1/organizations',
      target: process.env.ORGANIZATION_SERVICE_URL ?? 'http://localhost:3003',
    },
    { pathPrefix: '/api/v1/workspaces', target: process.env.WORKSPACE_SERVICE_URL ?? 'http://localhost:3004' },
    // Il servizio dietro questa rotta si chiama internamente
    // "onboarding-service" (nome architetturale, nella cartella/package
    // — mai visto da un cliente). Il PERCORSO PUBBLICO usa invece
    // "first-meeting", coerente con la Product Constitution: "onboarding"
    // è esattamente il termine che la progettazione di Epic 2 ha escluso
    // dal linguaggio rivolto all'utente ("NON PARLARE MAI DI ONBOARDING").
    { pathPrefix: '/api/v1/first-meeting', target: process.env.ONBOARDING_SERVICE_URL ?? 'http://localhost:3005' },
  ];
}

/** Trova la regola di routing la cui pathPrefix corrisponde al path richiesto (il primo match vince). */
export function resolveRoute(path: string, routes: RouteRule[]): RouteRule | null {
  return routes.find((r) => path.startsWith(r.pathPrefix)) ?? null;
}
