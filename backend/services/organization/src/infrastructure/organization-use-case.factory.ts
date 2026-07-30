import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import {
  CreateOrganizationUseCase,
  CreateOrganizationInput,
  CreateOrganizationOutput,
} from '../application/create-organization.use-case';
import {
  UpdateOrganizationUseCase,
  UpdateOrganizationInput,
  ChangeOrganizationPlanUseCase,
  ChangeOrganizationPlanInput,
  ArchiveOrganizationUseCase,
  ArchiveOrganizationInput,
} from '../application/manage-organization.use-cases';

import { runOrganizationUnitOfWork } from './unit-of-work';
import { PRISMA_CLIENT } from './tokens';

@Injectable()
export class OrganizationUseCaseFactory {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async createOrganization(input: CreateOrganizationInput): Promise<CreateOrganizationOutput> {
    return runOrganizationUnitOfWork(this.prisma, async ({ organizationRepository, eventPublisher }) => {
      const useCase = new CreateOrganizationUseCase(organizationRepository, eventPublisher);
      return useCase.execute(input);
    });
  }

  async updateOrganization(input: UpdateOrganizationInput): Promise<void> {
    return runOrganizationUnitOfWork(this.prisma, async ({ organizationRepository, eventPublisher }) => {
      const useCase = new UpdateOrganizationUseCase(organizationRepository, eventPublisher);
      return useCase.execute(input);
    });
  }

  async changePlan(input: ChangeOrganizationPlanInput): Promise<void> {
    return runOrganizationUnitOfWork(this.prisma, async ({ organizationRepository, eventPublisher }) => {
      const useCase = new ChangeOrganizationPlanUseCase(organizationRepository, eventPublisher);
      return useCase.execute(input);
    });
  }

  async archiveOrganization(input: ArchiveOrganizationInput): Promise<void> {
    return runOrganizationUnitOfWork(this.prisma, async ({ organizationRepository, eventPublisher }) => {
      const useCase = new ArchiveOrganizationUseCase(organizationRepository, eventPublisher);
      return useCase.execute(input);
    });
  }
}
