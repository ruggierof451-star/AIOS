/**
 * Caso d'uso: Refresh del token di accesso. Implementa la rotazione
 * (API Contract, sezione 2.2): ogni uso di un refresh token ne invalida
 * il precedente e ne genera uno nuovo — mitiga il furto silenzioso di
 * refresh token, perché un token rubato e già usato dal legittimo
 * proprietario risulterebbe "già ruotato" al tentativo dell'attaccante,
 * rilevabile come anomalia.
 */

import { TokenService, RefreshTokenRepository, UserRepository } from './ports';

export class RefreshTokenInvalidError extends Error {
  constructor() {
    super('Il refresh token non è valido.');
    this.name = 'RefreshTokenInvalidError';
  }
}

export class RefreshTokenExpiredOrRevokedError extends Error {
  constructor() {
    super('Il refresh token è scaduto o è già stato revocato.');
    this.name = 'RefreshTokenExpiredOrRevokedError';
  }
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class RefreshTokenUseCase {
  constructor(
    private readonly tokenService: TokenService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    const tokenHash = this.tokenService.hashRefreshTokenValue(input.refreshToken);
    const record = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!record) {
      throw new RefreshTokenInvalidError();
    }

    // Un token già revocato (rotato in precedenza, o revocato esplicitamente
    // — es. logout, o sospensione utente) non genera mai un nuovo token,
    // indipendentemente dal fatto che non sia ancora scaduto per data.
    if (record.revokedAt !== null) {
      throw new RefreshTokenExpiredOrRevokedError();
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new RefreshTokenExpiredOrRevokedError();
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user) {
      throw new RefreshTokenInvalidError();
    }
    user.assertCanAuthenticate(); // un utente sospeso non può rinnovare la sessione

    const newRefreshTokenValue = this.tokenService.generateRefreshTokenValue();
    const newRefreshTokenHash = this.tokenService.hashRefreshTokenValue(newRefreshTokenValue);

    const newRecord = await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      revokedAt: null,
      replacedBy: null,
    });

    // Rotazione: il vecchio token viene revocato SOLO dopo che il nuovo è
    // stato creato con successo — mai il contrario, per non rischiare di
    // invalidare l'accesso dell'utente se la creazione del nuovo token
    // fallisse a metà.
    await this.refreshTokenRepository.revoke(record.id, newRecord.id);

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email.toString(),
    });

    return { accessToken, refreshToken: newRefreshTokenValue };
  }
}
