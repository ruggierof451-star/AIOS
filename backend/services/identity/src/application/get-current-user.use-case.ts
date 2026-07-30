import { UserRepository } from './ports';

export class UserNotFoundError extends Error {
  constructor() {
    super('Utente non trovato.');
    this.name = 'UserNotFoundError';
  }
}

export interface GetCurrentUserInput {
  userId: string;
}

export interface GetCurrentUserOutput {
  userId: string;
  email: string;
  mfaEnabled: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
}

/**
 * Caso d'uso dietro il primo endpoint protetto di Identity
 * (`GET /api/v1/auth/me`, Milestone "Sistema di Autenticazione").
 * Non richiede alcun permesso specifico (Domain Model, RBAC) — solo
 * autenticazione: un utente può sempre vedere il proprio profilo.
 */
export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: GetCurrentUserInput): Promise<GetCurrentUserOutput> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    return {
      userId: user.id,
      email: user.email.toString(),
      mfaEnabled: user.mfaEnabled,
      status: user.status,
    };
  }
}
