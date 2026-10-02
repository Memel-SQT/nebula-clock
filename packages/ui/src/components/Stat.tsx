import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Icon, type IconName } from '../nebula/Icon.js';

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon: IconName;
  tone?: 'accent' | 'positive' | 'gold' | 'warning';
  className?: string;
}

/** A KPI card (Nebula Hub `.summary-card`): accent rule on top, icon in a tile, big value. */
export function Stat({ label, value, hint, icon, tone = 'accent', className }: StatProps) {
  return (
    <article className={cn('summary-card nebula-surface', `tone-${tone}`, className)}>
      <div className="card-top">
        <span>{label}</span>
        <i aria-hidden="true">
          <Icon name={icon} size={16} />
        </i>
      </div>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}
