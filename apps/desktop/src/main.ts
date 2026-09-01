/**
 * Electron main process.
 *
 * Owns the windows, the tray, the global accelerators, the updater and the
 * distraction blocker, and relays commands to whichever renderer is live.
 * All business logic stays in the renderer: this process only knows how to
 * display a countdown someone else computed.
 */
import { BrowserWindow, Notification, app, ipcMain, powerSaveBlocker } from 'electron';
import { CHANNELS } from './ipc.js';
import type {
  BlockerConfig,
  DesktopCommand,
  DesktopTimerSnapshot,
  NotificationPayload,
  UpdateEvent,
} from './ipc.js';
import { applyBlocker, teardownBlocker } from './blocker.js';
import { applyGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts.js';
import { createTray, destroyTray, updateBadge, updateTray } from './tray.js';
import { checkForUpdates, disposeUpdater, initUpdater, quitAndInstall } from './updater.js';
import {
  allWindows,
  closeMiniWindow,
  createMainWindow,
  focusMainWindow,
  getMainWindow,
  getMiniWindow,
  openMiniWindow,
  setMiniAlwaysOnTop,
  setMinimizeToTray,
  setQuitting,
} from './windows.js';

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

function setDoNotDisturb(enabled: boolean): void {
  doNotDisturb = enabled;

  if (enabled && powerBlockerId === null) {
    powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  } else if (!enabled && powerBlockerId !== null) {
    if (powerSaveBlocker.isStarted(powerBlockerId)) powerSaveBlocker.stop(powerBlockerId);
    powerBlockerId = null;
  }
}

/** Send a command to every live renderer (main window and mini window). */
function broadcastCommand(command: DesktopCommand): void {
  if (command === 'mini-mode') {
    void (getMiniWindow() ? closeMiniWindow() : openMiniWindow(miniAlwaysOnTop));
    return;
  }
  for (const window of allWindows()) window.webContents.send(CHANNELS.command, command);
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

function registerIpc(): void {
  ipcMain.handle(CHANNELS.notify, (_event, payload: NotificationPayload) => {
    showNotification(payload);
  });

  // The main window is the source of truth; the mini window mirrors it.
  ipcMain.on(CHANNELS.publishTimer, (event, snapshot: DesktopTimerSnapshot) => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (sender && sender === getMiniWindow()) return;

    updateTray(snapshot);
    updateBadge(snapshot.completedToday);
    getMiniWindow()?.webContents.send(CHANNELS.timerSnapshot, snapshot);
  });

  ipcMain.handle(CHANNELS.setLaunchAtLogin, (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle(CHANNELS.setGlobalShortcuts, (_event, enabled: boolean) =>
    applyGlobalShortcuts(enabled, broadcastCommand),
  );

  ipcMain.handle(CHANNELS.setDoNotDisturb, (_event, enabled: boolean) => {
    setDoNotDisturb(enabled);
  });

  ipcMain.handle(CHANNELS.setMiniAlwaysOnTop, (_event, enabled: boolean) => {
    miniAlwaysOnTop = enabled;
    setMiniAlwaysOnTop(enabled);
  });

  ipcMain.handle(CHANNELS.setMinimizeToTray, (_event, enabled: boolean) => {
    setMinimizeToTray(enabled);
  });

  ipcMain.handle(CHANNELS.applyBlocker, (_event, config: BlockerConfig) =>
    applyBlocker(config, {
      onBlockedApp: (name) =>
        showNotification({
          title: 'Blocked during focus',
          body: `${name} is on your block list.`,
        }),
    }),
  );

  ipcMain.handle(CHANNELS.openMiniMode, () =>
    openMiniWindow(miniAlwaysOnTop).then(() => undefined),
  );
  ipcMain.handle(CHANNELS.closeMiniMode, () => {
    closeMiniWindow();
  });

  ipcMain.handle(CHANNELS.setFullscreen, (_event, enabled: boolean) => {
    getMainWindow()?.setFullScreen(enabled);
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
  app.on('second-instance', () => focusMainWindow());

  void app.whenReady().then(async () => {
    // Read back by the preload script to show the version in Settings.
    process.env.NEBULA_APP_VERSION = app.getVersion();
    app.setAppUserModelId('clock.nebula.desktop');

    registerIpc();
    await createMainWindow();

    createTray({
      onCommand: broadcastCommand,
      onShowWindow: focusMainWindow,
      onQuit: quit,
    });

    applyGlobalShortcuts(true, broadcastCommand);
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
