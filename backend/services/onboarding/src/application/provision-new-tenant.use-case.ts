import { ConversationSession } from '../domain/conversation-session.entity';
import { ConversationSteps } from '../domain/conversation-steps';
import {
  OrganizationServiceClient,
  AdministrationServiceClient,
  WorkspaceServiceClient,
  ConversationSessionStore,
  ConversationSessionNotFoundError,
  ProvisioningStepFailedError,
  LegalConsentRequiredError,
} from './ports';

export interface ProvisionNewTenantInput {
  conversationId: string;
  name: string;
  ownerUserId: string;
  userAccessToken: string;
}

export interface ProvisionNewTenantOutput {
  organizationId: string;
  workspaceId: string;
}

const DEFAULT_WORKSPACE_NAME = 'Principale';

// Chiavi dei passi generici che QUESTO orchestratore, specificamente,
// considera necessari per "provisioning completo" — è conoscenza di
// dominio dell'orchestratore, non dell'aggregate ConversationSession,
// che resta agnostico rispetto al significato di ciascun passo
// (Incremento 6, vedi domain/conversation-session.entity.ts).
// Chiavi ufficiali definite in domain/conversation-steps.ts (Conversation
// Step Registry) — REQUIRED_STEPS resta una lista specifica di QUESTO
// orchestratore (quali passi, tra tutti quelli noti al registro,
// costituiscono "provisioning completo" è conoscenza dell'orchestratore,
// non del registro né dell'aggregate).
const REQUIRED_STEPS: string[] = [
  ConversationSteps.ORGANIZATION_CREATED,
  ConversationSteps.ROLES_PROVISIONED,
  ConversationSteps.WORKSPACE_CREATED,
];

/**
 * Orchestratore del provisioning automatico dell'ambiente (Feature 2.1).
 *
 * Ogni passo verifica prima se è già stato completato (letto dalla
 * sessione tramite le chiavi generiche sopra) — se sì, lo salta; se no,
 * lo esegue e registra immediatamente il progresso, PRIMA di procedere
 * al passo successivo. Questo è ciò che rende una chiamata ripetuta con
 * lo stesso `conversationId` una vera ripresa, non una nuova esecuzione
 * da capo.
 *
 * Ogni salvataggio (`sessionStore.saveWithEvent`) è la propria
 * transazione breve e indipendente — mai una transazione che avvolge
 * anche le chiamate HTTP verso Organization/Administration/Workspace.
 *
 * Ordine dei passi non arbitrario: i ruoli devono esistere ed essere
 * assegnati PRIMA della creazione del Workspace, perché quell'endpoint
 * richiede il permesso `workspace.create`, ottenuto solo tramite il
 * ruolo Admin.
 *
 * Nomi degli eventi: `ConversationSession<Verbo>`, mai un termine di
 * prodotto ("FirstMeeting") — convenzione definitiva fissata
 * nell'Incremento 6, coerente con `OrganizationCreated`/
 * `WorkspaceCreated`: il nome dell'evento riflette sempre il vero nome
 * tecnico dell'aggregate, mai il linguaggio rivolto all'utente.
 */
export class ProvisionNewTenantUseCase {
  constructor(
    private readonly sessionStore: ConversationSessionStore,
    private readonly organizationClient: OrganizationServiceClient,
    private readonly administrationClient: AdministrationServiceClient,
    private readonly workspaceClient: WorkspaceServiceClient,
  ) {}

  async execute(input: ProvisionNewTenantInput): Promise<ProvisionNewTenantOutput> {
    const session = await this.sessionStore.findById(input.conversationId);
    if (!session) {
      throw new ConversationSessionNotFoundError();
    }

    if (session.areStepsComplete(REQUIRED_STEPS)) {
      // Già completato in una chiamata precedente — richiamare questo
      // caso d'uso una seconda volta con lo stesso conversationId
      // restituisce semplicemente il risultato già ottenuto, non lo
      // rifà (idempotenza reale, non solo "nessun errore").
      return this.buildOutput(session);
    }

    // Decisione progettuale (Feature 2.2, Incremento 1): nessuna
    // Organization viene creata senza un consenso legale già registrato
    // — coerente con la Business Rule già definita nella progettazione
    // di Epic 2 ("nessuna Organization viene creata senza
    // un'accettazione registrata per ciascun documento legale
    // obbligatorio"). Il controllo avviene qui, non nel controller: è
    // una regola dell'orchestrazione, non solo della singola richiesta
    // HTTP — vale anche per una ripresa dopo un'interruzione.
    if (!session.isStepComplete(ConversationSteps.LEGAL_CONSENT_GIVEN)) {
      throw new LegalConsentRequiredError();
    }

    if (!session.isStepComplete(ConversationSteps.ORGANIZATION_CREATED)) {
      let organizationId: string;
      try {
        const result = await this.organizationClient.createOrganization({
          name: input.name,
          userAccessToken: input.userAccessToken,
        });
        organizationId = result.organizationId;
      } catch (err) {
        await this.markFailedAndPersist(session, ConversationSteps.ORGANIZATION_CREATED);
        throw new ProvisioningStepFailedError('organization', err);
      }
      session.linkToOrganization(organizationId);
      session.completeStep(ConversationSteps.ORGANIZATION_CREATED, { organization_id: organizationId });
      await this.sessionStore.saveWithEvent(session, {
        eventType: 'ConversationSessionOrganizationProvisioned',
        aggregateId: session.id,
        organizationId,
        payload: { schema_version: 1, conversation_id: session.id, organization_id: organizationId },
      });
    }

    const organizationId = this.readStepValue(session, ConversationSteps.ORGANIZATION_CREATED, 'organization_id');

    if (!session.isStepComplete(ConversationSteps.ROLES_PROVISIONED)) {
      try {
        await this.administrationClient.createDefaultRoles({
          organizationId,
          ownerUserId: input.ownerUserId,
        });
      } catch (err) {
        await this.markFailedAndPersist(session, ConversationSteps.ROLES_PROVISIONED);
        throw new ProvisioningStepFailedError('default-roles', err);
      }
      session.completeStep(ConversationSteps.ROLES_PROVISIONED);
      await this.sessionStore.saveWithEvent(session, {
        eventType: 'ConversationSessionRolesProvisioned',
        aggregateId: session.id,
        organizationId,
        payload: { schema_version: 1, conversation_id: session.id, organization_id: organizationId },
      });
    }

    if (!session.isStepComplete(ConversationSteps.WORKSPACE_CREATED)) {
      let workspaceId: string;
      try {
        const result = await this.workspaceClient.createWorkspace({
          organizationId,
          name: DEFAULT_WORKSPACE_NAME,
          userAccessToken: input.userAccessToken,
        });
        workspaceId = result.workspaceId;
      } catch (err) {
        await this.markFailedAndPersist(session, ConversationSteps.WORKSPACE_CREATED);
        throw new ProvisioningStepFailedError('workspace', err);
      }
      session.completeStep(ConversationSteps.WORKSPACE_CREATED, { workspace_id: workspaceId });
      session.markCompleted();
      await this.sessionStore.saveWithEvent(session, {
        eventType: 'ConversationSessionProvisioningCompleted',
        aggregateId: session.id,
        organizationId,
        payload: {
          schema_version: 1,
          conversation_id: session.id,
          organization_id: organizationId,
          workspace_id: workspaceId,
        },
      });
    }

    return this.buildOutput(session);
  }

  private buildOutput(session: ConversationSession): ProvisionNewTenantOutput {
    return {
      organizationId: this.readStepValue(session, ConversationSteps.ORGANIZATION_CREATED, 'organization_id'),
      workspaceId: this.readStepValue(session, ConversationSteps.WORKSPACE_CREATED, 'workspace_id'),
    };
  }

  private readStepValue(session: ConversationSession, stepKey: string, field: string): string {
    const step = session.getStep(stepKey);
    const value = step?.resultData?.[field];
    if (typeof value !== 'string') {
      throw new Error(`Passo '${stepKey}' completato ma privo del campo atteso '${field}'.`);
    }
    return value;
  }

  private async markFailedAndPersist(session: ConversationSession, stepKey: string): Promise<void> {
    session.failStep(stepKey);
    session.markFailed();
    await this.sessionStore.saveWithEvent(session, {
      eventType: 'ConversationSessionProvisioningFailed',
      aggregateId: session.id,
      payload: { schema_version: 1, conversation_id: session.id, failed_step: stepKey },
    });
  }
}
