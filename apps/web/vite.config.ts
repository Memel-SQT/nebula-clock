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
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'nebula-mark.svg'],
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
              runtimeCaching: [
                {
                  // Google Fonts is the only external origin the app touches,
                  // and only for the Inter webfont.
                  urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'nebula-fonts',
                    expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              ],
            },
            devOptions: { enabled: false },
          }),
        ]),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Recharts and jsPDF are large and only needed on two screens; keeping
        // them out of the entry chunk keeps first paint fast.
        manualChunks: {
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable'],
          vendor: ['react', 'react-dom', 'framer-motion'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
