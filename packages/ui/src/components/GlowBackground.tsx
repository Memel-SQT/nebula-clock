import { cn } from '../lib/cn.js';

/**
 * The signature Nebula backdrop: two slow-drifting radial glows behind the
 * whole app. Decorative only, so it is hidden from assistive technology, and
 * the drift stops under either reduced-motion switch (handled in tokens.css).
 */
export function GlowBackground({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('nebula-glow', className)} />;
}
