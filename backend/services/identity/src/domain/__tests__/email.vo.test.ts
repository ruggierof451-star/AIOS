import { describe, it, expect } from 'vitest';
import { Email, InvalidEmailError } from '../email.vo';

describe('Email Value Object', () => {
  it('accetta un indirizzo email ben formato', () => {
    const email = Email.create('mario.rossi@azienda.it');
    expect(email.toString()).toBe('mario.rossi@azienda.it');
  });

  it('normalizza in minuscolo', () => {
    const email = Email.create('Mario.Rossi@Azienda.IT');
    expect(email.toString()).toBe('mario.rossi@azienda.it');
  });

  it('rimuove spazi bianchi accidentali ai bordi', () => {
    const email = Email.create('  mario@azienda.it  ');
    expect(email.toString()).toBe('mario@azienda.it');
  });

  it('rifiuta una stringa senza @', () => {
    expect(() => Email.create('marioazienda.it')).toThrow(InvalidEmailError);
  });

  it('rifiuta una stringa senza dominio', () => {
    expect(() => Email.create('mario@')).toThrow(InvalidEmailError);
  });

  it('rifiuta una stringa vuota', () => {
    expect(() => Email.create('')).toThrow(InvalidEmailError);
  });

  it('rifiuta una stringa solo di spazi', () => {
    expect(() => Email.create('   ')).toThrow(InvalidEmailError);
  });

  it('due email con la stessa stringa (case-insensitive) sono equals', () => {
    const a = Email.create('Mario@Azienda.it');
    const b = Email.create('mario@azienda.it');
    expect(a.equals(b)).toBe(true);
  });

  it('due email diverse non sono equals', () => {
    const a = Email.create('mario@azienda.it');
    const b = Email.create('luigi@azienda.it');
    expect(a.equals(b)).toBe(false);
  });
});
