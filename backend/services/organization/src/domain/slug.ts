/**
 * Normalizza una stringa in uno slug URL-safe (Milestone 2.1, "Business
 * Rules — lo slug deve essere normalizzato"). Funzione pura, nessun I/O:
 * l'unicità (che richiede accesso al repository) è responsabilità del
 * caso d'uso che la chiama, non di questa funzione — coerente con la
 * separazione dominio/infrastruttura già in uso nel resto del progetto.
 *
 * Esempi: "Àcme Corp S.r.l." → "acme-corp-s-r-l"; "  Caffè   Bar  " →
 * "caffe-bar".
 */
export function normalizeSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove i segni diacritici (é → e, à → a)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // ogni sequenza non alfanumerica diventa un trattino
    .replace(/^-+|-+$/g, '') // nessun trattino iniziale/finale
    .slice(0, 80); // lunghezza massima ragionevole per una colonna slug
}
