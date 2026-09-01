import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn.js';

// `title` is widened to ReactNode, which clashes with the HTML tooltip
// attribute of the same name, so that one is dropped.
export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional heading rendered above the content. */
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Adds the Nebula violet inner ring, for the currently active card. */
  highlighted?: boolean;
  padded?: boolean;
}

/** `.card` from the Nebula theme: 12px radius, 1px border, soft elevation. */
export function Card({
  title,
  description,
  actions,
  highlighted,
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card shadow-card',
        'transition-[border-color,box-shadow] duration-base ease-nebula',
        highlighted && 'shadow-ring-strong border-accent/40',
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
      {title || actions ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold tracking-tight">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
