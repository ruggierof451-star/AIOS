import { Module, OnModuleDestroy, Inject, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthMiddleware, JwtVerifier, HttpGrantsResolver, GRANTS_RESOLVER, ServiceTokenIssuer } from '@aios/rbac';

import { OrganizationController } from './api/organization.controller';
import { HealthController } from './api/health.controller';
import { OrganizationUseCaseFactory } from './infrastructure/organization-use-case.factory';
import { PRISMA_CLIENT } from './infrastructure/tokens';

const prismaClientProvider = {
  provide: PRISMA_CLIENT,
  useFactory: () => new PrismaClient(),
};

const jwtVerifierProvider = {
  provide: JwtVerifier,
  useFactory: () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET non configurato per il servizio Organization.');
    }
    return new JwtVerifier(secret);
  },
};

const serviceTokenIssuerProvider = {
  provide: ServiceTokenIssuer,
  useFactory: () => {
    const secret = process.env.SERVICE_JWT_SECRET;
    if (!secret) {
      throw new Error('SERVICE_JWT_SECRET non configurato per il servizio Organization.');
    }
    return new ServiceTokenIssuer(secret);
  },
};

const grantsResolverProvider = {
  provide: GRANTS_RESOLVER,
  useFactory: (serviceTokenIssuer: ServiceTokenIssuer) => {
    const baseUrl = process.env.ADMINISTRATION_SERVICE_URL ?? 'http://localhost:3002';
    return new HttpGrantsResolver(baseUrl, 'organization-service', serviceTokenIssuer);
  },
  inject: [ServiceTokenIssuer],
};

const authMiddlewareProvider = {
  provide: AuthMiddleware,
  useFactory: (jwtVerifier: JwtVerifier, grantsResolver: HttpGrantsResolver) =>
    new AuthMiddleware(jwtVerifier, grantsResolver),
  inject: [JwtVerifier, GRANTS_RESOLVER],
};

@Module({
  controllers: [OrganizationController, HealthController],
  providers: [
    prismaClientProvider,
    jwtVerifierProvider,
    serviceTokenIssuerProvider,
    grantsResolverProvider,
    authMiddlewareProvider,
    OrganizationUseCaseFactory,
  ],
})
export class OrganizationModule implements NestModule, OnModuleDestroy {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  configure(consumer: MiddlewareConsumer) {
    // /health resta sempre pubblico — un healthcheck non deve mai
    // richiedere un JWT, altrimenti perde senso per strumenti di
    // infrastruttura (Docker healthcheck, load balancer).
    consumer.apply(AuthMiddleware).exclude('health').forRoutes('*');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
