/**
 * Window management: the main window and the compact always-on-top mini
 * window. Both load the same renderer bundle; the mini window is told which
 * it is through a `?mini=1` query parameter that the preload script reads.
 */
import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(DEV_SERVER_URL);

/** Nebula `--bg-base`, so the window never flashes white before first paint. */
const BACKGROUND = '#0A0A0F';

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

/** Renderer entry point for a window; `mini` picks the compact layout. */
function rendererUrl(mini: boolean): { url?: string; file?: string; query: string } {
  const query = mini ? 'mini=1' : '';
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

export async function createMainWindow(): Promise<BrowserWindow> {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: BACKGROUND,
    // Painted only once the renderer is ready, avoiding a white flash.
    show: false,
    autoHideMenuBar: true,
    title: 'Nebula Clock',
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Closing the window keeps the timer running in the tray unless the user
  // actually asked to quit or turned the behaviour off.
  mainWindow.on('close', (event) => {
    if (quitting || !minimizeToTray) return;
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // External links belong in the user's browser, never in an app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  await load(mainWindow, false);
  return mainWindow;
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
    backgroundColor: BACKGROUND,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

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
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}
