import { describe, it, expect, beforeEach } from 'vitest';
import { CreateWorkspaceUseCase } from '../create-workspace.use-case';
import {
  InviteUserUseCase,
  AcceptInviteUseCase,
  RemoveMemberUseCase,
  ChangeMemberRoleUseCase,
} from '../membership.use-cases';
import { WorkspaceNotFoundError, InviteNotFoundError } from '../ports';
import { Workspace } from '../../domain/workspace.entity';
import {
  InMemoryWorkspaceRepository,
  InMemoryInviteRepository,
  RecordingEventPublisher,
  RecordingInviteNotifier,
  fakeHashToken,
} from './fakes';

describe('CreateWorkspaceUseCase', () => {
  it('crea un workspace con il creatore come primo membro e pubblica WorkspaceCreated', async () => {
    const repo = new InMemoryWorkspaceRepository();
    const events = new RecordingEventPublisher();
    const useCase = new CreateWorkspaceUseCase(repo, events);

    const result = await useCase.execute({
      organizationId: 'org-1',
      name: 'Commerciale',
      creatorUserId: 'user-1',
      creatorRoleName: 'Admin',
    });

    const saved = await repo.findById(result.workspaceId);
    expect(saved?.members).toHaveLength(1);
    expect(events.published[0]?.eventType).toBe('WorkspaceCreated');
  });
});

describe('Flusso completo: invito → accettazione', () => {
  let workspaceRepo: InMemoryWorkspaceRepository;
  let inviteRepo: InMemoryInviteRepository;
  let events: RecordingEventPublisher;
  let notifier: RecordingInviteNotifier;
  let workspaceId: string;

  beforeEach(async () => {
    workspaceRepo = new InMemoryWorkspaceRepository();
    inviteRepo = new InMemoryInviteRepository();
    events = new RecordingEventPublisher();
    notifier = new RecordingInviteNotifier();

    const ws = Workspace.create({
      organizationId: 'org-1',
      name: 'Commerciale',
      creatorUserId: 'user-admin',
      creatorRoleName: 'Admin',
    });
    await workspaceRepo.save(ws);
    workspaceId = ws.id;
  });

  it('invita un utente e invia la notifica', async () => {
    const useCase = new InviteUserUseCase(workspaceRepo, inviteRepo, events, notifier);
    await useCase.execute({
      workspaceId,
      email: 'nuovo@azienda.it',
      invitedByUserId: 'user-admin',
      roleName: 'Commerciale',
    });

    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0]?.email).toBe('nuovo@azienda.it');
    expect(events.published[0]?.eventType).toBe('WorkspaceInviteCreated');
  });

  it('accetta l\'invito e aggiunge l\'utente come membro del workspace', async () => {
    const inviteUseCase = new InviteUserUseCase(workspaceRepo, inviteRepo, events, notifier);
    await inviteUseCase.execute({
      workspaceId,
      email: 'nuovo@azienda.it',
      invitedByUserId: 'user-admin',
      roleName: 'Commerciale',
    });
    const plainToken = notifier.sent[0]?.plainToken;
    if (!plainToken) throw new Error('Test setup non valido: nessun invito inviato.');

    const acceptUseCase = new AcceptInviteUseCase(workspaceRepo, inviteRepo, events, fakeHashToken);
    await acceptUseCase.execute({ plainToken, acceptingUserId: 'user-nuovo' });

    const workspace = await workspaceRepo.findById(workspaceId);
    expect(workspace?.isMember('user-nuovo')).toBe(true);
    expect(events.published.some((e) => e.eventType === 'WorkspaceMemberAdded')).toBe(true);
  });

  it('rifiuta l\'accettazione con un token inesistente', async () => {
    const acceptUseCase = new AcceptInviteUseCase(workspaceRepo, inviteRepo, events, fakeHashToken);
    await expect(
      acceptUseCase.execute({ plainToken: 'token-mai-esistito', acceptingUserId: 'user-x' }),
    ).rejects.toThrow(InviteNotFoundError);
  });
});

describe('RemoveMemberUseCase', () => {
  it('rimuove un membro e pubblica WorkspaceMemberRemoved', async () => {
    const repo = new InMemoryWorkspaceRepository();
    const events = new RecordingEventPublisher();

    const ws = Workspace.create({
      organizationId: 'org-1',
      name: 'Commerciale',
      creatorUserId: 'user-admin',
      creatorRoleName: 'Admin',
    });
    ws.addMember('user-2', 'Commerciale');
    await repo.save(ws);

    const useCase = new RemoveMemberUseCase(repo, events);
    await useCase.execute({ workspaceId: ws.id, userId: 'user-2' });

    const updated = await repo.findById(ws.id);
    expect(updated?.isMember('user-2')).toBe(false);
    expect(events.published[0]?.eventType).toBe('WorkspaceMemberRemoved');
  });

  it('rifiuta se il workspace non esiste', async () => {
    const repo = new InMemoryWorkspaceRepository();
    const events = new RecordingEventPublisher();
    const useCase = new RemoveMemberUseCase(repo, events);

    await expect(useCase.execute({ workspaceId: 'non-esiste', userId: 'user-2' })).rejects.toThrow(
      WorkspaceNotFoundError,
    );
  });
});

describe('ChangeMemberRoleUseCase', () => {
  it('cambia il ruolo di un membro e pubblica WorkspaceMemberRoleChanged', async () => {
    const repo = new InMemoryWorkspaceRepository();
    const events = new RecordingEventPublisher();

    const ws = Workspace.create({
      organizationId: 'org-1',
      name: 'Commerciale',
      creatorUserId: 'user-admin',
      creatorRoleName: 'Admin',
    });
    ws.addMember('user-2', 'Commerciale');
    await repo.save(ws);

    const useCase = new ChangeMemberRoleUseCase(repo, events);
    await useCase.execute({ workspaceId: ws.id, userId: 'user-2', newRoleName: 'Direttore Commerciale' });

    const updated = await repo.findById(ws.id);
    const member = updated?.members.find((m) => m.userId === 'user-2');
    expect(member?.roleName).toBe('Direttore Commerciale');
    expect(events.published[0]?.eventType).toBe('WorkspaceMemberRoleChanged');
  });
});
