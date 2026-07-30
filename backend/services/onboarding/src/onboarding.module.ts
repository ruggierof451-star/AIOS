import { Module, Inject, OnModuleDestroy, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  AuthMiddleware,
  JwtVerifier,
  HttpGrantsResolver,
  GRANTS_RESOLVER,
  ServiceTokenIssuer,
} from '@aios/rbac';

import { HealthController } from './api/health.controller';
import { ProvisioningController } from './api/provisioning.controller';
import { SessionController } from './api/session.controller';
import { LegalConsentController } from './api/legal-consent.controller';
import { OnboardingUseCaseFactory } from './infrastructure/onboarding-use-case.factory';
import { HttpOrganizationClient } from './infrastructure/http-organization-client';
import { HttpAdministrationClient } from './infrastructure/http-administration-client';
import { HttpWorkspaceClient } from './infrastructure/http-workspace-client';
import { PRISMA_CLIENT } from './infrastructure/tokens';

const prismaClientProvider = {
  provide: PRISMA_CLIENT,
  useFactory: () => new PrismaClient(),
};

const jwtVerifierProvider = {
  provide: JwtVerifier,
  useFactory: () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET non configurato per il servizio Onboarding.');
    return new JwtVerifier(secret);
  },
};

const serviceTokenIssuerProvider = {
  provide: ServiceTokenIssuer,
  useFactory: () => {
    const secret = process.env.SERVICE_JWT_SECRET;
    if (!secret) throw new Error('SERVICE_JWT_SECRET non configurato per il servizio Onboarding.');
    return new ServiceTokenIssuer(secret);
  },
};

const grantsResolverProvider = {
  provide: GRANTS_RESOLVER,
  useFactory: (serviceTokenIssuer: ServiceTokenIssuer) =>
    new HttpGrantsResolver(
      process.env.ADMINISTRATION_SERVICE_URL ?? 'http://localhost:3002',
      'onboarding-service',
      serviceTokenIssuer,
    ),
  inject: [ServiceTokenIssuer],
};

const authMiddlewareProvider = {
  provide: AuthMiddleware,
  useFactory: (jwtVerifier: JwtVerifier, grantsResolver: HttpGrantsResolver) =>
    new AuthMiddleware(jwtVerifier, grantsResolver),
  inject: [JwtVerifier, GRANTS_RESOLVER],
};

const organizationClientProvider = {
  provide: HttpOrganizationClient,
  useFactory: () => new HttpOrganizationClient(process.env.ORGANIZATION_SERVICE_URL ?? 'http://localhost:3003'),
};

const administrationClientProvider = {
  provide: HttpAdministrationClient,
  useFactory: (serviceTokenIssuer: ServiceTokenIssuer) =>
    new HttpAdministrationClient(process.env.ADMINISTRATION_SERVICE_URL ?? 'http://localhost:3002', serviceTokenIssuer),
  inject: [ServiceTokenIssuer],
};

const workspaceClientProvider = {
  provide: HttpWorkspaceClient,
  useFactory: () => new HttpWorkspaceClient(process.env.WORKSPACE_SERVICE_URL ?? 'http://localhost:3004'),
};

@Module({
  controllers: [HealthController, SessionController, ProvisioningController, LegalConsentController],
  providers: [
    prismaClientProvider,
    jwtVerifierProvider,
    serviceTokenIssuerProvider,
    grantsResolverProvider,
    authMiddlewareProvider,
    organizationClientProvider,
    administrationClientProvider,
    workspaceClientProvider,
    OnboardingUseCaseFactory,
  ],
})
export class OnboardingModule implements NestModule, OnModuleDestroy {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  configure(consumer: MiddlewareConsumer) {
    // /health resta sempre pubblico, come in ogni altro servizio.
    consumer.apply(AuthMiddleware).exclude('health').forRoutes('*');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
