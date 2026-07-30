import { PrismaClient } from '@prisma/client';
import { PrismaOutboxEventPublisher } from '@aios/eventing';
import { PrismaWorkspaceRepository } from './prisma-workspace.repository';
import { PrismaInviteRepository } from './prisma-invite.repository';

export async function runWorkspaceUnitOfWork<T>(
  prisma: PrismaClient,
  work: (ctx: {
    workspaceRepository: PrismaWorkspaceRepository;
    inviteRepository: PrismaInviteRepository;
    eventPublisher: PrismaOutboxEventPublisher;
  }) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const workspaceRepository = new PrismaWorkspaceRepository(tx);
    const inviteRepository = new PrismaInviteRepository(tx);
    const eventPublisher = new PrismaOutboxEventPublisher(tx);
    return work({ workspaceRepository, inviteRepository, eventPublisher });
  });
}
