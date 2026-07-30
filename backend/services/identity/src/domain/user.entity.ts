/**
 * User — Aggregate Root del Bounded Context Identity (Domain Model,
 * sezione 2.1 e 3 esteso). Rappresenta "chi" indipendentemente da quale
 * azienda sta usando in un dato momento (quello è Workspace/Organization).
 */

import { generateUuidV7 } from '@aios/domain-model';
import { Email } from './email.vo';

export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export class UserAlreadySuspendedError extends Error {
  constructor() {
    super('L\'utente è già sospeso.');
    this.name = 'UserAlreadySuspendedError';
  }
}

export class UserSuspendedError extends Error {
  constructor() {
    super('Impossibile autenticare: utente sospeso.');
    this.name = 'UserSuspendedError';
  }
}

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: string | null;
  mfaEnabled: boolean;
  status: UserStatus;
  createdAt: Date;
  lockVersion: number;
}

export class User {
  private constructor(private props: UserProps) {}

  static register(params: { email: Email; passwordHash: string }): User {
    return new User({
      id: generateUuidV7(),
      email: params.email,
      passwordHash: params.passwordHash,
      mfaEnabled: false,
      status: 'ACTIVE',
      createdAt: new Date(),
      lockVersion: 1,
    });
  }

  /** Ricostruzione da persistenza — mai da usare per creare un nuovo utente. */
  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  get mfaEnabled(): boolean {
    return this.props.mfaEnabled;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get lockVersion(): number {
    return this.props.lockVersion;
  }

  /** Invariante: non si può autenticare un utente sospeso. */
  assertCanAuthenticate(): void {
    if (this.props.status === 'SUSPENDED') {
      throw new UserSuspendedError();
    }
  }

  enableMfa(): void {
    this.props.mfaEnabled = true;
  }

  disableMfa(): void {
    this.props.mfaEnabled = false;
  }

  suspend(): void {
    if (this.props.status === 'SUSPENDED') {
      throw new UserAlreadySuspendedError();
    }
    this.props.status = 'SUSPENDED';
  }

  toPersistence(): UserProps {
    return { ...this.props };
  }
}
