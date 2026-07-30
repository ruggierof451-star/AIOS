/**
 * Re-export dell'implementazione condivisa (Milestone 2 — refactor di
 * coerenza): questo file esisteva già come classe locale identica; per
 * evitare la duplicazione ora delega al pacchetto @aios/eventing,
 * riutilizzato anche da Organization e da ogni servizio futuro.
 */
export { PrismaOutboxEventPublisher } from '@aios/eventing';
