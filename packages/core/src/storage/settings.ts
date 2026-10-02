/**
 * Settings read back from anywhere (localStorage, an imported backup, an older version, a hand
 * edit) are normalized field by field: a missing, out-of-range or wrongly typed value falls back
 * to its own default and never takes the neighbouring fields down with it.
 */
import { migrateAppearance } from '../appearance/index.js';
import { normalizeAppName, normalizeList, normalizeSite } from '../blocker/index.js';
import { DEFAULT_SETTINGS, LIMITS, NOTIFICATION_SOUNDS } from '../config/index.js';
import type {
  AmbientTrackId,
  BlockerMode,
  LanguageSetting,
  NotificationSettings,
  Settings,
} from '../types.js';
import { clamp } from '../utils/index.js';

type Bounds = { min: number; max: number };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

/** A finite number inside its bounds (rounded when `integer`), else the default. */
function num(value: unknown, fallback: number, bounds: Bounds, integer = true): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clamp(integer ? Math.round(value) : value, bounds.min, bounds.max);
}

const LANGUAGES: readonly LanguageSetting[] = ['system', 'fr', 'en'];
const BLOCKER_MODES: readonly BlockerMode[] = ['blacklist', 'whitelist'];
const VOLUME = LIMITS.volume;

function customSound(value: unknown): NotificationSettings['customSound'] {
  const sound = record(value);
  if (
    typeof sound.name === 'string' &&
    typeof sound.dataUrl === 'string' &&
    sound.dataUrl.startsWith('data:audio/') &&
    sound.dataUrl.length <= LIMITS.customSoundBytes.max
  ) {
    return { name: sound.name.slice(0, 200), dataUrl: sound.dataUrl };
  }
  return null;
}

function reminderMessages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((line): line is string => typeof line === 'string')
    .map((line) => line.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 50);
}

export function normalizeSettings(value: unknown): Settings {
  const raw = record(value);
  const d = DEFAULT_SETTINGS;

  const timer = record(raw.timer);
  const goals = record(raw.goals);
  const notifications = record(raw.notifications);
  const ambient = record(raw.ambient);
  const tracks = record(ambient.tracks);
  const breaks = record(raw.breakReminders);
  const desktop = record(raw.desktop);
  const blocker = record(desktop.blocker);

  const trackVolumes = Object.fromEntries(
    (Object.keys(d.ambient.tracks) as AmbientTrackId[]).map((id) => [
      id,
      num(tracks[id], d.ambient.tracks[id], VOLUME, false),
    ]),
  ) as Record<AmbientTrackId, number>;

  return {
    version: d.version,
    language: LANGUAGES.includes(raw.language as LanguageSetting)
      ? (raw.language as LanguageSetting)
      : d.language,
    timer: {
      focusMinutes: num(timer.focusMinutes, d.timer.focusMinutes, LIMITS.focusMinutes),
      shortBreakMinutes: num(
        timer.shortBreakMinutes,
        d.timer.shortBreakMinutes,
        LIMITS.shortBreakMinutes,
      ),
      longBreakMinutes: num(
        timer.longBreakMinutes,
        d.timer.longBreakMinutes,
        LIMITS.longBreakMinutes,
      ),
      cyclesBeforeLongBreak: num(
        timer.cyclesBeforeLongBreak,
        d.timer.cyclesBeforeLongBreak,
        LIMITS.cyclesBeforeLongBreak,
      ),
      autoStartBreaks: bool(timer.autoStartBreaks, d.timer.autoStartBreaks),
      autoStartFocus: bool(timer.autoStartFocus, d.timer.autoStartFocus),
      activePresetId:
        typeof timer.activePresetId === 'string' || timer.activePresetId === null
          ? timer.activePresetId
          : d.timer.activePresetId,
    },
    goals: {
      dailyPomodoros: num(goals.dailyPomodoros, d.goals.dailyPomodoros, LIMITS.dailyPomodoros),
      weeklyPomodoros: num(goals.weeklyPomodoros, d.goals.weeklyPomodoros, LIMITS.weeklyPomodoros),
    },
    notifications: {
      system: bool(notifications.system, d.notifications.system),
      sound: bool(notifications.sound, d.notifications.sound),
      soundId: NOTIFICATION_SOUNDS.some((sound) => sound.id === notifications.soundId)
        ? (notifications.soundId as string)
        : d.notifications.soundId,
      customSound: customSound(notifications.customSound),
      volume: num(notifications.volume, d.notifications.volume, VOLUME, false),
    },
    ambient: {
      enabled: bool(ambient.enabled, d.ambient.enabled),
      masterVolume: num(ambient.masterVolume, d.ambient.masterVolume, VOLUME, false),
      tracks: trackVolumes,
      pauseOnBreak: bool(ambient.pauseOnBreak, d.ambient.pauseOnBreak),
    },
    breakReminders: {
      enabled: bool(breaks.enabled, d.breakReminders.enabled),
      intervalSeconds: num(
        breaks.intervalSeconds,
        d.breakReminders.intervalSeconds,
        LIMITS.breakReminderSeconds,
      ),
      customMessages: reminderMessages(breaks.customMessages),
    },
    appearance: migrateAppearance(raw.appearance),
    desktop: {
      minimizeToTray: bool(desktop.minimizeToTray, d.desktop.minimizeToTray),
      launchAtLogin: bool(desktop.launchAtLogin, d.desktop.launchAtLogin),
      globalShortcuts: bool(desktop.globalShortcuts, d.desktop.globalShortcuts),
      doNotDisturb: bool(desktop.doNotDisturb, d.desktop.doNotDisturb),
      miniModeAlwaysOnTop: bool(desktop.miniModeAlwaysOnTop, d.desktop.miniModeAlwaysOnTop),
      blocker: {
        enabled: bool(blocker.enabled, d.desktop.blocker.enabled),
        mode: BLOCKER_MODES.includes(blocker.mode as BlockerMode)
          ? (blocker.mode as BlockerMode)
          : d.desktop.blocker.mode,
        sites: Array.isArray(blocker.sites) ? normalizeList(blocker.sites, normalizeSite) : [],
        apps: Array.isArray(blocker.apps) ? normalizeList(blocker.apps, normalizeAppName) : [],
      },
    },
    fullscreenOnFocus: bool(raw.fullscreenOnFocus, d.fullscreenOnFocus),
  };
}
