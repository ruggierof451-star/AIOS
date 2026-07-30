import { describe, it, expect } from 'vitest';
import { resolveRoute, buildRouteTable, RouteRule } from '../route-table';

const routes: RouteRule[] = [
  { pathPrefix: '/api/v1/auth', target: 'http://identity:3001' },
  { pathPrefix: '/api/v1/organizations', target: 'http://organization:3003' },
];

describe('resolveRoute', () => {
  it('trova il servizio corretto per un path che corrisponde a un prefisso', () => {
    const route = resolveRoute('/api/v1/auth/register', routes);
    expect(route?.target).toBe('http://identity:3001');
  });

  it('restituisce null se nessun prefisso corrisponde', () => {
    const route = resolveRoute('/api/v1/sconosciuto', routes);
    expect(route).toBeNull();
  });

  it('distingue correttamente tra due prefissi simili', () => {
    const route = resolveRoute('/api/v1/organizations/123/plan', routes);
    expect(route?.target).toBe('http://organization:3003');
  });
});

describe('buildRouteTable', () => {
  it('include la rotta verso il servizio onboarding, con percorso pubblico "first-meeting" (Product Constitution: mai "onboarding" nel linguaggio rivolto all\'utente)', () => {
    const table = buildRouteTable();
    const route = resolveRoute('/api/v1/first-meeting/provision', table);
    expect(route?.pathPrefix).toBe('/api/v1/first-meeting');
  });
});
