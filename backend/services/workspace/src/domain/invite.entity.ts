import { generateUuidV7 } from '@aios/domain-model';
import { randomBytes, createHash } from 'node:crypto';

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export class InviteAlreadyProcessedError extends Error {
  constructor() {
    super('Questo invito è già stato accettato o revocato.');
    this.name = 'InviteAlreadyProcessedError';
  }
}

export class InviteExpiredError extends Error {
  constructor() {
    super('Questo invito è scaduto.');
    this.name = 'InviteExpiredError';
  }
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni

export interface InviteProps {
  id: string;
  workspaceId: string;
  email: string;
  invitedByUserId: string;
  roleName: string;
  tokenHash: string;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
}

export class Invite {
  private constructor(private props: InviteProps) {}

  /** Restituisce sia l'entità sia il token in chiaro (mostrato una sola volta, mai persistito). */
  static create(params: {
    workspaceId: string;
    email: string;
    invitedByUserId: string;
    roleName: string;
  }): { invite: Invite; plainToken: string } {
    const plainToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');

    const invite = new Invite({
      id: generateUuidV7(),
      workspaceId: params.workspaceId,
      email: params.email.trim().toLowerCase(),
      invitedByUserId: params.invitedByUserId,
      roleName: params.roleName,
      tokenHash,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      createdAt: new Date(),
      acceptedAt: null,
    });

    return { invite, plainToken };
  }

  static reconstitute(props: InviteProps): Invite {
    return new Invite(props);
  }

  get id(): string {
    return this.props.id;
  }
  get workspaceId(): string {
    return this.props.workspaceId;
  }
  get email(): string {
    return this.props.email;
  }
  get roleName(): string {
    return this.props.roleName;
  }
  get status(): InviteStatus {
    return this.props.status;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }

  assertCanBeAccepted(): void {
    if (this.props.status !== 'PENDING') {
      throw new InviteAlreadyProcessedError();
    }
    if (this.props.expiresAt.getTime() < Date.now()) {
      this.props.status = 'EXPIRED';
      throw new InviteExpiredError();
    }
  }

  accept(): void {
    this.assertCanBeAccepted();
    this.props.status = 'ACCEPTED';
    this.props.acceptedAt = new Date();
  }

  revoke(): void {
    if (this.props.status !== 'PENDING') {
      throw new InviteAlreadyProcessedError();
    }
    this.props.status = 'REVOKED';
  }

  toPersistence(): InviteProps {
    return { ...this.props };
  }
}
