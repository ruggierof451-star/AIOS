import { PrismaClientOrTx } from '@aios/eventing';
import { Invite, InviteStatus } from '../domain/invite.entity';
import { InviteRepository } from '../application/ports';

export class PrismaInviteRepository implements InviteRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async findById(id: string): Promise<Invite | null> {
    const record = await this.prisma.workspaceInvite.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByTokenHash(tokenHash: string): Promise<Invite | null> {
    const record = await this.prisma.workspaceInvite.findUnique({ where: { tokenHash } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async save(invite: Invite): Promise<void> {
    const props = invite.toPersistence();
    await this.prisma.workspaceInvite.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        workspaceId: props.workspaceId,
        email: props.email,
        invitedByUserId: props.invitedByUserId,
        roleName: props.roleName,
        tokenHash: props.tokenHash,
        status: props.status,
        expiresAt: props.expiresAt,
        acceptedAt: props.acceptedAt,
      },
      update: {
        status: props.status,
        acceptedAt: props.acceptedAt,
      },
    });
  }

  private toDomain(record: {
    id: string;
    workspaceId: string;
    email: string;
    invitedByUserId: string;
    roleName: string;
    tokenHash: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
    acceptedAt: Date | null;
  }): Invite {
    return Invite.reconstitute({
      id: record.id,
      workspaceId: record.workspaceId,
      email: record.email,
      invitedByUserId: record.invitedByUserId,
      roleName: record.roleName,
      tokenHash: record.tokenHash,
      status: record.status as InviteStatus,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      acceptedAt: record.acceptedAt,
    });
  }
}
