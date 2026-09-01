import { useEffect } from 'react';
import { formatDuration } from '@nebula-clock/core';
import { getRange, filterByRange, isPomodoro } from '@nebula-clock/core';
import { getDesktop } from '../lib/platform.js';
import { useDataStore } from '../store/dataStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { selectTimerView, useTimerStore } from '../store/timerStore.js';

/**
 * Two-way sync with the Electron main process.
 *
 * Out: a snapshot of the timer, so the tray title, the tray menu and the
 * mini window stay current, and so focus mode can drive Do Not Disturb.
 * In: commands from the tray menu and the global accelerators.
 *
 * Every call is a no-op in the browser build, where `getDesktop()` is null.
 */
export function useDesktopSync(): void {
  const view = useTimerStore(selectTimerView);
  const sessions = useDataStore((state) => state.sessions);
  const desktopSettings = useSettingsStore((state) => state.settings.desktop);

  // Commands coming in from the tray and the global shortcuts.
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
          void desktop.openMiniMode();
          break;
      }
    });
  }, []);

  // Snapshot out. Formatting happens here so the main process never has to
  // duplicate the countdown logic.
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;

    const today = filterByRange(sessions, getRange('day')).filter(isPomodoro).length;
    desktop.publishTimer({
      phase: view.phase,
      status: view.status,
      remainingSeconds: view.remaining,
      display: formatDuration(view.remaining),
      completedToday: today,
    });
  }, [view.phase, view.status, view.remaining, sessions]);

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

/**
 * The mini window is a pure mirror: it renders whatever the main window
 * publishes rather than running a second copy of the machine.
 */
export function useMiniWindowSnapshot(): ReturnType<typeof selectTimerView> | null {
  const view = useTimerStore(selectTimerView);
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop?.isMiniWindow) return;
    return desktop.onTimerSnapshot((snapshot) => {
      // Fold the published snapshot into the local store so the shared
      // components can render it unchanged.
      useTimerStore.setState((state) => ({
        machine: { ...state.machine, phase: snapshot.phase, status: snapshot.status },
        now: Date.now(),
      }));
    });
  }, []);
  return view;
}
