import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** A single headline metric on the statistics page. */
export function Stat({ label, value, hint, icon, className }: StatProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card p-4',
        'transition-colors duration-base ease-nebula hover:border-accent/40',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
        {icon ? (
          <span aria-hidden="true" className="text-accent">
            {icon}
          </span>
        ) : null}
        {label}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-text-secondary">{hint}</div> : null}
    </div>
  );
}
