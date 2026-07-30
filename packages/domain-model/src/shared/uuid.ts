/**
 * Generazione di UUID v7 (Physical Database Schema, sezione 1.3).
 *
 * Perché v7 e non v4: v7 incorpora un componente temporale ordinabile,
 * migliorando la località dell'indice B-tree su tabelle molto grandi
 * rispetto a un UUID v4 completamente casuale — pur restando non
 * enumerabile da un utente esterno (a differenza di un intero
 * auto-incrementante).
 *
 * Generato lato applicativo (non da Postgres) per poter costruire l'id
 * prima ancora della scrittura, senza round-trip al database — necessario
 * ad esempio per il pattern Transactional Outbox (Event Catalog, sez. 5.2),
 * dove l'evento deve riferire l'id dell'Aggregate Root nella stessa
 * transazione che lo crea.
 */

import { randomBytes } from 'node:crypto';

export function generateUuidV7(): string {
  const unixTimestampMs = BigInt(Date.now());
  const timeHex = unixTimestampMs.toString(16).padStart(12, '0');

  const rand = randomBytes(10);

  // Versione (7) nei 4 bit alti del 7° byte. Uso readUInt8/writeUInt8
  // invece dell'accesso indicizzato (rand[0]): con
  // `noUncheckedIndexedAccess` attivo (tsconfig.base.json), un accesso
  // indicizzato su un Buffer è tipizzato `number | undefined` — i metodi
  // readUInt8/writeUInt8 restituiscono/accettano sempre `number`, quindi
  // restano type-safe senza bisogno di asserzioni non-null.
  const byte0 = rand.readUInt8(0);
  rand.writeUInt8((byte0 & 0x0f) | 0x70, 0);

  // Variante RFC 4122 nei 2 bit alti del 9° byte
  const byte2 = rand.readUInt8(2);
  rand.writeUInt8((byte2 & 0x3f) | 0x80, 2);

  const randHex = rand.toString('hex');

  const hex =
    timeHex.slice(0, 12) +
    randHex.slice(0, 4) +
    randHex.slice(4, 8) +
    randHex.slice(8, 20);

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** Verifica minima di formato, usata nei confini di dominio (Value Object). */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
