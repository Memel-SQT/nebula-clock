/**
 * Electron main process.
 *
 * Owns the windows, the tray, the global accelerators, the updater and the
 * distraction blocker, and relays commands to whichever renderer is live.
 * All business logic stays in the renderer: this process only knows how to
 * display a countdown someone else computed.
 */
import { BrowserWindow, Notification, app, ipcMain, powerSaveBlocker, shell } from 'electron';
import { join } from 'node:path';
import { isNewsArticleLink, type FocusTodayPublication, type PackView } from '@nebula-clock/core';
import { NebulaIntegration } from './nebula.js';
import { readPackViews } from './packs.js';
import { CHANNELS } from './ipc.js';
import type {
  DesktopCommand,
  DesktopTimerSnapshot,
  NotificationPayload,
  UpdateEvent,
} from './ipc.js';
import { applyBlocker, cleanupStaleBlock, teardownBlocker } from './blocker.js';
import { applyGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts.js';
import {
  createTray,
  destroyTray,
  fill,
  setTrayLabels,
  shellLabels,
  updateBadge,
  updateTray,
} from './tray.js';
import {
  asBlockerConfig,
  asCommand,
  asNotification,
  asShellLabels,
  asSnapshot,
  asWindowChrome,
  isBoolean,
  isSafeExternalUrl,
} from './validate.js';
import {
  checkForUpdates,
  disposeUpdater,
  initUpdater,
  quitAndInstall,
  setUpdatesDeferred,
} from './updater.js';
import {
  allWindows,
  applyDock,
  applyWindowTheme,
  closeMiniWindow,
  createMainWindow,
  focusMainWindow,
  getMainWindow,
  getMiniWindow,
  openMiniWindow,
  setMiniAlwaysOnTop,
  setMinimizeToTray,
  setQuitting,
  undock,
} from './windows.js';

/** Nebula Hub, through Nebula Link: optional, and silent when the Hub is absent. */
const nebula = new NebulaIntegration({
  appVersion: app.getVersion(),
  // Packaged: copied to resources\ by electron-builder, where Nebula Hub reads it too.
  manifestPath: app.isPackaged
    ? join(process.resourcesPath, 'nebula.app.json')
    : join(__dirname, '../nebula.app.json'),
  settingsPath: join(app.getPath('userData'), 'nebula-hub.json'),
  send: (channel, payload) => getMainWindow()?.webContents.send(channel, payload),
  focus: () => focusMainWindow(),
  isVisible: () => {
    const win = getMainWindow();
    return Boolean(win && win.isVisible() && !win.isMinimized());
  },
  startTimer: () => getMainWindow()?.webContents.send(CHANNELS.command, 'start'),
  onDock: (payload) => void applyDock(payload),
  onUpdatesDeferred: (deferred) => void setUpdatesDeferred(deferred),
});

function isFocusPublication(value: unknown): value is FocusTodayPublication {
  const record = value as Record<string, unknown> | null;
  return (
    Boolean(record) &&
    typeof record === 'object' &&
    typeof record?.date === 'string' &&
    ['done', 'goal', 'streak'].every((key) => Number.isInteger(record?.[key])) &&
    ['title', 'value', 'caption'].every((key) => typeof record?.[key] === 'string')
  );
}

/**
 * Do Not Disturb.
 *
 * Electron exposes no cross-platform API for the system-wide setting, and
 * flipping it would mean writing to OS preferences behind the user's back.
 * What this actually does, and what the UI promises, is: suppress this app's
 * own notifications and keep the display awake for the length of the focus
 * phase. See docs/manual-testing-electron.md.
 */
let doNotDisturb = false;
let powerBlockerId: number | null = null;
let miniAlwaysOnTop = true;

/**
 * The most recent state the main window published.
 *
 * A mirror that opens while the timer is idle would otherwise wait forever
 * for a change that never comes, so it can ask for this on mount.
 */
let lastSnapshot: DesktopTimerSnapshot | null = null;

function setDoNotDisturb(enabled: boolean): void {
  doNotDisturb = enabled;

  if (enabled && powerBlockerId === null) {
    powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  } else if (!enabled && powerBlockerId !== null) {
    if (powerSaveBlocker.isStarted(powerBlockerId)) powerSaveBlocker.stop(powerBlockerId);
    powerBlockerId = null;
  }
}

/**
 * Route a command to the main window, which owns the only state machine.
 *
 * It deliberately does *not* reach the mini window: that one is a mirror, and
 * delivering the same command to both would complete phases twice and record
 * every session twice over.
 */
function broadcastCommand(command: DesktopCommand): void {
  if (command === 'mini-mode') {
    void (getMiniWindow() ? closeMiniWindow() : openMiniWindow(miniAlwaysOnTop));
    return;
  }
  getMainWindow()?.webContents.send(CHANNELS.command, command);
}

function broadcastUpdate(event: UpdateEvent): void {
  for (const window of allWindows()) window.webContents.send(CHANNELS.updateEvent, event);
}

function showNotification(payload: NotificationPayload): void {
  if (doNotDisturb || !Notification.isSupported()) return;
  new Notification({
    title: payload.title,
    body: payload.body,
    silent: payload.silent ?? false,
  }).show();
}

/**
 * Appearance packs of installed Nebula apps (Nebula Hub NEBULA_LINK.md § 18): read at startup and
 * whenever a window comes back, sent to the windows when they change.
 */
let packs: PackView[] = [];

function refreshPacks(): void {
  const next = readPackViews(process.env);
  if (JSON.stringify(next) === JSON.stringify(packs)) return;
  packs = next;
  for (const window of allWindows()) window.webContents.send(CHANNELS.packsChanged, packs);
}

function registerIpc(): void {
  ipcMain.handle(CHANNELS.packs, () => packs);

  // Every payload from the renderer is validated before use (validate.ts).
  ipcMain.handle(CHANNELS.notify, (_event, value: unknown) => {
    const payload = asNotification(value);
    if (!payload) return;
    showNotification(payload);
    nebula.notify(payload.title, payload.body);
  });

  ipcMain.handle(CHANNELS.setWindowTheme, (_event, value: unknown) => {
    const chrome = asWindowChrome(value);
    if (chrome) applyWindowTheme(chrome);
  });

  ipcMain.on(CHANNELS.setShellLabels, (_event, value: unknown) => {
    const labels = asShellLabels(value);
    if (labels) setTrayLabels(labels);
  });

  ipcMain.on(CHANNELS.appInfo, (event) => {
    event.returnValue = { version: app.getVersion(), platform: process.platform };
  });

  ipcMain.on(CHANNELS.publishFocus, (_event, focus: unknown) => {
    if (isFocusPublication(focus)) nebula.publishFocus(focus);
  });

  ipcMain.handle(CHANNELS.hubState, () => nebula.state());
  ipcMain.handle(CHANNELS.setUpdatesByHub, (_event, enabled: unknown) =>
    nebula.setUpdatesByHub(enabled === true),
  );
  ipcMain.handle(CHANNELS.openHub, async () => {
    // nebula:// is registered by an installed Nebula Hub; without it, its download page.
    if (app.getApplicationNameForProtocol('nebula://')) {
      await shell.openExternal('nebula://hub/');
      return 'opened';
    }
    const page = 'https://github.com/Memel-SQT/Nebula-Hub/releases';
    if (isSafeExternalUrl(page)) await shell.openExternal(page);
    return 'not-installed';
  });
  // Nebula News during breaks: the main window only (never the mini window).
  ipcMain.handle(CHANNELS.breakReading, (event) =>
    BrowserWindow.fromWebContents(event.sender) === getMainWindow()
      ? nebula.breakReadingNow()
      : null,
  );
  ipcMain.handle(CHANNELS.openBreakReading, async () => {
    // The link validated with the card; nebula:// is handled by an installed Nebula Hub.
    const link = nebula.breakReadingLink();
    if (!link || !app.getApplicationNameForProtocol('nebula://')) return false;
    await shell.openExternal(link);
    return true;
  });
  // The "Nebula News" tab: the main window only, like the break card.
  ipcMain.handle(CHANNELS.newsArticles, (event) =>
    BrowserWindow.fromWebContents(event.sender) === getMainWindow()
      ? nebula.newsTabNow()
      : { state: 'unavailable' },
  );
  ipcMain.handle(CHANNELS.openNewsArticle, async (_event, link: unknown) => {
    // One article the tab shows (validated with it); nebula:// is handled by an installed Nebula Hub.
    if (!isNewsArticleLink(link) || !nebula.isShownArticle(link)) return false;
    if (!app.getApplicationNameForProtocol('nebula://')) return false;
    await shell.openExternal(link);
    return true;
  });
  ipcMain.handle(CHANNELS.setBreakReading, (_event, enabled: unknown) =>
    nebula.setBreakReading(enabled === true),
  );
  ipcMain.handle(CHANNELS.detachFromHub, async () => {
    // Leave the Hub mode from the app: stop listening (the Hub forgets the app), normal window,
    // then listen again so the mode can be chosen later from the Hub.
    nebula.pauseDock();
    await undock();
    setTimeout(() => nebula.resumeDock(), 1500);
  });

  // The main window is the source of truth; the mini window mirrors it.
  ipcMain.on(CHANNELS.publishTimer, (event, value: unknown) => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (sender && sender === getMiniWindow()) return;
    const snapshot = asSnapshot(value);
    if (!snapshot) return;

    lastSnapshot = snapshot;
    nebula.publishPhase({
      phase: snapshot.phase,
      status: snapshot.status,
      remainingSeconds: snapshot.remainingSeconds,
    });
    updateTray(snapshot);
    updateBadge(snapshot.completedToday);
    getMiniWindow()?.webContents.send(CHANNELS.timerSnapshot, snapshot);
  });

  // A button in the mini window: forward it to the window that owns the timer.
  ipcMain.on(CHANNELS.requestCommand, (_event, value: unknown) => {
    const command = asCommand(value);
    if (command) broadcastCommand(command);
  });

  // A mirror has just mounted and needs the current state, not the next change.
  ipcMain.on(CHANNELS.requestSnapshot, (event) => {
    if (lastSnapshot) event.sender.send(CHANNELS.timerSnapshot, lastSnapshot);
  });

  ipcMain.handle(CHANNELS.setLaunchAtLogin, (_event, enabled: unknown) => {
    if (!isBoolean(enabled)) return app.getLoginItemSettings().openAtLogin;
    // (openAsHidden, macOS only, is gone from Electron 44.)
    app.setLoginItemSettings({ openAtLogin: enabled });
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle(CHANNELS.setGlobalShortcuts, (_event, enabled: unknown) =>
    isBoolean(enabled) ? applyGlobalShortcuts(enabled, broadcastCommand) : false,
  );

  ipcMain.handle(CHANNELS.setDoNotDisturb, (_event, enabled: unknown) => {
    if (isBoolean(enabled)) setDoNotDisturb(enabled);
  });

  ipcMain.handle(CHANNELS.setMiniAlwaysOnTop, (_event, enabled: unknown) => {
    if (!isBoolean(enabled)) return;
    miniAlwaysOnTop = enabled;
    setMiniAlwaysOnTop(enabled);
  });

  ipcMain.handle(CHANNELS.setMinimizeToTray, (_event, enabled: unknown) => {
    if (isBoolean(enabled)) setMinimizeToTray(enabled);
  });

  ipcMain.handle(CHANNELS.applyBlocker, (_event, value: unknown) => {
    const config = asBlockerConfig(value);
    if (!config) return { ok: false, reason: 'invalid' };
    return applyBlocker(config, {
      onBlockedApp: (name) =>
        showNotification({
          title: shellLabels().blockedTitle,
          body: fill(shellLabels().blockedBody, { name }),
        }),
    });
  });

  ipcMain.handle(CHANNELS.openMiniMode, () =>
    openMiniWindow(miniAlwaysOnTop).then(() => undefined),
  );
  ipcMain.handle(CHANNELS.closeMiniMode, () => {
    closeMiniWindow();
  });

  ipcMain.handle(CHANNELS.setFullscreen, (_event, enabled: unknown) => {
    if (isBoolean(enabled)) getMainWindow()?.setFullScreen(enabled);
  });

  ipcMain.handle(CHANNELS.checkForUpdates, () => checkForUpdates(broadcastUpdate));

  ipcMain.on(CHANNELS.quitAndInstall, () => {
    setQuitting(true);
    void quitAndInstall();
  });
}

function quit(): void {
  setQuitting(true);
  app.quit();
}

// A second launch should surface the running instance, not start a rival one
// that would fight over the tray icon and the global shortcuts.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (!nebula.routeArgv(argv)) focusMainWindow();
  });

  void app.whenReady().then(async () => {
    app.setAppUserModelId('clock.nebula.desktop');

    registerIpc();
    cleanupStaleBlock();
    refreshPacks();
    app.on('browser-window-focus', () => refreshPacks());
    await createMainWindow();

    createTray({
      onCommand: broadcastCommand,
      onShowWindow: focusMainWindow,
      onQuit: quit,
    });

    applyGlobalShortcuts(true, broadcastCommand);
    await nebula.start().catch(() => undefined);
    nebula.routeArgv(process.argv);
    await initUpdater(broadcastUpdate);

    app.on('activate', () => {
      // macOS keeps the process alive with no windows; recreate on dock click.
      if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
      else focusMainWindow();
    });
  });

  // A failure while wiring the shell up must be visible in the logs rather
  // than surfacing as an unhandled rejection warning.
  process.on('unhandledRejection', (reason) => {
    console.error('[main] unhandled rejection:', reason);
  });

  // The tray keeps the timer running, so closing every window is not a quit
  // (and on macOS it never is).
  app.on('window-all-closed', () => {
    // Intentionally empty: quitting happens through the tray menu.
  });

  app.on('before-quit', () => {
    setQuitting(true);
    nebula.dispose();
    unregisterGlobalShortcuts();
    disposeUpdater();
    destroyTray();
    // Never leave the user's hosts file edited after the app is gone.
    teardownBlocker();
    if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
      powerSaveBlocker.stop(powerBlockerId);
    }
  });
}
