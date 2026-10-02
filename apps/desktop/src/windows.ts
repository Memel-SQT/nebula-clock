/**
 * Window management: the main window and the compact always-on-top mini
 * window. Both load the same renderer bundle; the mini window is told which
 * it is through a `?mini=1` query parameter that the preload script reads.
 */
import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import type { WindowChrome } from './ipc.js';
import { isSafeExternalUrl } from './validate.js';

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(DEV_SERVER_URL);

/**
 * The active theme's page and ink colours (nebula-dark until the renderer says otherwise): the
 * window background, so it never flashes white, and the native window controls drawn by
 * Windows over the frameless window.
 */
let chrome: WindowChrome = { page: '#0a0a0f', ink: '#f1f1f6' };

/** Height of the drag strip (`.titlebar-drag` in shell.css) and of the window controls. */
const TITLE_BAR_HEIGHT = 36;

function titleBarOverlay(): Electron.TitleBarOverlayOptions {
  // Transparent: the app's own background (and its animated glow) shows behind the controls.
  return { color: 'rgba(0, 0, 0, 0)', symbolColor: chrome.ink, height: TITLE_BAR_HEIGHT };
}

/** Keeps the window controls and background in the current theme. */
export function applyWindowTheme(next: WindowChrome): void {
  chrome = next;
  for (const window of allWindows()) {
    window.setBackgroundColor(chrome.page);
  }
  const main = mainWindow;
  if (main && !main.isDestroyed() && !dock.docked && process.platform === 'win32') {
    main.setTitleBarOverlay(titleBarOverlay());
  }
}

/**
 * Every window shows the app and nothing else: no navigation away from it, no new windows
 * (an https link opens in the browser, anything else is dropped), no webviews.
 */
function harden(window: BrowserWindow): void {
  const contents = window.webContents;
  contents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    const current = contents.getURL();
    // Hash changes are the app's own routing; anything else leaves the app.
    if (url.split('#')[0] !== current.split('#')[0]) event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

let mainWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;

/** Set on quit so the close handler stops hiding the window to the tray. */
let quitting = false;
let minimizeToTray = true;

export const setQuitting = (value: boolean): void => {
  quitting = value;
};

export const setMinimizeToTray = (value: boolean): void => {
  minimizeToTray = value;
};

function preloadPath(): string {
  return join(__dirname, 'preload.cjs');
}

/** The main window's Nebula Hub mode: docked (frameless, placed by the Hub) or recreated after it. */
let windowMode: 'docked' | 'restored' | null = null;

/** Renderer entry point for a window; `mini` picks the compact layout. */
function rendererUrl(mini: boolean): { url?: string; file?: string; query: string } {
  const query = mini ? 'mini=1' : windowMode ? `mode=${windowMode}` : '';
  if (isDev) {
    return { url: `${DEV_SERVER_URL}${query ? `?${query}` : ''}#/timer`, query };
  }
  return { file: join(__dirname, '../renderer/index.html'), query };
}

async function load(window: BrowserWindow, mini: boolean): Promise<void> {
  const target = rendererUrl(mini);
  if (target.url) {
    await window.loadURL(target.url);
  } else if (target.file) {
    await window.loadFile(target.file, {
      search: target.query || undefined,
      hash: '/timer',
    });
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getMiniWindow(): BrowserWindow | null {
  return miniWindow;
}

/** Every live renderer, for broadcasting commands and snapshots. */
export function allWindows(): BrowserWindow[] {
  return [mainWindow, miniWindow].filter((w): w is BrowserWindow => w !== null && !w.isDestroyed());
}

type Bounds = { x: number; y: number; width: number; height: number };

export async function createMainWindow(
  options: { docked?: boolean; bounds?: Bounds } = {},
): Promise<BrowserWindow> {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  const docked = options.docked === true;

  mainWindow = new BrowserWindow({
    width: options.bounds?.width ?? 1120,
    height: options.bounds?.height ?? 780,
    ...(options.bounds ? { x: options.bounds.x, y: options.bounds.y } : {}),
    minWidth: docked ? 240 : 380,
    minHeight: docked ? 240 : 560,
    // Docked in Nebula Hub: exactly the Hub's area, no frame, no invisible resize border, off the
    // taskbar, and only the Hub moves or sizes it.
    ...(docked
      ? {
          frame: false,
          thickFrame: false,
          skipTaskbar: true,
          resizable: false,
          movable: false,
          minimizable: false,
          maximizable: false,
          fullscreenable: false,
        }
      : {
          // No native title bar: the window is drawn in the app's theme, Windows only draws
          // the three controls on top (Nebula Hub does the same).
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: titleBarOverlay(),
        }),
    backgroundColor: chrome.page,
    // Painted only once the renderer is ready, avoiding a white flash.
    show: false,
    autoHideMenuBar: true,
    title: 'Nebula Clock',
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      // The preload only uses contextBridge and ipcRenderer (the version comes over IPC).
      sandbox: true,
      spellcheck: false,
      // This window owns the timer. Chromium throttles timers in hidden
      // windows, and this one is hidden whenever the app is in the tray or
      // the mini window is up - which would delay every phase-change
      // notification by up to a minute.
      backgroundThrottling: false,
    },
  });

  const created = mainWindow;
  created.once('ready-to-show', () => (docked ? created.showInactive() : created.show()));

  // Closing the window keeps the timer running in the tray unless the user
  // actually asked to quit or turned the behaviour off.
  created.on('close', (event) => {
    if (quitting || !minimizeToTray) return;
    event.preventDefault();
    created.hide();
  });

  created.on('closed', () => {
    if (mainWindow === created) mainWindow = null;
  });

  harden(created);

  await load(created, false);
  return created;
}

/**
 * The Nebula Hub mode. Electron cannot remove the frame of an open window, so the main window is
 * recreated (the new one first, then the old one is destroyed: the renderer reloads its own state
 * from storage, the timer being timestamp-based). Any `released`, loss of the Hub or "Detach"
 * brings the normal window back where it was.
 */
const dock: { docked: boolean; normalBounds: Bounds | null; busy: Promise<void> } = {
  docked: false,
  normalBounds: null,
  busy: Promise.resolve(),
};

type DockPayload =
  { state: 'released' } | { state: 'docked'; visible: boolean; raise: boolean; bounds: Bounds };

function isDockPayload(value: unknown): value is DockPayload {
  const record = value as Record<string, unknown> | null;
  if (!record || typeof record !== 'object') return false;
  if (record.state === 'released') return true;
  const bounds = record.bounds as Record<string, unknown> | undefined;
  return (
    record.state === 'docked' &&
    typeof record.visible === 'boolean' &&
    typeof record.raise === 'boolean' &&
    Boolean(bounds) &&
    ['x', 'y', 'width', 'height'].every((key) => Number.isInteger(bounds?.[key]))
  );
}

export function isDocked(): boolean {
  return dock.docked;
}

async function replaceMainWindow(options: { docked: boolean; bounds?: Bounds }): Promise<void> {
  const previous = mainWindow;
  mainWindow = null;
  windowMode = options.docked ? 'docked' : 'restored';
  await createMainWindow(options);
  if (previous && !previous.isDestroyed()) previous.destroy();
}

export function applyDock(payload: unknown): Promise<void> {
  if (!isDockPayload(payload)) return dock.busy;
  dock.busy = dock.busy
    .then(async () => {
      if (payload.state === 'released') {
        await undock();
        return;
      }
      if (!dock.docked) {
        dock.normalBounds = mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null;
        dock.docked = true;
        closeMiniWindow();
        await replaceMainWindow({ docked: true, bounds: payload.bounds });
      }
      const window = mainWindow;
      if (!window || window.isDestroyed()) return;
      if (!payload.visible) {
        window.hide();
        return;
      }
      window.setBounds(payload.bounds);
      if (!window.isVisible()) window.showInactive();
      if (payload.raise) window.moveTop();
    })
    .catch(() => undefined);
  return dock.busy;
}

export async function undock(): Promise<void> {
  if (!dock.docked) return;
  dock.docked = false;
  await replaceMainWindow({ docked: false, bounds: dock.normalBounds ?? undefined });
  focusMainWindow();
}

export async function openMiniWindow(alwaysOnTop: boolean): Promise<BrowserWindow> {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show();
    miniWindow.focus();
    return miniWindow;
  }

  miniWindow = new BrowserWindow({
    width: 260,
    height: 116,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    // Frameless: the renderer marks its own drag region with `-webkit-app-region`.
    frame: false,
    alwaysOnTop,
    backgroundColor: chrome.page,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      // Like the main window: the preload only needs contextBridge and ipcRenderer.
      sandbox: true,
      spellcheck: false,
    },
  });
  harden(miniWindow);

  // Float above full-screen apps too, which the plain flag does not cover.
  if (alwaysOnTop) miniWindow.setAlwaysOnTop(true, 'floating');
  miniWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  miniWindow.once('ready-to-show', () => miniWindow?.show());
  miniWindow.on('closed', () => {
    miniWindow = null;
  });

  await load(miniWindow, true);
  mainWindow?.hide();
  return miniWindow;
}

export function closeMiniWindow(): void {
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.close();
  miniWindow = null;
  const main = mainWindow;
  if (main && !main.isDestroyed()) {
    main.show();
    main.focus();
  }
}

export function setMiniAlwaysOnTop(enabled: boolean): void {
  if (!miniWindow || miniWindow.isDestroyed()) return;
  miniWindow.setAlwaysOnTop(enabled, enabled ? 'floating' : 'normal');
}

/** Bring the app forward, restoring and un-hiding as needed. */
export function focusMainWindow(): void {
  const window = mainWindow;
  if (!window || window.isDestroyed()) {
    void createMainWindow();
    return;
  }
  if (dock.docked) {
    // The Hub places the docked window; it only comes to the front.
    window.moveTop();
    return;
  }
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}
