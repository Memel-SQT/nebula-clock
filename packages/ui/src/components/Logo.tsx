import { cn } from '../lib/cn.js';

export interface LogoProps {
  size?: number;
  className?: string;
  /** Renders the wordmark next to the glyph. */
  withWordmark?: boolean;
  title?: string;
}

/**
 * The Nebula mark, inlined from `packages/ui/src/nebula-mark.svg` (itself a
 * verbatim copy of the Nebula desktop app's logo) so it can pick up the
 * active accent without a second network request.
 */
export function Logo({ size = 28, className, withWordmark, title = 'Nebula Clock' }: LogoProps) {
  const glyph = (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={withWordmark ? undefined : title}
      aria-hidden={withWordmark ? true : undefined}
      className={cn('shrink-0', !withWordmark && className)}
    >
      <defs>
        <linearGradient id="nebulaMark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-from)" />
          <stop offset="1" stopColor="var(--accent-to)" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="#1A1A2E" />
      <rect x="22" y="18" width="18" height="64" rx="6" fill="url(#nebulaMark)" />
      <rect x="60" y="18" width="18" height="64" rx="6" fill="url(#nebulaMark)" opacity="0.55" />
      <polygon points="40,18 60,18 60,82 40,82" fill="url(#nebulaMark)" opacity="0.85" />
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
