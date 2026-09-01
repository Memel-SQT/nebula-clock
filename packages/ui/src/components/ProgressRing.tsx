import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface ProgressRingProps {
  /** Completion, 0..1. Values outside the range are clamped. */
  progress: number;
  size?: number;
  thickness?: number;
  /** Rendered in the middle of the ring, typically the countdown. */
  children?: ReactNode;
  /** Spoken description, e.g. "12:30 left in the focus phase". */
  label: string;
  /** Dims the ring while the timer is paused. */
  muted?: boolean;
  className?: string;
}

/**
 * The circular countdown.
 *
 * The arc is a stroked circle whose dash offset tracks progress, painted with
 * the Nebula accent gradient. The transition is short and linear so the ring
 * advances smoothly once a second without ever appearing to run backwards
 * after a re-render.
 */
export function ProgressRing({
  progress,
  size = 280,
  thickness = 12,
  children,
  label,
  muted,
  className,
}: ProgressRingProps) {
  const gradientId = useId();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped * 100)}
        aria-label={label}
        className={cn('-rotate-90', muted && 'opacity-60')}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-from)" />
            <stop offset="1" stopColor="var(--accent-to)" />
          </linearGradient>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--card-alt)"
          strokeWidth={thickness}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{
            transition: 'stroke-dashoffset var(--motion-base) linear',
            filter: 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.35))',
          }}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
