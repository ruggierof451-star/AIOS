/**
 * Caso d'uso: Autenticazione (login). Genera access token (JWT a vita
 * breve) + refresh token (rotante, API Contract sezione 2.2).
 *
 * Nota MFA: se l'utente ha la MFA abilitata, questo caso d'uso richiede
 * anche il codice MFA valido — in un flusso reale a due passi (prima la
 * password, poi il codice), qui semplificato in un unico input opzionale
 * per restare nello scope di questa milestone; il flusso a due passi
 * completo (con un token temporaneo intermedio) è segnalato come lavoro
 * di rifinitura nel riepilogo della milestone, non un'omissione silenziosa.
 */

import { Email } from '../domain/email.vo';
import { UserSuspendedError } from '../domain/user.entity';
import {
  UserRepository,
  PasswordHasher,
  TokenService,
  RefreshTokenRepository,
  DomainEventPublisher,
} from './ports';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Email o password non corretti.');
    this.name = 'InvalidCredentialsError';
  }
}

export class MfaCodeRequiredError extends Error {
  constructor() {
    super('È richiesto il codice di autenticazione a due fattori.');
    this.name = 'MfaCodeRequiredError';
  }
}

export class MfaCodeInvalidError extends Error {
  constructor() {
    super('Il codice di autenticazione a due fattori non è valido.');
    this.name = 'MfaCodeInvalidError';
  }
}

export interface MfaVerifier {
  verify(userId: string, code: string): Promise<boolean>;
}

export interface AuthenticateUserInput {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface AuthenticateUserOutput {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni (API Contract, sez. 2.2)

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly mfaVerifier: MfaVerifier,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    const email = Email.create(input.email);
    const user = await this.userRepository.findByEmail(email);

    // Mai rivelare se è l'email o la password a essere sbagliata — stesso
    // errore generico in entrambi i casi, per non facilitare l'enumerazione
    // di account esistenti (Infrastructure Modulo 4, sez. 12 — Zero Trust
    // applicato anche qui, non solo tra servizi).
    if (user === null || user.passwordHash === null) {
      throw new InvalidCredentialsError();
    }

    const passwordValid = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new InvalidCredentialsError();
    }

    try {
      user.assertCanAuthenticate();
    } catch (err) {
      if (err instanceof UserSuspendedError) throw err;
      throw err;
    }

    if (user.mfaEnabled) {
      if (!input.mfaCode) {
        throw new MfaCodeRequiredError();
      }
      const mfaValid = await this.mfaVerifier.verify(user.id, input.mfaCode);
      if (!mfaValid) {
        throw new MfaCodeInvalidError();
      }
    }

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email.toString(),
    });

    const refreshTokenValue = this.tokenService.generateRefreshTokenValue();
    const refreshTokenHash = this.tokenService.hashRefreshTokenValue(refreshTokenValue);

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      revokedAt: null,
      replacedBy: null,
    });

    await this.eventPublisher.publish({
      eventType: 'UserAuthenticated',
      aggregateId: user.id,
      payload: { user_id: user.id },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      userId: user.id,
    };
  }
}
