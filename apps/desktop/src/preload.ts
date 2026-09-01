/**
 * The only bridge between the renderer and Node.
 *
 * `contextIsolation` is on and `nodeIntegration` off, so the renderer sees
 * exactly the functions exposed here and nothing else — no `require`, no
 * `fs`, no ipcRenderer. Each listener returns its own unsubscribe so React
 * effects can clean up properly.
 */
import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS } from './ipc.js';
import type {
  BlockerConfig,
  DesktopCommand,
  DesktopTimerSnapshot,
  NotificationPayload,
  UpdateEvent,
} from './ipc.js';

/** The mini window is told which it is by its query string. */
const isMiniWindow = new URLSearchParams(window.location.search).get('mini') === '1';

function subscribe<T>(channel: string, handler: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const bridge = {
  isDesktop: true as const,
  platform: process.platform,
  appVersion: process.env.NEBULA_APP_VERSION ?? '0.0.0',
  isMiniWindow,

  notify: (payload: NotificationPayload): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.notify, payload) as Promise<void>,

  publishTimer: (snapshot: DesktopTimerSnapshot): void => {
    ipcRenderer.send(CHANNELS.publishTimer, snapshot);
  },

  onCommand: (handler: (command: DesktopCommand) => void): (() => void) =>
    subscribe<DesktopCommand>(CHANNELS.command, handler),

  onTimerSnapshot: (handler: (snapshot: DesktopTimerSnapshot) => void): (() => void) =>
    subscribe<DesktopTimerSnapshot>(CHANNELS.timerSnapshot, handler),

  setLaunchAtLogin: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.setLaunchAtLogin, enabled) as Promise<boolean>,

  setGlobalShortcuts: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.setGlobalShortcuts, enabled) as Promise<boolean>,

  setDoNotDisturb: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.setDoNotDisturb, enabled) as Promise<void>,

  setMiniModeAlwaysOnTop: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.setMiniAlwaysOnTop, enabled) as Promise<void>,

  setMinimizeToTray: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.setMinimizeToTray, enabled) as Promise<void>,

  applyBlocker: (config: BlockerConfig): Promise<{ ok: boolean; reason?: string }> =>
    ipcRenderer.invoke(CHANNELS.applyBlocker, config) as Promise<{
      ok: boolean;
      reason?: string;
    }>,

  openMiniMode: (): Promise<void> => ipcRenderer.invoke(CHANNELS.openMiniMode) as Promise<void>,
  closeMiniMode: (): Promise<void> => ipcRenderer.invoke(CHANNELS.closeMiniMode) as Promise<void>,

  setFullscreen: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.setFullscreen, enabled) as Promise<void>,

  checkForUpdates: (): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.checkForUpdates) as Promise<void>,

  onUpdateEvent: (handler: (event: UpdateEvent) => void): (() => void) =>
    subscribe<UpdateEvent>(CHANNELS.updateEvent, handler),

  quitAndInstall: (): void => {
    ipcRenderer.send(CHANNELS.quitAndInstall);
  },
};

contextBridge.exposeInMainWorld('nebula', bridge);
