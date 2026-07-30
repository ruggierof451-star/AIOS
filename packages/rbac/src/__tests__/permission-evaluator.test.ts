import { describe, it, expect } from 'vitest';
import { PermissionEvaluator, AuthorizationContext } from '../permission-evaluator';

function buildContext(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    userId: 'user-1',
    organizationId: 'org-1',
    grants: [],
    ...overrides,
  };
}

describe('PermissionEvaluator', () => {
  it('nega l\'accesso se nessun grant corrisponde all\'azione richiesta', () => {
    const context = buildContext({ grants: [{ action: 'crm.customer.view' }] });
    expect(PermissionEvaluator.isAuthorized(context, 'crm.customer.create')).toBe(false);
  });

  it('autorizza se esiste un grant senza restrizioni di scope', () => {
    const context = buildContext({ grants: [{ action: 'crm.customer.create' }] });
    expect(PermissionEvaluator.isAuthorized(context, 'crm.customer.create')).toBe(true);
  });

  it('autorizza con scope assigned_only solo se la risorsa è assegnata all\'utente', () => {
    const context = buildContext({
      grants: [{ action: 'crm.customer.view', scope: { restrictTo: 'assigned_only' } }],
      resource: { assignedToUserId: 'user-1' },
    });
    expect(PermissionEvaluator.isAuthorized(context, 'crm.customer.view')).toBe(true);
  });

  it('nega con scope assigned_only se la risorsa è assegnata a un altro utente', () => {
    const context = buildContext({
      grants: [{ action: 'crm.customer.view', scope: { restrictTo: 'assigned_only' } }],
      resource: { assignedToUserId: 'user-2' },
    });
    expect(PermissionEvaluator.isAuthorized(context, 'crm.customer.view')).toBe(false);
  });

  it('nega (fail-closed) se lo scope dichiarato non è riconosciuto', () => {
    const context = buildContext({
      grants: [{ action: 'crm.customer.view', scope: { restrictTo: 'uno_scope_inventato' } }],
      resource: { assignedToUserId: 'user-1' },
    });
    expect(PermissionEvaluator.isAuthorized(context, 'crm.customer.view')).toBe(false);
  });

  it('autorizza se almeno uno tra più grant per la stessa azione non ha restrizioni', () => {
    const context = buildContext({
      grants: [
        { action: 'crm.customer.view', scope: { restrictTo: 'assigned_only' } },
        { action: 'crm.customer.view' }, // secondo grant, senza scope
      ],
      resource: { assignedToUserId: 'un-altro-utente' },
    });
    expect(PermissionEvaluator.isAuthorized(context, 'crm.customer.view')).toBe(true);
  });

  it('nega di default se non è dichiarata alcuna risorsa ma lo scope la richiede', () => {
    const context = buildContext({
      grants: [{ action: 'crm.customer.view', scope: { restrictTo: 'assigned_only' } }],
    });
    expect(PermissionEvaluator.isAuthorized(context, 'crm.customer.view')).toBe(false);
  });
});
