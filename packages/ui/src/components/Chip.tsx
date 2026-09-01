import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface ChipProps {
  children: ReactNode;
  /** A tag colour; when given, the chip is tinted with it. */
  color?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

const tones = {
  neutral: 'border-border bg-card-alt text-text-secondary',
  accent: 'border-accent/40 bg-accent/10 text-accent',
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  danger: 'border-danger/40 bg-danger/10 text-danger',
} as const;

/** A small pill for tags, phases and statuses. */
export function Chip({ children, color, tone = 'neutral', size = 'md', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        color ? 'border-transparent' : tones[tone],
        className,
      )}
      style={
        color
          ? // 18% tint keeps the label readable on both themes.
            { backgroundColor: `${color}2E`, color, borderColor: `${color}66` }
          : undefined
      }
    >
      {children}
    </span>
  );
}
