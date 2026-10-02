/**
 * User settings, persisted to localStorage.
 *
 * The storage key and shape are also read by the inline theme script in
 * `index.html`, which resolves the theme before first paint - keep the two
 * in step if this ever changes.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  SETTINGS_VERSION,
  clamp,
  migrateAppearance,
  normalizeAppName,
  normalizeList,
  normalizeSettings,
  normalizeSite,
} from '@nebula-clock/core';
import type {
  AmbientSettings,
  AppearanceSettings,
  BreakReminderSettings,
  DesktopSettings,
  GoalSettings,
  LanguageSetting,
  NotificationSettings,
  Preset,
  Settings,
  TimerSettings,
} from '@nebula-clock/core';

export const SETTINGS_STORAGE_KEY = 'nebula-clock-settings';

interface SettingsStore {
  settings: Settings;
  updateTimer: (patch: Partial<TimerSettings>) => void;
  updateGoals: (patch: Partial<GoalSettings>) => void;
  updateNotifications: (patch: Partial<NotificationSettings>) => void;
  updateAmbient: (patch: Partial<AmbientSettings>) => void;
  updateBreakReminders: (patch: Partial<BreakReminderSettings>) => void;
  updateAppearance: (patch: Partial<AppearanceSettings>) => void;
  updateDesktop: (patch: Partial<DesktopSettings>) => void;
  updateBlocker: (patch: Partial<DesktopSettings['blocker']>) => void;
  setLanguage: (language: LanguageSetting) => void;
  setFullscreenOnFocus: (enabled: boolean) => void;
  applyPreset: (preset: Preset) => void;
  /** Wholesale replacement, used by the import flow. */
  replaceAll: (settings: Settings) => void;
  resetAll: () => void;
}

/** Keep durations and volumes inside the documented bounds. */
function sanitizeTimer(timer: TimerSettings): TimerSettings {
  return {
    ...timer,
    focusMinutes: clamp(
      Math.round(timer.focusMinutes),
      LIMITS.focusMinutes.min,
      LIMITS.focusMinutes.max,
    ),
    shortBreakMinutes: clamp(
      Math.round(timer.shortBreakMinutes),
      LIMITS.shortBreakMinutes.min,
      LIMITS.shortBreakMinutes.max,
    ),
    longBreakMinutes: clamp(
      Math.round(timer.longBreakMinutes),
      LIMITS.longBreakMinutes.min,
      LIMITS.longBreakMinutes.max,
    ),
    cyclesBeforeLongBreak: clamp(
      Math.round(timer.cyclesBeforeLongBreak),
      LIMITS.cyclesBeforeLongBreak.min,
      LIMITS.cyclesBeforeLongBreak.max,
    ),
  };
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      updateTimer: (patch) =>
        set((state) => {
          const timer = sanitizeTimer({ ...state.settings.timer, ...patch });
          // Editing a duration by hand detaches the settings from the preset,
          // unless the caller explicitly set one.
          const touchesDurations =
            patch.focusMinutes !== undefined ||
            patch.shortBreakMinutes !== undefined ||
            patch.longBreakMinutes !== undefined ||
            patch.cyclesBeforeLongBreak !== undefined;
          return {
            settings: {
              ...state.settings,
              timer: {
                ...timer,
                activePresetId:
                  patch.activePresetId !== undefined
                    ? patch.activePresetId
                    : touchesDurations
                      ? null
                      : timer.activePresetId,
              },
            },
          };
        }),

      updateGoals: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            goals: {
              dailyPomodoros: clamp(
                Math.round(patch.dailyPomodoros ?? state.settings.goals.dailyPomodoros),
                LIMITS.dailyPomodoros.min,
                LIMITS.dailyPomodoros.max,
              ),
              weeklyPomodoros: clamp(
                Math.round(patch.weeklyPomodoros ?? state.settings.goals.weeklyPomodoros),
                LIMITS.weeklyPomodoros.min,
                LIMITS.weeklyPomodoros.max,
              ),
            },
          },
        })),

      updateNotifications: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            notifications: {
              ...state.settings.notifications,
              ...patch,
              volume: clamp(patch.volume ?? state.settings.notifications.volume, 0, 1),
            },
          },
        })),

      updateAmbient: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ambient: {
              ...state.settings.ambient,
              ...patch,
              masterVolume: clamp(patch.masterVolume ?? state.settings.ambient.masterVolume, 0, 1),
            },
          },
        })),

      updateBreakReminders: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            breakReminders: {
              ...state.settings.breakReminders,
              ...patch,
              intervalSeconds: clamp(
                Math.round(patch.intervalSeconds ?? state.settings.breakReminders.intervalSeconds),
                LIMITS.breakReminderSeconds.min,
                LIMITS.breakReminderSeconds.max,
              ),
            },
          },
        })),

      // Through the same field-by-field rules as a stored value: a patch from the Hub or a
      // colour picker can never leave an invalid appearance behind.
      updateAppearance: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            appearance: migrateAppearance({ ...state.settings.appearance, ...patch }),
          },
        })),

      updateDesktop: (patch) =>
        set((state) => ({
          settings: { ...state.settings, desktop: { ...state.settings.desktop, ...patch } },
        })),

      updateBlocker: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            desktop: {
              ...state.settings.desktop,
              blocker: {
                ...state.settings.desktop.blocker,
                ...patch,
                // The main process writes these into the hosts file: plain hostnames only.
                sites: normalizeList(
                  patch.sites ?? state.settings.desktop.blocker.sites,
                  normalizeSite,
                ),
                apps: normalizeList(
                  patch.apps ?? state.settings.desktop.blocker.apps,
                  normalizeAppName,
                ),
              },
            },
          },
        })),

      setLanguage: (language) => set((state) => ({ settings: { ...state.settings, language } })),

      setFullscreenOnFocus: (fullscreenOnFocus) =>
        set((state) => ({ settings: { ...state.settings, fullscreenOnFocus } })),

      applyPreset: (preset) =>
        set((state) => ({
          settings: {
            ...state.settings,
            timer: {
              ...state.settings.timer,
              focusMinutes: preset.focusMinutes,
              shortBreakMinutes: preset.shortBreakMinutes,
              longBreakMinutes: preset.longBreakMinutes,
              cyclesBeforeLongBreak: preset.cyclesBeforeLongBreak,
              activePresetId: preset.id,
            },
          },
        })),

      replaceAll: (settings) => set({ settings: normalizeSettings(settings) }),
      resetAll: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      // 2: the Nebula family appearance model (1.3). Older versions are migrated field by
      // field (`normalizeSettings` reads the 1.2 appearance too), never reset.
      version: SETTINGS_VERSION,
      partialize: (state) => ({ settings: state.settings }),
      migrate: (persisted) => ({
        settings: normalizeSettings((persisted as { settings?: unknown } | null)?.settings),
      }),
      // Every load goes through the normalizer, not only version bumps: the default shallow
      // merge would replace the whole object and drop any field added since (or keep a corrupt
      // one from a hand edit).
      merge: (persisted, current) => ({
        ...current,
        settings: normalizeSettings((persisted as { settings?: unknown } | null)?.settings),
      }),
    },
  ),
);

export const selectSettings = (state: SettingsStore): Settings => state.settings;
