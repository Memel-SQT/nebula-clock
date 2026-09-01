import { useTranslation } from 'react-i18next';
import { Pause, Play, SkipForward, X } from 'lucide-react';
import { IconButton } from '@nebula-clock/ui';
import { TimerDisplay } from './TimerDisplay.js';
import { getDesktop } from '../lib/platform.js';
import { useTimerStore, useTimerView } from '../store/timerStore.js';

/**
 * The compact always-on-top window (Electron only).
 *
 * The whole surface is draggable except the buttons, which is what makes a
 * frameless window movable.
 */
export function MiniTimer() {
  const { t } = useTranslation(['timer']);
  const view = useTimerView();
  const toggle = useTimerStore((state) => state.toggle);
  const skip = useTimerStore((state) => state.skip);
  const desktop = getDesktop();
  const running = view.status === 'running';

  return (
    <div className="app-drag flex h-screen w-screen select-none items-center gap-3 bg-card px-4">
      <TimerDisplay
        phase={view.phase}
        status={view.status}
        remaining={view.remaining}
        progress={view.progress}
        completedInCycle={view.completedInCycle}
        cycleTarget={view.cycleTarget}
        size={92}
        compact
      />

      <div className="app-no-drag ml-auto flex items-center gap-1">
        <IconButton
          label={
            running ? t('timer:controls.pauseAria') : t('timer:controls.startAria', { phase: '' })
          }
          icon={running ? <Pause size={16} /> : <Play size={16} />}
          variant="accent"
          size="sm"
          onClick={toggle}
        />
        <IconButton
          label={t('timer:controls.skipAria')}
          icon={<SkipForward size={16} />}
          size="sm"
          onClick={skip}
        />
        <IconButton
          label={t('timer:miniMode.exit')}
          icon={<X size={16} />}
          size="sm"
          onClick={() => void desktop?.closeMiniMode()}
        />
      </div>
    </div>
  );
}
