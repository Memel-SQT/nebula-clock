import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('nebula-clock');
  });
});

test('the timer is fully operable from the keyboard', async ({ page }) => {
  await page.goto('/');
  const countdown = page.getByRole('progressbar').getByText(/^\d{1,2}:\d{2}$/);

  // Space starts and pauses, n skips, r resets - all without a pointer.
  await page.keyboard.press('Space');
  await expect(countdown).not.toHaveText('25:00', { timeout: 5000 });

  await page.keyboard.press('n');
  await expect(countdown).toHaveText('05:00');

  await page.keyboard.press('r');
  await expect(countdown).toHaveText('05:00');
});

test('shortcuts stay out of the way while typing', async ({ page }) => {
  await page.goto('/#/tasks');

  const field = page.getByPlaceholder(/what are you working on/i);
  await field.fill('Plan the sprint');
  // A space inside a text field must not start the timer.
  await field.press('Space');
  await expect(field).toHaveValue('Plan the sprint ');
});

test('there is a skip link and a single level-1 heading per view', async ({ page }) => {
  await page.goto('/#/stats');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /skip to main content/i })).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test('the progress ring exposes its value to assistive technology', async ({ page }) => {
  await page.goto('/');

  const ring = page.getByRole('progressbar').first();
  await expect(ring).toHaveAttribute('aria-valuenow', '0');
  await expect(ring).toHaveAttribute('aria-label', /left in the focus phase/i);
});

test('reduced motion and high contrast reach the document root', async ({ page }) => {
  await page.goto('/#/settings');

  await page.getByRole('switch', { name: /reduce animations/i }).check();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');

  await page.getByRole('switch', { name: /stronger contrast/i }).check();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
});

test('text scaling is applied to the root font size', async ({ page }) => {
  await page.goto('/#/settings');

  const slider = page.getByRole('slider', { name: /text size/i });
  await slider.fill('1.25');

  const scale = await page
    .locator('html')
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--font-scale').trim());
  expect(Number(scale)).toBeCloseTo(1.25, 2);
});
