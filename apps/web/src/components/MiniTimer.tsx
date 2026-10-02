import { useTranslation } from 'react-i18next';
import { IconButton } from '@nebula-clock/ui';
import { TimerDisplay } from './TimerDisplay.js';
import { getDesktop, type DesktopTimerSnapshot } from '../lib/platform.js';

export interface MiniTimerProps {
  /** Published by the main window; null until the first snapshot arrives. */
  snapshot: DesktopTimerSnapshot | null;
}

/**
 * The compact always-on-top window (Electron only): its minimal layout is kept, with the
 * family tokens, radii and icons.
 *
 * It runs no timer of its own: it renders whatever the main window publishes and sends button
 * presses back there, so there is exactly one state machine and every session is recorded
 * once. The whole surface is draggable except the buttons, which is what makes a frameless
 * window movable.
 */
export function MiniTimer({ snapshot }: MiniTimerProps) {
  const { t } = useTranslation(['timer', 'common']);
  const desktop = getDesktop();
  const running = snapshot?.status === 'running';

  return (
    <div className="mini-timer app-drag">
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
        <span className="mini-timer-loading">{t('common:state.loading')}</span>
      )}

      <div className="mini-timer-actions app-no-drag">
        <IconButton
          label={running ? t('timer:controls.pause') : t('timer:controls.start')}
          icon={running ? 'pause' : 'start'}
          variant="primary"
          size="sm"
          disabled={!snapshot}
          onClick={() => desktop?.requestCommand('toggle')}
        />
        <IconButton
          label={t('timer:controls.skipAria')}
          icon="skipNext"
          size="sm"
          disabled={!snapshot}
          onClick={() => desktop?.requestCommand('skip')}
        />
        <IconButton
          label={t('timer:miniMode.exit')}
          icon="close"
          size="sm"
          onClick={() => void desktop?.closeMiniMode()}
        />
      </div>
    </div>
  );
}
