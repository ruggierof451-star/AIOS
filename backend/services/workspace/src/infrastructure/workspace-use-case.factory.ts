import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

import { CreateWorkspaceUseCase, CreateWorkspaceInput, CreateWorkspaceOutput } from '../application/create-workspace.use-case';
import {
  InviteUserUseCase,
  InviteUserInput,
  AcceptInviteUseCase,
  AcceptInviteInput,
  RemoveMemberUseCase,
  RemoveMemberInput,
  ChangeMemberRoleUseCase,
  ChangeMemberRoleInput,
} from '../application/membership.use-cases';

import { runWorkspaceUnitOfWork } from './unit-of-work';
import { ConsoleInviteNotifier } from './console-invite.notifier';
import { PRISMA_CLIENT } from './tokens';

function hashToken(plainToken: string): string {
  return createHash('sha256').update(plainToken).digest('hex');
}

@Injectable()
export class WorkspaceUseCaseFactory {
  private readonly inviteNotifier = new ConsoleInviteNotifier();

  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceOutput> {
    return runWorkspaceUnitOfWork(this.prisma, async ({ workspaceRepository, eventPublisher }) => {
      const useCase = new CreateWorkspaceUseCase(workspaceRepository, eventPublisher);
      return useCase.execute(input);
    });
  }

  async inviteUser(input: InviteUserInput): Promise<{ inviteId: string }> {
    return runWorkspaceUnitOfWork(this.prisma, async ({ workspaceRepository, inviteRepository, eventPublisher }) => {
      const useCase = new InviteUserUseCase(workspaceRepository, inviteRepository, eventPublisher, this.inviteNotifier);
      return useCase.execute(input);
    });
  }

  async acceptInvite(input: AcceptInviteInput): Promise<{ workspaceId: string }> {
    return runWorkspaceUnitOfWork(this.prisma, async ({ workspaceRepository, inviteRepository, eventPublisher }) => {
      const useCase = new AcceptInviteUseCase(workspaceRepository, inviteRepository, eventPublisher, hashToken);
      return useCase.execute(input);
    });
  }

  async removeMember(input: RemoveMemberInput): Promise<void> {
    return runWorkspaceUnitOfWork(this.prisma, async ({ workspaceRepository, eventPublisher }) => {
      const useCase = new RemoveMemberUseCase(workspaceRepository, eventPublisher);
      return useCase.execute(input);
    });
  }

  async changeMemberRole(input: ChangeMemberRoleInput): Promise<void> {
    return runWorkspaceUnitOfWork(this.prisma, async ({ workspaceRepository, eventPublisher }) => {
      const useCase = new ChangeMemberRoleUseCase(workspaceRepository, eventPublisher);
      return useCase.execute(input);
    });
  }
}
