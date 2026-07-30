import { PrismaClientOrTx } from '@aios/eventing';
import type { JsonObject } from '@aios/domain-model';
import { Organization, OrganizationProps } from '../domain/organization.entity';
import { OrganizationRepository, OptimisticLockError } from '../application/ports';

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClientOrTx) {}

  async findById(id: string): Promise<Organization | null> {
    const record = await this.prisma.organization.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const record = await this.prisma.organization.findUnique({ where: { slug } });
    return record !== null;
  }

  async save(organization: Organization): Promise<void> {
    const props = organization.toPersistence();
    const existing = await this.prisma.organization.findUnique({ where: { id: props.id } });

    // Per un campo Json nullable, passare `null` esplicito richiederebbe i
    // sentinel `Prisma.JsonNull`/`Prisma.DbNull` — più semplice e altrettanto
    // corretto omettere del tutto la chiave quando non c'è un valore
    // (stessa strategia già applicata in Administration per l'audit log).
    // Non serve per gli altri campi nullable sotto (stringhe/numeri
    // semplici, non Json): per quelli `null` è un valore diretto e valido.
    const settingsField = props.settings !== null ? { settings: props.settings as JsonObject } : {};

    const commonFields = {
      name: props.name,
      slug: props.slug,
      legalName: props.legalName,
      vatNumber: props.vatNumber,
      taxCode: props.taxCode,
      pec: props.pec,
      sdi: props.sdi,
      email: props.email,
      phone: props.phone,
      website: props.website,
      logoUrl: props.logoUrl,
      address: props.address,
      city: props.city,
      province: props.province,
      postalCode: props.postalCode,
      country: props.country,
      timezone: props.timezone,
      language: props.language,
      currency: props.currency,
      fiscalYearStart: props.fiscalYearStart,
      fiscalYearEnd: props.fiscalYearEnd,
      defaultWorkspaceId: props.defaultWorkspaceId,
      plan: props.plan,
      status: props.status,
      deletedAt: props.deletedAt,
      ...settingsField,
    };

    if (!existing) {
      await this.prisma.organization.create({
        data: {
          id: props.id,
          ownerUserId: props.ownerUserId,
          lockVersion: props.lockVersion,
          ...commonFields,
        },
      });
      return;
    }

    const result = await this.prisma.organization.updateMany({
      where: { id: props.id, lockVersion: existing.lockVersion },
      data: {
        ...commonFields,
        lockVersion: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new OptimisticLockError();
    }
  }

  private toDomain(record: {
    id: string;
    name: string | null;
    slug: string | null;
    legalName: string | null;
    vatNumber: string | null;
    taxCode: string | null;
    pec: string | null;
    sdi: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    logoUrl: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string;
    timezone: string;
    language: string;
    currency: string;
    fiscalYearStart: number;
    fiscalYearEnd: number;
    defaultWorkspaceId: string | null;
    ownerUserId: string;
    plan: string;
    status: string;
    settings: unknown;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    lockVersion: number;
  }): Organization {
    // `name`/`slug` sono nullable a livello di colonna solo per permettere
    // la migrazione non interattiva su righe esistenti (vedi schema.prisma
    // e scripts/backfill-organization-v2.ts) — a runtime, dopo il backfill,
    // sono sempre valorizzati. Un record ancora privo dell'uno o dell'altro
    // indica un backfill non ancora eseguito: un errore esplicito è più
    // corretto di un valore fittizio silenzioso.
    if (record.name === null || record.slug === null) {
      throw new Error(
        `Organization ${record.id} priva di name/slug — eseguire 'pnpm db:backfill-2.1' prima di leggerla.`,
      );
    }

    const props: OrganizationProps = {
      id: record.id,
      name: record.name,
      slug: record.slug,
      legalName: record.legalName,
      vatNumber: record.vatNumber,
      taxCode: record.taxCode,
      pec: record.pec,
      sdi: record.sdi,
      email: record.email,
      phone: record.phone,
      website: record.website,
      logoUrl: record.logoUrl,
      address: record.address,
      city: record.city,
      province: record.province,
      postalCode: record.postalCode,
      country: record.country,
      timezone: record.timezone,
      language: record.language,
      currency: record.currency,
      fiscalYearStart: record.fiscalYearStart,
      fiscalYearEnd: record.fiscalYearEnd,
      defaultWorkspaceId: record.defaultWorkspaceId,
      ownerUserId: record.ownerUserId,
      plan: record.plan as Organization['plan'],
      status: record.status as Organization['status'],
      settings: (record.settings as JsonObject | null) ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      lockVersion: record.lockVersion,
    };

    return Organization.reconstitute(props);
  }
}
