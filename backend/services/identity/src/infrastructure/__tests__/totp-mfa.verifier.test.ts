import { describe, it, expect } from 'vitest';
import { TotpMfaVerifier, generateTotpCode, MfaSecretProvider } from '../totp-mfa.verifier';

const TEST_SECRET = 'JBSWY3DPEHPK3PXP'; // secret di esempio standard RFC 6238 (base32)

class FakeSecretProvider implements MfaSecretProvider {
  constructor(private readonly secret: string | null) {}
  async getSecretForUser(): Promise<string | null> {
    return this.secret;
  }
}

describe('generateTotpCode', () => {
  it('genera sempre un codice di 6 cifre', () => {
    const step = Math.floor(Date.now() / 1000 / 30);
    const code = generateTotpCode(TEST_SECRET, step);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('genera lo stesso codice per lo stesso time step (determinismo)', () => {
    const step = 12345678;
    const a = generateTotpCode(TEST_SECRET, step);
    const b = generateTotpCode(TEST_SECRET, step);
    expect(a).toBe(b);
  });

  it('genera codici diversi per time step diversi (nella quasi totalità dei casi)', () => {
    const a = generateTotpCode(TEST_SECRET, 1000);
    const b = generateTotpCode(TEST_SECRET, 1001);
    // Nota: teoricamente due step diversi potrebbero produrre lo stesso
    // codice a 6 cifre per puro caso (1 su 1.000.000) — testiamo su più
    // step consecutivi per rendere il test robusto rispetto a questa
    // probabilità residua.
    const c = generateTotpCode(TEST_SECRET, 1002);
    const allSame = a === b && b === c;
    expect(allSame).toBe(false);
  });
});

describe('TotpMfaVerifier', () => {
  it('verifica correttamente un codice generato per il time step corrente', async () => {
    const verifier = new TotpMfaVerifier(new FakeSecretProvider(TEST_SECRET));
    const currentStep = Math.floor(Date.now() / 1000 / 30);
    const validCode = generateTotpCode(TEST_SECRET, currentStep);

    const result = await verifier.verify('user-1', validCode);
    expect(result).toBe(true);
  });

  it('rifiuta un codice errato', async () => {
    const verifier = new TotpMfaVerifier(new FakeSecretProvider(TEST_SECRET));
    const result = await verifier.verify('user-1', '000000');
    // Probabilità trascurabile che '000000' sia per caso il codice valido
    // in questo istante — accettabile per un test deterministico al 99.9999%.
    expect(result).toBe(false);
  });

  it('rifiuta se l\'utente non ha un secret configurato', async () => {
    const verifier = new TotpMfaVerifier(new FakeSecretProvider(null));
    const result = await verifier.verify('user-senza-mfa', '123456');
    expect(result).toBe(false);
  });

  it('accetta un codice del time step precedente (tolleranza clock drift)', async () => {
    const verifier = new TotpMfaVerifier(new FakeSecretProvider(TEST_SECRET));
    const currentStep = Math.floor(Date.now() / 1000 / 30);
    const previousStepCode = generateTotpCode(TEST_SECRET, currentStep - 1);

    const result = await verifier.verify('user-1', previousStepCode);
    expect(result).toBe(true);
  });
});
