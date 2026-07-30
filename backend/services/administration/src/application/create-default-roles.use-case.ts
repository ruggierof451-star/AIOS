/**
 * CreateDefaultRolesUseCase — Feature 2.1 (First Meeting Foundation).
 *
 * Estrae in un caso d'uso reale ciò che finora esisteva solo come
 * logica ad-hoc dentro scripts/seed-dev-db.ts: la creazione dei tre
 * ruoli di sistema (Admin/Manager/Employee) per una nuova
 * organizzazione, con lo stesso identico set di permessi già seminato
 * per l'organizzazione demo — nessuna divergenza tra ciò che il seed
 * crea per lo sviluppo e ciò che un'organizzazione reale riceve.
 *
 * Idempotente per costruzione (coerente con la strategia di ripresa
 * dell'orchestratore di provisioning, Incremento successivo): se i
 * ruoli per questa organizzazione esistono già, non li ricrea né
 * fallisce — li lascia intatti e assegna comunque l'utente indicato al
 * ruolo Admin se non lo è già.
 */

export interface DefaultRoleDefinition {
  name: 'Admin' | 'Manager' | 'Employee';
  permissionActions: string[];
}

/**
 * Stesso identico set di permessi già seminato per l'organizzazione demo
 * (scripts/seed-dev-db.ts) — nessuna duplicazione concettuale, una sola
 * fonte di verità per "quali permessi ha di default ciascun ruolo".
 */
export const DEFAULT_ROLE_DEFINITIONS: readonly DefaultRoleDefinition[] = [
  {
    name: 'Admin',
    permissionActions: [
      'organization.update',
      'organization.plan.change',
      'organization.archive',
      'workspace.create',
      'workspace.member.invite',
      'workspace.member.remove',
      'workspace.member.role.change',
    ],
  },
  {
    name: 'Manager',
    permissionActions: ['workspace.member.invite', 'workspace.member.role.change'],
  },
  {
    name: 'Employee',
    permissionActions: [],
  },
];

export interface RoleProvisioningRepository {
  /**
   * Crea il ruolo con il nome e i permessi indicati per l'organizzazione,
   * se non esiste già (idempotente per `organizationId` + `name`, coerente
   * col vincolo di unicità già presente nello schema). Restituisce
   * l'id del ruolo, sia che sia stato appena creato sia che esistesse già.
   */
  ensureRole(params: {
    organizationId: string;
    name: string;
    permissionActions: string[];
  }): Promise<{ roleId: string }>;

  /**
   * Assegna l'utente al ruolo nell'organizzazione, se non è già assegnato
   * (idempotente, coerente col vincolo di unicità userId+organizationId+roleId).
   */
  ensureAssignment(params: { userId: string; organizationId: string; roleId: string }): Promise<void>;
}

export interface CreateDefaultRolesInput {
  organizationId: string;
  ownerUserId: string;
}

export interface CreateDefaultRolesOutput {
  roleIds: Record<'Admin' | 'Manager' | 'Employee', string>;
}

export class CreateDefaultRolesUseCase {
  constructor(private readonly repository: RoleProvisioningRepository) {}

  async execute(input: CreateDefaultRolesInput): Promise<CreateDefaultRolesOutput> {
    const created: Array<{ name: DefaultRoleDefinition['name']; roleId: string }> = [];

    for (const definition of DEFAULT_ROLE_DEFINITIONS) {
      const { roleId } = await this.repository.ensureRole({
        organizationId: input.organizationId,
        name: definition.name,
        permissionActions: definition.permissionActions,
      });
      created.push({ name: definition.name, roleId });
    }

    // Nessun fallback silenzioso: se uno qualunque dei tre ruoli attesi
    // non risulta creato, è un errore da segnalare esplicitamente, non
    // da mascherare restituendo l'id di un ruolo diverso.
    const findRoleId = (name: DefaultRoleDefinition['name']): string => {
      const match = created.find((entry) => entry.name === name);
      if (!match) {
        throw new Error(`Ruolo '${name}' non risulta creato correttamente per l'organizzazione ${input.organizationId}.`);
      }
      return match.roleId;
    };

    const adminRoleId = findRoleId('Admin');
    const managerRoleId = findRoleId('Manager');
    const employeeRoleId = findRoleId('Employee');

    await this.repository.ensureAssignment({
      userId: input.ownerUserId,
      organizationId: input.organizationId,
      roleId: adminRoleId,
    });

    return {
      roleIds: {
        Admin: adminRoleId,
        Manager: managerRoleId,
        Employee: employeeRoleId,
      },
    };
  }
}
