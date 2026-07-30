/**
 * Motore di valutazione RBAC (Domain Model, sezione 7.3): Role + Permission
 * + Scope. Puro dominio, nessuna dipendenza da Prisma/NestJS — testabile
 * in isolamento.
 */

export interface PermissionGrant {
  action: string; // es. "crm.customer.create"
  scope?: Record<string, unknown> | null; // es. { restrictTo: "assigned_only" }
}

export interface AuthorizationContext {
  userId: string;
  organizationId: string;
  grants: PermissionGrant[];
  /** Dati della risorsa specifica su cui si valuta lo Scope, se applicabile. */
  resource?: {
    assignedToUserId?: string;
    [key: string]: unknown;
  };
}

export class PermissionEvaluator {
  /**
   * Restituisce true se l'insieme di grant dell'utente autorizza l'azione
   * richiesta, rispettando lo Scope quando dichiarato (Domain Model,
   * sezione 7.3 — "solo i propri clienti assegnati").
   */
  static isAuthorized(context: AuthorizationContext, requiredAction: string): boolean {
    const matchingGrants = context.grants.filter((g) => g.action === requiredAction);
    if (matchingGrants.length === 0) return false;

    // Se ALMENO un grant non ha restrizioni di scope, l'azione è permessa
    // senza ulteriori vincoli (es. un Direttore Commerciale con grant
    // senza scope vede tutti i clienti, non solo i propri).
    const hasUnrestrictedGrant = matchingGrants.some((g) => !g.scope || Object.keys(g.scope).length === 0);
    if (hasUnrestrictedGrant) return true;

    // Altrimenti, verifica lo scope più comune: "assigned_only" — l'utente
    // può agire solo su risorse a lui assegnate (Product Bible CRM, sez. 13).
    const restrictedToAssignedOnly = matchingGrants.some(
      (g) => g.scope?.restrictTo === 'assigned_only',
    );
    if (restrictedToAssignedOnly) {
      return context.resource?.assignedToUserId === context.userId;
    }

    // Uno scope dichiarato ma non riconosciuto è trattato come NON
    // autorizzato di default — mai un fallback permissivo su una regola
    // di sicurezza che non si sa interpretare (fail-closed, non fail-open).
    return false;
  }
}
