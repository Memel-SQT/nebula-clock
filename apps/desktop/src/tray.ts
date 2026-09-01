/**
 * System tray: a live countdown in the tooltip (and the title bar on macOS)
 * plus a context menu that drives the timer without opening the window.
 */
import { Menu, Tray, app, nativeImage } from 'electron';
import { join } from 'node:path';
import type { DesktopCommand, DesktopTimerSnapshot } from './ipc.js';

let tray: Tray | null = null;
let snapshot: DesktopTimerSnapshot | null = null;
let sendCommand: (command: DesktopCommand) => void = () => undefined;
let onShow: () => void = () => undefined;
let onQuit: () => void = () => undefined;

/** Bundled next to the compiled main process by electron-builder. */
function trayIcon(): Electron.NativeImage {
  const icon = nativeImage.createFromPath(join(__dirname, '../resources/tray.png'));
  // macOS wants a small template image so the icon follows the menu bar theme.
  const resized = icon.resize({ width: 18, height: 18 });
  if (process.platform === 'darwin') resized.setTemplateImage(true);
  return resized;
}

const PHASE_LABELS: Record<DesktopTimerSnapshot['phase'], string> = {
  focus: 'Focus',
  shortBreak: 'Break',
  longBreak: 'Long break',
};

function buildMenu(): Electron.Menu {
  const running = snapshot?.status === 'running';
  const idle = !snapshot || snapshot.status === 'idle';

  return Menu.buildFromTemplate([
    {
      label: snapshot ? `${PHASE_LABELS[snapshot.phase]} — ${snapshot.display}` : 'Nebula Clock',
      enabled: false,
    },
    {
      label: snapshot ? `${snapshot.completedToday} pomodoros today` : '',
      enabled: false,
      visible: Boolean(snapshot),
    },
    { type: 'separator' },
    {
      label: running ? 'Pause' : idle ? 'Start' : 'Resume',
      click: () => sendCommand('toggle'),
    },
    { label: 'Skip phase', click: () => sendCommand('skip') },
    { label: 'Reset phase', click: () => sendCommand('reset') },
    { type: 'separator' },
    { label: 'Mini mode', click: () => sendCommand('mini-mode') },
    { label: 'Open Nebula Clock', click: () => onShow() },
    { type: 'separator' },
    { label: 'Quit', click: () => onQuit() },
  ]);
}

export interface TrayHandlers {
  onCommand: (command: DesktopCommand) => void;
  onShowWindow: () => void;
  onQuit: () => void;
}

export function createTray(handlers: TrayHandlers): Tray {
  sendCommand = handlers.onCommand;
  onShow = handlers.onShowWindow;
  onQuit = handlers.onQuit;

  tray = new Tray(trayIcon());
  tray.setToolTip('Nebula Clock');
  tray.setContextMenu(buildMenu());
  // Left-clicking the tray icon is expected to reopen the window on Windows
  // and Linux; on macOS it opens the menu, which Electron does for us.
  tray.on('click', () => handlers.onShowWindow());
  return tray;
}

/** Refresh the tooltip, macOS title and menu from the latest snapshot. */
export function updateTray(next: DesktopTimerSnapshot): void {
  snapshot = next;
  if (!tray || tray.isDestroyed()) return;

  const label = `${PHASE_LABELS[next.phase]} — ${next.display}`;
  tray.setToolTip(`Nebula Clock · ${label}`);
  // A running countdown in the menu bar is useful; a static one is clutter.
  if (process.platform === 'darwin') {
    tray.setTitle(next.status === 'running' ? ` ${next.display}` : '');
  }
  tray.setContextMenu(buildMenu());
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}

/** Badge count on the dock/taskbar: pomodoros completed today. */
export function updateBadge(count: number): void {
  if (process.platform === 'darwin' || process.platform === 'linux') {
    app.setBadgeCount(count);
  }
}
