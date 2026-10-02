/**
 * Bounds enforced by the settings UI and by import validation. A module of its own so the
 * appearance model can read them without importing the whole config (which imports it back).
 */
export const LIMITS = {
  focusMinutes: { min: 1, max: 180 },
  shortBreakMinutes: { min: 1, max: 60 },
  longBreakMinutes: { min: 1, max: 120 },
  cyclesBeforeLongBreak: { min: 1, max: 12 },
  dailyPomodoros: { min: 1, max: 40 },
  weeklyPomodoros: { min: 1, max: 200 },
  fontScale: { min: 0.875, max: 1.5 },
  volume: { min: 0, max: 1 },
  breakReminderSeconds: { min: 30, max: 900 },
  /** A task's estimate, in pomodoros. */
  estimatedPomodoros: { min: 1, max: 20 },
  /** An imported notification sound, as a data URL (localStorage holds about 5 MB in all). */
  customSoundBytes: { max: 1_500_000 },
} as const;
