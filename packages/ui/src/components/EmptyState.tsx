import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Icon, type IconName } from '../nebula/Icon.js';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  /** Drops the surface when the empty state already sits inside a panel. */
  compact?: boolean;
  className?: string;
}

/** Nebula Hub `ScreenState.tsx` empty state: icon in an accent tile, title, help, action. */
export function EmptyState({
  title,
  description,
  icon = 'sparkles',
  action,
  compact = true,
  className,
}: EmptyStateProps) {
  const Heading = compact ? 'h3' : 'h2';
  return (
    <div className={cn('empty-state', compact ? 'compact' : 'nebula-surface', className)}>
      <span className="empty-state-icon" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      <Heading>{title}</Heading>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
