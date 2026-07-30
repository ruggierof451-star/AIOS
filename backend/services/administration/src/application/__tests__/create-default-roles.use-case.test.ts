import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CreateDefaultRolesUseCase, RoleProvisioningRepository } from '../create-default-roles.use-case';

class FakeRoleProvisioningRepository implements RoleProvisioningRepository {
  public roles = new Map<string, { roleId: string; permissionActions: string[] }>();
  public assignments = new Set<string>();
  public ensureRoleCalls = 0;

  private key(organizationId: string, name: string): string {
    return `${organizationId}:${name}`;
  }

  async ensureRole(params: {
    organizationId: string;
    name: string;
    permissionActions: string[];
  }): Promise<{ roleId: string }> {
    this.ensureRoleCalls += 1;
    const key = this.key(params.organizationId, params.name);
    const existing = this.roles.get(key);
    if (existing) return { roleId: existing.roleId };

    const roleId = randomUUID();
    this.roles.set(key, { roleId, permissionActions: params.permissionActions });
    return { roleId };
  }

  async ensureAssignment(params: { userId: string; organizationId: string; roleId: string }): Promise<void> {
    this.assignments.add(`${params.userId}:${params.organizationId}:${params.roleId}`);
  }
}

describe('CreateDefaultRolesUseCase', () => {
  it('crea i tre ruoli di default (Admin, Manager, Employee)', async () => {
    const repository = new FakeRoleProvisioningRepository();
    const useCase = new CreateDefaultRolesUseCase(repository);

    const result = await useCase.execute({ organizationId: 'org-1', ownerUserId: 'user-1' });

    expect(Object.keys(result.roleIds).sort()).toEqual(['Admin', 'Employee', 'Manager']);
    expect(repository.roles.size).toBe(3);
  });

  it('assegna il proprietario al ruolo Admin', async () => {
    const repository = new FakeRoleProvisioningRepository();
    const useCase = new CreateDefaultRolesUseCase(repository);

    const result = await useCase.execute({ organizationId: 'org-1', ownerUserId: 'user-1' });

    expect(repository.assignments.has(`user-1:org-1:${result.roleIds.Admin}`)).toBe(true);
  });

  it('crea il ruolo Admin con lo stesso set di permessi già seminato per la demo', async () => {
    const repository = new FakeRoleProvisioningRepository();
    const useCase = new CreateDefaultRolesUseCase(repository);

    await useCase.execute({ organizationId: 'org-1', ownerUserId: 'user-1' });

    const adminRole = repository.roles.get('org-1:Admin');
    expect(adminRole?.permissionActions).toEqual([
      'organization.update',
      'organization.plan.change',
      'organization.archive',
      'workspace.create',
      'workspace.member.invite',
      'workspace.member.remove',
      'workspace.member.role.change',
    ]);
  });

  it('è idempotente: rieseguito sulla stessa organizzazione non crea ruoli duplicati', async () => {
    const repository = new FakeRoleProvisioningRepository();
    const useCase = new CreateDefaultRolesUseCase(repository);

    const first = await useCase.execute({ organizationId: 'org-1', ownerUserId: 'user-1' });
    const second = await useCase.execute({ organizationId: 'org-1', ownerUserId: 'user-1' });

    expect(repository.roles.size).toBe(3);
    expect(second.roleIds.Admin).toBe(first.roleIds.Admin);
    expect(second.roleIds.Manager).toBe(first.roleIds.Manager);
    expect(second.roleIds.Employee).toBe(first.roleIds.Employee);
  });

  it('è idempotente anche per organizzazioni diverse (ruoli non condivisi tra tenant)', async () => {
    const repository = new FakeRoleProvisioningRepository();
    const useCase = new CreateDefaultRolesUseCase(repository);

    const orgA = await useCase.execute({ organizationId: 'org-a', ownerUserId: 'user-1' });
    const orgB = await useCase.execute({ organizationId: 'org-b', ownerUserId: 'user-2' });

    expect(orgA.roleIds.Admin).not.toBe(orgB.roleIds.Admin);
    expect(repository.roles.size).toBe(6);
  });
});
