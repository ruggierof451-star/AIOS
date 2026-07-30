import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AuthController } from './api/auth.controller';
import { HealthController } from './api/health.controller';
import { JwtAuthGuard } from './api/jwt-auth.guard';
import { IdentityUseCaseFactory } from './infrastructure/identity-use-case.factory';
import { PrismaMfaSecretProvider } from './infrastructure/prisma-mfa-secret.provider';
import { PRISMA_CLIENT, JWT_SECRET, MFA_SECRET_PROVIDER } from './infrastructure/tokens';

/**
 * Un'unica istanza di PrismaClient per tutto il servizio, coerente con
 * "ogni servizio applicativo è stateless per default" (Runtime, principio
 * 3) — il client stesso gestisce il proprio pool di connessioni
 * (DATABASE_POOL_MIN/MAX, .env.example), non ne serve una per richiesta.
 */
const prismaClientProvider = {
  provide: PRISMA_CLIENT,
  useFactory: () => new PrismaClient(),
};

const jwtSecretProvider = {
  provide: JWT_SECRET,
  useFactory: () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Fallire rumorosamente all'avvio è corretto qui: un servizio di
      // autenticazione senza secret configurato non deve MAI avviarsi
      // silenziosamente con un default insicuro.
      throw new Error(
        'JWT_SECRET non configurato. Imposta la variabile d\'ambiente prima di avviare il servizio Identity.',
      );
    }
    return secret;
  },
};

const mfaSecretProviderProvider = {
  provide: MFA_SECRET_PROVIDER,
  useFactory: (prisma: PrismaClient) => new PrismaMfaSecretProvider(prisma),
  inject: [PRISMA_CLIENT],
};

@Module({
  controllers: [AuthController, HealthController],
  providers: [
    prismaClientProvider,
    jwtSecretProvider,
    mfaSecretProviderProvider,
    IdentityUseCaseFactory,
    JwtAuthGuard,
  ],
})
export class IdentityModule implements OnModuleDestroy {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async onModuleDestroy() {
    // Chiusura pulita della connessione — evita connessioni Postgres
    // orfane quando il servizio viene fermato (rilevante soprattutto
    // durante i rolling update, Infrastructure Modulo 4, sezione 4.4).
    await this.prisma.$disconnect();
  }
}
