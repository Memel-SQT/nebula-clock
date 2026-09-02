import { useId } from 'react';
import { cn } from '../lib/cn.js';

export interface LogoProps {
  size?: number;
  className?: string;
  /** Renders the wordmark next to the glyph. */
  withWordmark?: boolean;
  title?: string;
  /**
   * Animates the mark on mount: the ring draws itself and the hands sweep
   * into place. Used by the launch screen; ignored under reduced motion,
   * which the CSS handles.
   */
  animated?: boolean;
}

/**
 * The Nebula Clock mark, kept in sync with
 * `packages/ui/src/nebula-clock-mark.svg` and the icon renderer.
 *
 * It carries the Nebula family cues - the #1A1A2E card and the blue-to-violet
 * diagonal gradient - with a clock face of its own. The gradient stops read
 * from the accent tokens, so a custom accent recolours the logo too.
 */
export function Logo({
  size = 28,
  className,
  withWordmark,
  title = 'Nebula Clock',
  animated,
}: LogoProps) {
  // useId keeps the gradient unique when several logos are on the page.
  const gradientId = `nebula-clock-mark-${useId()}`;

  const glyph = (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={withWordmark ? undefined : title}
      aria-hidden={withWordmark ? true : undefined}
      className={cn('shrink-0', animated && 'nebula-logo-animated', !withWordmark && className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-from)" />
          <stop offset="1" stopColor="var(--accent-to)" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="#1A1A2E" />
      <circle
        className="nebula-logo-ring"
        cx="50"
        cy="50"
        r="32"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="8"
      />
      <path
        className="nebula-logo-hands"
        d="M50 50V32.5M50 50l10.83 6.25"
        stroke={`url(#${gradientId})`}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  if (!withWordmark) return glyph;

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {glyph}
      <span className="text-lg font-bold tracking-tight">{title}</span>
    </span>
  );
}
