import { useEffect } from 'react';
import { filterByRange, getRange, isPomodoro } from '@nebula-clock/core';
import { getDesktop } from '../lib/platform.js';
import { useDataStore } from '../store/dataStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useTimerStore, useTimerView } from '../store/timerStore.js';

/**
 * Two-way sync with the Electron main process.
 *
 * Out: a snapshot of the timer, so the tray, the mini window and Do Not
 * Disturb all follow the one state machine that lives here.
 * In: commands from the tray menu, the global accelerators and the mini
 * window's buttons.
 *
 * Only the main window runs this hook - the mini window mounts `MiniApp`,
 * which mirrors instead of computing. Every call is a no-op in the browser
 * build, where `getDesktop()` is null.
 */
export function useDesktopSync(): void {
  const view = useTimerView();
  const sessions = useDataStore((state) => state.sessions);
  const desktopSettings = useSettingsStore((state) => state.settings.desktop);

  // Commands coming in from the tray, the global shortcuts and the mini window.
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;

    return desktop.onCommand((command) => {
      const timer = useTimerStore.getState();
      switch (command) {
        case 'toggle':
          timer.toggle();
          break;
        case 'start':
          timer.start();
          break;
        case 'pause':
          timer.pause();
          break;
        case 'skip':
          timer.skip();
          break;
        case 'reset':
          timer.reset();
          break;
        case 'mini-mode':
          // Handled entirely in the main process; nothing to do here.
          break;
      }
    });
  }, []);

  /**
   * Push the settings the main process cannot see for itself.
   *
   * They live in this renderer's localStorage, so without this the main
   * process would fall back to its own defaults on every launch and, for
   * example, re-enable global shortcuts the user had turned off.
   */
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;
    void desktop.setGlobalShortcuts(desktopSettings.globalShortcuts);
    void desktop.setMinimizeToTray(desktopSettings.minimizeToTray);
    void desktop.setMiniModeAlwaysOnTop(desktopSettings.miniModeAlwaysOnTop);
    void desktop.setLaunchAtLogin(desktopSettings.launchAtLogin);
  }, [
    desktopSettings.globalShortcuts,
    desktopSettings.minimizeToTray,
    desktopSettings.miniModeAlwaysOnTop,
    desktopSettings.launchAtLogin,
  ]);

  // Snapshot out. Keyed off `display` rather than the raw seconds so it fires
  // once per visible second instead of on every 500 ms tick.
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;

    const today = filterByRange(sessions, getRange('day')).filter(isPomodoro).length;
    desktop.publishTimer({
      phase: view.phase,
      status: view.status,
      remainingSeconds: view.remaining,
      display: view.display,
      completedToday: today,
      progress: view.progress,
      completedInCycle: view.completedInCycle,
      cycleTarget: view.cycleTarget,
    });
    // `view` is rebuilt every tick; the listed fields are what actually
    // changes what the tray and the mini window show.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.phase, view.status, view.display, view.completedInCycle, view.cycleTarget, sessions]);

  // Do Not Disturb follows the focus phase, when the user asked for it.
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop || !desktopSettings.doNotDisturb) return;
    const focusing = view.phase === 'focus' && view.status === 'running';
    void desktop.setDoNotDisturb(focusing);
    return () => void desktop.setDoNotDisturb(false);
  }, [desktopSettings.doNotDisturb, view.phase, view.status]);

  // The distraction blocker is only enforced during a running focus phase.
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;
    const blocker = desktopSettings.blocker;
    void desktop.applyBlocker({
      enabled: blocker.enabled,
      mode: blocker.mode,
      sites: blocker.sites,
      apps: blocker.apps,
      active: blocker.enabled && view.phase === 'focus' && view.status === 'running',
    });
  }, [desktopSettings.blocker, view.phase, view.status]);
}
