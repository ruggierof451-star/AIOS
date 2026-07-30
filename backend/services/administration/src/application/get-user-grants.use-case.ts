import { PermissionGrant } from '@aios/rbac';

export interface RoleAssignmentRepository {
  /**
   * Restituisce tutti i grant effettivi (unione dei permessi di tutti i
   * ruoli assegnati) per un utente in una specifica Organization.
   */
  findGrantsForUser(userId: string, organizationId: string): Promise<PermissionGrant[]>;
}

export class GetUserGrantsUseCase {
  constructor(private readonly roleAssignmentRepository: RoleAssignmentRepository) {}

  async execute(input: { userId: string; organizationId: string }): Promise<PermissionGrant[]> {
    return this.roleAssignmentRepository.findGrantsForUser(input.userId, input.organizationId);
  }
}
