import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@nebula-clock/ui';
import { TimerControls } from './TimerControls.js';
import { TimerDisplay } from './TimerDisplay.js';
import { getDesktop } from '../lib/platform.js';
import { useTimerView } from '../store/timerStore.js';

/** The ring size for the window: half its height, at most 440 px. */
const ringSize = () => Math.round(Math.min(440, window.innerHeight * 0.5, window.innerWidth * 0.8));

/**
 * Immersive focus mode: nothing on screen but the ring and the controls. Uses the real
 * Fullscreen API on the web and the native window flag on desktop, and always leaves on Escape.
 * It is a modal dialog: focus moves into it, the app behind is out of the tab order, and focus
 * returns where it was on exit.
 */
export function FullscreenTimer({ onExit }: { onExit: () => void }) {
  const { t } = useTranslation(['timer']);
  const view = useTimerView();
  const panelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(ringSize);

  useEffect(() => {
    const restoreFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    // Everything behind the overlay leaves the tab order and the accessibility tree.
    const shell = document.querySelector<HTMLElement>('.app-shell');
    shell?.setAttribute('inert', '');

    const desktop = getDesktop();
    if (desktop) {
      void desktop.setFullscreen(true);
    } else {
      // Rejects when there was no user gesture; the overlay still works.
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExit();
    };
    // The browser also exits fullscreen on Escape by itself; stay in step.
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !getDesktop()) onExit();
    };
    const onResize = () => setSize(ringSize());

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      shell?.removeAttribute('inert');
      if (desktop) void desktop.setFullscreen(false);
      else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      restoreFocus?.focus();
    };
  }, [onExit]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('timer:fullscreen.enter')}
      className="fullscreen-timer"
    >
      <TimerDisplay
        phase={view.phase}
        status={view.status}
        remaining={view.remaining}
        progress={view.progress}
        completedInCycle={view.completedInCycle}
        cycleTarget={view.cycleTarget}
        size={size}
      />

      <TimerControls status={view.status} phase={t(`timer:phase.${view.phase}`)} />

      <div className="fullscreen-timer-exit">
        <Button variant="ghost" size="sm" icon="collapse" onClick={onExit}>
          {t('timer:fullscreen.exit')}
        </Button>
        <p>{t('timer:fullscreen.hint')}</p>
      </div>
    </div>
  );
}
