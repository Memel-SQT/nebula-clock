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

/** The family gradient angle (CSS `100deg`), as a unit vector in screen coordinates. */
const ANGLE = (100 * Math.PI) / 180;
const DX = Math.sin(ANGLE);
const DY = -Math.cos(ANGLE);

/**
 * The circular countdown.
 *
 * The arc is a stroked path starting at twelve o'clock, so nothing is rotated and the accent
 * gradient keeps the family's 100deg angle on screen. Progress is a stroke-dashoffset step once
 * a second (a drawn stroke, which the design system allows); nothing on the ring loops, so the
 * animated background remains the only infinite animation on screen.
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
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  // A full circle as one arc path, clockwise from the top.
  const arc = `M ${center} ${center - radius} a ${radius} ${radius} 0 1 1 -0.01 0`;

  return (
    <div
      className={cn('progress-ring', muted && 'is-muted', className)}
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
      >
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={center - DX * radius}
            y1={center - DY * radius}
            x2={center + DX * radius}
            y2={center + DY * radius}
          >
            <stop offset="0" stopColor="var(--gold)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>

        <circle
          className="progress-ring-track"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={thickness}
        />
        <path
          className="progress-ring-arc"
          d={arc}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          // A zero-length round cap would still paint a dot at twelve o'clock.
          visibility={clamped === 0 ? 'hidden' : undefined}
        />
      </svg>

      <div className="progress-ring-content">{children}</div>
    </div>
  );
}
