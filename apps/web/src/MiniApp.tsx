import { useEffect, useLayoutEffect, useState } from 'react';
import { resolveTheme } from '@nebula-clock/core';
import { MiniTimer } from './components/MiniTimer.js';
import { applyAppearanceToDocument } from './hooks/useAppearance.js';
import { getDesktop, type DesktopTimerSnapshot } from './lib/platform.js';
import { useSettingsStore } from './store/settingsStore.js';

/**
 * Root of the Electron mini window.
 *
 * Deliberately *not* `<App />`: that one starts the ticker, the notification effects and the
 * desktop sync, and a second copy of those would complete every phase twice, record every
 * session twice and chime twice. This root only mirrors what the main window publishes, in the
 * same appearance (read from the shared settings, kept in step by the storage event).
 */
export function MiniApp() {
  const [snapshot, setSnapshot] = useState<DesktopTimerSnapshot | null>(null);
  const appearance = useSettingsStore((state) => state.settings.appearance);
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useLayoutEffect(() => {
    document.documentElement.dataset.mini = 'true';
    applyAppearanceToDocument(appearance, resolveTheme(appearance.theme, prefersDark));
  }, [appearance, prefersDark]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setPrefersDark(media.matches);
    media.addEventListener('change', onChange);
    // The main window writes the settings; this window follows its changes live.
    const onStorage = () => void useSettingsStore.persist.rehydrate();
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;
    const unsubscribe = desktop.onTimerSnapshot(setSnapshot);
    // Subscribe first, then ask: an idle timer publishes nothing on its own, so without this
    // the window would sit on its loading state.
    desktop.requestSnapshot();
    return unsubscribe;
  }, []);

  return <MiniTimer snapshot={snapshot} />;
}
