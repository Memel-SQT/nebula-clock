/**
 * The contract between the renderer and the Electron main process.
 *
 * The web build never sees an implementation of this: `getDesktop()` returns
 * `null` and every desktop-only feature degrades to a no-op or a disabled
 * control. That is what lets one renderer serve both targets.
 */
import type { NotificationPayload } from '@nebula-clock/core';
import type { BlockerMode, Phase } from '@nebula-clock/core';

/** Commands the tray menu and the global shortcuts can send in. */
export type DesktopCommand = 'toggle' | 'start' | 'pause' | 'skip' | 'reset' | 'mini-mode';

/** Snapshot the main process needs to render the tray title and menu. */
export interface DesktopTimerSnapshot {
  phase: Phase;
  status: 'idle' | 'running' | 'paused';
  remainingSeconds: number;
  /** Pre-formatted `mm:ss`, so the main process never duplicates the logic. */
  display: string;
  completedToday: number;
}

export interface BlockerConfig {
  enabled: boolean;
  mode: BlockerMode;
  sites: string[];
  apps: string[];
  /** Blocking is only enforced while a focus phase is actually running. */
  active: boolean;
}

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string };

export interface DesktopBridge {
  readonly isDesktop: true;
  /** `process.platform`; the three named values are the supported targets. */
  readonly platform: 'win32' | 'darwin' | 'linux' | (string & {});
  readonly appVersion: string;
  /** True in the small always-on-top window rather than the main one. */
  readonly isMiniWindow: boolean;

  notify(payload: NotificationPayload): Promise<void>;

  /** Push the current timer state so tray, mini window and DND stay in sync. */
  publishTimer(snapshot: DesktopTimerSnapshot): void;
  /** Tray / global shortcut commands coming back in. Returns an unsubscribe. */
  onCommand(handler: (command: DesktopCommand) => void): () => void;
  /** The mini window mirrors the main window's state through the main process. */
  onTimerSnapshot(handler: (snapshot: DesktopTimerSnapshot) => void): () => void;

  setLaunchAtLogin(enabled: boolean): Promise<boolean>;
  setGlobalShortcuts(enabled: boolean): Promise<boolean>;
  setDoNotDisturb(enabled: boolean): Promise<void>;
  setMiniModeAlwaysOnTop(enabled: boolean): Promise<void>;
  setMinimizeToTray(enabled: boolean): Promise<void>;
  applyBlocker(config: BlockerConfig): Promise<{ ok: boolean; reason?: string }>;

  openMiniMode(): Promise<void>;
  closeMiniMode(): Promise<void>;
  setFullscreen(enabled: boolean): Promise<void>;

  checkForUpdates(): Promise<void>;
  onUpdateEvent(handler: (event: UpdateEvent) => void): () => void;
  quitAndInstall(): void;
}

declare global {
  interface Window {
    nebula?: DesktopBridge;
  }
}

/** The bridge when running inside Electron, `null` in a browser. */
export function getDesktop(): DesktopBridge | null {
  if (typeof window === 'undefined') return null;
  return window.nebula ?? null;
}

export const isDesktop = (): boolean => getDesktop() !== null;

/** True when this renderer is the compact always-on-top mini window. */
export const isMiniWindow = (): boolean => getDesktop()?.isMiniWindow === true;
