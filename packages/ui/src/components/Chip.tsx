import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface ChipProps {
  children: ReactNode;
  /** A tag colour; when given, the chip is tinted with it (`--chip`). */
  color?: string;
  tone?: 'neutral' | 'accent' | 'positive' | 'warning';
  className?: string;
}

/** A small pill for tags, phases and statuses. */
export function Chip({ children, color, tone = 'neutral', className }: ChipProps) {
  return (
    <span
      className={cn('chip', color ? 'tagged' : tone !== 'neutral' && `tone-${tone}`, className)}
      style={color ? ({ '--chip': color } as CSSProperties) : undefined}
    >
      {children}
    </span>
  );
}
