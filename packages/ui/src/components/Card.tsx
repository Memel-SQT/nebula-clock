import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

// `title` is widened to ReactNode, which clashes with the HTML tooltip attribute of the same
// name, so that one is dropped.
export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Uppercase overline above the title (Nebula Hub panels). */
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** A count pill on the right of the heading. */
  count?: ReactNode;
  actions?: ReactNode;
  /** Adds the accent ring, for the currently active card. */
  highlighted?: boolean;
  padded?: boolean;
}

/**
 * A Nebula panel (`dashboard.css`): surface, 1 px line, `--radius`, overline + title + count
 * pill. Rendered as a labelled `section` when it has a title.
 */
export function Card({
  eyebrow,
  title,
  description,
  count,
  actions,
  highlighted,
  padded = true,
  className,
  style,
  children,
  ...rest
}: CardProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={cn('panel nebula-surface', highlighted && 'ring-1 ring-accent/40', className)}
      style={padded ? style : { padding: 0, ...style }}
      {...rest}
    >
      {title || eyebrow || actions || count !== undefined ? (
        <div className="section-heading">
          <div className="min-w-0">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h2 id={titleId}>{title}</h2> : null}
            {description ? <p className="section-heading-copy">{description}</p> : null}
          </div>
          {actions || count !== undefined ? (
            <div className="section-heading-actions">
              {actions}
              {count !== undefined ? <span className="pill">{count}</span> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
