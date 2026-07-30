import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Configurazione Vitest unica per tutto il monorepo (approccio "workspace
 * singolo" invece di una configurazione duplicata per pacchetto — più
 * semplice da mantenere in questa fase iniziale del progetto).
 *
 * Gli alias qui sotto risolvono gli import "@aios/..." anche per Vitest,
 * che non passa sempre dalla risoluzione "exports" di Node/pnpm allo stesso
 * modo del runtime applicativo — la mappatura esplicita evita ambiguità.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@aios/domain-model': path.resolve(
        __dirname,
        'packages/domain-model/src/index.ts',
      ),
      '@aios/api-contract': path.resolve(
        __dirname,
        'packages/api-contract/src/envelope.ts',
      ),
      '@aios/rbac': path.resolve(__dirname, 'packages/rbac/src/index.ts'),
    },
  },
  test: {
    include: [
      'packages/**/src/**/*.test.ts',
      'backend/**/src/**/*.test.ts',
      'ai-platform/**/src/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/dist/**'],
    },
  },
});
