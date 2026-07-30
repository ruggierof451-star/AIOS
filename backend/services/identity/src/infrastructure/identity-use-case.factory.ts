import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { RegisterUserUseCase, RegisterUserInput, RegisterUserOutput } from '../application/register-user.use-case';
import {
  AuthenticateUserUseCase,
  AuthenticateUserInput,
  AuthenticateUserOutput,
} from '../application/authenticate-user.use-case';
import {
  RefreshTokenUseCase,
  RefreshTokenInput,
  RefreshTokenOutput,
} from '../application/refresh-token.use-case';
import { GetCurrentUserUseCase, GetCurrentUserInput, GetCurrentUserOutput } from '../application/get-current-user.use-case';

import { runIdentityUnitOfWork } from './unit-of-work';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { JwtTokenService } from './jwt-token.service';
import { PrismaUserRepository } from './prisma-user.repository';
import { TotpMfaVerifier, MfaSecretProvider } from './totp-mfa.verifier';
import { AccessTokenClaims } from '../application/ports';
import { PRISMA_CLIENT, JWT_SECRET, MFA_SECRET_PROVIDER } from './tokens';

/**
 * Punto di composizione unico per Identity: ogni metodo pubblico costruisce
 * il caso d'uso pertinente con repository/publisher SCOPED alla stessa
 * transazione Prisma (unit-of-work.ts) — il controller non deve mai
 * assemblare un caso d'uso da sé, per non rischiare di dimenticare questa
 * garanzia in un nuovo endpoint futuro.
 */
@Injectable()
export class IdentityUseCaseFactory {
  private readonly passwordHasher = new BcryptPasswordHasher();
  private readonly tokenService: JwtTokenService;
  private readonly mfaVerifier: TotpMfaVerifier;

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(JWT_SECRET) jwtSecret: string,
    @Inject(MFA_SECRET_PROVIDER) mfaSecretProvider: MfaSecretProvider,
  ) {
    this.tokenService = new JwtTokenService(jwtSecret);
    this.mfaVerifier = new TotpMfaVerifier(mfaSecretProvider);
  }

  async registerUser(input: RegisterUserInput): Promise<RegisterUserOutput> {
    return runIdentityUnitOfWork(this.prisma, async ({ userRepository, eventPublisher }) => {
      const useCase = new RegisterUserUseCase(userRepository, this.passwordHasher, eventPublisher);
      return useCase.execute(input);
    });
  }

  async authenticateUser(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    return runIdentityUnitOfWork(
      this.prisma,
      async ({ userRepository, refreshTokenRepository, eventPublisher }) => {
        const useCase = new AuthenticateUserUseCase(
          userRepository,
          this.passwordHasher,
          this.tokenService,
          refreshTokenRepository,
          this.mfaVerifier,
          eventPublisher,
        );
        return useCase.execute(input);
      },
    );
  }

  async refreshToken(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    return runIdentityUnitOfWork(this.prisma, async ({ userRepository, refreshTokenRepository }) => {
      const useCase = new RefreshTokenUseCase(this.tokenService, refreshTokenRepository, userRepository);
      return useCase.execute(input);
    });
  }

  /**
   * Verifica un access token JWT — usata da JwtAuthGuard per proteggere
   * endpoint come `GET /api/v1/auth/me`. Nessuna transazione necessaria
   * (operazione pura, senza scrittura), a differenza degli altri metodi
   * di questa factory.
   */
  verifyAccessToken(token: string): AccessTokenClaims {
    return this.tokenService.verifyAccessToken(token);
  }

  /**
   * Sola lettura: nessuna transazione/Unit of Work necessaria, coerente
   * con "solo le scritture richiedono la garanzia di atomicità" già
   * stabilito per gli altri metodi di questa factory.
   */
  async getCurrentUser(input: GetCurrentUserInput): Promise<GetCurrentUserOutput> {
    const userRepository = new PrismaUserRepository(this.prisma);
    const useCase = new GetCurrentUserUseCase(userRepository);
    return useCase.execute(input);
  }
}
