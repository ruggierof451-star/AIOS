import { describe, it, expect, beforeEach } from 'vitest';
import { CreateOrganizationUseCase } from '../create-organization.use-case';
import { InMemoryOrganizationRepository, RecordingEventPublisher } from './fakes';

describe('CreateOrganizationUseCase', () => {
  let repository: InMemoryOrganizationRepository;
  let events: RecordingEventPublisher;
  let useCase: CreateOrganizationUseCase;

  beforeEach(() => {
    repository = new InMemoryOrganizationRepository();
    events = new RecordingEventPublisher();
    useCase = new CreateOrganizationUseCase(repository, events);
  });

  it('crea un\'organizzazione con piano STARTER di default', async () => {
    const result = await useCase.execute({ name: 'Rossi Srl', ownerUserId: 'user-1' });
    expect(result.plan).toBe('STARTER');
    expect(result.name).toBe('Rossi Srl');
  });

  it('genera automaticamente uno slug normalizzato dal nome', async () => {
    const result = await useCase.execute({ name: 'Rossi & Bianchi S.r.l.', ownerUserId: 'user-1' });
    expect(result.slug).toBe('rossi-bianchi-s-r-l');
  });

  it('disambigua lo slug se il nome produce una collisione', async () => {
    const first = await useCase.execute({ name: 'Rossi Srl', ownerUserId: 'user-1' });
    const second = await useCase.execute({ name: 'Rossi Srl', ownerUserId: 'user-2' });
    expect(first.slug).toBe('rossi-srl');
    expect(second.slug).toBe('rossi-srl-2');
    expect(second.slug).not.toBe(first.slug);
  });

  it('crea un\'organizzazione con il piano esplicitamente richiesto', async () => {
    const result = await useCase.execute({
      name: 'Bianchi Spa',
      ownerUserId: 'user-2',
      plan: 'ENTERPRISE',
    });
    expect(result.plan).toBe('ENTERPRISE');
  });

  it('salva l\'organizzazione nel repository', async () => {
    const result = await useCase.execute({ name: 'Rossi Srl', ownerUserId: 'user-1' });
    const saved = await repository.findById(result.organizationId);
    expect(saved).not.toBeNull();
    expect(saved?.ownerUserId).toBe('user-1');
  });

  it('pubblica l\'evento OrganizationCreated', async () => {
    const result = await useCase.execute({ name: 'Rossi Srl', ownerUserId: 'user-1' });
    expect(events.published).toHaveLength(1);
    const [published] = events.published;
    expect(published).toBeDefined();
    expect(published?.eventType).toBe('OrganizationCreated');
    expect(published?.aggregateId).toBe(result.organizationId);
  });

  it('rifiuta un nome vuoto', async () => {
    await expect(
      useCase.execute({ name: '   ', ownerUserId: 'user-1' }),
    ).rejects.toThrow();
  });
});
