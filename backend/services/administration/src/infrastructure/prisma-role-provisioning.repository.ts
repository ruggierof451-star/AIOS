import { PrismaClient } from '@prisma/client';
import { RoleProvisioningRepository } from '../application/create-default-roles.use-case';

export class PrismaRoleProvisioningRepository implements RoleProvisioningRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureRole(params: {
    organizationId: string;
    name: string;
    permissionActions: string[];
  }): Promise<{ roleId: string }> {
    const existing = await this.prisma.role.findUnique({
      where: { organizationId_name: { organizationId: params.organizationId, name: params.name } },
    });
    if (existing) {
      return { roleId: existing.id };
    }

    const created = await this.prisma.role.create({
      data: {
        organizationId: params.organizationId,
        name: params.name,
        isSystemRole: false,
        permissions: {
          create: params.permissionActions.map((action) => ({ action })),
        },
      },
    });
    return { roleId: created.id };
  }

  async ensureAssignment(params: { userId: string; organizationId: string; roleId: string }): Promise<void> {
    const existing = await this.prisma.userRoleAssignment.findUnique({
      where: {
        userId_organizationId_roleId: {
          userId: params.userId,
          organizationId: params.organizationId,
          roleId: params.roleId,
        },
      },
    });
    if (existing) return;

    await this.prisma.userRoleAssignment.create({
      data: {
        userId: params.userId,
        organizationId: params.organizationId,
        roleId: params.roleId,
      },
    });
  }
}
