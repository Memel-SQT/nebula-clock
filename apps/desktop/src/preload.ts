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
  ShellLabels,
  UpdateEvent,
  WindowChrome,
} from './ipc.js';

/** The mini window is told which it is by its query string. */
const query = new URLSearchParams(window.location.search);
const isMiniWindow = query.get('mini') === '1';
/** A main window recreated for (or after) the Nebula Hub mode. */
const hubMode =
  query.get('mode') === 'docked' ? 'docked' : query.get('mode') === 'restored' ? 'restored' : null;

// Asked once, synchronously: the sandboxed preload has no access to the main process' env.
const info = ipcRenderer.sendSync(CHANNELS.appInfo) as { version: string; platform: string };

function subscribe<T>(channel: string, handler: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const bridge = {
  isDesktop: true as const,
  platform: info.platform,
  appVersion: info.version,
  isMiniWindow,
  hubMode,

  notify: (payload: NotificationPayload): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.notify, payload) as Promise<void>,

  publishTimer: (snapshot: DesktopTimerSnapshot): void => {
    ipcRenderer.send(CHANNELS.publishTimer, snapshot);
  },

  requestCommand: (command: DesktopCommand): void => {
    ipcRenderer.send(CHANNELS.requestCommand, command);
  },

  requestSnapshot: (): void => {
    ipcRenderer.send(CHANNELS.requestSnapshot);
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

  // Nebula Hub (optional).
  publishFocus: (focus: unknown): void => {
    ipcRenderer.send(CHANNELS.publishFocus, focus);
  },
  getHubState: (): Promise<unknown> => ipcRenderer.invoke(CHANNELS.hubState),
  onHubState: (handler: (state: unknown) => void): (() => void) =>
    subscribe<unknown>(CHANNELS.hubStateChanged, handler),
  onNebulaAppearance: (handler: (appearance: unknown) => void): (() => void) =>
    subscribe<unknown>(CHANNELS.hubAppearance, handler),
  setUpdatesByHub: (enabled: boolean): Promise<unknown> =>
    ipcRenderer.invoke(CHANNELS.setUpdatesByHub, enabled),
  openHub: (): Promise<'opened' | 'not-installed'> =>
    ipcRenderer.invoke(CHANNELS.openHub) as Promise<'opened' | 'not-installed'>,
  detachFromHub: (): Promise<void> => ipcRenderer.invoke(CHANNELS.detachFromHub) as Promise<void>,
  getBreakReading: (): Promise<unknown> => ipcRenderer.invoke(CHANNELS.breakReading),
  openBreakReading: (): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.openBreakReading) as Promise<boolean>,
  setBreakReading: (enabled: boolean): Promise<unknown> =>
    ipcRenderer.invoke(CHANNELS.setBreakReading, enabled),

  // Window chrome and translated shell texts (validated in the main process).
  setWindowTheme: (chrome: WindowChrome): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.setWindowTheme, chrome) as Promise<void>,
  setShellLabels: (labels: ShellLabels): void => {
    ipcRenderer.send(CHANNELS.setShellLabels, labels);
  },
};

contextBridge.exposeInMainWorld('nebula', bridge);
