import { describe, it, expect } from 'vitest';
import {
  Organization,
  InvalidNameError,
  InvalidStatusTransitionError,
} from '../organization.entity';

function buildOrg() {
  return Organization.create({ name: 'Rossi Srl', slug: 'rossi-srl', ownerUserId: 'user-1' });
}

describe('Organization Aggregate Root', () => {
  it('crea un\'organizzazione attiva con piano STARTER di default', () => {
    const org = buildOrg();
    expect(org.plan).toBe('STARTER');
    expect(org.status).toBe('ACTIVE');
    expect(org.isArchived).toBe(false);
    expect(org.lockVersion).toBe(1);
  });

  it('applica i default di paese/lingua/valuta/timezone quando non forniti', () => {
    const org = buildOrg();
    expect(org.country).toBe('IT');
    expect(org.language).toBe('it');
    expect(org.currency).toBe('EUR');
    expect(org.timezone).toBe('Europe/Rome');
    expect(org.fiscalYearStart).toBe(1);
    expect(org.fiscalYearEnd).toBe(12);
  });

  it('rifiuta un nome vuoto', () => {
    expect(() =>
      Organization.create({ name: '   ', slug: 'x', ownerUserId: 'user-1' }),
    ).toThrow(InvalidNameError);
  });

  it('rimuove spazi bianchi ai bordi del nome', () => {
    const org = Organization.create({ name: '  Rossi Srl  ', slug: 'rossi-srl', ownerUserId: 'user-1' });
    expect(org.name).toBe('Rossi Srl');
  });

  it('tratta una legalName vuota dopo il trim come assente (campo opzionale)', () => {
    const org = Organization.create({
      name: 'Rossi Srl',
      slug: 'rossi-srl',
      legalName: '   ',
      ownerUserId: 'user-1',
    });
    expect(org.legalName).toBeNull();
  });

  it('permette di rinominare l\'organizzazione', () => {
    const org = buildOrg();
    org.rename('Rossi & Bianchi Srl');
    expect(org.name).toBe('Rossi & Bianchi Srl');
  });

  it('permette di cambiare piano', () => {
    const org = buildOrg();
    org.changePlan('PROFESSIONAL');
    expect(org.plan).toBe('PROFESSIONAL');
  });

  it('accetta anche i due nuovi valori del piano (FREE, BUSINESS)', () => {
    const org = buildOrg();
    org.changePlan('FREE');
    expect(org.plan).toBe('FREE');
    org.changePlan('BUSINESS');
    expect(org.plan).toBe('BUSINESS');
  });

  it('sospende un\'organizzazione attiva', () => {
    const org = buildOrg();
    org.suspend();
    expect(org.status).toBe('SUSPENDED');
  });

  it('non permette di sospendere un\'organizzazione già sospesa', () => {
    const org = buildOrg();
    org.suspend();
    expect(() => org.suspend()).toThrow(InvalidStatusTransitionError);
  });

  it('riattiva un\'organizzazione sospesa', () => {
    const org = buildOrg();
    org.suspend();
    org.reactivate();
    expect(org.status).toBe('ACTIVE');
  });

  it('non permette di riattivare un\'organizzazione che non è sospesa', () => {
    const org = buildOrg();
    expect(() => org.reactivate()).toThrow(InvalidStatusTransitionError);
  });

  it('archivia l\'organizzazione (reversibile, non elimina)', () => {
    const org = buildOrg();
    org.archive();
    expect(org.status).toBe('ARCHIVED');
    expect(org.isArchived).toBe(true);
  });

  it('non permette di archiviare due volte', () => {
    const org = buildOrg();
    org.archive();
    expect(() => org.archive()).toThrow(InvalidStatusTransitionError);
  });

  it('ripristina un\'organizzazione archiviata', () => {
    const org = buildOrg();
    org.archive();
    org.restore();
    expect(org.status).toBe('ACTIVE');
    expect(org.isArchived).toBe(false);
  });

  it('non permette di ripristinare un\'organizzazione che non è archiviata', () => {
    const org = buildOrg();
    expect(() => org.restore()).toThrow(InvalidStatusTransitionError);
  });

  it('permette di sospendere e poi archiviare (SUSPENDED non blocca ulteriori mutazioni in questo incremento)', () => {
    const org = buildOrg();
    org.suspend();
    expect(() => org.archive()).not.toThrow();
    expect(org.status).toBe('ARCHIVED');
  });

  it('DELETED non è raggiungibile da alcun metodo pubblico in questo incremento', () => {
    const org = buildOrg();
    org.archive();
    org.restore();
    org.suspend();
    // Nessuna combinazione dei metodi pubblici disponibili porta a DELETED
    // — è uno stato riservato a una futura procedura amministrativa.
    expect(org.status).not.toBe('DELETED');
  });

  it('aggiorna le impostazioni facendo merge, non sovrascrivendo tutto', () => {
    const org = buildOrg();
    org.updateSettings({ branding: 'blue' });
    org.updateSettings({ locale: 'it-IT' });
    expect(org.settings).toEqual({ branding: 'blue', locale: 'it-IT' });
  });

  it('ricostruisce correttamente da dati persistiti', () => {
    const original = buildOrg();
    const reconstituted = Organization.reconstitute(original.toPersistence());
    expect(reconstituted.id).toBe(original.id);
    expect(reconstituted.name).toBe(original.name);
    expect(reconstituted.slug).toBe(original.slug);
    expect(reconstituted.ownerUserId).toBe(original.ownerUserId);
    expect(reconstituted.status).toBe(original.status);
  });
});
