/**
 * Fake in-memory condivisi tra i test dei casi d'uso di Identity — evita
 * di duplicare le stesse implementazioni fittizie in ogni file di test.
 */

import { User } from '../../domain/user.entity';
import { Email } from '../../domain/email.vo';
import type {
  UserRepository,
  PasswordHasher,
  DomainEventPublisher,
  TokenService,
  AccessTokenClaims,
  RefreshTokenRepository,
  RefreshTokenRecord,
} from '../ports';
import type { MfaVerifier } from '../authenticate-user.use-case';
import { generateUuidV7 } from '@aios/domain-model';

export class InMemoryUserRepository implements UserRepository {
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

export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

export class RecordingEventPublisher implements DomainEventPublisher {
  public published: Array<{ eventType: string; aggregateId: string; payload: Record<string, unknown> }> = [];
  async publish(event: { eventType: string; aggregateId: string; payload: Record<string, unknown> }): Promise<void> {
    this.published.push(event);
  }
}

/** Token service fittizio, deterministico e senza crittografia reale — solo per test. */
export class FakeTokenService implements TokenService {
  signAccessToken(claims: AccessTokenClaims): string {
    return `access:${claims.sub}`;
  }
  verifyAccessToken(token: string): AccessTokenClaims {
    const sub = token.replace('access:', '');
    return { sub, email: '' };
  }
  generateRefreshTokenValue(): string {
    return `refresh-value:${generateUuidV7()}`;
  }
  hashRefreshTokenValue(value: string): string {
    return `hash:${value}`;
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private tokens = new Map<string, RefreshTokenRecord>();

  async create(record: Omit<RefreshTokenRecord, 'id'>): Promise<RefreshTokenRecord> {
    const id = generateUuidV7();
    const full: RefreshTokenRecord = { id, ...record };
    this.tokens.set(id, full);
    return full;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    for (const record of this.tokens.values()) {
      if (record.tokenHash === tokenHash) return record;
    }
    return null;
  }

  async revoke(id: string, replacedById: string | null): Promise<void> {
    const record = this.tokens.get(id);
    if (record) {
      record.revokedAt = new Date();
      record.replacedBy = replacedById;
    }
  }
}

/** Sempre valido per il codice '111111', per test deterministici. */
export class FakeMfaVerifier implements MfaVerifier {
  async verify(_userId: string, code: string): Promise<boolean> {
    return code === '111111';
  }
}

export async function registerFakeUser(
  repository: InMemoryUserRepository,
  hasher: FakePasswordHasher,
  emailValue: string,
  passwordValue: string,
): Promise<User> {
  const user = User.register({
    email: Email.create(emailValue),
    passwordHash: await hasher.hash(passwordValue),
  });
  await repository.save(user);
  return user;
}
