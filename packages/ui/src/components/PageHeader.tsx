import { forwardRef, type ReactNode } from 'react';

export interface PageHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
  /** Visually hidden title, when the screen's content already says what it is (the timer). */
  hiddenTitle?: boolean;
}

/**
 * Page header (Nebula Hub `.topbar`): overline in capitals, the h1, an optional intro, and the
 * actions on the right, which never shrink. The h1 takes focus after each navigation so screen
 * readers land on the new screen (`tabIndex={-1}`, no focus ring).
 */
export const PageHeader = forwardRef<HTMLHeadingElement, PageHeaderProps>(function PageHeader(
  { eyebrow, title, intro, actions, hiddenTitle },
  ref,
) {
  if (hiddenTitle) {
    return (
      <h1 ref={ref} tabIndex={-1} className="sr-only">
        {title}
      </h1>
    );
  }
  return (
    <header className="topbar">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 ref={ref} tabIndex={-1}>
          {title}
        </h1>
        {intro ? <p className="topbar-intro">{intro}</p> : null}
      </div>
      {actions ? <div className="topbar-actions">{actions}</div> : null}
    </header>
  );
});
