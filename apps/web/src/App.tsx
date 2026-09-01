import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from './components/AppShell.js';
import { BreakReminder } from './components/BreakReminder.js';
import { FullscreenTimer } from './components/FullscreenTimer.js';
import { MiniTimer } from './components/MiniTimer.js';
import { useDesktopSync } from './hooks/useDesktopSync.js';
import { useDocumentTitle } from './hooks/useDocumentTitle.js';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useTheme } from './hooks/useTheme.js';
import { useTicker } from './hooks/useTicker.js';
import { changeLanguage } from './lib/i18n.js';
import { isMiniWindow } from './lib/platform.js';
import { CalendarView } from './views/CalendarView.js';
import { SettingsView } from './views/SettingsView.js';
import { StatsView } from './views/StatsView.js';
import { TasksView } from './views/TasksView.js';
import { TimerView } from './views/TimerView.js';
import { useSettingsStore } from './store/settingsStore.js';
import { useTimerStore } from './store/timerStore.js';

export function App() {
  const [route, navigate] = useHashRoute();
  const [fullscreen, setFullscreen] = useState(false);

  const language = useSettingsStore((state) => state.settings.language);
  const fullscreenOnFocus = useSettingsStore((state) => state.settings.fullscreenOnFocus);
  const phase = useTimerStore((state) => state.machine.phase);
  const status = useTimerStore((state) => state.machine.status);

  useTheme();
  useTicker();
  useDocumentTitle();
  useDesktopSync();

  const enterFullscreen = useCallback(() => setFullscreen(true), []);
  const exitFullscreen = useCallback(() => setFullscreen(false), []);

  useKeyboardShortcuts({
    onToggleFullscreen: () => setFullscreen((current) => !current),
    onOpenSettings: () => navigate('settings'),
  });

  useEffect(() => changeLanguage(language), [language]);

  // Optional immersive mode: engage when a focus phase starts, drop out of it
  // as soon as the break begins.
  useEffect(() => {
    if (!fullscreenOnFocus) return;
    if (phase === 'focus' && status === 'running') setFullscreen(true);
    else if (phase !== 'focus') setFullscreen(false);
  }, [fullscreenOnFocus, phase, status]);

  // The Electron mini window shares this bundle but none of the chrome.
  if (isMiniWindow()) return <MiniTimer />;

  return (
    <>
      <AppShell route={route} onNavigate={navigate}>
        {route === 'timer' ? <TimerView onEnterFullscreen={enterFullscreen} /> : null}
        {route === 'tasks' ? <TasksView /> : null}
        {route === 'stats' ? <StatsView /> : null}
        {route === 'calendar' ? <CalendarView /> : null}
        {route === 'settings' ? <SettingsView /> : null}
      </AppShell>

      <BreakReminder />

      <AnimatePresence>
        {fullscreen ? <FullscreenTimer onExit={exitFullscreen} /> : null}
      </AnimatePresence>
    </>
  );
}
