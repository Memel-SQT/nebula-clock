import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AppShell } from './components/AppShell.js';
import { BreakReminder } from './components/BreakReminder.js';
import { FullscreenTimer } from './components/FullscreenTimer.js';
import { SplashScreen } from './components/SplashScreen.js';
import { useDesktopSync } from './hooks/useDesktopSync.js';
import { useDocumentTitle } from './hooks/useDocumentTitle.js';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useTheme } from './hooks/useTheme.js';
import { useTicker } from './hooks/useTicker.js';
import { changeLanguage } from './lib/i18n.js';
import { CalendarView } from './views/CalendarView.js';
import { TasksView } from './views/TasksView.js';
import { TimerView } from './views/TimerView.js';
import { useSettingsStore } from './store/settingsStore.js';
import { useTimerStore } from './store/timerStore.js';

// Recharts and jsPDF together are larger than the rest of the app; loading
// them only when their screen is opened keeps the timer's first paint fast.
const StatsView = lazy(() =>
  import('./views/StatsView.js').then((m) => ({ default: m.StatsView })),
);
const SettingsView = lazy(() =>
  import('./views/SettingsView.js').then((m) => ({ default: m.SettingsView })),
);

/** Short enough that moving between screens never feels like waiting. */
const ROUTE_TRANSITION = { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const };

export function App() {
  const [route, navigate] = useHashRoute();
  const [fullscreen, setFullscreen] = useState(false);

  const language = useSettingsStore((state) => state.settings.language);
  const fullscreenOnFocus = useSettingsStore((state) => state.settings.fullscreenOnFocus);
  const reduceMotion = useSettingsStore((state) => state.settings.appearance.reduceMotion);
  const phase = useTimerStore((state) => state.machine.phase);
  const status = useTimerStore((state) => state.machine.status);

  // Someone who has asked for less motion should not be shown a launch
  // animation at all, so the splash starts out already dismissed for them.
  const [splashDone, setSplashDone] = useState(() => reduceMotion);
  const dismissSplash = useCallback(() => setSplashDone(true), []);

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

  return (
    // `user` follows the operating system; `always` lets the in-app
    // accessibility switch override it. Framer then reduces every animation
    // it drives, matching what tokens.css does to the CSS ones.
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <AppShell route={route} onNavigate={navigate}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={route}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={ROUTE_TRANSITION}
          >
            <Suspense fallback={<div className="p-8 text-sm text-text-secondary">…</div>}>
              {route === 'timer' ? <TimerView onEnterFullscreen={enterFullscreen} /> : null}
              {route === 'tasks' ? <TasksView /> : null}
              {route === 'stats' ? <StatsView /> : null}
              {route === 'calendar' ? <CalendarView /> : null}
              {route === 'settings' ? <SettingsView /> : null}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </AppShell>

      <BreakReminder />

      <AnimatePresence>
        {fullscreen ? <FullscreenTimer onExit={exitFullscreen} /> : null}
      </AnimatePresence>

      <AnimatePresence>
        {splashDone ? null : <SplashScreen onDone={dismissSplash} />}
      </AnimatePresence>
    </MotionConfig>
  );
}
