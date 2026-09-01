import { beforeEach, describe, expect, it } from 'vitest';
import { BUILT_IN_PRESETS, DEFAULT_SETTINGS } from '@nebula-clock/core';
import { useSettingsStore } from './settingsStore.js';

const store = () => useSettingsStore.getState();

beforeEach(() => {
  useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) });
});

describe('timer settings', () => {
  it('clamps durations into their documented bounds', () => {
    store().updateTimer({ focusMinutes: 999, shortBreakMinutes: 0 });
    expect(store().settings.timer.focusMinutes).toBe(180);
    expect(store().settings.timer.shortBreakMinutes).toBe(1);
  });

  it('rounds fractional minutes', () => {
    store().updateTimer({ focusMinutes: 25.7 });
    expect(store().settings.timer.focusMinutes).toBe(26);
  });

  it('detaches from the active preset when a duration is edited by hand', () => {
    expect(store().settings.timer.activePresetId).toBe('classic');
    store().updateTimer({ focusMinutes: 30 });
    expect(store().settings.timer.activePresetId).toBeNull();
  });

  it('keeps the preset when a non-duration flag is toggled', () => {
    store().updateTimer({ autoStartFocus: true });
    expect(store().settings.timer.activePresetId).toBe('classic');
    expect(store().settings.timer.autoStartFocus).toBe(true);
  });

  it('applies a preset wholesale', () => {
    const deepWork = BUILT_IN_PRESETS.find((preset) => preset.id === 'deep-work')!;
    store().applyPreset(deepWork);

    expect(store().settings.timer).toMatchObject({
      focusMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 30,
      cyclesBeforeLongBreak: 3,
      activePresetId: 'deep-work',
    });
  });
});

describe('goals', () => {
  it('clamps and rounds both targets', () => {
    store().updateGoals({ dailyPomodoros: 0, weeklyPomodoros: 5000 });
    expect(store().settings.goals.dailyPomodoros).toBe(1);
    expect(store().settings.goals.weeklyPomodoros).toBe(200);
  });

  it('leaves the other target alone', () => {
    store().updateGoals({ dailyPomodoros: 6 });
    expect(store().settings.goals.weeklyPomodoros).toBe(DEFAULT_SETTINGS.goals.weeklyPomodoros);
  });
});

describe('volumes', () => {
  it('keeps notification and ambient volumes within 0..1', () => {
    store().updateNotifications({ volume: 5 });
    store().updateAmbient({ masterVolume: -2 });
    expect(store().settings.notifications.volume).toBe(1);
    expect(store().settings.ambient.masterVolume).toBe(0);
  });

  it('treats the two buses as independent', () => {
    store().updateNotifications({ volume: 0.2 });
    store().updateAmbient({ masterVolume: 0.9 });
    expect(store().settings.notifications.volume).toBe(0.2);
    expect(store().settings.ambient.masterVolume).toBe(0.9);
  });
});

describe('appearance', () => {
  it('clamps the font scale to the accessible range', () => {
    store().updateAppearance({ fontScale: 4 });
    expect(store().settings.appearance.fontScale).toBe(1.5);
    store().updateAppearance({ fontScale: 0.1 });
    expect(store().settings.appearance.fontScale).toBe(0.875);
  });

  it('stores the accent without touching anything else', () => {
    store().updateAppearance({ accent: '#22D3EE' });
    expect(store().settings.appearance.accent).toBe('#22D3EE');
    expect(store().settings.appearance.theme).toBe(DEFAULT_SETTINGS.appearance.theme);
  });
});

describe('break reminders', () => {
  it('clamps the interval', () => {
    store().updateBreakReminders({ intervalSeconds: 5 });
    expect(store().settings.breakReminders.intervalSeconds).toBe(30);
  });

  it('accepts a custom message list', () => {
    store().updateBreakReminders({ customMessages: ['Stand up', 'Drink water'] });
    expect(store().settings.breakReminders.customMessages).toEqual(['Stand up', 'Drink water']);
  });
});

describe('desktop settings', () => {
  it('patches the blocker without replacing the rest', () => {
    store().updateBlocker({ enabled: true, sites: ['news.example.com'] });
    expect(store().settings.desktop.blocker).toMatchObject({
      enabled: true,
      mode: 'blacklist',
      sites: ['news.example.com'],
      apps: [],
    });
    expect(store().settings.desktop.minimizeToTray).toBe(true);
  });
});

describe('replaceAll and resetAll', () => {
  it('round-trips a whole settings object', () => {
    const incoming = structuredClone(DEFAULT_SETTINGS);
    incoming.language = 'fr';
    incoming.timer.focusMinutes = 42;

    store().replaceAll(incoming);
    expect(store().settings.language).toBe('fr');
    expect(store().settings.timer.focusMinutes).toBe(42);

    store().resetAll();
    expect(store().settings).toEqual(DEFAULT_SETTINGS);
  });
});
