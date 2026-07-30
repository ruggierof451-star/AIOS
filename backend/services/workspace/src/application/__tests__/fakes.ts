import { createHash } from 'node:crypto';
import { Workspace } from '../../domain/workspace.entity';
import { Invite } from '../../domain/invite.entity';
import type {
  WorkspaceRepository,
  InviteRepository,
  DomainEventPublisher,
  InviteNotifier,
} from '../ports';

export class InMemoryWorkspaceRepository implements WorkspaceRepository {
  private workspaces = new Map<string, Workspace>();
  async findById(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) ?? null;
  }
  async save(workspace: Workspace): Promise<void> {
    this.workspaces.set(workspace.id, workspace);
  }
}

export class InMemoryInviteRepository implements InviteRepository {
  private invites = new Map<string, Invite>();
  async findById(id: string): Promise<Invite | null> {
    return this.invites.get(id) ?? null;
  }
  async findByTokenHash(tokenHash: string): Promise<Invite | null> {
    for (const invite of this.invites.values()) {
      if (invite.tokenHash === tokenHash) return invite;
    }
    return null;
  }
  async save(invite: Invite): Promise<void> {
    this.invites.set(invite.id, invite);
  }
}

export class RecordingEventPublisher implements DomainEventPublisher {
  public published: Array<{ eventType: string; aggregateId: string; payload: Record<string, unknown> }> = [];
  async publish(event: { eventType: string; aggregateId: string; payload: Record<string, unknown> }): Promise<void> {
    this.published.push(event);
  }
}

export class RecordingInviteNotifier implements InviteNotifier {
  public sent: Array<{ email: string; plainToken: string; workspaceName: string }> = [];
  async sendInviteEmail(params: { email: string; plainToken: string; workspaceName: string }): Promise<void> {
    this.sent.push(params);
  }
}

/** Stesso algoritmo di hashing usato realmente dall'entità Invite (sha256). */
export function fakeHashToken(plainToken: string): string {
  return createHash('sha256').update(plainToken).digest('hex');
}
