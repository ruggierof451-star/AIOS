/**
 * Caso d'uso: Registrazione di un nuovo utente.
 * Genera l'evento `UserRegistered` (Event Catalog) alla fine, coerente con
 * "ogni Domain Event nasce dopo la persistenza transazionale" (AI Platform
 * Modulo 3 / API Contract, sezione 5.2 — ordine di pubblicazione).
 */

import { Email, InvalidEmailError } from '../domain/email.vo';
import { User } from '../domain/user.entity';
import {
  UserRepository,
  PasswordHasher,
  DomainEventPublisher,
} from './ports';

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('Un utente con questa email è già registrato.');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class WeakPasswordError extends Error {
  constructor() {
    super('La password non rispetta i requisiti minimi di sicurezza.');
    this.name = 'WeakPasswordError';
  }
}

export interface RegisterUserInput {
  email: string;
  password: string;
}

export interface RegisterUserOutput {
  userId: string;
  email: string;
}

const MIN_PASSWORD_LENGTH = 10;

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // Validazione di formato prima di qualunque logica di business
    // (Runtime, sezione 4.3 — schema prima di business rule).
    let email: Email;
    try {
      email = Email.create(input.email);
    } catch (err) {
      if (err instanceof InvalidEmailError) throw err;
      throw err;
    }

    this.assertPasswordStrength(input.password);

    const existing = await this.userRepository.findByEmail(email);
    if (existing !== null) {
      // Deduplicazione con errore esplicito, mai una creazione silenziosa
      // di un secondo record (coerente col pattern generale di
      // deduplicazione già stabilito per Party/Product nel Domain Model).
      throw new EmailAlreadyRegisteredError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = User.register({ email, passwordHash });

    await this.userRepository.save(user);

    await this.eventPublisher.publish({
      eventType: 'UserRegistered',
      aggregateId: user.id,
      payload: { user_id: user.id, email: email.toString() },
    });

    return { userId: user.id, email: email.toString() };
  }

  private assertPasswordStrength(password: string): void {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new WeakPasswordError();
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    if (!hasLetter || !hasDigit) {
      throw new WeakPasswordError();
    }
  }
}
