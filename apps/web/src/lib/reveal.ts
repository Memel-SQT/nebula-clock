import type { CSSProperties } from 'react';

/** Default gap between two items in a staggered entrance. */
const STEP_MS = 45;

/**
 * Stagger for the `.nebula-reveal` entrance animation.
 *
 * Pair with `className="nebula-reveal"`. The animation itself lives in the
 * design system's tokens.css, which is also where both reduced-motion
 * switches neutralise it.
 */
export function revealDelay(index: number, step = STEP_MS): CSSProperties {
  // Long lists should not make the last row wait a noticeable amount of time.
  return { animationDelay: `${Math.min(index, 12) * step}ms` };
}
