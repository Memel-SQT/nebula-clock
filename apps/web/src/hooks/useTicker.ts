import { useEffect } from 'react';
import { useTimerStore } from '../store/timerStore.js';

/** Coarse enough to be cheap, fine enough that a phase ends on time. */
const TICK_MS = 500;

/**
 * The one place in the app that drives time forward.
 *
 * Browsers throttle background timers hard (and stop them entirely when a
 * device sleeps), so the interval is treated purely as a *polling* mechanism:
 * the machine recomputes elapsed time from timestamps, and an extra tick is
 * forced whenever the page becomes visible again so a phase that ended while
 * the tab was hidden is settled immediately rather than on the next interval.
 */
export function useTicker(): void {
  useEffect(() => {
    const tick = () => useTimerStore.getState().tick();

    const interval = window.setInterval(tick, TICK_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', tick);
    // Waking from sleep fires `online`/`pageshow` before `focus` on some
    // platforms; catching them all costs nothing and closes the gap.
    window.addEventListener('pageshow', tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', tick);
      window.removeEventListener('pageshow', tick);
    };
  }, []);
}
