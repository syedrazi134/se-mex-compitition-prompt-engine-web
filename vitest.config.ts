import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkg = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    // Tests run against package sources, so they don't need a build first.
    alias: {
      '@prompt-engine/shared-types': pkg('shared-types'),
      '@prompt-engine/ai-adapters': pkg('ai-adapters'),
      '@prompt-engine/payment-adapters': pkg('payment-adapters'),
    },
  },
  test: {
    include: ['apps/*/src/**/*.test.ts', 'apps/*/test/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
