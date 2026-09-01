import { useEffect, useState } from 'react';
import { MiniTimer } from './components/MiniTimer.js';
import { useTheme } from './hooks/useTheme.js';
import { getDesktop, type DesktopTimerSnapshot } from './lib/platform.js';

/**
 * Root of the Electron mini window.
 *
 * Deliberately *not* `<App />`: that one starts the ticker, the notification
 * effects and the desktop sync, and a second copy of those would complete
 * every phase twice, record every session twice and chime twice. This root
 * only mirrors what the main window publishes.
 */
export function MiniApp() {
  const [snapshot, setSnapshot] = useState<DesktopTimerSnapshot | null>(null);

  useTheme();

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;
    const unsubscribe = desktop.onTimerSnapshot(setSnapshot);
    // Subscribe first, then ask: an idle timer publishes nothing on its own,
    // so without this the window would sit on its loading state.
    desktop.requestSnapshot();
    return unsubscribe;
  }, []);

  return <MiniTimer snapshot={snapshot} />;
}
