import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/test-setup.ts',
        // Type-only modules: they erase to nothing at runtime, so v8 reports
        // them as 0% executed and would drag the real figure down.
        'src/types.ts',
        'src/timer/types.ts',
        // Pure re-export barrels.
        'src/index.ts',
        'src/timer/index.ts',
        'src/storage/index.ts',
        'src/i18n/locales/**',
      ],
      // The brief mandates 80% unit coverage on packages/core.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
