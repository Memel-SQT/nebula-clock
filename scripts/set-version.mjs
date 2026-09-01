#!/usr/bin/env node
/**
 * semantic-release calls this during `prepare` so every workspace package
 * carries the version that is about to be tagged. electron-builder reads
 * apps/desktop/package.json for the version embedded in the installers and
 * in latest.yml, which is what electron-updater compares against.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version) {
  console.error('usage: set-version.mjs <version>');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  'package.json',
  'apps/web/package.json',
  'apps/desktop/package.json',
  'packages/core/package.json',
  'packages/ui/package.json',
];

for (const relative of targets) {
  const file = resolve(root, relative);
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  pkg.version = version;
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`set ${relative} -> ${version}`);
}
