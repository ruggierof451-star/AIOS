/**
 * Port dell'application layer di Onboarding — coerente con la
 * convenzione già in uso in Organization/Workspace (interfaccia qui,
 * implementazione HTTP/Prisma in infrastructure/).
 */

import type { DomainEvent } from '@aios/eventing';
import { ConversationSession } from '../domain/conversation-session.entity';

export type { DomainEvent };

/**
 * A differenza di Organization/Workspace (dove un intero caso d'uso è
 * un'unica operazione locale, avvolta in una sola transazione),
 * `ProvisionNewTenantUseCase` intreccia più salvataggi con chiamate HTTP
 * lente verso altri servizi. Avvolgere l'intera orchestrazione in
 * un'unica transazione Postgres terrebbe quella transazione aperta per
 * tutta la durata delle chiamate HTTP — un rischio reale (connessioni,
 * lock), scoperto rileggendo questo stesso incremento prima di
 * consegnarlo, non un dettaglio da manuale.
 *
 * `ConversationSessionStore` risolve questo: `findById` è una lettura
 * semplice, senza transazione; `saveWithEvent` è una transazione breve
 * e indipendente per OGNI singolo passo — mai una transazione che
 * avvolge le chiamate HTTP stesse. Sessione ed evento restano atomici
 * tra loro ad ogni passo, ma l'orchestrazione nel suo complesso non lo
 * è (e non deve esserlo: i tre servizi a valle non condividono
 * comunque una transazione distribuita — coerente con "mai una 2PC",
 * Engineering Bible).
 */
export interface ConversationSessionStore {
  findById(id: string): Promise<ConversationSession | null>;
  saveWithEvent(session: ConversationSession, event: DomainEvent): Promise<void>;
}

export class ConversationSessionNotFoundError extends Error {
  constructor() {
    super('Sessione di conversazione non trovata.');
    this.name = 'ConversationSessionNotFoundError';
  }
}

export interface OrganizationServiceClient {
  /**
   * Inoltra l'access token dell'utente che ha avviato il provisioning —
   * Organization ricava `ownerUserId` dal proprio AuthMiddleware/JWT,
   * non da un campo del corpo (stessa identità della richiesta
   * originale, non un'identità di servizio: creare la propria azienda è
   * un'azione dell'utente, orchestrata da questo servizio ma compiuta
   * "come" quell'utente).
   */
  createOrganization(params: { name: string; userAccessToken: string }): Promise<{ organizationId: string }>;
}

export interface AdministrationServiceClient {
  /**
   * Chiamata service-to-service reale (token di servizio, non JWT
   * utente) — questo endpoint di Administration è protetto da
   * ServiceAuthGuard con @AllowServices('onboarding-service').
   */
  createDefaultRoles(params: { organizationId: string; ownerUserId: string }): Promise<void>;
}

export interface WorkspaceServiceClient {
  /**
   * Stessa logica di inoltro del JWT di OrganizationServiceClient:
   * Workspace ricava `creatorUserId` dal proprio AuthMiddleware, e
   * richiede il permesso `workspace.create` — che l'utente ha solo
   * DOPO che AdministrationServiceClient.createDefaultRoles ha
   * assegnato il ruolo Admin. L'ordine delle chiamate nell'orchestratore
   * non è arbitrario: è un vincolo reale, non stilistico.
   */
  createWorkspace(params: {
    organizationId: string;
    name: string;
    userAccessToken: string;
  }): Promise<{ workspaceId: string }>;
}

/**
 * Errore esplicito per un passo fallito dell'orchestrazione — indica
 * quale passo e quale causa, invece di un errore generico che
 * nasconderebbe dove esattamente il provisioning si è interrotto.
 */
export class ProvisioningStepFailedError extends Error {
  constructor(
    public readonly step: 'organization' | 'default-roles' | 'workspace',
    cause: unknown,
  ) {
    super(`Provisioning fallito al passo '${step}': ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'ProvisioningStepFailedError';
  }
}

/**
 * Feature 2.2, Incremento 1: il consenso legale deve essere registrato
 * prima che il provisioning possa procedere — vedi
 * provision-new-tenant.use-case.ts per dove viene applicato.
 */
export class LegalConsentRequiredError extends Error {
  constructor() {
    super('Consenso legale non ancora registrato per questa sessione — completa quel passo prima di procedere.');
    this.name = 'LegalConsentRequiredError';
  }
}
