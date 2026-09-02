#!/usr/bin/env node
/**
 * Capture the README screenshots from a real production build.
 *
 * Run a preview server first, then:
 *   node scripts/capture-screenshots.mjs [baseUrl]
 *
 * Seeds a fortnight of plausible sessions straight into IndexedDB so the
 * statistics screen has something to show, then writes PNGs into
 * docs/screenshots/.
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://localhost:4175';
const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/screenshots');
mkdirSync(outDir, { recursive: true });

/** Write focus sessions directly into the store Dexie already created. */
async function seedSessions(page) {
  await page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const req = indexedDB.open('nebula-clock');
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });

    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    const day = 86_400_000;
    let id = 0;

    for (let back = 13; back >= 0; back -= 1) {
      const date = new Date(Date.now() - back * day);
      // A believable working rhythm rather than a flat line.
      const count = [5, 7, 4, 8, 6, 2, 0][date.getDay()] ?? 4;
      for (let i = 0; i < count; i += 1) {
        const startedAt = new Date(date).setHours(9 + i, 0, 0, 0);
        store.put({
          id: `seed-${(id += 1)}`,
          phase: 'focus',
          startedAt,
          endedAt: startedAt + 1500_000,
          durationSeconds: 1500,
          plannedSeconds: 1500,
          completed: true,
          taskId: null,
          tagIds: [],
        });
      }
    }
    await new Promise((res) => {
      tx.oncomplete = res;
    });
    db.close();
  });
}

const shots = [];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 940 },
  deviceScaleFactor: 2,
  // The app's default theme follows the system, and headless Chromium
  // reports light; emulate dark so the dark shots really are dark.
  colorScheme: 'dark',
});

async function shot(name) {
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  shots.push(name);
  console.log(`  ${name}.png`);
}

await page.goto(baseUrl);
await page.waitForSelector('h1, [role="progressbar"]');

// Switch to English through the UI rather than by rewriting localStorage:
// the persisted object has to stay complete or the store rehydrates with
// half its settings missing. The selector is language-agnostic.
await page.goto(`${baseUrl}/#/settings`);
await page
  .locator('select')
  .filter({ has: page.locator('option[value="en"]') })
  .first()
  .selectOption('en');
await page.waitForTimeout(400);

await seedSessions(page);
await page.goto(`${baseUrl}/#/timer`);
await page.reload();
// Long enough for the launch animation to finish and get out of the way.
await page.waitForTimeout(2600);

await shot('timer-dark');

await page.goto(`${baseUrl}/#/tasks`);
for (const [title, estimate] of [
  ['Write the quarterly report', '4'],
  ['Review the pull request queue', '2'],
  ['Prepare Thursday workshop', '3'],
]) {
  await page.getByPlaceholder(/what are you working on/i).fill(title);
  await page.getByLabel(/estimated pomodoros/i).fill(estimate);
  await page.getByRole('button', { name: /^add task$/i }).click();
  await page.waitForTimeout(200);
}
await shot('tasks');

await page.goto(`${baseUrl}/#/stats`);
await page.waitForTimeout(1800);
await shot('stats');

await page.emulateMedia({ colorScheme: 'light' });
await page.goto(`${baseUrl}/#/settings`);
await page.getByRole('radio', { name: /^light$/i }).click();
await page.waitForTimeout(600);
await page.goto(`${baseUrl}/#/timer`);
await page.waitForTimeout(1200);
await shot('timer-light');

await browser.close();
console.log(`\n${shots.length} screenshots written to docs/screenshots/`);
