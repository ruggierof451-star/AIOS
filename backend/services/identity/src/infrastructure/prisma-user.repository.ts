/**
 * Implementazione concreta di UserRepository su Prisma/Postgres.
 * L'application layer non conosce questa classe direttamente — riceve
 * l'interfaccia UserRepository via dependency injection (NestJS module,
 * vedi ../identity.module.ts).
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { User } from '../domain/user.entity';
import { Email } from '../domain/email.vo';
import { UserRepository, OptimisticLockError } from '../application/ports';

/**
 * Accetta sia il client Prisma "normale" sia un client transazionale
 * (quello fornito dentro `prisma.$transaction(async (tx) => ...)`).
 * Necessario per rispettare l'atomicità richiesta dal pattern
 * Transactional Outbox — vedi infrastructure/unit-of-work.ts.
 */
export type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.toString() },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async save(user: User): Promise<void> {
    const props = user.toPersistence();

    const existing = await this.prisma.user.findUnique({ where: { id: props.id } });

    if (!existing) {
      await this.prisma.user.create({
        data: {
          id: props.id,
          email: props.email.toString(),
          passwordHash: props.passwordHash,
          mfaEnabled: props.mfaEnabled,
          status: props.status,
          lockVersion: props.lockVersion,
        },
      });
      return;
    }

    // Optimistic locking (Runtime, sezione 12.1; Physical DB Schema, sez. 3.1):
    // l'UPDATE include la lockVersion attesa nella clausola WHERE — se zero
    // righe vengono modificate, un'altra richiesta ha scritto nel frattempo.
    const result = await this.prisma.user.updateMany({
      where: { id: props.id, lockVersion: existing.lockVersion },
      data: {
        email: props.email.toString(),
        passwordHash: props.passwordHash,
        mfaEnabled: props.mfaEnabled,
        status: props.status,
        lockVersion: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new OptimisticLockError();
    }
  }

  private toDomain(record: {
    id: string;
    email: string;
    passwordHash: string | null;
    mfaEnabled: boolean;
    status: string;
    createdAt: Date;
    lockVersion: number;
  }): User {
    return User.reconstitute({
      id: record.id,
      email: Email.create(record.email),
      passwordHash: record.passwordHash,
      mfaEnabled: record.mfaEnabled,
      status: record.status as 'ACTIVE' | 'SUSPENDED',
      createdAt: record.createdAt,
      lockVersion: record.lockVersion,
    });
  }
}
