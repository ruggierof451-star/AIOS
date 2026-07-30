import { PrismaClient } from '@prisma/client';
import { PrismaOutboxEventPublisher } from '@aios/eventing';
import { PrismaOrganizationRepository } from './prisma-organization.repository';

/**
 * Stesso principio già stabilito per Identity (vedi il file omonimo in
 * quel servizio): ogni scrittura di Organization e il relativo Domain
 * Event finiscono nella stessa transazione Postgres.
 */
export async function runOrganizationUnitOfWork<T>(
  prisma: PrismaClient,
  work: (ctx: {
    organizationRepository: PrismaOrganizationRepository;
    eventPublisher: PrismaOutboxEventPublisher;
  }) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const organizationRepository = new PrismaOrganizationRepository(tx);
    const eventPublisher = new PrismaOutboxEventPublisher(tx);
    return work({ organizationRepository, eventPublisher });
  });
}
