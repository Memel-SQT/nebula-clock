import type { ReactNode } from 'react';

/** Visible to screen readers only. Used for live regions and extra context. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

export interface LiveRegionProps {
  children: ReactNode;
  /** `assertive` interrupts the user; reserve it for phase changes. */
  assertive?: boolean;
}

/**
 * An off-screen live region. Mounted once and updated in place, so that
 * assistive technology announces timer transitions without any visual noise.
 */
export function LiveRegion({ children, assertive }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}
