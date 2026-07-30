import { RefreshTokenRepository, RefreshTokenRecord } from '../application/ports';
import { PrismaClientOrTx } from './prisma-user.repository';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async create(record: Omit<RefreshTokenRecord, 'id'>): Promise<RefreshTokenRecord> {
    const created = await this.prisma.refreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
        replacedBy: record.replacedBy,
      },
    });
    return created;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revoke(id: string, replacedById: string | null): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedBy: replacedById },
    });
  }
}
