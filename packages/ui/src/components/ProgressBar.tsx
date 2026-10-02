import { cn } from '../lib/cn.js';

export interface ProgressBarProps {
  /** Completion, 0..1. */
  value: number;
  label: string;
  /** Hides the bar from assistive tech when a sibling already announces it. */
  decorative?: boolean;
  tone?: 'accent' | 'positive' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}

/** Linear progress in the accent gradient; the fill moves by `transform` only. */
export function ProgressBar({
  value,
  label,
  decorative,
  tone = 'accent',
  size = 'md',
  className,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const percent = Math.round(clamped * 100);

  return (
    <span
      role={decorative ? undefined : 'progressbar'}
      aria-hidden={decorative || undefined}
      aria-valuemin={decorative ? undefined : 0}
      aria-valuemax={decorative ? undefined : 100}
      aria-valuenow={decorative ? undefined : percent}
      aria-label={decorative ? undefined : label}
      className={cn(
        'progress-track',
        size === 'sm' && 'small',
        tone !== 'accent' && `tone-${tone}`,
        className,
      )}
    >
      <i style={{ transform: `scaleX(${clamped})` }} />
    </span>
  );
}
