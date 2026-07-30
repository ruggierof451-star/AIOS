/**
 * Workspace — Aggregate Root (Milestone 2). Include la membership come
 * parte del proprio confine (Domain Model, sezione 5 — un Aggregate Root
 * è l'unico punto di scrittura consistente per le entità che deve
 * cambiare insieme: aggiungere/rimuovere un membro è sempre un'operazione
 * sul Workspace, mai una scrittura diretta e indipendente su una riga di
 * membership).
 */

import { generateUuidV7 } from '@aios/domain-model';

export class WorkspaceAlreadyArchivedError extends Error {
  constructor() {
    super('Il workspace è già archiviato.');
    this.name = 'WorkspaceAlreadyArchivedError';
  }
}

export class InvalidWorkspaceNameError extends Error {
  constructor() {
    super('Il nome del workspace non può essere vuoto.');
    this.name = 'InvalidWorkspaceNameError';
  }
}

export class MemberAlreadyPresentError extends Error {
  constructor() {
    super('L\'utente è già membro di questo workspace.');
    this.name = 'MemberAlreadyPresentError';
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super('Questo utente non è membro del workspace.');
    this.name = 'MemberNotFoundError';
  }
}

export interface WorkspaceMember {
  userId: string;
  roleName: string;
  joinedAt: Date;
}

export interface WorkspaceProps {
  id: string;
  organizationId: string;
  name: string;
  members: WorkspaceMember[];
  createdAt: Date;
  archivedAt: Date | null;
  lockVersion: number;
}

export class Workspace {
  private constructor(private props: WorkspaceProps) {}

  static create(params: {
    organizationId: string;
    name: string;
    creatorUserId: string;
    creatorRoleName: string;
  }): Workspace {
    const trimmed = params.name.trim();
    if (trimmed.length === 0) throw new InvalidWorkspaceNameError();

    return new Workspace({
      id: generateUuidV7(),
      organizationId: params.organizationId,
      name: trimmed,
      members: [{ userId: params.creatorUserId, roleName: params.creatorRoleName, joinedAt: new Date() }],
      createdAt: new Date(),
      archivedAt: null,
      lockVersion: 1,
    });
  }

  static reconstitute(props: WorkspaceProps): Workspace {
    return new Workspace(props);
  }

  get id(): string {
    return this.props.id;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get name(): string {
    return this.props.name;
  }
  get members(): ReadonlyArray<WorkspaceMember> {
    return this.props.members;
  }
  get isArchived(): boolean {
    return this.props.archivedAt !== null;
  }
  get lockVersion(): number {
    return this.props.lockVersion;
  }

  rename(newName: string): void {
    this.assertNotArchived();
    const trimmed = newName.trim();
    if (trimmed.length === 0) throw new InvalidWorkspaceNameError();
    this.props.name = trimmed;
  }

  addMember(userId: string, roleName: string): void {
    this.assertNotArchived();
    if (this.props.members.some((m) => m.userId === userId)) {
      throw new MemberAlreadyPresentError();
    }
    this.props.members.push({ userId, roleName, joinedAt: new Date() });
  }

  removeMember(userId: string): void {
    this.assertNotArchived();
    const exists = this.props.members.some((m) => m.userId === userId);
    if (!exists) throw new MemberNotFoundError();
    this.props.members = this.props.members.filter((m) => m.userId !== userId);
  }

  changeMemberRole(userId: string, newRoleName: string): void {
    this.assertNotArchived();
    const member = this.props.members.find((m) => m.userId === userId);
    if (!member) throw new MemberNotFoundError();
    member.roleName = newRoleName;
  }

  isMember(userId: string): boolean {
    return this.props.members.some((m) => m.userId === userId);
  }

  archive(): void {
    this.assertNotArchived();
    this.props.archivedAt = new Date();
  }

  private assertNotArchived(): void {
    if (this.isArchived) throw new WorkspaceAlreadyArchivedError();
  }

  toPersistence(): WorkspaceProps {
    return { ...this.props, members: [...this.props.members] };
  }
}
