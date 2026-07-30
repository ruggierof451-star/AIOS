import { Module, OnModuleDestroy, Inject, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthMiddleware, JwtVerifier, HttpGrantsResolver, GRANTS_RESOLVER, ServiceTokenIssuer } from '@aios/rbac';

import { WorkspaceController } from './api/workspace.controller';
import { HealthController } from './api/health.controller';
import { WorkspaceUseCaseFactory } from './infrastructure/workspace-use-case.factory';
import { PRISMA_CLIENT } from './infrastructure/tokens';

const prismaClientProvider = { provide: PRISMA_CLIENT, useFactory: () => new PrismaClient() };

const jwtVerifierProvider = {
  provide: JwtVerifier,
  useFactory: () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET non configurato per il servizio Workspace.');
    return new JwtVerifier(secret);
  },
};

const serviceTokenIssuerProvider = {
  provide: ServiceTokenIssuer,
  useFactory: () => {
    const secret = process.env.SERVICE_JWT_SECRET;
    if (!secret) throw new Error('SERVICE_JWT_SECRET non configurato per il servizio Workspace.');
    return new ServiceTokenIssuer(secret);
  },
};

const grantsResolverProvider = {
  provide: GRANTS_RESOLVER,
  useFactory: (serviceTokenIssuer: ServiceTokenIssuer) =>
    new HttpGrantsResolver(process.env.ADMINISTRATION_SERVICE_URL ?? 'http://localhost:3002', 'workspace-service', serviceTokenIssuer),
  inject: [ServiceTokenIssuer],
};

const authMiddlewareProvider = {
  provide: AuthMiddleware,
  useFactory: (jwtVerifier: JwtVerifier, grantsResolver: HttpGrantsResolver) =>
    new AuthMiddleware(jwtVerifier, grantsResolver),
  inject: [JwtVerifier, GRANTS_RESOLVER],
};

@Module({
  controllers: [WorkspaceController, HealthController],
  providers: [
    prismaClientProvider,
    jwtVerifierProvider,
    serviceTokenIssuerProvider,
    grantsResolverProvider,
    authMiddlewareProvider,
    WorkspaceUseCaseFactory,
  ],
})
export class WorkspaceModule implements NestModule, OnModuleDestroy {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).exclude('health').forRoutes('*');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
