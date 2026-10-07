import { describe, expect, it } from 'vitest';
import {
  dockedWindowSteps,
  breakReadingFromLink,
  breakStarted,
  clockAppearanceFromHub,
  focusTodayWidget,
  readingKeptMs,
  readingShown,
  READING_REFRESH_MS,
  READING_RETRY_MS,
} from './index.js';

const focus = {
  date: '2026-10-02',
  done: 5,
  goal: 8,
  streak: 12,
  title: 'Focus du jour',
  value: '5 / 8',
  caption: 'Série : 12 jours',
};

describe('focusTodayWidget', () => {
  it('is empty until the renderer has published', () => {
    expect(focusTodayWidget(null, new Date())).toBeNull();
  });

  it('builds a short widget with a link back to the app', () => {
    const now = new Date('2026-10-02T10:00:00.000Z');
    expect(focusTodayWidget(focus, now)).toEqual({
      title: 'Focus du jour',
      value: '5 / 8',
      caption: 'Série : 12 jours',
      deepLink: 'nebula://clock/',
      updatedAt: '2026-10-02T10:00:00.000Z',
    });
    expect(focusTodayWidget({ ...focus, caption: 'x'.repeat(200) }, now)?.caption).toHaveLength(80);
  });
});

describe('breakStarted', () => {
  const focusRunning = { phase: 'focus' as const, status: 'running' as const, remainingSeconds: 3 };

  it('announces a break that starts after a focus phase', () => {
    expect(
      breakStarted(focusRunning, { phase: 'longBreak', status: 'running', remainingSeconds: 900 }),
    ).toEqual({ kind: 'long', durationMin: 15 });
    expect(
      breakStarted(focusRunning, { phase: 'shortBreak', status: 'running', remainingSeconds: 299 }),
    ).toEqual({ kind: 'short', durationMin: 5 });
  });

  it('announces a break started by hand, once', () => {
    const idle = { phase: 'shortBreak' as const, status: 'idle' as const, remainingSeconds: 300 };
    const running = { ...idle, status: 'running' as const };
    expect(breakStarted(idle, running)).toEqual({ kind: 'short', durationMin: 5 });
    expect(breakStarted(running, { ...running, remainingSeconds: 299 })).toBeNull();
    // Paused, then resumed: still the same break.
    expect(breakStarted({ ...running, status: 'paused' }, running)).toBeNull();
  });

  it('ignores focus phases and stopped timers', () => {
    expect(breakStarted(null, focusRunning)).toBeNull();
    expect(
      breakStarted(focusRunning, { phase: 'shortBreak', status: 'paused', remainingSeconds: 300 }),
    ).toBeNull();
  });
});

describe('clockAppearanceFromHub', () => {
  it('maps the whole family appearance 1 for 1, with the language', () => {
    expect(
      clockAppearanceFromHub({
        theme: 'glass-light',
        accentPreset: 'custom',
        customPrimary: '#12AB34',
        customSecondary: '#4c6ef5',
        background: 'stars',
        motion: 'reduced',
        soundEnabled: true,
        soundVolume: 60,
        language: 'en',
      }),
    ).toEqual({
      appearance: {
        theme: 'glass-light',
        accentPreset: 'custom',
        customPrimary: '#12ab34',
        customSecondary: '#4c6ef5',
        background: 'stars',
        motion: 'reduced',
        soundEnabled: true,
        soundVolume: 60,
      },
      language: 'en',
    });
  });

  it('keeps only the valid fields, never replacing the others with a default', () => {
    expect(
      clockAppearanceFromHub({
        theme: 'old-dark',
        accentPreset: 'lava',
        background: 'aurora',
        soundVolume: null,
        language: 'de',
      }),
    ).toEqual({ appearance: { background: 'aurora' } });
    expect(clockAppearanceFromHub(null)).toEqual({ appearance: {} });
  });

  it('clamps the volume instead of dropping it', () => {
    expect(clockAppearanceFromHub({ soundVolume: 140 }).appearance).toEqual({ soundVolume: 100 });
  });
});

describe('breakReadingFromLink', () => {
  const widget = {
    title: 'Développement personnel du jour',
    caption: 'Trois lectures pour la pause',
    items: [
      { label: 'Planifier sa semaine en 20 minutes', value: 'Zen Habits' },
      { label: 'La règle des deux minutes', value: 'James Clear' },
      { label: 'Dire non sans culpabiliser', value: 'Psychologies' },
    ],
    deepLink: 'nebula://news/theme/focus',
    updatedAt: '2026-10-03T08:00:00.000Z',
  };
  const read = (value: unknown) => breakReadingFromLink({ ok: true, value });

  it('keeps a valid theme as is', () => {
    expect(read(widget)).toEqual(widget);
    const { caption: _caption, ...withoutCaption } = widget;
    expect(read(withoutCaption)).toEqual(withoutCaption);
  });

  it('shows nothing without the Hub, without News or without consent', () => {
    for (const error of [
      'offline',
      'provider-offline',
      'unknown-capability',
      'consent-denied',
      'consent-required',
      'timeout',
      'invalid-result',
      'unknown',
    ]) {
      expect(breakReadingFromLink({ ok: false, error })).toBeNull();
    }
  });

  it('shows nothing for an empty theme', () => {
    expect(read(null)).toBeNull();
    expect(read({ ...widget, items: [] })).toBeNull();
    expect(read({ ...widget, items: undefined })).toBeNull();
  });

  it('refuses anything that is not a widget', () => {
    expect(read('Tech du jour')).toBeNull();
    expect(read([widget])).toBeNull();
    expect(read({ ...widget, items: [null] })).toBeNull();
    expect(read({ ...widget, items: ['La règle des deux minutes'] })).toBeNull();
  });

  it('refuses long, empty, markup or control-character texts', () => {
    expect(read({ ...widget, title: 'x'.repeat(81) })).toBeNull();
    expect(read({ ...widget, title: 'x'.repeat(80) })?.title).toHaveLength(80);
    expect(read({ ...widget, title: '   ' })).toBeNull();
    expect(read({ ...widget, caption: '<img src=x onerror=alert(1)>' })).toBeNull();
    expect(read({ ...widget, caption: 42 })).toBeNull();
    expect(read({ ...widget, items: [{ label: 'Lire </b>', value: 'Source' }] })).toBeNull();
    expect(read({ ...widget, items: [{ label: 'Titre', value: 'Sour\nce' }] })).toBeNull();
    // A plain comparison is not markup.
    expect(read({ ...widget, title: 'Focus < 25 min' })?.title).toBe('Focus < 25 min');
  });

  it('keeps three articles at most', () => {
    expect(read({ ...widget, items: [...widget.items, widget.items[0]] })).toBeNull();
  });

  it('only opens a screen of Nebula News', () => {
    for (const deepLink of [
      undefined,
      'https://example.com/',
      'nebula://finterest/accounts',
      'nebula://hub/',
      'nebula://news/../hub',
      'nebula://news/theme/focus?ref=clock',
      'nebula://news/theme/focus#top',
      'javascript:alert(1)',
    ]) {
      expect(read({ ...widget, deepLink })).toBeNull();
    }
    expect(read({ ...widget, deepLink: 'nebula://news/' })?.deepLink).toBe('nebula://news/');
  });

  it('needs a valid update date', () => {
    expect(read({ ...widget, updatedAt: 'hier' })).toBeNull();
    expect(read({ ...widget, updatedAt: undefined })).toBeNull();
  });
});

describe('Hub mode: showing and raising the docked window (Nebula Hub ADR-032)', () => {
  it('shows and raises a hidden window, raises a visible one only when the Hub asks', () => {
    expect(dockedWindowSteps(false, false)).toEqual({ show: true, raise: true });
    expect(dockedWindowSteps(false, true)).toEqual({ show: true, raise: true });
    expect(dockedWindowSteps(true, true)).toEqual({ show: false, raise: true });
    expect(dockedWindowSteps(true, false)).toEqual({ show: false, raise: false });
  });
});

describe('reading card rules (Nebula News, appears on its own)', () => {
  it('shows during a break and while the timer is idle, never during a focus session', () => {
    expect(readingShown('focus', 'idle')).toBe(true);
    expect(readingShown('shortBreak', 'running')).toBe(true);
    expect(readingShown('longBreak', 'paused')).toBe(true);
    expect(readingShown('focus', 'running')).toBe(false);
    expect(readingShown('focus', 'paused')).toBe(false);
  });

  it('keeps an answer of News 15 minutes, and asks again 30 s after no answer', () => {
    expect(readingKeptMs({ ok: true, value: null })).toBe(READING_REFRESH_MS);
    expect(readingKeptMs({ ok: false, error: 'provider-offline' })).toBe(READING_RETRY_MS);
    expect(READING_REFRESH_MS).toBe(15 * 60 * 1000);
    expect(READING_RETRY_MS).toBe(30 * 1000);
  });
});
