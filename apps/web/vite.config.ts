/// <reference types="vitest" />
import { createHash } from 'node:crypto';
import { defineConfig, type Plugin } from 'vite';
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

/**
 * Content Security Policy for the Electron renderer (loaded over file://, so there are no
 * response headers to carry it): a meta tag, with the inline theme script allowed by its hash
 * rather than by 'unsafe-inline'. Styles keep 'unsafe-inline' for React's style attributes.
 * The PWA is served by GitHub Pages, which this does not change.
 */
function electronCsp(): Plugin {
  return {
    name: 'nebula-clock-electron-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          (match) =>
            `'sha256-${createHash('sha256')
              .update(match[1] ?? '')
              .digest('base64')}'`,
        );
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "media-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self' data:",
          "object-src 'none'",
          "base-uri 'none'",
          "form-action 'none'",
        ].join('; ');
        return html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        );
      },
    },
  };
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    ...(isElectron
      ? [electronCsp()]
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
              // Matches the nebula-dark --page so the splash screen is on-brand.
              background_color: '#0a0a0f',
              theme_color: '#0a0a0f',
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
