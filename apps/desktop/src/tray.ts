/**
 * System tray: a live countdown in the tooltip (and the title bar on macOS)
 * plus a context menu that drives the timer without opening the window.
 */
import { Menu, Tray, app, nativeImage } from 'electron';
import { join } from 'node:path';
import type { DesktopCommand, DesktopTimerSnapshot, ShellLabels } from './ipc.js';

let tray: Tray | null = null;
let snapshot: DesktopTimerSnapshot | null = null;
let sendCommand: (command: DesktopCommand) => void = () => undefined;
let onShow: () => void = () => undefined;
let onQuit: () => void = () => undefined;
let lastMenuKey = '';

/** Bundled next to the compiled main process by electron-builder. */
function trayIcon(): Electron.NativeImage {
  const icon = nativeImage.createFromPath(join(__dirname, '../resources/tray.png'));
  // macOS wants a small template image so the icon follows the menu bar theme.
  const resized = icon.resize({ width: 18, height: 18 });
  if (process.platform === 'darwin') resized.setTemplateImage(true);
  return resized;
}

/**
 * English until the renderer sends its translated texts (`setShellLabels`), which it does as
 * soon as it starts and again on every language change.
 */
let labels: ShellLabels = {
  phase: { focus: 'Focus', shortBreak: 'Break', longBreak: 'Long break' },
  start: 'Start',
  pause: 'Pause',
  resume: 'Resume',
  skip: 'Skip phase',
  reset: 'Reset phase',
  miniMode: 'Mini mode',
  open: 'Open Nebula Clock',
  quit: 'Quit',
  todayOne: '{{count}} pomodoro today',
  todayOther: '{{count}} pomodoros today',
  blockedTitle: 'Blocked during focus',
  blockedBody: '{{name}} is on your block list.',
};

export function setTrayLabels(next: ShellLabels): void {
  labels = next;
  lastMenuKey = '';
  if (snapshot) updateTray(snapshot);
  else if (tray && !tray.isDestroyed()) tray.setContextMenu(buildMenu());
}

export function shellLabels(): ShellLabels {
  return labels;
}

export const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => String(values[key] ?? match));

function buildMenu(): Electron.Menu {
  const running = snapshot?.status === 'running';
  const idle = !snapshot || snapshot.status === 'idle';

  return Menu.buildFromTemplate([
    {
      label: snapshot ? `${labels.phase[snapshot.phase]} — ${snapshot.display}` : 'Nebula Clock',
      enabled: false,
    },
    {
      label: snapshot
        ? fill(snapshot.completedToday === 1 ? labels.todayOne : labels.todayOther, {
            count: snapshot.completedToday,
          })
        : '',
      enabled: false,
      visible: Boolean(snapshot),
    },
    { type: 'separator' },
    {
      label: running ? labels.pause : idle ? labels.start : labels.resume,
      click: () => sendCommand('toggle'),
    },
    { label: labels.skip, click: () => sendCommand('skip') },
    { label: labels.reset, click: () => sendCommand('reset') },
    { type: 'separator' },
    { label: labels.miniMode, click: () => sendCommand('mini-mode') },
    { label: labels.open, click: () => onShow() },
    { type: 'separator' },
    { label: labels.quit, click: () => onQuit() },
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

/** Identifies a menu that would render identically, to avoid rebuilding it. */
function menuKey(s: DesktopTimerSnapshot): string {
  return `${s.phase}|${s.status}|${s.display}|${s.completedToday}`;
}

/**
 * Refresh the tooltip, the macOS title and, when it would actually differ,
 * the context menu.
 *
 * Snapshots arrive once a second. Rebuilding the menu each time is wasteful
 * and, on Linux, makes an open tray menu flicker or close under the pointer,
 * so it is only replaced when one of the values it shows has changed.
 */
export function updateTray(next: DesktopTimerSnapshot): void {
  snapshot = next;
  if (!tray || tray.isDestroyed()) return;

  const label = `${labels.phase[next.phase]} — ${next.display}`;
  tray.setToolTip(`Nebula Clock · ${label}`);
  // A running countdown in the menu bar is useful; a static one is clutter.
  if (process.platform === 'darwin') {
    tray.setTitle(next.status === 'running' ? ` ${next.display}` : '');
  }

  const key = menuKey(next);
  if (key === lastMenuKey) return;
  lastMenuKey = key;
  tray.setContextMenu(buildMenu());
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
  lastMenuKey = '';
}

/** Badge count on the dock/taskbar: pomodoros completed today. */
export function updateBadge(count: number): void {
  if (process.platform === 'darwin' || process.platform === 'linux') {
    app.setBadgeCount(count);
  }
}
