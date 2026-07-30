import { describe, it, expect } from 'vitest';
import {
  Workspace,
  WorkspaceAlreadyArchivedError,
  InvalidWorkspaceNameError,
  MemberAlreadyPresentError,
  MemberNotFoundError,
} from '../workspace.entity';

function buildWorkspace() {
  return Workspace.create({
    organizationId: 'org-1',
    name: 'Commerciale',
    creatorUserId: 'user-1',
    creatorRoleName: 'Admin',
  });
}

describe('Workspace Aggregate Root', () => {
  it('crea un workspace con il creatore già come membro', () => {
    const ws = buildWorkspace();
    expect(ws.members).toHaveLength(1);
    expect(ws.members[0]?.userId).toBe('user-1');
    expect(ws.isMember('user-1')).toBe(true);
  });

  it('rifiuta un nome vuoto', () => {
    expect(() =>
      Workspace.create({ organizationId: 'org-1', name: '  ', creatorUserId: 'user-1', creatorRoleName: 'Admin' }),
    ).toThrow(InvalidWorkspaceNameError);
  });

  it('aggiunge un nuovo membro', () => {
    const ws = buildWorkspace();
    ws.addMember('user-2', 'Commerciale');
    expect(ws.members).toHaveLength(2);
    expect(ws.isMember('user-2')).toBe(true);
  });

  it('rifiuta di aggiungere lo stesso membro due volte', () => {
    const ws = buildWorkspace();
    expect(() => ws.addMember('user-1', 'Admin')).toThrow(MemberAlreadyPresentError);
  });

  it('rimuove un membro esistente', () => {
    const ws = buildWorkspace();
    ws.addMember('user-2', 'Commerciale');
    ws.removeMember('user-2');
    expect(ws.isMember('user-2')).toBe(false);
    expect(ws.members).toHaveLength(1);
  });

  it('rifiuta di rimuovere un membro inesistente', () => {
    const ws = buildWorkspace();
    expect(() => ws.removeMember('user-mai-esistito')).toThrow(MemberNotFoundError);
  });

  it('cambia il ruolo di un membro esistente', () => {
    const ws = buildWorkspace();
    ws.addMember('user-2', 'Commerciale');
    ws.changeMemberRole('user-2', 'Direttore Commerciale');
    const member = ws.members.find((m) => m.userId === 'user-2');
    expect(member?.roleName).toBe('Direttore Commerciale');
  });

  it('rifiuta di cambiare ruolo a un membro inesistente', () => {
    const ws = buildWorkspace();
    expect(() => ws.changeMemberRole('user-mai-esistito', 'Ruolo')).toThrow(MemberNotFoundError);
  });

  it('archivia il workspace', () => {
    const ws = buildWorkspace();
    ws.archive();
    expect(ws.isArchived).toBe(true);
  });

  it('non permette operazioni su un workspace archiviato', () => {
    const ws = buildWorkspace();
    ws.archive();
    expect(() => ws.addMember('user-2', 'Ruolo')).toThrow(WorkspaceAlreadyArchivedError);
    expect(() => ws.rename('Nuovo nome')).toThrow(WorkspaceAlreadyArchivedError);
    expect(() => ws.archive()).toThrow(WorkspaceAlreadyArchivedError);
  });

  it('ricostruisce correttamente da dati persistiti, inclusi i membri', () => {
    const original = buildWorkspace();
    original.addMember('user-2', 'Commerciale');
    const reconstituted = Workspace.reconstitute(original.toPersistence());
    expect(reconstituted.members).toHaveLength(2);
    expect(reconstituted.isMember('user-2')).toBe(true);
  });

  it('toPersistence restituisce una copia, non un riferimento mutabile ai membri interni', () => {
    const ws = buildWorkspace();
    const persisted = ws.toPersistence();
    persisted.members.push({ userId: 'user-esterno', roleName: 'X', joinedAt: new Date() });
    expect(ws.members).toHaveLength(1);
  });
});
