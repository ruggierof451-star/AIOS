import { describe, it, expect, beforeEach } from 'vitest';
import {
  RegisterUserUseCase,
  EmailAlreadyRegisteredError,
  WeakPasswordError,
} from '../register-user.use-case';
import { InvalidEmailError } from '../../domain/email.vo';
import { User } from '../../domain/user.entity';
import { Email } from '../../domain/email.vo';
import type {
  UserRepository,
  PasswordHasher,
  DomainEventPublisher,
} from '../ports';

/** Fake in-memory del repository — niente database reale in un unit test. */
class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.equals(email)) return user;
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}

class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

class RecordingEventPublisher implements DomainEventPublisher {
  public published: Array<{ eventType: string; aggregateId: string; payload: Record<string, unknown> }> = [];
  async publish(event: { eventType: string; aggregateId: string; payload: Record<string, unknown> }): Promise<void> {
    this.published.push(event);
  }
}

describe('RegisterUserUseCase', () => {
  let repository: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let events: RecordingEventPublisher;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    events = new RecordingEventPublisher();
    useCase = new RegisterUserUseCase(repository, hasher, events);
  });

  it('registra un utente con email e password valide', async () => {
    const result = await useCase.execute({
      email: 'mario@azienda.it',
      password: 'passwordSicura123',
    });

    expect(result.email).toBe('mario@azienda.it');
    expect(result.userId).toBeTruthy();
  });

  it('salva l\'utente con la password hashata, mai in chiaro', async () => {
    await useCase.execute({ email: 'mario@azienda.it', password: 'passwordSicura123' });
    const saved = await repository.findByEmail(Email.create('mario@azienda.it'));
    expect(saved?.passwordHash).toBe('hashed:passwordSicura123');
  });

  it('pubblica l\'evento UserRegistered dopo la registrazione', async () => {
    const result = await useCase.execute({ email: 'mario@azienda.it', password: 'passwordSicura123' });
    expect(events.published).toHaveLength(1);
    expect(events.published[0].eventType).toBe('UserRegistered');
    expect(events.published[0].aggregateId).toBe(result.userId);
  });

  it('rifiuta una seconda registrazione con la stessa email', async () => {
    await useCase.execute({ email: 'mario@azienda.it', password: 'passwordSicura123' });
    await expect(
      useCase.execute({ email: 'mario@azienda.it', password: 'unAltraPassword1' }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('rifiuta la stessa email con maiuscole diverse (case-insensitive)', async () => {
    await useCase.execute({ email: 'mario@azienda.it', password: 'passwordSicura123' });
    await expect(
      useCase.execute({ email: 'Mario@Azienda.IT', password: 'unAltraPassword1' }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('rifiuta un\'email malformata', async () => {
    await expect(
      useCase.execute({ email: 'non-una-email', password: 'passwordSicura123' }),
    ).rejects.toThrow(InvalidEmailError);
  });

  it('rifiuta una password troppo corta', async () => {
    await expect(
      useCase.execute({ email: 'mario@azienda.it', password: 'corta1' }),
    ).rejects.toThrow(WeakPasswordError);
  });

  it('rifiuta una password senza cifre', async () => {
    await expect(
      useCase.execute({ email: 'mario@azienda.it', password: 'soloLettereLunghe' }),
    ).rejects.toThrow(WeakPasswordError);
  });

  it('rifiuta una password senza lettere', async () => {
    await expect(
      useCase.execute({ email: 'mario@azienda.it', password: '1234567890' }),
    ).rejects.toThrow(WeakPasswordError);
  });

  it('non pubblica alcun evento se la registrazione fallisce', async () => {
    await expect(
      useCase.execute({ email: 'non-una-email', password: 'passwordSicura123' }),
    ).rejects.toThrow();
    expect(events.published).toHaveLength(0);
  });
});
