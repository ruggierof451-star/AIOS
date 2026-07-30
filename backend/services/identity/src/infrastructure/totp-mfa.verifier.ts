/**
 * Verificatore TOTP (RFC 6238) per la MFA (Costituzione, Step 1 sez. 11).
 *
 * Implementazione diretta dell'algoritmo (HMAC-SHA1, 30 secondi, 6 cifre —
 * stessi parametri di Google Authenticator/Authy) invece di una libreria
 * esterna, per tenere questa milestone senza dipendenze aggiuntive oltre
 * a quelle già elencate nel tech stack.
 *
 * Nota di scope onestamente dichiarata: questo file verifica un codice
 * contro un secret già memorizzato. Il flusso di ENROLLMENT (generazione
 * del secret, presentazione del QR code all'utente) non è incluso in
 * questa milestone — segnalato esplicitamente nel riepilogo, non
 * un'omissione silenziosa.
 */

import { createHmac } from 'node:crypto';
import { MfaVerifier } from '../application/authenticate-user.use-case';

const TIME_STEP_SECONDS = 30;
const CODE_DIGITS = 6;
const ALLOWED_CLOCK_DRIFT_STEPS = 1; // tollera ±1 finestra di 30s per drift di orologio

function base32Decode(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = base32.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const char of cleaned) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotpCode(secretBase32: string, timeStepIndex: number): string {
  const key = base32Decode(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(timeStepIndex));

  const hmac = createHmac('sha1', key).update(counterBuffer).digest();

  // Stesso motivo di packages/domain-model/src/shared/uuid.ts: con
  // `noUncheckedIndexedAccess` attivo, un accesso indicizzato su un
  // Buffer (hmac[i]) è tipizzato `number | undefined` — readUInt8
  // restituisce sempre `number`, quindi resta type-safe senza bisogno
  // di asserzioni non-null.
  const offset = hmac.readUInt8(hmac.length - 1) & 0x0f;

  const binaryCode =
    ((hmac.readUInt8(offset) & 0x7f) << 24) |
    ((hmac.readUInt8(offset + 1) & 0xff) << 16) |
    ((hmac.readUInt8(offset + 2) & 0xff) << 8) |
    (hmac.readUInt8(offset + 3) & 0xff);

  const code = (binaryCode % 10 ** CODE_DIGITS).toString().padStart(CODE_DIGITS, '0');
  return code;
}

export interface MfaSecretProvider {
  getSecretForUser(userId: string): Promise<string | null>;
}

export class TotpMfaVerifier implements MfaVerifier {
  constructor(private readonly secretProvider: MfaSecretProvider) {}

  async verify(userId: string, code: string): Promise<boolean> {
    const secret = await this.secretProvider.getSecretForUser(userId);
    if (!secret) return false;

    const currentStep = Math.floor(Date.now() / 1000 / TIME_STEP_SECONDS);

    for (let drift = -ALLOWED_CLOCK_DRIFT_STEPS; drift <= ALLOWED_CLOCK_DRIFT_STEPS; drift++) {
      if (generateTotpCode(secret, currentStep + drift) === code) {
        return true;
      }
    }
    return false;
  }
}

// Esportata anche standalone per riuso nel futuro flusso di enrollment
// (generazione del primo codice per verificare che l'utente abbia
// configurato correttamente la propria app authenticator).
export { generateTotpCode, base32Decode };
