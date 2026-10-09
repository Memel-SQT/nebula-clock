import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { BackgroundFx, useInterfaceEffects } from '@nebula-clock/ui';
import { AppShell } from './components/AppShell.js';
import { BreakReminder } from './components/BreakReminder.js';
import { FullscreenTimer } from './components/FullscreenTimer.js';
import { SplashScreen } from './components/SplashScreen.js';
import { useAmbientSync } from './hooks/useAmbientSync.js';
import { useAppearance } from './hooks/useAppearance.js';
import { useDesktopSync } from './hooks/useDesktopSync.js';
import { useNebulaHubSync } from './hooks/useNebulaHub.js';
import { useShellLabels } from './hooks/useShellLabels.js';
import { getDesktop } from './lib/platform.js';
import { useDocumentTitle } from './hooks/useDocumentTitle.js';
import { useHashRoute } from './hooks/useHashRoute.js';
import { NewsView } from './views/NewsView.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
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

/** Glass themes light up every Nebula surface under the pointer. */
const GLASS_SURFACES = '.nebula-surface';

export function App() {
  const [route, navigate] = useHashRoute();
  const [fullscreen, setFullscreen] = useState(false);

  const language = useSettingsStore((state) => state.settings.language);
  const fullscreenOnFocus = useSettingsStore((state) => state.settings.fullscreenOnFocus);
  const phase = useTimerStore((state) => state.machine.phase);
  const status = useTimerStore((state) => state.machine.status);
  const { appearance, resolved } = useAppearance();

  // Animations off means no launch sequence at all; a window recreated for (or after) the
  // Nebula Hub mode is not a launch either.
  const [splashDone, setSplashDone] = useState(
    () => appearance.motion === 'off' || Boolean(getDesktop()?.hubMode),
  );
  const dismissSplash = useCallback(() => setSplashDone(true), []);

  useInterfaceEffects(appearance.motion, resolved, GLASS_SURFACES);
  useTicker();
  useDocumentTitle();
  useDesktopSync();
  useNebulaHubSync();
  useAmbientSync();
  useShellLabels();

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

  // After a navigation (not on launch), focus moves to the new screen's title so screen
  // readers announce where they landed.
  const firstRoute = useRef(true);
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    const frame = window.requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('#main h1')?.focus({ preventScroll: true }),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  return (
    <>
      <BackgroundFx effect={appearance.background} motion={appearance.motion} />

      <AppShell route={route} onNavigate={navigate}>
        {/* Keyed on the route, so each screen replays its entrance. */}
        <div key={route} className="page-in">
          <Suspense fallback={<span className="skeleton skeleton-line" />}>
            {route === 'timer' ? <TimerView onEnterFullscreen={enterFullscreen} /> : null}
            {route === 'tasks' ? <TasksView /> : null}
            {route === 'news' ? <NewsView /> : null}
            {route === 'stats' ? <StatsView /> : null}
            {route === 'calendar' ? <CalendarView /> : null}
            {route === 'settings' ? <SettingsView /> : null}
          </Suspense>
        </div>
      </AppShell>

      <BreakReminder />

      {fullscreen ? <FullscreenTimer onExit={exitFullscreen} /> : null}

      {splashDone ? null : <SplashScreen motion={appearance.motion} onDone={dismissSplash} />}
    </>
  );
}
