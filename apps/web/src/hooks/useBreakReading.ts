import { useCallback, useEffect, useState } from 'react';
import {
  breakReadingFromLink,
  readingShown,
  type BreakReading,
  type Phase,
  type TimerStatus,
} from '@nebula-clock/core';
import { getDesktop } from '../lib/platform.js';

export type BreakReadingState =
  { status: 'hidden' } | { status: 'loading' } | { status: 'ready'; reading: BreakReading };

const HIDDEN: BreakReadingState = { status: 'hidden' };

/**
 * The main process decides when News is really asked (15 min after an answer, 30 s after none):
 * asking it this often costs nothing and lets the card appear on its own once News is there.
 */
const POLL_MS = 30 * 1000;

/**
 * Nebula News during breaks and while the timer is idle (desktop main window only, never during
 * a focus session). The main process asks News through the Hub and validates the theme; it is
 * checked once more here so the card only ever renders plain, bounded texts. Anything missing
 * — no Hub, no News, the setting off, an empty theme — simply hides the card until News answers.
 */
export function useBreakReading(
  phase: Phase,
  status: TimerStatus,
): {
  state: BreakReadingState;
  open: () => void;
} {
  const [state, setState] = useState<BreakReadingState>(HIDDEN);
  const desktop = getDesktop();
  const available = typeof desktop?.getBreakReading === 'function' && !desktop.isMiniWindow;
  const shown = readingShown(phase, status);

  useEffect(() => {
    const bridge = getDesktop();
    if (!available || !shown || !bridge?.getBreakReading) {
      setState(HIDDEN);
      return undefined;
    }
    let active = true;
    const ask = () => {
      if (document.visibilityState !== 'visible') return;
      void bridge.getBreakReading?.().then(
        (value) => {
          if (!active) return;
          const reading = breakReadingFromLink({ ok: true, value });
          setState(reading ? { status: 'ready', reading } : HIDDEN);
        },
        () => {
          if (active) setState(HIDDEN);
        },
      );
    };
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    ask();
    // Back on screen, or the Hub / the setting changed: ask again (the main process decides
    // whether News is really queried).
    document.addEventListener('visibilitychange', ask);
    const stopHub = bridge.onHubState?.(ask);
    const timer = window.setInterval(ask, POLL_MS);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', ask);
      stopHub?.();
      window.clearInterval(timer);
    };
  }, [available, shown]);

  const open = useCallback(() => {
    // The main process opens the link it validated; the timer is left alone.
    void getDesktop()
      ?.openBreakReading?.()
      .catch(() => undefined);
  }, []);

  return { state, open };
}
