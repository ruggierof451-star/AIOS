/**
 * Tipo ricorsivo che rappresenta un valore genuinamente serializzabile
 * come JSON — usato ovunque un dato debba finire in una colonna `Json`
 * di Prisma (Outbox payload, Audit Log before/after state).
 *
 * Perché non `Record<string, unknown>`: `unknown` è troppo generico —
 * TypeScript non può verificare staticamente che un valore `unknown`
 * rispetti la forma ricorsiva richiesta dal tipo `InputJsonValue`
 * generato da Prisma, quindi l'assegnazione fallisce a compile time
 * (`Type 'Record<string, unknown>' is not assignable to type
 * 'JsonNull | InputJsonValue'`). Questo tipo, essendo esso stesso
 * ricorsivo e composto solo da valori genuinamente JSON-compatibili, è
 * strutturalmente assegnabile senza bisogno di cast.
 */
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}
