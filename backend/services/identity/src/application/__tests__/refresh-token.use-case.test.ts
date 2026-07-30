import { describe, it, expect, beforeEach } from 'vitest';
import {
  RefreshTokenUseCase,
  RefreshTokenInvalidError,
  RefreshTokenExpiredOrRevokedError,
} from '../refresh-token.use-case';
import { UserSuspendedError } from '../../domain/user.entity';
import { Email } from '../../domain/email.vo';
import {
  InMemoryUserRepository,
  FakePasswordHasher,
  FakeTokenService,
  InMemoryRefreshTokenRepository,
  registerFakeUser,
} from './fakes';

describe('RefreshTokenUseCase', () => {
  let userRepository: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let tokenService: FakeTokenService;
  let refreshTokenRepository: InMemoryRefreshTokenRepository;
  let useCase: RefreshTokenUseCase;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    tokenService = new FakeTokenService();
    refreshTokenRepository = new InMemoryRefreshTokenRepository();
    useCase = new RefreshTokenUseCase(tokenService, refreshTokenRepository, userRepository);

    await registerFakeUser(userRepository, hasher, 'mario@azienda.it', 'passwordSicura123');
  });

  async function createValidTokenForUser(): Promise<string> {
    const user = await userRepository.findByEmail(Email.create('mario@azienda.it'));
    const value = tokenService.generateRefreshTokenValue();
    await refreshTokenRepository.create({
      userId: user!.id,
      tokenHash: tokenService.hashRefreshTokenValue(value),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // valido per 1 ora
      revokedAt: null,
      replacedBy: null,
    });
    return value;
  }

  it('genera un nuovo access token e un nuovo refresh token per un token valido', async () => {
    const originalToken = await createValidTokenForUser();
    const result = await useCase.execute({ refreshToken: originalToken });

    expect(result.accessToken).toContain('access:');
    expect(result.refreshToken).not.toBe(originalToken);
  });

  it('revoca il vecchio refresh token dopo la rotazione', async () => {
    const originalToken = await createValidTokenForUser();
    await useCase.execute({ refreshToken: originalToken });

    const oldHash = tokenService.hashRefreshTokenValue(originalToken);
    const oldRecord = await refreshTokenRepository.findByTokenHash(oldHash);
    expect(oldRecord?.revokedAt).not.toBeNull();
  });

  it('collega il vecchio token al nuovo tramite replacedBy', async () => {
    const originalToken = await createValidTokenForUser();
    const result = await useCase.execute({ refreshToken: originalToken });

    const oldHash = tokenService.hashRefreshTokenValue(originalToken);
    const oldRecord = await refreshTokenRepository.findByTokenHash(oldHash);

    const newHash = tokenService.hashRefreshTokenValue(result.refreshToken);
    const newRecord = await refreshTokenRepository.findByTokenHash(newHash);

    expect(oldRecord?.replacedBy).toBe(newRecord?.id);
  });

  it('rifiuta un token che non esiste', async () => {
    await expect(
      useCase.execute({ refreshToken: 'token-mai-esistito' }),
    ).rejects.toThrow(RefreshTokenInvalidError);
  });

  it('rifiuta un token già usato/revocato (rilevamento di possibile furto)', async () => {
    const originalToken = await createValidTokenForUser();
    await useCase.execute({ refreshToken: originalToken }); // prima rotazione, legittima

    // Un secondo tentativo con lo STESSO token originale ora fallisce:
    // o è il legittimo proprietario che ha perso il nuovo token (raro),
    // o è un attaccante che ha rubato il token già usato — in entrambi i
    // casi, mai onorare la richiesta.
    await expect(
      useCase.execute({ refreshToken: originalToken }),
    ).rejects.toThrow(RefreshTokenExpiredOrRevokedError);
  });

  it('rifiuta un token scaduto per data', async () => {
    const user = await userRepository.findByEmail(Email.create('mario@azienda.it'));
    const value = tokenService.generateRefreshTokenValue();
    await refreshTokenRepository.create({
      userId: user!.id,
      tokenHash: tokenService.hashRefreshTokenValue(value),
      expiresAt: new Date(Date.now() - 1000), // già scaduto
      revokedAt: null,
      replacedBy: null,
    });

    await expect(useCase.execute({ refreshToken: value })).rejects.toThrow(
      RefreshTokenExpiredOrRevokedError,
    );
  });

  it('rifiuta il refresh per un utente sospeso dopo l\'emissione del token', async () => {
    const originalToken = await createValidTokenForUser();
    const user = await userRepository.findByEmail(Email.create('mario@azienda.it'));
    user!.suspend();
    await userRepository.save(user!);

    await expect(useCase.execute({ refreshToken: originalToken })).rejects.toThrow(
      UserSuspendedError,
    );
  });
});
