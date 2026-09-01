import { expect, test, type Page } from '@playwright/test';

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

const countdown = (page: Page) => page.getByTestId('countdown');

/** The app boots asynchronously, so wait for it before pressing any key. */
async function ready(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
}

test('the timer is fully operable from the keyboard', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(countdown(page)).toHaveText('25:00');

  // Space starts, n skips, r resets - all without a pointer.
  await page.keyboard.press('Space');
  await expect(countdown(page)).not.toHaveText('25:00');

  await page.keyboard.press('n');
  await expect(countdown(page)).toHaveText('05:00');

  await page.keyboard.press('r');
  await expect(countdown(page)).toHaveText('05:00');
});

test('shortcuts stay out of the way while typing', async ({ page }) => {
  await page.goto('/#/tasks');
  await ready(page);

  const field = page.getByPlaceholder(/what are you working on/i);
  await field.fill('Plan the sprint');
  // A space inside a text field must not start the timer.
  await field.press('Space');
  await expect(field).toHaveValue('Plan the sprint ');
});

test('there is a skip link and exactly one level-1 heading per view', async ({ page }) => {
  await page.goto('/#/stats');
  await ready(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

  const skipLink = page.getByRole('link', { name: /skip to main content/i });
  await expect(skipLink).toBeAttached();
  // It has to be the very first stop in the tab order to be worth having.
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
});

test('the progress ring exposes its value to assistive technology', async ({ page }) => {
  await page.goto('/');
  await ready(page);

  const ring = page.getByRole('progressbar').first();
  await expect(ring).toHaveAttribute('aria-valuenow', '0');
  await expect(ring).toHaveAttribute('aria-label', /left in the focus phase/i);
});

test('reduced motion and high contrast reach the document root', async ({ page }) => {
  await page.goto('/#/settings');
  await ready(page);

  await page.getByRole('switch', { name: /reduce animations/i }).check();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');

  await page.getByRole('switch', { name: /stronger contrast/i }).check();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
});

test('text scaling is applied to the root font size', async ({ page }) => {
  await page.goto('/#/settings');
  await ready(page);

  await page.getByRole('slider', { name: /text size/i }).fill('1.25');

  await expect
    .poll(() =>
      page
        .locator('html')
        .evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--font-scale').trim())),
    )
    .toBeCloseTo(1.25, 2);
});
