import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServiceTokenVerifier, ServiceAuthGuard } from '@aios/rbac';

import { GrantsController } from './api/grants.controller';
import { AuditLogController } from './api/audit-log.controller';
import { HealthController } from './api/health.controller';
import { ProvisioningController } from './api/provisioning.controller';
import { GetUserGrantsUseCase } from './application/get-user-grants.use-case';
import { CreateDefaultRolesUseCase } from './application/create-default-roles.use-case';
import { PrismaRoleAssignmentRepository } from './infrastructure/prisma-role-assignment.repository';
import { PrismaAuditLogRepository } from './infrastructure/prisma-audit-log.repository';
import { PrismaRoleProvisioningRepository } from './infrastructure/prisma-role-provisioning.repository';

const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

const prismaClientProvider = {
  provide: PRISMA_CLIENT,
  useFactory: () => new PrismaClient(),
};

const serviceTokenVerifierProvider = {
  provide: ServiceTokenVerifier,
  useFactory: () => {
    const secret = process.env.SERVICE_JWT_SECRET;
    if (!secret) {
      throw new Error('SERVICE_JWT_SECRET non configurato per il servizio Administration.');
    }
    return new ServiceTokenVerifier(secret);
  },
};

const roleAssignmentRepositoryProvider = {
  provide: PrismaRoleAssignmentRepository,
  useFactory: (prisma: PrismaClient) => new PrismaRoleAssignmentRepository(prisma),
  inject: [PRISMA_CLIENT],
};

const auditLogRepositoryProvider = {
  provide: PrismaAuditLogRepository,
  useFactory: (prisma: PrismaClient) => new PrismaAuditLogRepository(prisma),
  inject: [PRISMA_CLIENT],
};

const roleProvisioningRepositoryProvider = {
  provide: PrismaRoleProvisioningRepository,
  useFactory: (prisma: PrismaClient) => new PrismaRoleProvisioningRepository(prisma),
  inject: [PRISMA_CLIENT],
};

const getUserGrantsUseCaseProvider = {
  provide: GetUserGrantsUseCase,
  useFactory: (repo: PrismaRoleAssignmentRepository) => new GetUserGrantsUseCase(repo),
  inject: [PrismaRoleAssignmentRepository],
};

const createDefaultRolesUseCaseProvider = {
  provide: CreateDefaultRolesUseCase,
  useFactory: (repo: PrismaRoleProvisioningRepository) => new CreateDefaultRolesUseCase(repo),
  inject: [PrismaRoleProvisioningRepository],
};

@Module({
  controllers: [GrantsController, AuditLogController, HealthController, ProvisioningController],
  providers: [
    prismaClientProvider,
    serviceTokenVerifierProvider,
    ServiceAuthGuard,
    roleAssignmentRepositoryProvider,
    auditLogRepositoryProvider,
    roleProvisioningRepositoryProvider,
    getUserGrantsUseCaseProvider,
    createDefaultRolesUseCaseProvider,
  ],
})
export class AdministrationModule implements OnModuleDestroy {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
