import { expect, test, type Page } from '@playwright/test';

/**
 * Nebula News during breaks. The card belongs to the desktop shell, so these tests stand in for
 * the Electron preload with a fake bridge: every method is a no-op except the three the card
 * uses, whose calls are recorded on `window.__breakReading`.
 */

const THEME = {
  title: "Today's personal growth",
  caption: 'Three reads for your break',
  items: [
    { label: 'Plan your week in 20 minutes', value: 'Zen Habits' },
    { label: 'The two-minute rule', value: 'James Clear' },
    { label: 'Saying no without guilt', value: 'Psyche' },
  ],
  deepLink: 'nebula://news/theme/focus',
  updatedAt: '2026-10-03T08:00:00.000Z',
};

declare global {
  interface Window {
    __breakReading?: { asked: number; opened: number };
  }
}

async function withDesktop(page: Page, reading: unknown): Promise<void> {
  await page.addInitScript((answer) => {
    const calls = { asked: 0, opened: 0 };
    window.__breakReading = calls;
    const known: Record<string, unknown> = {
      isDesktop: true,
      platform: 'win32',
      appVersion: '0.0.0-e2e',
      isMiniWindow: false,
      hubMode: null,
      getHubState: () =>
        Promise.resolve({
          connected: true,
          hubVersion: '0.2.1',
          updatesByHub: false,
          breakReading: true,
        }),
      getBreakReading: () => {
        calls.asked += 1;
        return Promise.resolve(answer);
      },
      openBreakReading: () => {
        calls.opened += 1;
        return Promise.resolve(true);
      },
    };
    // Anything else the shell offers: listeners give an unsubscribe, the rest resolve.
    (window as unknown as { nebula: unknown }).nebula = new Proxy(known, {
      get: (target, name: string) =>
        name in target
          ? target[name]
          : name.startsWith('on')
            ? () => () => undefined
            : () => Promise.resolve(undefined),
    });
  }, reading);
}

async function ready(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
}

const card = (page: Page) => page.getByRole('region', { name: 'Read during your break' });
const skip = (page: Page) => page.getByRole('button', { name: /skip to the next phase/i });

test('the card shows during a break and never during focus', async ({ page }) => {
  await withDesktop(page, THEME);
  await page.goto('/');
  await ready(page);

  await expect(card(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.__breakReading?.asked)).toBe(0);

  await skip(page).click();
  await expect(card(page)).toBeVisible();
  for (const item of THEME.items) {
    await expect(card(page).getByText(item.label)).toBeVisible();
    await expect(card(page).getByText(item.value)).toBeVisible();
  }
  await expect(card(page).getByText(THEME.caption)).toBeVisible();

  // Back to focus: the card goes away.
  await skip(page).click();
  await expect(card(page)).toHaveCount(0);
});

test('opening the theme leaves the timer alone', async ({ page }) => {
  await withDesktop(page, THEME);
  await page.goto('/');
  await ready(page);
  await skip(page).click();
  // Breaks start on their own by default: pause it, so any change would show.
  await page.getByRole('button', { name: /pause the timer/i }).click();

  const countdown = page.getByTestId('countdown');
  const before = await countdown.textContent();
  await card(page).getByRole('button', { name: 'Open in Nebula News' }).click();

  await expect.poll(() => page.evaluate(() => window.__breakReading?.opened)).toBe(1);
  await page.waitForTimeout(1500);
  await expect(countdown).toHaveText(before ?? '');
  await expect(page.getByRole('button', { name: /resume the timer/i })).toBeVisible();
  await expect(card(page)).toBeVisible();
});

test('nothing shows when News has nothing (null)', async ({ page }) => {
  await withDesktop(page, null);
  await page.goto('/');
  await ready(page);
  await skip(page).click();

  await expect.poll(() => page.evaluate(() => window.__breakReading?.asked)).toBeGreaterThan(0);
  await expect(card(page)).toHaveCount(0);
});

test('a payload breaking the rules never reaches the screen', async ({ page }) => {
  await withDesktop(page, { ...THEME, title: '<img src=x onerror=alert(1)>' });
  await page.goto('/');
  await ready(page);
  await skip(page).click();

  await expect.poll(() => page.evaluate(() => window.__breakReading?.asked)).toBeGreaterThan(0);
  await expect(card(page)).toHaveCount(0);
});

test('the web version has no reading card', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await skip(page).click();

  await expect(page.getByText(/short break/i).first()).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});
