import { useTranslation } from 'react-i18next';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Button, IconButton } from '@nebula-clock/ui';
import { useTimerStore } from '../store/timerStore.js';
import { getSoundEngine } from '../lib/sound.js';

export interface TimerControlsProps {
  status: 'idle' | 'running' | 'paused';
  phase: string;
  size?: 'md' | 'lg';
}

export function TimerControls({ status, phase, size = 'lg' }: TimerControlsProps) {
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
    <div className="flex items-center justify-center gap-3">
      <IconButton
        label={t('timer:controls.resetAria')}
        icon={<RotateCcw size={18} />}
        variant="solid"
        size={size === 'lg' ? 'md' : 'sm'}
        onClick={reset}
      />

      <Button
        variant="primary"
        size={size}
        className="min-w-[9rem]"
        icon={running ? <Pause size={18} /> : <Play size={18} />}
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
        icon={<SkipForward size={18} />}
        variant="solid"
        size={size === 'lg' ? 'md' : 'sm'}
        onClick={skip}
      />
    </div>
  );
}
