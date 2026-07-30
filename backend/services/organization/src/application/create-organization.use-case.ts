import { Organization, Plan } from '../domain/organization.entity';
import { normalizeSlug } from '../domain/slug';
import { OrganizationRepository, DomainEventPublisher } from './ports';

export interface CreateOrganizationInput {
  name: string;
  ownerUserId: string;
  legalName?: string;
  plan?: Plan;
  vatNumber?: string;
  taxCode?: string;
  pec?: string;
  sdi?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  fiscalYearStart?: number;
  fiscalYearEnd?: number;
}

export interface CreateOrganizationOutput {
  organizationId: string;
  name: string;
  slug: string;
  plan: Plan;
}

export class CreateOrganizationUseCase {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<CreateOrganizationOutput> {
    const slug = await this.generateUniqueSlug(input.name);

    const organization = Organization.create({
      name: input.name,
      slug,
      ownerUserId: input.ownerUserId,
      // exactOptionalPropertyTypes: ogni campo opzionale va omesso del
      // tutto quando assente, mai passato esplicitamente come undefined
      // (Organization.create applica i propri default interni).
      ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
      ...(input.plan !== undefined ? { plan: input.plan } : {}),
      ...(input.vatNumber !== undefined ? { vatNumber: input.vatNumber } : {}),
      ...(input.taxCode !== undefined ? { taxCode: input.taxCode } : {}),
      ...(input.pec !== undefined ? { pec: input.pec } : {}),
      ...(input.sdi !== undefined ? { sdi: input.sdi } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.province !== undefined ? { province: input.province } : {}),
      ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
      ...(input.country !== undefined ? { country: input.country } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      ...(input.language !== undefined ? { language: input.language } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.fiscalYearStart !== undefined ? { fiscalYearStart: input.fiscalYearStart } : {}),
      ...(input.fiscalYearEnd !== undefined ? { fiscalYearEnd: input.fiscalYearEnd } : {}),
    });

    await this.organizationRepository.save(organization);

    await this.eventPublisher.publish({
      eventType: 'OrganizationCreated',
      aggregateId: organization.id,
      organizationId: organization.id,
      payload: {
        schema_version: 1,
        organization_id: organization.id,
        name: organization.name,
        slug: organization.slug,
        owner_user_id: organization.ownerUserId,
        plan: organization.plan,
      },
    });

    return {
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
    };
  }

  /**
   * Business Rule: "lo slug deve essere unico, generato automaticamente,
   * normalizzato". La normalizzazione è pura (domain/slug.ts); la verifica
   * di unicità richiede I/O ed è quindi qui, nel caso d'uso, non
   * nell'entità. In caso di collisione con lo slug base, disambigua con
   * un suffisso numerico progressivo.
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = normalizeSlug(name) || 'organizzazione';
    let candidate = baseSlug;
    let suffix = 1;
    while (await this.organizationRepository.existsBySlug(candidate)) {
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
    return candidate;
  }
}
