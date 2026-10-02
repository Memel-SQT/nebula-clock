import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ACCENT_VARIABLES,
  appearanceVariables,
  resolveTheme,
  type AppearanceSettings,
  type ResolvedTheme,
} from '@nebula-clock/core';
import { THEME_CHROME, configureSounds } from '@nebula-clock/ui';
import { getDesktop } from '../lib/platform.js';
import { useSettingsStore } from '../store/settingsStore.js';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Read by the inline script in `index.html` before the first frame, so a custom accent paints
 * immediately instead of flashing the default one. It is a cache of what is computed here,
 * never a source of truth.
 */
export const PAINT_CACHE_KEY = 'nebula-clock-paint';

/** Follows the OS while the theme is `system`. */
function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia(DARK_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setPrefersDark(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return prefersDark;
}

/** Everything the appearance writes on `<html>` (also used by the mini window). */
export function applyAppearanceToDocument(
  appearance: AppearanceSettings,
  resolved: ResolvedTheme,
): void {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.motion = appearance.motion;
  root.dataset.background = appearance.background;
  if (appearance.highContrast) root.dataset.contrast = 'high';
  else delete root.dataset.contrast;
  if (getDesktop()) root.dataset.desktop = 'true';
  root.style.setProperty('--font-scale', String(appearance.fontScale));

  const variables = appearanceVariables(appearance, resolved);
  for (const name of ACCENT_VARIABLES) {
    if (variables) root.style.setProperty(name, variables[name]);
    else root.style.removeProperty(name);
  }

  // The mobile browser chrome and the PWA splash follow the page colour.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_CHROME[resolved].page);

  try {
    window.localStorage.setItem(
      PAINT_CACHE_KEY,
      JSON.stringify({ theme: resolved, variables: variables ?? {} }),
    );
  } catch {
    // Private mode or a full quota: the next launch just paints the default accent first.
  }
}

/**
 * Applies the Nebula appearance: the resolved theme, accents, background, motion level,
 * contrast and text size on `<html>` (in a layout effect, before the browser paints), the
 * interface sounds, and the native window controls on desktop.
 */
export function useAppearance(): { appearance: AppearanceSettings; resolved: ResolvedTheme } {
  const appearance = useSettingsStore((state) => state.settings.appearance);
  const prefersDark = usePrefersDark();
  const resolved = resolveTheme(appearance.theme, prefersDark);

  useLayoutEffect(() => {
    applyAppearanceToDocument(appearance, resolved);
  }, [appearance, resolved]);

  useEffect(() => {
    void getDesktop()?.setWindowTheme?.(THEME_CHROME[resolved]);
  }, [resolved]);

  useEffect(() => {
    configureSounds({ enabled: appearance.soundEnabled, volume: appearance.soundVolume });
  }, [appearance.soundEnabled, appearance.soundVolume]);

  return { appearance, resolved };
}
