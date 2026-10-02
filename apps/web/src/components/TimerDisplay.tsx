import { useTranslation } from 'react-i18next';
import { ProgressRing, cn } from '@nebula-clock/ui';
import type { Phase } from '@nebula-clock/core';
import { formatDuration } from '@nebula-clock/core';

export interface TimerDisplayProps {
  phase: Phase;
  status: 'idle' | 'running' | 'paused';
  remaining: number;
  progress: number;
  completedInCycle: number;
  cycleTarget: number;
  size?: number;
  /** Hides the cycle dots in the compact mini window. */
  compact?: boolean;
}

/** Countdown ring plus the numeric readout and the cycle indicator. */
export function TimerDisplay({
  phase,
  status,
  remaining,
  progress,
  completedInCycle,
  cycleTarget,
  size = 300,
  compact,
}: TimerDisplayProps) {
  const { t } = useTranslation(['timer']);
  const display = formatDuration(remaining);

  return (
    // Keyed on the phase so the wrapper remounts and replays the flourish each time focus
    // turns into a break, or back.
    <div key={phase} className={cn('timer-display', compact && 'is-compact')}>
      <ProgressRing
        progress={progress}
        size={size}
        thickness={compact ? 7 : Math.max(10, Math.round(size / 24))}
        muted={status !== 'running'}
        label={t('timer:progressAria', { remaining: display, phase: t(`timer:phase.${phase}`) })}
      >
        <div className="timer-readout">
          <span className="timer-phase">{t(`timer:phase.${phase}`)}</span>
          <span
            // The countdown sits beside the SVG rather than inside it, so it needs its own
            // hook for the end-to-end tests.
            data-testid="countdown"
            className="timer-countdown nebula-gradient-text tabular"
            style={{ fontSize: compact ? size * 0.25 : size * 0.2 }}
          >
            {display}
          </span>

          {status === 'paused' ? (
            <span className="timer-paused">{t('timer:status.paused')}</span>
          ) : null}

          {!compact ? (
            <div
              className="timer-cycle"
              role="img"
              aria-label={t('timer:cycle.progress', { done: completedInCycle, total: cycleTarget })}
            >
              {Array.from({ length: cycleTarget }, (_, index) => (
                <i key={index} className={index < completedInCycle ? 'done' : undefined} />
              ))}
            </div>
          ) : null}
        </div>
      </ProgressRing>
    </div>
  );
}
