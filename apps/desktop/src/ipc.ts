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

  // renderer -> main (fire and forget)
  publishTimer: 'nebula:publish-timer',
  quitAndInstall: 'nebula:quit-and-install',

  // main -> renderer
  command: 'nebula:command',
  timerSnapshot: 'nebula:timer-snapshot',
  updateEvent: 'nebula:update-event',
} as const;

export type Phase = 'focus' | 'shortBreak' | 'longBreak';

export type DesktopCommand = 'toggle' | 'start' | 'pause' | 'skip' | 'reset' | 'mini-mode';

export interface DesktopTimerSnapshot {
  phase: Phase;
  status: 'idle' | 'running' | 'paused';
  remainingSeconds: number;
  display: string;
  completedToday: number;
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
