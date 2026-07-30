/**
 * Punto di ingresso unico del pacchetto @aios/domain-model.
 *
 * Storia di questa scelta: in origine ogni utility (generateUuidV7,
 * loadRootEnv) era esposta come sub-path export separato
 * (`@aios/domain-model/shared/uuid`, `@aios/domain-model/shared/load-env`)
 * con una mappa "exports" condizionale (types/default) nel package.json.
 * Questo richiede che il resolver TypeScript supporti correttamente le
 * mappe "exports" con condizioni — supporto che dipende dalla
 * combinazione esatta di `module`/`moduleResolution` usata da chi
 * consuma il pacchetto, e non è garantito con `moduleResolution: "Node"`
 * (la strategia classica, l'unica testata come sicuramente compatibile
 * con `module: "CommonJS"` in ogni versione di TypeScript).
 *
 * Consolidare tutto in un unico entry point (`main`/`types` semplici,
 * nessuna mappa "exports" con sub-path da risolvere) elimina questa
 * classe di problemi alla radice, invece di scommettere su quale
 * combinazione di opzioni del compilatore funzioni.
 */

export { generateUuidV7, isValidUuid } from './shared/uuid';
export { loadRootEnv } from './shared/load-env';
export type { JsonValue, JsonPrimitive, JsonObject } from './shared/json-value';
