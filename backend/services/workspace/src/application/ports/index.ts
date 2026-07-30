import { Workspace } from '../../domain/workspace.entity';
import { Invite } from '../../domain/invite.entity';

export interface WorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<void>;
}

export interface InviteRepository {
  findById(id: string): Promise<Invite | null>;
  findByTokenHash(tokenHash: string): Promise<Invite | null>;
  save(invite: Invite): Promise<void>;
}

export class OptimisticLockError extends Error {
  constructor() {
    super('Conflitto di concorrenza: il record è stato modificato da un\'altra richiesta.');
    this.name = 'OptimisticLockError';
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor() {
    super('Workspace non trovato.');
    this.name = 'WorkspaceNotFoundError';
  }
}

export class InviteNotFoundError extends Error {
  constructor() {
    super('Invito non trovato o token non valido.');
    this.name = 'InviteNotFoundError';
  }
}

/**
 * Riesportato da @aios/eventing, mai più ridichiarato localmente —
 * convenzione definitiva sulla nomenclatura/forma degli eventi
 * (Feature 2.1). Vedi lo stesso consolidamento in Organization/ports.
 */
export type { DomainEvent, DomainEventPublisher } from '@aios/eventing';

/** Port verso un servizio di invio email (non implementato in questa milestone — vedi README). */
export interface InviteNotifier {
  sendInviteEmail(params: { email: string; plainToken: string; workspaceName: string }): Promise<void>;
}
