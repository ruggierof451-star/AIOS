import { PrismaClientOrTx } from '@aios/eventing';
import { Workspace } from '../domain/workspace.entity';
import { WorkspaceRepository, OptimisticLockError } from '../application/ports';

export class PrismaWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async findById(id: string): Promise<Workspace | null> {
    const record = await this.prisma.workspace.findUnique({
      where: { id },
      include: { memberships: true },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async save(workspace: Workspace): Promise<void> {
    const props = workspace.toPersistence();
    const existing = await this.prisma.workspace.findUnique({ where: { id: props.id } });

    if (!existing) {
      await this.prisma.workspace.create({
        data: {
          id: props.id,
          organizationId: props.organizationId,
          name: props.name,
          archivedAt: props.archivedAt,
          lockVersion: props.lockVersion,
          memberships: {
            create: props.members.map((m) => ({
              userId: m.userId,
              roleName: m.roleName,
              joinedAt: m.joinedAt,
            })),
          },
        },
      });
      return;
    }

    // Aggiornamento con optimistic locking sulla riga Workspace, più
    // sincronizzazione completa della membership (strategia "elimina e
    // ricrea" per semplicità in questa milestone — accettabile per il
    // volume atteso di membri per workspace, da rivedere con un diff
    // puntuale se il numero di membri crescesse molto).
    const result = await this.prisma.workspace.updateMany({
      where: { id: props.id, lockVersion: existing.lockVersion },
      data: {
        name: props.name,
        archivedAt: props.archivedAt,
        lockVersion: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new OptimisticLockError();
    }

    await this.prisma.workspaceMembership.deleteMany({ where: { workspaceId: props.id } });
    await this.prisma.workspaceMembership.createMany({
      data: props.members.map((m) => ({
        workspaceId: props.id,
        userId: m.userId,
        roleName: m.roleName,
        joinedAt: m.joinedAt,
      })),
    });
  }

  private toDomain(record: {
    id: string;
    organizationId: string;
    name: string;
    createdAt: Date;
    archivedAt: Date | null;
    lockVersion: number;
    memberships: Array<{ userId: string; roleName: string; joinedAt: Date }>;
  }): Workspace {
    return Workspace.reconstitute({
      id: record.id,
      organizationId: record.organizationId,
      name: record.name,
      members: record.memberships.map((m) => ({
        userId: m.userId,
        roleName: m.roleName,
        joinedAt: m.joinedAt,
      })),
      createdAt: record.createdAt,
      archivedAt: record.archivedAt,
      lockVersion: record.lockVersion,
    });
  }
}
