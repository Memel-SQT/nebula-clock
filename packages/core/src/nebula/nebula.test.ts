import { describe, expect, it } from 'vitest';
import { breakStarted, clockAppearanceFromHub, focusTodayWidget } from './index.js';

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
