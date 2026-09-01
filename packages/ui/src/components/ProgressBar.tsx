import { cn } from '../lib/cn.js';

export interface ProgressBarProps {
  /** Completion, 0..1. */
  value: number;
  label: string;
  /** Hides the bar from assistive tech when a sibling already announces it. */
  decorative?: boolean;
  tone?: 'accent' | 'success' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}

const tones = {
  accent: 'bg-nebula-gradient',
  success: 'bg-success',
  warning: 'bg-warning',
} as const;

/** Linear progress, matching `.scan-progress-bar` from the Nebula theme. */
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
    <div
      role={decorative ? undefined : 'progressbar'}
      aria-hidden={decorative || undefined}
      aria-valuemin={decorative ? undefined : 0}
      aria-valuemax={decorative ? undefined : 100}
      aria-valuenow={decorative ? undefined : percent}
      aria-label={decorative ? undefined : label}
      className={cn(
        'w-full overflow-hidden rounded-pill bg-card-alt',
        size === 'sm' ? 'h-1.5' : 'h-2',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-pill transition-[width] duration-base ease-nebula',
          tones[tone],
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
