import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '@nebula-clock/ui';
import { useTimerStore } from '../store/timerStore.js';
import { getSoundEngine } from '../lib/sound.js';

export interface TimerControlsProps {
  status: 'idle' | 'running' | 'paused';
  phase: string;
}

/** Reset, the primary Start / Pause / Resume (the screen's one gradient button), Skip. */
export function TimerControls({ status, phase }: TimerControlsProps) {
  const { t } = useTranslation(['timer']);
  const toggle = useTimerStore((state) => state.toggle);
  const skip = useTimerStore((state) => state.skip);
  const reset = useTimerStore((state) => state.reset);

  const running = status === 'running';
  const primaryLabel = running
    ? t('timer:controls.pause')
    : status === 'paused'
      ? t('timer:controls.resume')
      : t('timer:controls.start');

  return (
    <div className="timer-controls">
      <IconButton
        label={t('timer:controls.resetAria')}
        icon="reset"
        variant="ghost"
        size="lg"
        onClick={reset}
      />

      <Button
        variant="primary"
        size="lg"
        className="timer-primary"
        icon={running ? 'pause' : 'start'}
        aria-label={
          running
            ? t('timer:controls.pauseAria')
            : status === 'paused'
              ? t('timer:controls.resumeAria')
              : t('timer:controls.startAria', { phase })
        }
        onClick={() => {
          // Browsers only allow audio after a gesture; this is the gesture.
          getSoundEngine().unlock();
          toggle();
        }}
      >
        {primaryLabel}
      </Button>

      <IconButton
        label={t('timer:controls.skipAria')}
        icon="skipNext"
        variant="ghost"
        size="lg"
        onClick={skip}
      />
    </div>
  );
}
