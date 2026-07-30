import type { JsonObject } from '@aios/domain-model';
import { Plan } from '../domain/organization.entity';
import { OrganizationRepository, DomainEventPublisher, OrganizationNotFoundError } from './ports';

export interface UpdateOrganizationInput {
  organizationId: string;
  // Rinominato da `legalName` a `name`, coerente con la Feature 2.1:
  // `name` è ora il nome primario dell'organizzazione (vedi
  // domain/organization.entity.ts). L'aggiornamento della ragione
  // sociale formale (legalName) e degli altri campi anagrafici/fiscali
  // è deliberatamente fuori scope in questo incremento — arriverà
  // insieme alle relative validazioni robuste.
  name?: string;
  settings?: JsonObject;
}

export class UpdateOrganizationUseCase {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(input: UpdateOrganizationInput): Promise<void> {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) throw new OrganizationNotFoundError();

    if (input.name) organization.rename(input.name);
    if (input.settings) organization.updateSettings(input.settings);

    await this.organizationRepository.save(organization);

    await this.eventPublisher.publish({
      eventType: 'OrganizationUpdated',
      aggregateId: organization.id,
      organizationId: organization.id,
      payload: { schema_version: 1, organization_id: organization.id },
    });
  }
}

export interface ChangeOrganizationPlanInput {
  organizationId: string;
  newPlan: Plan;
}

export class ChangeOrganizationPlanUseCase {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(input: ChangeOrganizationPlanInput): Promise<void> {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) throw new OrganizationNotFoundError();

    organization.changePlan(input.newPlan);
    await this.organizationRepository.save(organization);

    await this.eventPublisher.publish({
      eventType: 'OrganizationPlanChanged',
      aggregateId: organization.id,
      organizationId: organization.id,
      payload: { schema_version: 1, organization_id: organization.id, new_plan: input.newPlan },
    });
  }
}

export interface ArchiveOrganizationInput {
  organizationId: string;
}

/**
 * Nome della classe e dell'evento pubblicato invariati per continuità —
 * chiama `organization.archive()`: porta a ARCHIVED, reversibile via un
 * futuro endpoint di ripristino (Feature 2.3), mai a DELETED (stato
 * riservato, vedi domain/organization.entity.ts).
 */
export class ArchiveOrganizationUseCase {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(input: ArchiveOrganizationInput): Promise<void> {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) throw new OrganizationNotFoundError();

    organization.archive(); // lancia InvalidStatusTransitionError se già archiviata
    await this.organizationRepository.save(organization);

    await this.eventPublisher.publish({
      eventType: 'OrganizationArchived',
      aggregateId: organization.id,
      organizationId: organization.id,
      payload: { schema_version: 1, organization_id: organization.id },
    });
  }
}
