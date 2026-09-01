import { defineConfig } from 'tsup';

/**
 * Bundles the main and preload processes to CommonJS.
 *
 * Preload scripts must be CJS when `contextIsolation` is on, and keeping the
 * main process on the same format avoids a second module resolution story.
 * `@nebula-clock/core` ships as TypeScript source, so it is bundled in rather
 * than treated as an external dependency.
 */
export default defineConfig({
  entry: { main: 'src/main.ts', preload: 'src/preload.ts' },
  outDir: 'dist-electron',
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  outExtension: () => ({ js: '.cjs' }),
  // Electron is provided by the runtime; electron-updater is resolved from
  // node_modules inside the packaged app, which is how it expects to load.
  external: ['electron', 'electron-updater'],
  noExternal: [/@nebula-clock\//],
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
});
