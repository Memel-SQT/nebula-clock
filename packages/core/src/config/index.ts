/**
 * Single source of truth for every default value in the app.
 *
 * Nothing else in the codebase is allowed to hard-code a duration, a colour,
 * a sound id or a goal: UI and storage both read from here, so changing a
 * default is a one-line change with no hunting.
 */
import type {
  AmbientTrackId,
  BadgeDefinition,
  Preset,
  Settings,
  SupportedLanguage,
} from '../types.js';

/** Nebula brand tokens, lifted verbatim from the Nebula desktop app theme. */
export const NEBULA_PALETTE = {
  bgBase: '#0A0A0F',
  bgSurface: '#12121F',
  card: '#1A1A2E',
  cardAlt: '#231942',
  border: '#2A2A45',
  blue: '#4C6EF5',
  blueBright: '#5B5FEF',
  violet: '#8B5CF6',
  violetBright: '#A855F7',
  success: '#34D399',
  warning: '#FBBF24',
  text: '#F1F1F6',
  textSecondary: '#9A94B8',
} as const;

/**
 * Accent choices offered in Settings. Each carries both ends of the Nebula
 * gradient so the default reproduces the original `--accent-gradient`
 * (`#4C6EF5 -> #8B5CF6`) exactly rather than approximating it.
 */
export const ACCENT_PRESETS = [
  { id: 'nebula', from: NEBULA_PALETTE.blue, to: NEBULA_PALETTE.violet },
  { id: 'blue', from: '#3B82F6', to: NEBULA_PALETTE.blueBright },
  { id: 'aurora', from: '#0EA5E9', to: '#22D3EE' },
  { id: 'ember', from: '#F97316', to: '#FBBF24' },
  { id: 'rose', from: '#E11D48', to: '#F43F5E' },
  { id: 'mint', from: '#10B981', to: NEBULA_PALETTE.success },
] as const;

export type AccentPresetId = (typeof ACCENT_PRESETS)[number]['id'];

/**
 * Resolve a stored accent into the two gradient stops.
 *
 * `accent` holds either a preset id or a raw hex colour picked by the user;
 * a custom colour becomes the bright end, with the cooler end mixed toward
 * the Nebula blue so the gradient keeps the family look.
 */
export function resolveAccent(accent: string): { from: string; to: string } {
  const preset = ACCENT_PRESETS.find((entry) => entry.id === accent || entry.to === accent);
  if (preset) return { from: preset.from, to: preset.to };
  return { from: `color-mix(in oklab, ${accent} 45%, ${NEBULA_PALETTE.blue})`, to: accent };
}

/** Colours proposed when creating a tag - all legible on both themes. */
export const TAG_COLORS = [
  NEBULA_PALETTE.violet,
  NEBULA_PALETTE.blue,
  '#22D3EE',
  NEBULA_PALETTE.success,
  NEBULA_PALETTE.warning,
  '#F97316',
  '#F43F5E',
  '#A78BFA',
] as const;

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'classic',
    name: 'Classic 25/5/15',
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
    builtIn: true,
  },
  {
    id: 'deep-work',
    name: 'Deep Work 50/10/30',
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 30,
    cyclesBeforeLongBreak: 3,
    builtIn: true,
  },
  {
    id: 'sprint',
    name: 'Sprint 15/3/10',
    focusMinutes: 15,
    shortBreakMinutes: 3,
    longBreakMinutes: 10,
    cyclesBeforeLongBreak: 4,
    builtIn: true,
  },
  {
    id: 'ultradian',
    name: 'Ultradian 90/20/30',
    focusMinutes: 90,
    shortBreakMinutes: 20,
    longBreakMinutes: 30,
    cyclesBeforeLongBreak: 2,
    builtIn: true,
  },
];

/** Bounds enforced by the settings UI and by import validation. */
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
} as const;

export const NOTIFICATION_SOUNDS = [
  { id: 'chime', file: 'chime.wav' },
  { id: 'bell', file: 'bell.wav' },
  { id: 'digital', file: 'digital.wav' },
  { id: 'marimba', file: 'marimba.wav' },
] as const;

export const AMBIENT_TRACKS: readonly { id: AmbientTrackId; file: string }[] = [
  { id: 'rain', file: 'rain.wav' },
  { id: 'forest', file: 'forest.wav' },
  { id: 'cafe', file: 'cafe.wav' },
  { id: 'whiteNoise', file: 'white-noise.wav' },
];

/** Milestones surfaced on the stats page. */
export const BADGES: BadgeDefinition[] = [
  { id: 'first-focus', labelKey: 'firstFocus', kind: 'sessions', threshold: 1 },
  { id: 'ten-sessions', labelKey: 'tenSessions', kind: 'sessions', threshold: 10 },
  { id: 'fifty-sessions', labelKey: 'fiftySessions', kind: 'sessions', threshold: 50 },
  { id: 'hundred-sessions', labelKey: 'hundredSessions', kind: 'sessions', threshold: 100 },
  { id: 'streak-3', labelKey: 'streak3', kind: 'streak', threshold: 3 },
  { id: 'streak-7', labelKey: 'streak7', kind: 'streak', threshold: 7 },
  { id: 'streak-30', labelKey: 'streak30', kind: 'streak', threshold: 30 },
  { id: 'ten-hours', labelKey: 'tenHours', kind: 'focusHours', threshold: 10 },
  { id: 'fifty-hours', labelKey: 'fiftyHours', kind: 'focusHours', threshold: 50 },
  { id: 'hundred-hours', labelKey: 'hundredHours', kind: 'focusHours', threshold: 100 },
];

/**
 * Built-in break reminders. Kept here rather than in the i18n catalogue
 * because the user can replace the whole list from Settings, and the custom
 * list is language-agnostic.
 */
export const DEFAULT_BREAK_REMINDERS: Record<SupportedLanguage, string[]> = {
  en: [
    'Stand up and stretch your shoulders.',
    'Drink a glass of water.',
    'Look at something 6 metres away for 20 seconds.',
    'Roll your wrists and shake out your hands.',
    'Take five slow, deep breaths.',
    'Walk to the window and back.',
    'Relax your jaw and drop your shoulders.',
    'Straighten your back and reset your posture.',
  ],
  fr: [
    'Lève-toi et étire tes épaules.',
    "Bois un verre d'eau.",
    'Regarde un point à 6 mètres pendant 20 secondes.',
    'Fais tourner tes poignets et secoue tes mains.',
    'Prends cinq respirations lentes et profondes.',
    "Marche jusqu'à la fenêtre et reviens.",
    'Détends ta mâchoire et relâche tes épaules.',
    'Redresse ton dos et corrige ta posture.',
  ],
};

const CLASSIC = BUILT_IN_PRESETS[0]!;

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  language: 'system',
  timer: {
    focusMinutes: CLASSIC.focusMinutes,
    shortBreakMinutes: CLASSIC.shortBreakMinutes,
    longBreakMinutes: CLASSIC.longBreakMinutes,
    cyclesBeforeLongBreak: CLASSIC.cyclesBeforeLongBreak,
    autoStartBreaks: true,
    autoStartFocus: false,
    activePresetId: CLASSIC.id,
  },
  goals: {
    dailyPomodoros: 8,
    weeklyPomodoros: 40,
  },
  notifications: {
    system: true,
    sound: true,
    soundId: 'chime',
    customSound: null,
    volume: 0.7,
  },
  ambient: {
    enabled: false,
    masterVolume: 0.5,
    tracks: { rain: 0, forest: 0, cafe: 0, whiteNoise: 0 },
    pauseOnBreak: true,
  },
  breakReminders: {
    enabled: true,
    intervalSeconds: 120,
    customMessages: [],
  },
  appearance: {
    theme: 'system',
    accent: NEBULA_PALETTE.violet,
    fontScale: 1,
    reduceMotion: false,
    highContrast: false,
  },
  desktop: {
    minimizeToTray: true,
    launchAtLogin: false,
    globalShortcuts: true,
    doNotDisturb: false,
    miniModeAlwaysOnTop: true,
    blocker: {
      enabled: false,
      mode: 'blacklist',
      sites: [],
      apps: [],
    },
  },
  fullscreenOnFocus: false,
};

/** Default global accelerators; Electron registers these when enabled. */
export const GLOBAL_SHORTCUTS = {
  toggle: 'CommandOrControl+Shift+Space',
  skip: 'CommandOrControl+Shift+N',
  reset: 'CommandOrControl+Shift+R',
  miniMode: 'CommandOrControl+Shift+M',
} as const;

/** In-window keyboard shortcuts, documented in the UI and the README. */
export const KEYBOARD_SHORTCUTS = {
  toggle: 'Space',
  skip: 'n',
  reset: 'r',
  fullscreen: 'f',
  settings: ',',
} as const;
