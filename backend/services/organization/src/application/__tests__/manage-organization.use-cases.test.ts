import { describe, it, expect, beforeEach } from 'vitest';
import {
  UpdateOrganizationUseCase,
  ChangeOrganizationPlanUseCase,
  ArchiveOrganizationUseCase,
} from '../manage-organization.use-cases';
import { OrganizationNotFoundError } from '../ports';
import { Organization, InvalidStatusTransitionError } from '../../domain/organization.entity';
import { InMemoryOrganizationRepository, RecordingEventPublisher } from './fakes';

describe('UpdateOrganizationUseCase', () => {
  let repository: InMemoryOrganizationRepository;
  let events: RecordingEventPublisher;
  let useCase: UpdateOrganizationUseCase;
  let orgId: string;

  beforeEach(async () => {
    repository = new InMemoryOrganizationRepository();
    events = new RecordingEventPublisher();
    useCase = new UpdateOrganizationUseCase(repository, events);

    const org = Organization.create({ name: 'Rossi Srl', slug: 'rossi-srl', ownerUserId: 'user-1' });
    await repository.save(org);
    orgId = org.id;
  });

  it('rinomina l\'organizzazione', async () => {
    await useCase.execute({ organizationId: orgId, name: 'Rossi & Figli Srl' });
    const updated = await repository.findById(orgId);
    expect(updated?.name).toBe('Rossi & Figli Srl');
  });

  it('aggiorna le impostazioni', async () => {
    await useCase.execute({ organizationId: orgId, settings: { branding: 'blue' } });
    const updated = await repository.findById(orgId);
    expect(updated?.settings).toEqual({ branding: 'blue' });
  });

  it('pubblica OrganizationUpdated', async () => {
    await useCase.execute({ organizationId: orgId, name: 'Nuovo nome' });
    expect(events.published.some((e) => e.eventType === 'OrganizationUpdated')).toBe(true);
  });

  it('rifiuta se l\'organizzazione non esiste', async () => {
    await expect(
      useCase.execute({ organizationId: 'non-esiste', name: 'X' }),
    ).rejects.toThrow(OrganizationNotFoundError);
  });
});

describe('ChangeOrganizationPlanUseCase', () => {
  it('cambia il piano e pubblica OrganizationPlanChanged', async () => {
    const repository = new InMemoryOrganizationRepository();
    const events = new RecordingEventPublisher();
    const useCase = new ChangeOrganizationPlanUseCase(repository, events);

    const org = Organization.create({ name: 'Rossi Srl', slug: 'rossi-srl', ownerUserId: 'user-1' });
    await repository.save(org);

    await useCase.execute({ organizationId: org.id, newPlan: 'ENTERPRISE' });

    const updated = await repository.findById(org.id);
    expect(updated?.plan).toBe('ENTERPRISE');
    const [published] = events.published;
    expect(published?.eventType).toBe('OrganizationPlanChanged');
  });
});

describe('ArchiveOrganizationUseCase', () => {
  it('elimina logicamente l\'organizzazione e pubblica OrganizationArchived', async () => {
    const repository = new InMemoryOrganizationRepository();
    const events = new RecordingEventPublisher();
    const useCase = new ArchiveOrganizationUseCase(repository, events);

    const org = Organization.create({ name: 'Rossi Srl', slug: 'rossi-srl', ownerUserId: 'user-1' });
    await repository.save(org);

    await useCase.execute({ organizationId: org.id });

    const updated = await repository.findById(org.id);
    expect(updated?.isArchived).toBe(true);
    expect(updated?.status).toBe('ARCHIVED');
    const [published] = events.published;
    expect(published?.eventType).toBe('OrganizationArchived');
  });

  it('rifiuta di archiviare due volte', async () => {
    const repository = new InMemoryOrganizationRepository();
    const events = new RecordingEventPublisher();
    const useCase = new ArchiveOrganizationUseCase(repository, events);

    const org = Organization.create({ name: 'Rossi Srl', slug: 'rossi-srl', ownerUserId: 'user-1' });
    org.archive();
    await repository.save(org);

    await expect(useCase.execute({ organizationId: org.id })).rejects.toThrow(
      InvalidStatusTransitionError,
    );
  });
});
