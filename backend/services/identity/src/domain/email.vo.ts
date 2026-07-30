/**
 * Value Object Email (Domain Model, Modulo 1, sezione 4 — "definito
 * interamente dai suoi componenti, confrontabile per valore, senza
 * identità propria").
 *
 * Immutabile: ogni operazione restituisce una nuova istanza o un errore,
 * mai una mutazione in place.
 */

export class InvalidEmailError extends Error {
  constructor(rawValue: string) {
    super(`Formato email non valido: "${rawValue}"`);
    this.name = 'InvalidEmailError';
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  static create(rawValue: string): Email {
    const normalized = rawValue.trim().toLowerCase();

    if (normalized.length === 0) {
      throw new InvalidEmailError(rawValue);
    }
    if (!EMAIL_REGEX.test(normalized)) {
      throw new InvalidEmailError(rawValue);
    }
    if (normalized.length > 320) {
      // RFC 5321 — limite pratico per evitare abusi in fase di validazione
      throw new InvalidEmailError(rawValue);
    }

    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
