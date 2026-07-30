import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuthenticateUserUseCase,
  InvalidCredentialsError,
  MfaCodeRequiredError,
  MfaCodeInvalidError,
} from '../authenticate-user.use-case';
import { UserSuspendedError } from '../../domain/user.entity';
import { Email } from '../../domain/email.vo';
import {
  InMemoryUserRepository,
  FakePasswordHasher,
  RecordingEventPublisher,
  FakeTokenService,
  InMemoryRefreshTokenRepository,
  FakeMfaVerifier,
  registerFakeUser,
} from './fakes';

describe('AuthenticateUserUseCase', () => {
  let userRepository: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let tokenService: FakeTokenService;
  let refreshTokenRepository: InMemoryRefreshTokenRepository;
  let mfaVerifier: FakeMfaVerifier;
  let events: RecordingEventPublisher;
  let useCase: AuthenticateUserUseCase;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    tokenService = new FakeTokenService();
    refreshTokenRepository = new InMemoryRefreshTokenRepository();
    mfaVerifier = new FakeMfaVerifier();
    events = new RecordingEventPublisher();
    useCase = new AuthenticateUserUseCase(
      userRepository,
      hasher,
      tokenService,
      refreshTokenRepository,
      mfaVerifier,
      events,
    );

    await registerFakeUser(userRepository, hasher, 'mario@azienda.it', 'passwordSicura123');
  });

  it('autentica un utente con credenziali corrette', async () => {
    const result = await useCase.execute({ email: 'mario@azienda.it', password: 'passwordSicura123' });
    expect(result.accessToken).toContain('access:');
    expect(result.refreshToken).toContain('refresh-value:');
  });

  it('rifiuta una password errata con errore generico', async () => {
    await expect(
      useCase.execute({ email: 'mario@azienda.it', password: 'passwordSbagliata' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rifiuta un\'email non registrata con lo stesso errore generico (no enumerazione account)', async () => {
    await expect(
      useCase.execute({ email: 'non-esiste@azienda.it', password: 'qualunquecosa1' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('persiste un refresh token dopo login riuscito', async () => {
    const result = await useCase.execute({ email: 'mario@azienda.it', password: 'passwordSicura123' });
    const tokenHash = tokenService.hashRefreshTokenValue(result.refreshToken);
    const stored = await refreshTokenRepository.findByTokenHash(tokenHash);
    expect(stored).not.toBeNull();
    expect(stored?.revokedAt).toBeNull();
  });

  it('pubblica l\'evento UserAuthenticated dopo login riuscito', async () => {
    await useCase.execute({ email: 'mario@azienda.it', password: 'passwordSicura123' });
    expect(events.published.some((e) => e.eventType === 'UserAuthenticated')).toBe(true);
  });

  it('rifiuta l\'autenticazione per un utente sospeso', async () => {
    const user = await userRepository.findByEmail(Email.create('mario@azienda.it'));
    expect(user).not.toBeNull();

    user!.suspend();
    await userRepository.save(user!);

    await expect(
      useCase.execute({ email: 'mario@azienda.it', password: 'passwordSicura123' }),
    ).rejects.toThrow(UserSuspendedError);
  });

  describe('con MFA abilitata', () => {
    beforeEach(async () => {
      const user = await userRepository.findByEmail(Email.create('mario@azienda.it'));
      user!.enableMfa();
      await userRepository.save(user!);
    });

    it('richiede il codice MFA se non fornito', async () => {
      await expect(
        useCase.execute({ email: 'mario@azienda.it', password: 'passwordSicura123' }),
      ).rejects.toThrow(MfaCodeRequiredError);
    });

    it('rifiuta un codice MFA errato', async () => {
      await expect(
        useCase.execute({
          email: 'mario@azienda.it',
          password: 'passwordSicura123',
          mfaCode: '000000',
        }),
      ).rejects.toThrow(MfaCodeInvalidError);
    });

    it('accetta un codice MFA corretto', async () => {
      const result = await useCase.execute({
        email: 'mario@azienda.it',
        password: 'passwordSicura123',
        mfaCode: '111111',
      });
      expect(result.accessToken).toBeTruthy();
    });
  });
});
