import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
    // Keyed on the phase so the wrapper remounts and replays the flourish
    // each time focus turns into a break, or back.
    <div key={phase} className="nebula-phase-flourish">
      <ProgressRing
        progress={progress}
        size={size}
        thickness={compact ? 8 : 14}
        muted={status !== 'running'}
        label={t('timer:progressAria', { remaining: display, phase: t(`timer:phase.${phase}`) })}
      >
        <div className="flex flex-col items-center gap-1">
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary',
              compact && 'text-[10px]',
            )}
          >
            {t(`timer:phase.${phase}`)}
          </span>

          <motion.span
            // The countdown sits beside the SVG rather than inside it, so it
            // needs its own hook for the end-to-end tests.
            data-testid="countdown"
            // A gentle pulse on the whole readout each time the second changes
            // reads as "alive" without animating 60 times a second.
            key={display}
            initial={{ opacity: 0.75 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'font-mono font-bold tabular-nums tracking-tight nebula-gradient-text',
              compact ? 'text-4xl' : 'text-6xl',
            )}
          >
            {display}
          </motion.span>

          {status === 'paused' ? (
            <span className="text-xs font-medium text-warning">{t('timer:status.paused')}</span>
          ) : null}

          {!compact ? (
            <div
              className="mt-2 flex items-center gap-1.5"
              aria-label={t('timer:cycle.progress', { done: completedInCycle, total: cycleTarget })}
            >
              {Array.from({ length: cycleTarget }, (_, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className={cn(
                    'h-1.5 rounded-pill transition-all duration-base ease-nebula',
                    index < completedInCycle ? 'w-5 bg-nebula-gradient' : 'w-1.5 bg-card-alt',
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </ProgressRing>
    </div>
  );
}
