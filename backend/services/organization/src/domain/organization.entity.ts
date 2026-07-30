/**
 * Organization — Aggregate Root del Bounded Context Organization
 * (Domain Model, sezione 2.3). Radice dell'isolamento multi-tenant.
 *
 * Feature 2.1 (First Meeting Foundation): aggiunge i campi anagrafici,
 * fiscali e di localizzazione richiesti dal prodotto, un vero enum di
 * stato (`status`) al posto del solo `archivedAt`, e lo slug immutabile.
 *
 * Ciclo di vita dello stato (corretto dopo revisione dell'Incremento 1):
 *
 *   ACTIVE ⇄ SUSPENDED
 *   ACTIVE|SUSPENDED → ARCHIVED → (restore) → ACTIVE
 *   DELETED — stato riservato, non raggiungibile dal normale flusso
 *   utente in questo incremento. Nessun metodo dell'aggregate vi porta
 *   ancora: esiste nel tipo solo per essere pronto quando una futura
 *   funzionalità di eliminazione definitiva (procedura amministrativa)
 *   verrà costruita — non è codice morto, è un tipo dichiarato in
 *   anticipo senza un percorso ancora cablato, deliberatamente.
 *
 * Decisioni di scope esplicite (per non essere "silenziose"):
 * - I nuovi campi anagrafici/fiscali/di localizzazione sono impostabili
 *   in fase di creazione, ma non hanno ancora un metodo di
 *   aggiornamento dedicato: arriveranno insieme alle relative
 *   validazioni robuste in una Feature futura.
 * - Le transizioni di stato esistono come comportamento dell'aggregate
 *   ma solo `archive` (via `DELETE /organizations/:id`) è oggi esposta
 *   da un endpoint — `suspend`/`reactivate`/`restore` arrivano insieme
 *   alle regole di business più fini in una Feature futura.
 * - Solo lo stato DELETED blocca ulteriori mutazioni (assertNotDeleted).
 *   SUSPENDED/ARCHIVED restano modificabili in questo incremento.
 * - `deletedAt` è valorizzato solo quando (in futuro) lo stato diventa
 *   DELETED — mai da `archive()`, che è reversibile e non tocca questo
 *   campo.
 */

import { generateUuidV7 } from '@aios/domain-model';
import type { JsonObject } from '@aios/domain-model';

export type Plan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';
export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'DELETED';

export class InvalidNameError extends Error {
  constructor() {
    super('Il nome non può essere vuoto.');
    this.name = 'InvalidNameError';
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStatusTransitionError';
  }
}

export interface OrganizationProps {
  id: string;
  name: string;
  slug: string;
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
  plan: Plan;
  status: OrganizationStatus;
  settings: JsonObject | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  lockVersion: number;
}

export interface CreateOrganizationParams {
  name: string;
  slug: string;
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

export class Organization {
  private constructor(private props: OrganizationProps) {}

  static create(params: CreateOrganizationParams): Organization {
    const trimmedName = params.name.trim();
    if (trimmedName.length === 0) {
      throw new InvalidNameError();
    }
    // Una ragione sociale fornita ma vuota dopo il trim equivale a "non
    // fornita" (il campo è opzionale) — non è un errore di validazione,
    // a differenza di `name` che è sempre obbligatorio.
    const trimmedLegalName = params.legalName?.trim();

    return new Organization({
      id: generateUuidV7(),
      name: trimmedName,
      slug: params.slug,
      legalName: trimmedLegalName && trimmedLegalName.length > 0 ? trimmedLegalName : null,
      vatNumber: params.vatNumber ?? null,
      taxCode: params.taxCode ?? null,
      pec: params.pec ?? null,
      sdi: params.sdi ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      website: params.website ?? null,
      logoUrl: params.logoUrl ?? null,
      address: params.address ?? null,
      city: params.city ?? null,
      province: params.province ?? null,
      postalCode: params.postalCode ?? null,
      country: params.country ?? 'IT',
      timezone: params.timezone ?? 'Europe/Rome',
      language: params.language ?? 'it',
      currency: params.currency ?? 'EUR',
      fiscalYearStart: params.fiscalYearStart ?? 1,
      fiscalYearEnd: params.fiscalYearEnd ?? 12,
      defaultWorkspaceId: null,
      ownerUserId: params.ownerUserId,
      plan: params.plan ?? 'STARTER',
      status: 'ACTIVE',
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      lockVersion: 1,
    });
  }

  static reconstitute(props: OrganizationProps): Organization {
    return new Organization(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get legalName(): string | null {
    return this.props.legalName;
  }

  get vatNumber(): string | null {
    return this.props.vatNumber;
  }

  get taxCode(): string | null {
    return this.props.taxCode;
  }

  get pec(): string | null {
    return this.props.pec;
  }

  get sdi(): string | null {
    return this.props.sdi;
  }

  get email(): string | null {
    return this.props.email;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get website(): string | null {
    return this.props.website;
  }

  get logoUrl(): string | null {
    return this.props.logoUrl;
  }

  get address(): string | null {
    return this.props.address;
  }

  get city(): string | null {
    return this.props.city;
  }

  get province(): string | null {
    return this.props.province;
  }

  get postalCode(): string | null {
    return this.props.postalCode;
  }

  get country(): string {
    return this.props.country;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get language(): string {
    return this.props.language;
  }

  get currency(): string {
    return this.props.currency;
  }

  get fiscalYearStart(): number {
    return this.props.fiscalYearStart;
  }

  get fiscalYearEnd(): number {
    return this.props.fiscalYearEnd;
  }

  get defaultWorkspaceId(): string | null {
    return this.props.defaultWorkspaceId;
  }

  get ownerUserId(): string {
    return this.props.ownerUserId;
  }

  get plan(): Plan {
    return this.props.plan;
  }

  get status(): OrganizationStatus {
    return this.props.status;
  }

  get isArchived(): boolean {
    return this.props.status === 'ARCHIVED' || this.props.status === 'DELETED';
  }

  get lockVersion(): number {
    return this.props.lockVersion;
  }

  get settings(): JsonObject | null {
    return this.props.settings;
  }

  updateSettings(newSettings: JsonObject): void {
    this.assertNotDeleted();
    this.props.settings = { ...(this.props.settings ?? {}), ...newSettings };
    this.touch();
  }

  rename(newName: string): void {
    this.assertNotDeleted();
    const trimmed = newName.trim();
    if (trimmed.length === 0) {
      throw new InvalidNameError();
    }
    this.props.name = trimmed;
    this.touch();
  }

  changePlan(newPlan: Plan): void {
    this.assertNotDeleted();
    this.props.plan = newPlan;
    this.touch();
  }

  suspend(): void {
    this.assertNotDeleted();
    if (this.props.status !== 'ACTIVE') {
      throw new InvalidStatusTransitionError("Solo un'organizzazione attiva può essere sospesa.");
    }
    this.props.status = 'SUSPENDED';
    this.touch();
  }

  reactivate(): void {
    this.assertNotDeleted();
    if (this.props.status !== 'SUSPENDED') {
      throw new InvalidStatusTransitionError("Solo un'organizzazione sospesa può essere riattivata.");
    }
    this.props.status = 'ACTIVE';
    this.touch();
  }

  /**
   * Cancellazione logica dal punto di vista dell'utente — porta ad
   * ARCHIVED, non a DELETED. Reversibile via `restore()`. DELETED resta
   * uno stato riservato a procedure amministrative o a una futura
   * funzionalità di eliminazione definitiva, non raggiungibile da qui
   * (vedi intestazione del file).
   */
  archive(): void {
    this.assertNotDeleted();
    if (this.props.status === 'ARCHIVED') {
      throw new InvalidStatusTransitionError("L'organizzazione è già stata archiviata.");
    }
    this.props.status = 'ARCHIVED';
    this.touch();
  }

  /**
   * Ripristina un'organizzazione archiviata — simmetrico a `reactivate`.
   * Non applicabile da DELETED (stato terminale/riservato, quando in
   * futuro sarà raggiungibile).
   */
  restore(): void {
    this.assertNotDeleted();
    if (this.props.status !== 'ARCHIVED') {
      throw new InvalidStatusTransitionError("Solo un'organizzazione archiviata può essere ripristinata.");
    }
    this.props.status = 'ACTIVE';
    this.touch();
  }

  private assertNotDeleted(): void {
    if (this.props.status === 'DELETED') {
      throw new InvalidStatusTransitionError('Questa organizzazione è stata eliminata.');
    }
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  toPersistence(): OrganizationProps {
    return { ...this.props };
  }
}
