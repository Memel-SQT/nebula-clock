/**
 * The IPC vocabulary, shared by the main process and the preload bridge.
 *
 * Keeping the channel names in one typed object stops the two sides drifting
 * apart, which is otherwise the classic Electron bug.
 */
export const CHANNELS = {
  // renderer -> main (invoke)
  notify: 'nebula:notify',
  setLaunchAtLogin: 'nebula:set-launch-at-login',
  setGlobalShortcuts: 'nebula:set-global-shortcuts',
  setDoNotDisturb: 'nebula:set-do-not-disturb',
  setMiniAlwaysOnTop: 'nebula:set-mini-always-on-top',
  setMinimizeToTray: 'nebula:set-minimize-to-tray',
  applyBlocker: 'nebula:apply-blocker',
  openMiniMode: 'nebula:open-mini-mode',
  closeMiniMode: 'nebula:close-mini-mode',
  setFullscreen: 'nebula:set-fullscreen',
  checkForUpdates: 'nebula:check-for-updates',
  hubState: 'nebula:hub-state',
  setUpdatesByHub: 'nebula:set-updates-by-hub',
  openHub: 'nebula:open-hub',
  detachFromHub: 'nebula:detach-from-hub',
  /** Nebula News' theme for the break card, validated in the main process (or null). */
  breakReading: 'nebula:break-reading',
  /** Opens the card's theme in Nebula News; the link never comes from the renderer. */
  openBreakReading: 'nebula:open-break-reading',
  newsArticles: 'nebula:news-articles',
  openNewsArticle: 'nebula:open-news-article',
  setBreakReading: 'nebula:set-break-reading',
  /** Theme colours for the native window controls of the frameless window. */
  setWindowTheme: 'nebula:set-window-theme',

  // renderer -> main (synchronous, read once by the preload)
  appInfo: 'nebula:app-info',

  // renderer -> main (fire and forget)
  publishTimer: 'nebula:publish-timer',
  /** The mini window asking the main window to act; it owns no timer itself. */
  requestCommand: 'nebula:request-command',
  /** A freshly opened mirror asking for the current state right away. */
  requestSnapshot: 'nebula:request-snapshot',
  quitAndInstall: 'nebula:quit-and-install',
  /** Today's focus for the Nebula Hub widget (the renderer owns sessions and translations). */
  publishFocus: 'nebula:publish-focus',
  /** Translated texts for the tray menu and the main process notifications. */
  setShellLabels: 'nebula:set-shell-labels',

  // main -> renderer
  command: 'nebula:command',
  timerSnapshot: 'nebula:timer-snapshot',
  updateEvent: 'nebula:update-event',
  hubStateChanged: 'nebula:state',
  hubAppearance: 'nebula:appearance',
} as const;

export type Phase = 'focus' | 'shortBreak' | 'longBreak';

export type DesktopCommand = 'toggle' | 'start' | 'pause' | 'skip' | 'reset' | 'mini-mode';

/**
 * Everything a mirror needs to render the timer without running one.
 * The tray uses `display` and `completedToday`; the mini window uses the rest.
 */
export interface DesktopTimerSnapshot {
  phase: Phase;
  status: 'idle' | 'running' | 'paused';
  remainingSeconds: number;
  display: string;
  completedToday: number;
  /** 0..1 completion of the current phase. */
  progress: number;
  completedInCycle: number;
  cycleTarget: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  silent?: boolean;
}

export interface BlockerConfig {
  enabled: boolean;
  mode: 'blacklist' | 'whitelist';
  sites: string[];
  apps: string[];
  active: boolean;
}

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string };

/** Page and ink colours of the active theme (packages/ui THEME_CHROME). */
export interface WindowChrome {
  page: string;
  ink: string;
}

/** Texts the main process shows; the count and the app name placeholders are filled in here. */
export interface ShellLabels {
  phase: Record<Phase, string>;
  start: string;
  pause: string;
  resume: string;
  skip: string;
  reset: string;
  miniMode: string;
  open: string;
  quit: string;
  todayOne: string;
  todayOther: string;
  blockedTitle: string;
  blockedBody: string;
}
