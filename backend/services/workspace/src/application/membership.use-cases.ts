import { Invite } from '../domain/invite.entity';
import {
  WorkspaceRepository,
  InviteRepository,
  DomainEventPublisher,
  WorkspaceNotFoundError,
  InviteNotFoundError,
  InviteNotifier,
} from './ports';

export interface InviteUserInput {
  workspaceId: string;
  email: string;
  invitedByUserId: string;
  roleName: string;
}

export class InviteUserUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly inviteRepository: InviteRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly inviteNotifier: InviteNotifier,
  ) {}

  async execute(input: InviteUserInput): Promise<{ inviteId: string }> {
    const workspace = await this.workspaceRepository.findById(input.workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError();

    const { invite, plainToken } = Invite.create({
      workspaceId: input.workspaceId,
      email: input.email,
      invitedByUserId: input.invitedByUserId,
      roleName: input.roleName,
    });

    await this.inviteRepository.save(invite);

    await this.eventPublisher.publish({
      eventType: 'WorkspaceInviteCreated',
      aggregateId: invite.id,
      organizationId: workspace.organizationId,
      payload: { schema_version: 1, invite_id: invite.id, workspace_id: workspace.id, email: invite.email },
    });

    // L'invio email avviene DOPO la persistenza (mai bloccare la
    // creazione dell'invito se il provider email è temporaneamente
    // irraggiungibile) — se fallisce, l'invito resta comunque valido e
    // accettabile con il link, solo la notifica non è arrivata.
    await this.inviteNotifier.sendInviteEmail({
      email: invite.email,
      plainToken,
      workspaceName: workspace.name,
    });

    return { inviteId: invite.id };
  }
}

export interface AcceptInviteInput {
  plainToken: string;
  acceptingUserId: string;
}

export class AcceptInviteUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly inviteRepository: InviteRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly hashToken: (plainToken: string) => string,
  ) {}

  async execute(input: AcceptInviteInput): Promise<{ workspaceId: string }> {
    const tokenHash = this.hashToken(input.plainToken);
    const invite = await this.inviteRepository.findByTokenHash(tokenHash);
    if (!invite) throw new InviteNotFoundError();

    invite.accept(); // lancia InviteAlreadyProcessedError / InviteExpiredError se non valido

    const workspace = await this.workspaceRepository.findById(invite.workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError();

    workspace.addMember(input.acceptingUserId, invite.roleName);

    await this.inviteRepository.save(invite);
    await this.workspaceRepository.save(workspace);

    await this.eventPublisher.publish({
      eventType: 'WorkspaceMemberAdded',
      aggregateId: workspace.id,
      organizationId: workspace.organizationId,
      payload: { schema_version: 1, workspace_id: workspace.id, user_id: input.acceptingUserId, role_name: invite.roleName },
    });

    return { workspaceId: workspace.id };
  }
}

export interface RemoveMemberInput {
  workspaceId: string;
  userId: string;
}

export class RemoveMemberUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(input: RemoveMemberInput): Promise<void> {
    const workspace = await this.workspaceRepository.findById(input.workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError();

    workspace.removeMember(input.userId); // lancia MemberNotFoundError se non presente
    await this.workspaceRepository.save(workspace);

    await this.eventPublisher.publish({
      eventType: 'WorkspaceMemberRemoved',
      aggregateId: workspace.id,
      organizationId: workspace.organizationId,
      payload: { schema_version: 1, workspace_id: workspace.id, user_id: input.userId },
    });
  }
}

export interface ChangeMemberRoleInput {
  workspaceId: string;
  userId: string;
  newRoleName: string;
}

export class ChangeMemberRoleUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(input: ChangeMemberRoleInput): Promise<void> {
    const workspace = await this.workspaceRepository.findById(input.workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError();

    workspace.changeMemberRole(input.userId, input.newRoleName);
    await this.workspaceRepository.save(workspace);

    await this.eventPublisher.publish({
      eventType: 'WorkspaceMemberRoleChanged',
      aggregateId: workspace.id,
      organizationId: workspace.organizationId,
      payload: { schema_version: 1, workspace_id: workspace.id, user_id: input.userId, new_role_name: input.newRoleName },
    });
  }
}
