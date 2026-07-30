import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from './prisma-user.repository';
import { PrismaOutboxEventPublisher } from './prisma-outbox-event.publisher';
import { PrismaRefreshTokenRepository } from './prisma-refresh-token.repository';

/**
 * Punto unico di composizione per garantire che ogni scrittura di un
 * Aggregate Root/record correlato e il relativo Domain Event finiscano
 * nella stessa transazione Postgres (Physical Database Schema, sezione
 * 5.1 — "scritta nella stessa transazione locale che modifica
 * l'Aggregate Root").
 *
 * Si applica a TUTTI i casi d'uso di Identity che scrivono dati e
 * pubblicano un evento nello stesso flusso — non solo alla registrazione:
 * anche il login (crea un RefreshToken + pubblica UserAuthenticated) e il
 * refresh (crea/revoca RefreshToken) devono passare da qui. Costruire
 * repository/publisher con il client Prisma globale al di fuori di una
 * transazione esplicita è un errore da evitare in ogni nuovo caso d'uso,
 * non solo in quelli già scritti.
 */
export async function runIdentityUnitOfWork<T>(
  prisma: PrismaClient,
  work: (ctx: {
    userRepository: PrismaUserRepository;
    refreshTokenRepository: PrismaRefreshTokenRepository;
    eventPublisher: PrismaOutboxEventPublisher;
  }) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const userRepository = new PrismaUserRepository(tx);
    const refreshTokenRepository = new PrismaRefreshTokenRepository(tx);
    const eventPublisher = new PrismaOutboxEventPublisher(tx);
    return work({ userRepository, refreshTokenRepository, eventPublisher });
  });
}
