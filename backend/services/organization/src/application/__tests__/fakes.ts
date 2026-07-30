import { Organization } from '../../domain/organization.entity';
import type { OrganizationRepository, DomainEventPublisher } from '../ports';

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private organizations = new Map<string, Organization>();

  async findById(id: string): Promise<Organization | null> {
    return this.organizations.get(id) ?? null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    for (const org of this.organizations.values()) {
      if (org.slug === slug) return true;
    }
    return false;
  }

  async save(organization: Organization): Promise<void> {
    this.organizations.set(organization.id, organization);
  }
}

export class RecordingEventPublisher implements DomainEventPublisher {
  public published: Array<{ eventType: string; aggregateId: string; payload: Record<string, unknown> }> = [];
  async publish(event: { eventType: string; aggregateId: string; payload: Record<string, unknown> }): Promise<void> {
    this.published.push(event);
  }
}
