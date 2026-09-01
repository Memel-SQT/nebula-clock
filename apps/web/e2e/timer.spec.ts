import { expect, test, type Page } from '@playwright/test';

/**
 * Each test starts from a clean slate: the app persists settings in
 * localStorage and everything else in IndexedDB, so both are cleared before
 * the first script runs.
 */
test.beforeEach(async ({ page }) => {
  // addInitScript runs on *every* document load, reloads included, so the
  // reset is guarded: wiping storage again mid-test would destroy the very
  // persistence some of these tests exist to check.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-reset')) return;
    sessionStorage.setItem('e2e-reset', '1');
    localStorage.clear();
    indexedDB.deleteDatabase('nebula-clock');
  });
});

/**
 * The `mm:ss` readout. It sits beside the progress ring rather than inside
 * it, so it carries its own test id.
 */
function countdown(page: Page) {
  return page.getByTestId('countdown');
}

/** The app boots asynchronously (i18n, IndexedDB), so wait for real content. */
async function ready(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
}

test('loads with the classic 25 minute preset ready to start', async ({ page }) => {
  await page.goto('/');
  await ready(page);

  await expect(countdown(page)).toHaveText('25:00');
  await expect(page.getByRole('button', { name: /start the .* phase/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /classic 25\/5\/15/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('counts down, pauses and resets', async ({ page }) => {
  await page.goto('/');
  await ready(page);

  await page.getByRole('button', { name: /start the .* phase/i }).click();
  // The ticker runs at 500 ms, so a couple of seconds is plenty.
  await expect(countdown(page)).not.toHaveText('25:00');

  await page.getByRole('button', { name: /pause the timer/i }).click();
  const paused = await countdown(page).textContent();
  await page.waitForTimeout(1500);
  // A paused timer must not lose time.
  await expect(countdown(page)).toHaveText(paused ?? '');

  await page.getByRole('button', { name: /reset the current phase/i }).click();
  await expect(countdown(page)).toHaveText('25:00');
});

test('skipping moves to the short break', async ({ page }) => {
  await page.goto('/');
  await ready(page);

  await page.getByRole('button', { name: /skip to the next phase/i }).click();
  await expect(countdown(page)).toHaveText('05:00');
});

test('applying a preset changes the duration', async ({ page }) => {
  await page.goto('/');
  await ready(page);

  await page.getByRole('button', { name: /deep work/i }).click();
  await expect(countdown(page)).toHaveText('50:00');
});

test('the tab title mirrors the countdown', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page).toHaveTitle('Nebula Clock');

  await page.getByRole('button', { name: /start the .* phase/i }).click();
  await expect(page).toHaveTitle(/\d{1,2}:\d{2} · Focus/);
});

test('a task can be added and picked up by the timer', async ({ page }) => {
  await page.goto('/#/tasks');
  await ready(page);

  await page.getByPlaceholder(/what are you working on/i).fill('Write the report');
  await page.getByRole('button', { name: /^add task$/i }).click();

  const task = page.getByRole('listitem').filter({ hasText: 'Write the report' });
  await expect(task).toBeVisible();
  await expect(task.getByText('0 / 1')).toBeVisible();

  await task.getByRole('button', { name: /focus on this task/i }).click();
  await page.goto('/#/timer');
  await expect(page.getByLabel(/working on/i)).toHaveValue(/.+/);
});

test('the timer survives a page reload', async ({ page }) => {
  await page.goto('/');
  await ready(page);

  await page.getByRole('button', { name: /start the .* phase/i }).click();
  await expect(countdown(page)).not.toHaveText('25:00');

  await page.reload();
  await ready(page);
  // Elapsed time is derived from a stored timestamp, so the countdown must
  // resume where it was rather than jumping back to 25:00.
  await expect(countdown(page)).not.toHaveText('25:00');
});

test('switching to the light theme survives a reload', async ({ page }) => {
  await page.goto('/#/settings');
  await ready(page);

  await page.getByRole('radio', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();
  // The inline bootstrap script has to restore it before first paint.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('the interface can be switched to French', async ({ page }) => {
  await page.goto('/#/settings');
  await ready(page);

  await page.getByLabel(/interface language/i).selectOption('fr');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test('every view is reachable from the navigation', async ({ page }) => {
  await page.goto('/');
  await ready(page);

  // Desktop renders a sidebar and mobile a bottom bar; only one is visible.
  const nav = page.locator('nav:visible').first();

  for (const label of ['Tasks', 'Statistics', 'Calendar', 'Settings'] as const) {
    await nav.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('heading', { name: label, level: 1 })).toBeVisible();
  }
});
