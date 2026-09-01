#!/usr/bin/env node
/**
 * Builds the web app as the Electron renderer and copies it next to the main
 * process bundle.
 *
 * The renderer needs a *relative* base (`./`) because it is loaded over
 * `file://`, and it must not register a service worker, so it is built with
 * `VITE_TARGET=electron` rather than reusing the PWA output.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(here, '..');
const repoRoot = resolve(desktopRoot, '../..');
const webDist = resolve(repoRoot, 'apps/web/dist');
const target = resolve(desktopRoot, 'renderer');

console.log('> building renderer (VITE_TARGET=electron)');
execFileSync('pnpm', ['--filter', '@nebula-clock/web', 'build'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, VITE_TARGET: 'electron' },
  shell: process.platform === 'win32',
});

if (!existsSync(webDist)) {
  console.error(`renderer build produced nothing at ${webDist}`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(webDist, target, { recursive: true });
console.log(`> renderer copied to ${target}`);
