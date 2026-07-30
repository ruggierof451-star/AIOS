import { describe, it, expect, beforeEach } from 'vitest';
import { GetCurrentUserUseCase, UserNotFoundError } from '../get-current-user.use-case';
import { InMemoryUserRepository, FakePasswordHasher, registerFakeUser } from './fakes';

describe('GetCurrentUserUseCase', () => {
  let repository: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let useCase: GetCurrentUserUseCase;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    useCase = new GetCurrentUserUseCase(repository);
  });

  it('restituisce il profilo dell\'utente esistente', async () => {
    const user = await registerFakeUser(repository, hasher, 'mario@azienda.it', 'passwordSicura123');

    const result = await useCase.execute({ userId: user.id });

    expect(result.userId).toBe(user.id);
    expect(result.email).toBe('mario@azienda.it');
    expect(result.mfaEnabled).toBe(false);
    expect(result.status).toBe('ACTIVE');
  });

  it('riflette mfaEnabled correttamente se l\'utente ha attivato la MFA', async () => {
    const user = await registerFakeUser(repository, hasher, 'mario@azienda.it', 'passwordSicura123');
    user.enableMfa();
    await repository.save(user);

    const result = await useCase.execute({ userId: user.id });
    expect(result.mfaEnabled).toBe(true);
  });

  it('rifiuta se l\'utente non esiste', async () => {
    await expect(useCase.execute({ userId: 'id-mai-esistito' })).rejects.toThrow(UserNotFoundError);
  });

  it('non espone mai la password hashata nel risultato', async () => {
    const user = await registerFakeUser(repository, hasher, 'mario@azienda.it', 'passwordSicura123');
    const result = await useCase.execute({ userId: user.id });
    expect(result).not.toHaveProperty('passwordHash');
  });
});
