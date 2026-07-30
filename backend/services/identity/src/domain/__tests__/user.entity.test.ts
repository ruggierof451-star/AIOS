import { describe, it, expect } from 'vitest';
import { User, UserSuspendedError, UserAlreadySuspendedError } from '../user.entity';
import { Email } from '../email.vo';

function buildUser() {
  return User.register({
    email: Email.create('mario@azienda.it'),
    passwordHash: 'hashed_value',
  });
}

describe('User Aggregate Root', () => {
  it('registra un nuovo utente attivo, senza MFA, con lockVersion 1', () => {
    const user = buildUser();
    expect(user.status).toBe('ACTIVE');
    expect(user.mfaEnabled).toBe(false);
    expect(user.lockVersion).toBe(1);
    expect(user.id).toBeTruthy();
  });

  it('genera un id diverso per ogni nuovo utente', () => {
    const a = buildUser();
    const b = buildUser();
    expect(a.id).not.toBe(b.id);
  });

  it('permette l\'autenticazione per un utente attivo', () => {
    const user = buildUser();
    expect(() => user.assertCanAuthenticate()).not.toThrow();
  });

  it('impedisce l\'autenticazione per un utente sospeso', () => {
    const user = buildUser();
    user.suspend();
    expect(() => user.assertCanAuthenticate()).toThrow(UserSuspendedError);
  });

  it('non permette di sospendere due volte lo stesso utente', () => {
    const user = buildUser();
    user.suspend();
    expect(() => user.suspend()).toThrow(UserAlreadySuspendedError);
  });

  it('abilita e disabilita la MFA', () => {
    const user = buildUser();
    user.enableMfa();
    expect(user.mfaEnabled).toBe(true);
    user.disableMfa();
    expect(user.mfaEnabled).toBe(false);
  });

  it('ricostruisce correttamente un utente da dati persistiti', () => {
    const original = buildUser();
    const persisted = original.toPersistence();
    const reconstituted = User.reconstitute(persisted);

    expect(reconstituted.id).toBe(original.id);
    expect(reconstituted.email.equals(original.email)).toBe(true);
    expect(reconstituted.status).toBe(original.status);
  });
});
