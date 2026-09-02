/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Three build targets share this config:
 *  - dev / preview            -> base `/`
 *  - GitHub Pages             -> base `/<repo>/`, set through VITE_BASE
 *  - Electron renderer        -> base `./` and no service worker, because the
 *                                page is loaded over `file://`
 */
const isElectron = process.env.VITE_TARGET === 'electron';
const base = process.env.VITE_BASE ?? (isElectron ? './' : '/');

// Surfaced in the UI and stamped into exports and PDF reports. Comes from
// the workspace package.json, which semantic-release rewrites on each release.
const appVersion = process.env.npm_package_version ?? '0.0.0-development';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    ...(isElectron
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'nebula-clock-mark.svg'],
            manifest: {
              name: 'Nebula Clock',
              short_name: 'Nebula Clock',
              description:
                'A privacy-first Pomodoro time manager. Everything stays on your device.',
              lang: 'en',
              start_url: base,
              scope: base,
              display: 'standalone',
              orientation: 'portrait-primary',
              // Matches --bg-base / --card so the splash screen is on-brand.
              background_color: '#0A0A0F',
              theme_color: '#0A0A0F',
              categories: ['productivity', 'utilities'],
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                {
                  src: 'maskable-192.png',
                  sizes: '192x192',
                  type: 'image/png',
                  purpose: 'maskable',
                },
                {
                  src: 'maskable-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
            workbox: {
              // The app must work fully offline: everything it needs is
              // precached, including the ambient loops.
              globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wav}'],
              maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
              navigateFallback: `${base}index.html`,
              cleanupOutdatedCaches: true,
              // No runtimeCaching: the app fetches nothing from anywhere
              // else, so everything it needs is in the precache above.
            },
            devOptions: { enabled: false },
          }),
        ]),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    // No manualChunks here on purpose: hand-splitting react away from
    // recharts produced a circular chunk graph, which left React
    // uninitialised at recharts' import time and rendered a blank page in the
    // production build. Recharts and jsPDF are kept out of the entry chunk by
    // lazy-loading the views that use them (see App.tsx) instead.
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
