import { Organization } from '../../domain/organization.entity';

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  save(organization: Organization): Promise<void>;
  /**
   * Necessario per la disambiguazione dello slug in fase di creazione
   * (Business Rule: "lo slug deve essere unico"). Sola lettura, nessuna
   * mutazione — coerente con la separazione dominio/infrastruttura già
   * in uso: la normalizzazione è pura (vedi domain/slug.ts), l'unicità
   * richiede I/O ed è quindi responsabilità del repository.
   */
  existsBySlug(slug: string): Promise<boolean>;
}

export class OptimisticLockError extends Error {
  constructor() {
    super('Conflitto di concorrenza: il record è stato modificato da un\'altra richiesta.');
    this.name = 'OptimisticLockError';
  }
}

/**
 * Riesportato da @aios/eventing, mai più ridichiarato localmente —
 * convenzione definitiva sulla nomenclatura/forma degli eventi (Feature
 * 2.1). Prima di questo consolidamento, questo file dichiarava una
 * propria copia strutturalmente identica ma non collegata al tipo
 * condiviso: un rischio concreto, non solo teorico, di divergenza
 * silenziosa.
 */
export type { DomainEvent, DomainEventPublisher } from '@aios/eventing';

export class OrganizationNotFoundError extends Error {
  constructor() {
    super('Organizzazione non trovata.');
    this.name = 'OrganizationNotFoundError';
  }
}
