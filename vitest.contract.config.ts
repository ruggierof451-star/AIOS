import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * Configurazione separata per i contract test (API Contract, Engineering
 * Bible Modulo 2, sezione 13) — verificano che ogni servizio rispetti
 * l'envelope e gli schema JSON dichiarati, eseguiti come suite distinta
 * dagli unit test perché richiedono un servizio realmente in ascolto
 * (o un client HTTP contro un'istanza di test), non solo funzioni pure.
 *
 * Nessun contract test è ancora presente in questa milestone (Milestone 1
 * si concentra su unit test del dominio/applicazione) — questa
 * configurazione è pronta per quando i primi endpoint reali saranno
 * esposti (Milestone 1, servizio Identity — vedi backend/services/identity/test/integration).
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['**/*.contract.test.ts'],
    },
  }),
);
