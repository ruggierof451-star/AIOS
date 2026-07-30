import { describe, it, expect } from 'vitest';
import { ProvisionNewTenantUseCase } from '../provision-new-tenant.use-case';
import { ConversationSession } from '../../domain/conversation-session.entity';
import { ConversationSteps } from '../../domain/conversation-steps';
import {
  OrganizationServiceClient,
  AdministrationServiceClient,
  WorkspaceServiceClient,
  ConversationSessionStore,
  DomainEvent,
  ConversationSessionNotFoundError,
  ProvisioningStepFailedError,
  LegalConsentRequiredError,
} from '../ports';

class FakeConversationSessionStore implements ConversationSessionStore {
  public sessions = new Map<string, ConversationSession>();
  public savedEvents: DomainEvent[] = [];

  seed(session: ConversationSession) {
    this.sessions.set(session.id, session);
  }

  async findById(id: string): Promise<ConversationSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async saveWithEvent(session: ConversationSession, event: DomainEvent): Promise<void> {
    this.sessions.set(session.id, session);
    this.savedEvents.push(event);
  }
}

class FakeOrganizationClient implements OrganizationServiceClient {
  public calls: Array<{ name: string; userAccessToken: string }> = [];
  constructor(private readonly behavior: () => Promise<{ organizationId: string }> = async () => ({
    organizationId: 'org-1',
  })) {}
  async createOrganization(params: { name: string; userAccessToken: string }) {
    this.calls.push(params);
    return this.behavior();
  }
}

class FakeAdministrationClient implements AdministrationServiceClient {
  public calls: Array<{ organizationId: string; ownerUserId: string }> = [];
  constructor(private readonly behavior: () => Promise<void> = async () => undefined) {}
  async createDefaultRoles(params: { organizationId: string; ownerUserId: string }) {
    this.calls.push(params);
    return this.behavior();
  }
}

class FakeWorkspaceClient implements WorkspaceServiceClient {
  public calls: Array<{ organizationId: string; name: string; userAccessToken: string }> = [];
  constructor(private readonly behavior: () => Promise<{ workspaceId: string }> = async () => ({
    workspaceId: 'ws-1',
  })) {}
  async createWorkspace(params: { organizationId: string; name: string; userAccessToken: string }) {
    this.calls.push(params);
    return this.behavior();
  }
}

function buildSessionWithConsent(userId: string): ConversationSession {
  const session = ConversationSession.start({ userId });
  session.completeStep(ConversationSteps.LEGAL_CONSENT_GIVEN, { accepted_documents: [] });
  return session;
}

function buildUseCase(overrides?: {
  organizationClient?: FakeOrganizationClient;
  administrationClient?: FakeAdministrationClient;
  workspaceClient?: FakeWorkspaceClient;
}) {
  const sessionStore = new FakeConversationSessionStore();
  const organizationClient = overrides?.organizationClient ?? new FakeOrganizationClient();
  const administrationClient = overrides?.administrationClient ?? new FakeAdministrationClient();
  const workspaceClient = overrides?.workspaceClient ?? new FakeWorkspaceClient();
  const useCase = new ProvisionNewTenantUseCase(sessionStore, organizationClient, administrationClient, workspaceClient);
  return { useCase, sessionStore, organizationClient, administrationClient, workspaceClient };
}

describe('ProvisionNewTenantUseCase', () => {
  it('rifiuta se la sessione non esiste', async () => {
    const { useCase } = buildUseCase();
    await expect(
      useCase.execute({ conversationId: 'non-esiste', name: 'Rossi Srl', ownerUserId: 'user-1', userAccessToken: 't' }),
    ).rejects.toThrow(ConversationSessionNotFoundError);
  });

  it('rifiuta con LegalConsentRequiredError se il consenso legale non è stato ancora registrato', async () => {
    const { useCase, sessionStore, organizationClient } = buildUseCase();
    const session = ConversationSession.start({ userId: 'user-1' }); // NIENTE consenso, deliberatamente
    sessionStore.seed(session);

    await expect(
      useCase.execute({ conversationId: session.id, name: 'Rossi Srl', ownerUserId: 'user-1', userAccessToken: 't' }),
    ).rejects.toThrow(LegalConsentRequiredError);

    // Nessuna chiamata a Organization deve essere tentata prima del controllo del consenso.
    expect(organizationClient.calls).toHaveLength(0);
  });

  it('esegue i tre passi in ordine per una sessione nuova', async () => {
    const { useCase, sessionStore, organizationClient, administrationClient, workspaceClient } = buildUseCase();
    const session = buildSessionWithConsent('user-1');
    sessionStore.seed(session);

    const result = await useCase.execute({
      conversationId: session.id,
      name: 'Rossi Srl',
      ownerUserId: 'user-1',
      userAccessToken: 'token-utente',
    });

    expect(result).toEqual({ organizationId: 'org-1', workspaceId: 'ws-1' });
    expect(organizationClient.calls).toHaveLength(1);
    expect(administrationClient.calls).toHaveLength(1);
    expect(workspaceClient.calls).toHaveLength(1);
  });

  it('pubblica eventi con il nome dell\'aggregate reale (ConversationSession), mai un termine di prodotto', async () => {
    const { useCase, sessionStore } = buildUseCase();
    const session = buildSessionWithConsent('user-1');
    sessionStore.seed(session);

    await useCase.execute({ conversationId: session.id, name: 'Rossi Srl', ownerUserId: 'user-1', userAccessToken: 't' });

    const eventTypes = sessionStore.savedEvents.map((e) => e.eventType);
    expect(eventTypes).toEqual([
      'ConversationSessionOrganizationProvisioned',
      'ConversationSessionRolesProvisioned',
      'ConversationSessionProvisioningCompleted',
    ]);
    expect(eventTypes.every((t) => !t.includes('FirstMeeting'))).toBe(true);
  });

  it('ogni evento pubblicato include schema_version nel payload', async () => {
    const { useCase, sessionStore } = buildUseCase();
    const session = buildSessionWithConsent('user-1');
    sessionStore.seed(session);

    await useCase.execute({ conversationId: session.id, name: 'Rossi Srl', ownerUserId: 'user-1', userAccessToken: 't' });

    expect(sessionStore.savedEvents.every((e) => e.payload.schema_version === 1)).toBe(true);
  });

  it('inoltra il token utente sia a Organization sia a Workspace, mai ad Administration', async () => {
    const { useCase, sessionStore, organizationClient, workspaceClient } = buildUseCase();
    const session = buildSessionWithConsent('user-1');
    sessionStore.seed(session);

    await useCase.execute({ conversationId: session.id, name: 'Rossi Srl', ownerUserId: 'user-1', userAccessToken: 'token-utente' });

    expect(organizationClient.calls[0]?.userAccessToken).toBe('token-utente');
    expect(workspaceClient.calls[0]?.userAccessToken).toBe('token-utente');
  });

  it('RIPRESA: se l\'Organization è già stata provisionata, non la ricrea — riparte dal passo successivo', async () => {
    const { useCase, sessionStore, organizationClient, administrationClient, workspaceClient } = buildUseCase();
    const session = buildSessionWithConsent('user-1');
    session.linkToOrganization('org-già-creata');
    session.completeStep(ConversationSteps.ORGANIZATION_CREATED, { organization_id: 'org-già-creata' });
    sessionStore.seed(session);

    const result = await useCase.execute({
      conversationId: session.id,
      name: 'Rossi Srl',
      ownerUserId: 'user-1',
      userAccessToken: 'token-utente',
    });

    expect(organizationClient.calls).toHaveLength(0);
    expect(administrationClient.calls).toHaveLength(1);
    expect(administrationClient.calls[0]?.organizationId).toBe('org-già-creata');
    expect(workspaceClient.calls).toHaveLength(1);
    expect(result.organizationId).toBe('org-già-creata');
  });

  it('RIPRESA: se organizzazione e ruoli sono già a posto, tenta solo il Workspace', async () => {
    const { useCase, sessionStore, organizationClient, administrationClient, workspaceClient } = buildUseCase();
    const session = buildSessionWithConsent('user-1');
    session.linkToOrganization('org-1');
    session.completeStep(ConversationSteps.ORGANIZATION_CREATED, { organization_id: 'org-1' });
    session.completeStep(ConversationSteps.ROLES_PROVISIONED);
    sessionStore.seed(session);

    await useCase.execute({ conversationId: session.id, name: 'Rossi Srl', ownerUserId: 'user-1', userAccessToken: 't' });

    expect(organizationClient.calls).toHaveLength(0);
    expect(administrationClient.calls).toHaveLength(0);
    expect(workspaceClient.calls).toHaveLength(1);
  });

  it('RIPRESA: se il provisioning è già completo, non richiama nessun servizio e restituisce il risultato già ottenuto', async () => {
    const { useCase, sessionStore, organizationClient, administrationClient, workspaceClient } = buildUseCase();
    const session = buildSessionWithConsent('user-1');
    session.linkToOrganization('org-1');
    session.completeStep(ConversationSteps.ORGANIZATION_CREATED, { organization_id: 'org-1' });
    session.completeStep(ConversationSteps.ROLES_PROVISIONED);
    session.completeStep(ConversationSteps.WORKSPACE_CREATED, { workspace_id: 'ws-1' });
    sessionStore.seed(session);

    const result = await useCase.execute({ conversationId: session.id, name: 'Rossi Srl', ownerUserId: 'user-1', userAccessToken: 't' });

    expect(organizationClient.calls).toHaveLength(0);
    expect(administrationClient.calls).toHaveLength(0);
    expect(workspaceClient.calls).toHaveLength(0);
    expect(result).toEqual({ organizationId: 'org-1', workspaceId: 'ws-1' });
  });

  it('un passo fallito marca la sessione come fallita, la persiste, e segnala esplicitamente quale passo è fallito', async () => {
    const failingAdministrationClient = new FakeAdministrationClient(async () => {
      throw new Error('Administration non raggiungibile');
    });
    const { useCase, sessionStore, workspaceClient } = buildUseCase({ administrationClient: failingAdministrationClient });
    const session = buildSessionWithConsent('user-1');
    sessionStore.seed(session);

    let caught: unknown;
    try {
      await useCase.execute({ conversationId: session.id, name: 'Rossi Srl', ownerUserId: 'user-1', userAccessToken: 't' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ProvisioningStepFailedError);
    expect((caught as ProvisioningStepFailedError).step).toBe('default-roles');
    expect(workspaceClient.calls).toHaveLength(0);

    const persisted = await sessionStore.findById(session.id);
    expect(persisted?.status).toBe('FAILED');
    // Il passo precedente (organization), già riuscito, resta registrato.
    expect(persisted?.isStepComplete(ConversationSteps.ORGANIZATION_CREATED)).toBe(true);
    expect(persisted?.getStep(ConversationSteps.ROLES_PROVISIONED)?.status).toBe('FAILED');
  });

  it('dopo un fallimento, una chiamata successiva riprende correttamente dal passo mancante', async () => {
    let administrationCallCount = 0;
    const flakyAdministrationClient = new FakeAdministrationClient(async () => {
      administrationCallCount += 1;
      if (administrationCallCount === 1) throw new Error('Administration temporaneamente non raggiungibile');
    });
    const { useCase, sessionStore, organizationClient, workspaceClient } = buildUseCase({
      administrationClient: flakyAdministrationClient,
    });
    const session = buildSessionWithConsent('user-1');
    sessionStore.seed(session);

    await expect(
      useCase.execute({ conversationId: session.id, name: 'Rossi Srl', ownerUserId: 'user-1', userAccessToken: 't' }),
    ).rejects.toThrow(ProvisioningStepFailedError);

    const result = await useCase.execute({
      conversationId: session.id,
      name: 'Rossi Srl',
      ownerUserId: 'user-1',
      userAccessToken: 't',
    });

    expect(organizationClient.calls).toHaveLength(1);
    expect(administrationCallCount).toBe(2);
    expect(workspaceClient.calls).toHaveLength(1);
    expect(result).toEqual({ organizationId: 'org-1', workspaceId: 'ws-1' });
  });
});
