import { PrismaClient } from '@prisma/client';
import { PermissionGrant } from '@aios/rbac';
import { RoleAssignmentRepository } from '../application/get-user-grants.use-case';

export class PrismaRoleAssignmentRepository implements RoleAssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findGrantsForUser(userId: string, organizationId: string): Promise<PermissionGrant[]> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, organizationId },
      include: { role: { include: { permissions: true } } },
    });

    const grants: PermissionGrant[] = [];
    for (const assignment of assignments) {
      for (const permission of assignment.role.permissions) {
        grants.push({
          action: permission.action,
          // `scope` accetta esplicitamente `null` nel suo tipo — nessuna
          // conversione a `undefined` necessaria (che violerebbe
          // `exactOptionalPropertyTypes` comunque, essendo un valore
          // esplicito e non un'omissione della chiave).
          scope: permission.scope as Record<string, unknown> | null,
        });
      }
    }
    return grants;
  }
}
