import type { JsonObject } from '@aios/domain-model';
/**
 * Port (interfacce) del layer applicativo di Identity. L'application layer
 * dipende solo da queste astrazioni, mai da Prisma/bcrypt/jsonwebtoken
 * direttamente — l'infrastruttura concreta (infrastructure/) le implementa.
 * Coerente con Clean Architecture: le dipendenze puntano sempre verso il
 * dominio, mai il contrario.
 */

import { User } from '../../domain/user.entity';
import { Email } from '../../domain/email.vo';

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /**
   * Salva un utente nuovo o modificato. Deve verificare `lockVersion`
   * per l'optimistic locking (Runtime, sezione 12.1) e lanciare
   * `OptimisticLockError` in caso di conflitto.
   */
  save(user: User): Promise<void>;
}

export class OptimisticLockError extends Error {
  constructor() {
    super('Conflitto di concorrenza: il record è stato modificato da un\'altra richiesta.');
    this.name = 'OptimisticLockError';
  }
}

export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, hash: string): Promise<boolean>;
}

export interface AccessTokenClaims {
  sub: string; // user id
  email: string;
}

export interface TokenService {
  signAccessToken(claims: AccessTokenClaims): string;
  verifyAccessToken(token: string): AccessTokenClaims;
  generateRefreshTokenValue(): string;
  hashRefreshTokenValue(value: string): string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: string | null;
}

export interface RefreshTokenRepository {
  create(record: Omit<RefreshTokenRecord, 'id'>): Promise<RefreshTokenRecord>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revoke(id: string, replacedById: string | null): Promise<void>;
}

/**
 * Publisher di Domain Event, coerente col pattern Transactional Outbox
 * (API Contract, sezione 5.2 / Physical Database Schema, sezione 5.1).
 * L'implementazione concreta scrive nella tabella outbox nella stessa
 * transazione, mai una pubblicazione diretta su Kafka da qui.
 */
export interface DomainEventPublisher {
  publish(event: {
    eventType: string;
    aggregateId: string;
    payload: JsonObject;
  }): Promise<void>;
}
