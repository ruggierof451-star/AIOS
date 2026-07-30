import { describe, it, expect } from 'vitest';
import { GetUserGrantsUseCase, RoleAssignmentRepository } from '../get-user-grants.use-case';
import { PermissionGrant } from '@aios/rbac';

class FakeRoleAssignmentRepository implements RoleAssignmentRepository {
  constructor(private readonly grants: PermissionGrant[]) {}
  async findGrantsForUser(): Promise<PermissionGrant[]> {
    return this.grants;
  }
}

describe('GetUserGrantsUseCase', () => {
  it('restituisce i grant esposti dal repository', async () => {
    const grants: PermissionGrant[] = [{ action: 'crm.customer.view' }];
    const useCase = new GetUserGrantsUseCase(new FakeRoleAssignmentRepository(grants));

    const result = await useCase.execute({ userId: 'user-1', organizationId: 'org-1' });
    expect(result).toEqual(grants);
  });

  it('restituisce un array vuoto se l\'utente non ha alcun ruolo assegnato', async () => {
    const useCase = new GetUserGrantsUseCase(new FakeRoleAssignmentRepository([]));
    const result = await useCase.execute({ userId: 'user-senza-ruoli', organizationId: 'org-1' });
    expect(result).toEqual([]);
  });
});
