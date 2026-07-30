import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadRootEnv } from '../load-env';

describe('loadRootEnv', () => {
  let tempRoot: string;
  let nestedStartDir: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'aios-load-env-test-'));
    writeFileSync(join(tempRoot, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    writeFileSync(join(tempRoot, '.env'), 'AIOS_TEST_ONLY_VAR=valore_di_prova\n');

    // Simula la profondità reale di un servizio: backend/services/<nome>/src
    nestedStartDir = join(tempRoot, 'backend', 'services', 'finto-servizio', 'src');
    mkdirSync(nestedStartDir, { recursive: true });

    delete process.env.AIOS_TEST_ONLY_VAR;
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
    delete process.env.AIOS_TEST_ONLY_VAR;
  });

  it('risale l\'albero, trova pnpm-workspace.yaml e carica il .env corrispondente', () => {
    loadRootEnv(nestedStartDir);
    expect(process.env.AIOS_TEST_ONLY_VAR).toBe('valore_di_prova');
  });

  it('funziona anche se invocata direttamente dalla radice (nessuna risalita necessaria)', () => {
    loadRootEnv(tempRoot);
    expect(process.env.AIOS_TEST_ONLY_VAR).toBe('valore_di_prova');
  });

  it('non lancia mai un errore se pnpm-workspace.yaml non esiste da nessuna parte', () => {
    const isolatedDir = mkdtempSync(join(tmpdir(), 'aios-no-marker-'));
    const nestedIsolated = join(isolatedDir, 'a', 'b', 'c');
    mkdirSync(nestedIsolated, { recursive: true });

    expect(() => loadRootEnv(nestedIsolated)).not.toThrow();
    expect(process.env.AIOS_TEST_ONLY_VAR).toBeUndefined();

    rmSync(isolatedDir, { recursive: true, force: true });
  });

  it('non sovrascrive una variabile già presente nell\'ambiente (comportamento di default di dotenv)', () => {
    process.env.AIOS_TEST_ONLY_VAR = 'valore_gia_impostato_dal_processo';
    loadRootEnv(nestedStartDir);
    expect(process.env.AIOS_TEST_ONLY_VAR).toBe('valore_gia_impostato_dal_processo');
  });
});
