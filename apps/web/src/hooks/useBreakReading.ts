import { useCallback, useEffect, useState } from 'react';
import { breakReadingFromLink, type BreakReading, type Phase } from '@nebula-clock/core';
import { getDesktop } from '../lib/platform.js';

export type BreakReadingState =
  { status: 'hidden' } | { status: 'loading' } | { status: 'ready'; reading: BreakReading };

const HIDDEN: BreakReadingState = { status: 'hidden' };

/**
 * Nebula News during breaks (desktop main window only, never during a focus phase). The main
 * process asks News through the Hub at most every 15 minutes and validates the theme; it is
 * checked once more here so the card only ever renders plain, bounded texts. Anything missing
 * — no Hub, no News, the setting off, an empty theme — simply hides the card.
 */
export function useBreakReading(phase: Phase): {
  state: BreakReadingState;
  open: () => void;
} {
  const [state, setState] = useState<BreakReadingState>(HIDDEN);
  const desktop = getDesktop();
  const available = typeof desktop?.getBreakReading === 'function' && !desktop.isMiniWindow;
  const onBreak = phase !== 'focus';

  useEffect(() => {
    const bridge = getDesktop();
    if (!available || !onBreak || !bridge?.getBreakReading) {
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
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', ask);
      stopHub?.();
    };
  }, [available, onBreak]);

  const open = useCallback(() => {
    // The main process opens the link it validated; the timer is left alone.
    void getDesktop()
      ?.openBreakReading?.()
      .catch(() => undefined);
  }, []);

  return { state, open };
}
