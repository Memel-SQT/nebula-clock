import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Minimize2 } from 'lucide-react';
import { Button, GlowBackground } from '@nebula-clock/ui';
import { TimerControls } from './TimerControls.js';
import { TimerDisplay } from './TimerDisplay.js';
import { getDesktop } from '../lib/platform.js';
import { useTimerView } from '../store/timerStore.js';

/**
 * Immersive focus mode: nothing on screen but the ring and the controls.
 * Uses the real Fullscreen API on the web and the native window flag on
 * desktop, and always leaves on Escape.
 */
export function FullscreenTimer({ onExit }: { onExit: () => void }) {
  const { t } = useTranslation(['timer']);
  const view = useTimerView();

  useEffect(() => {
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

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (desktop) void desktop.setFullscreen(false);
      else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [onExit]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-base"
    >
      <GlowBackground />

      <div className="relative z-10 flex flex-col items-center gap-10">
        <TimerDisplay
          phase={view.phase}
          status={view.status}
          remaining={view.remaining}
          progress={view.progress}
          completedInCycle={view.completedInCycle}
          cycleTarget={view.cycleTarget}
          size={Math.min(440, typeof window === 'undefined' ? 440 : window.innerHeight * 0.5)}
        />

        <TimerControls status={view.status} phase={t(`timer:phase.${view.phase}`)} />

        <div className="flex flex-col items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Minimize2 size={14} />} onClick={onExit}>
            {t('timer:fullscreen.exit')}
          </Button>
          <p className="text-xs text-text-secondary">{t('timer:fullscreen.hint')}</p>
        </div>
      </div>
    </motion.div>
  );
}
