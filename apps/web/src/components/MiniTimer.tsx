import { useTranslation } from 'react-i18next';
import { Pause, Play, SkipForward, X } from 'lucide-react';
import { IconButton } from '@nebula-clock/ui';
import { TimerDisplay } from './TimerDisplay.js';
import { getDesktop, type DesktopTimerSnapshot } from '../lib/platform.js';

export interface MiniTimerProps {
  /** Published by the main window; null until the first snapshot arrives. */
  snapshot: DesktopTimerSnapshot | null;
}

/**
 * The compact always-on-top window (Electron only).
 *
 * It runs no timer of its own: it renders whatever the main window publishes
 * and sends button presses back there, so there is exactly one state machine
 * and every session is recorded once.
 *
 * The whole surface is draggable except the buttons, which is what makes a
 * frameless window movable.
 */
export function MiniTimer({ snapshot }: MiniTimerProps) {
  const { t } = useTranslation(['timer', 'common']);
  const desktop = getDesktop();
  const running = snapshot?.status === 'running';

  return (
    <div className="app-drag flex h-screen w-screen select-none items-center gap-3 bg-card px-4">
      {snapshot ? (
        <TimerDisplay
          phase={snapshot.phase}
          status={snapshot.status}
          remaining={snapshot.remainingSeconds}
          progress={snapshot.progress}
          completedInCycle={snapshot.completedInCycle}
          cycleTarget={snapshot.cycleTarget}
          size={92}
          compact
        />
      ) : (
        <span className="text-sm text-text-secondary">{t('common:state.loading')}</span>
      )}

      <div className="app-no-drag ml-auto flex items-center gap-1">
        <IconButton
          label={running ? t('timer:controls.pause') : t('timer:controls.start')}
          icon={running ? <Pause size={16} /> : <Play size={16} />}
          variant="accent"
          size="sm"
          disabled={!snapshot}
          onClick={() => desktop?.requestCommand('toggle')}
        />
        <IconButton
          label={t('timer:controls.skipAria')}
          icon={<SkipForward size={16} />}
          size="sm"
          disabled={!snapshot}
          onClick={() => desktop?.requestCommand('skip')}
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
