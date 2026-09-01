/**
 * Domain types shared by every surface (web, desktop, storage, stats).
 *
 * Time is stored as epoch milliseconds (`number`) everywhere so that a value
 * survives JSON export/import and IndexedDB round-trips without timezone
 * drift. Durations are seconds unless the field name says `Minutes`.
 */

/** A phase of the Pomodoro cycle. */
export type Phase = 'focus' | 'shortBreak' | 'longBreak';

/** Calendar day key, `YYYY-MM-DD`, always in the user's local timezone. */
export type DayKey = string;

export type ThemeMode = 'light' | 'dark' | 'system';

export type LanguageSetting = 'fr' | 'en' | 'system';

export type SupportedLanguage = 'fr' | 'en';

/** A colour-coded label; a task may carry several. */
export interface Tag {
  id: string;
  name: string;
  /** Hex colour, e.g. `#8B5CF6`. */
  color: string;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  /** How many pomodoros the user thinks this needs. */
  estimatedPomodoros: number;
  /** How many focus sessions have actually been logged against it. */
  completedPomodoros: number;
  done: boolean;
  tagIds: string[];
  /** Manual sort position, mutated by drag and drop. */
  order: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

/** One finished (or abandoned) phase, the atom every statistic is built from. */
export interface Session {
  id: string;
  phase: Phase;
  startedAt: number;
  endedAt: number;
  /** Wall-clock seconds actually spent in the phase. */
  durationSeconds: number;
  /** Seconds the phase was configured to last. */
  plannedSeconds: number;
  /** `false` when the user skipped or reset before the phase elapsed. */
  completed: boolean;
  taskId: string | null;
  tagIds: string[];
}

export interface Preset {
  id: string;
  name: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  /** Built-in presets ship with the app and cannot be deleted. */
  builtIn: boolean;
}

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  activePresetId: string | null;
}

export interface GoalSettings {
  dailyPomodoros: number;
  weeklyPomodoros: number;
}

export interface NotificationSettings {
  /** OS-level notification on every phase transition. */
  system: boolean;
  /** In-app chime on every phase transition. */
  sound: boolean;
  soundId: string;
  /** Data URL of a user-imported chime; takes precedence over `soundId`. */
  customSound: { name: string; dataUrl: string } | null;
  /** 0..1 - independent from the ambient mixer. */
  volume: number;
}

export type AmbientTrackId = 'rain' | 'forest' | 'cafe' | 'whiteNoise';

export interface AmbientSettings {
  enabled: boolean;
  /** 0..1 master gain applied on top of each per-track volume. */
  masterVolume: number;
  /** Per-track volume, 0 means "off". */
  tracks: Record<AmbientTrackId, number>;
  /** Stop ambient playback when a break starts. */
  pauseOnBreak: boolean;
}

export interface BreakReminderSettings {
  enabled: boolean;
  /** Seconds between two reminders inside a break. */
  intervalSeconds: number;
  /** User-supplied messages; empty means "use the built-in localized list". */
  customMessages: string[];
}

export interface AppearanceSettings {
  theme: ThemeMode;
  /** Hex accent colour driving the Nebula gradient. */
  accent: string;
  /** 0.875 .. 1.5 multiplier on the root font size. */
  fontScale: number;
  reduceMotion: boolean;
  highContrast: boolean;
}

export type BlockerMode = 'blacklist' | 'whitelist';

export interface DesktopSettings {
  minimizeToTray: boolean;
  launchAtLogin: boolean;
  globalShortcuts: boolean;
  /** Ask the OS to suppress other notifications during focus. */
  doNotDisturb: boolean;
  miniModeAlwaysOnTop: boolean;
  blocker: {
    enabled: boolean;
    mode: BlockerMode;
    /** Hostnames, e.g. `news.ycombinator.com`. */
    sites: string[];
    /** Executable names, e.g. `Discord.exe`. */
    apps: string[];
  };
}

export interface Settings {
  /** Bumped when the shape changes so imports can be migrated. */
  version: number;
  language: LanguageSetting;
  timer: TimerSettings;
  goals: GoalSettings;
  notifications: NotificationSettings;
  ambient: AmbientSettings;
  breakReminders: BreakReminderSettings;
  appearance: AppearanceSettings;
  desktop: DesktopSettings;
  /** Immersive full-screen focus mode. */
  fullscreenOnFocus: boolean;
}

/** Milestone unlocked by cumulative usage. */
export interface BadgeDefinition {
  id: string;
  /** i18n key suffix under `stats.badges`. */
  labelKey: string;
  kind: 'sessions' | 'streak' | 'focusHours';
  threshold: number;
}

export interface EarnedBadge extends BadgeDefinition {
  earned: boolean;
  /** Current value against the threshold, for a progress bar. */
  progress: number;
}
