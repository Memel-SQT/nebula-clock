import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ACCENT_VARIABLES,
  appearanceVariables,
  packBaseTheme,
  resolveTheme,
  type ActivePack,
  type AppearanceSettings,
  type ResolvedTheme,
} from '@nebula-clock/core';
import { THEME_CHROME, configureSounds } from '@nebula-clock/ui';
import { getDesktop } from '../lib/platform.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useActivePack } from '../store/packStore.js';

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
 * Draws a pack theme over the built-in one: `data-pack-theme`, `color-scheme` and its tokens as
 * inline custom properties (they win over the token blocks and the accent colours). Returns the
 * undo, which puts back what was there before (the accent colours are inline too).
 */
function applyPackTheme(active: ActivePack): () => void {
  const root = document.documentElement;
  const names = Object.keys(active.theme.tokens).filter((name) => name.startsWith('--'));
  const previous = names.map((name) => [name, root.style.getPropertyValue(name)] as const);
  root.dataset.packTheme = active.theme.id;
  root.style.setProperty('color-scheme', active.theme.scheme);
  for (const name of names) root.style.setProperty(name, active.theme.tokens[name] ?? '');
  return () => {
    for (const [name, value] of previous) {
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    }
    root.style.removeProperty('color-scheme');
    delete root.dataset.packTheme;
  };
}

/**
 * Applies the Nebula appearance: the resolved theme, accents, background, motion level,
 * contrast and text size on `<html>` (in a layout effect, before the browser paints), the
 * interface sounds, and the native window controls on desktop.
 */
export function useAppearance(): {
  appearance: AppearanceSettings;
  resolved: ResolvedTheme;
  active: ActivePack | null;
} {
  const appearance = useSettingsStore((state) => state.settings.appearance);
  const prefersDark = usePrefersDark();
  const active = useActivePack();
  // A pack theme is drawn over the built-in theme of its scheme (Nebula Hub NEBULA_LINK.md § 18).
  const resolved = active
    ? packBaseTheme(active.theme.scheme)
    : resolveTheme(appearance.theme, prefersDark);

  useLayoutEffect(() => {
    applyAppearanceToDocument(appearance, resolved);
    if (!active) return undefined;
    return applyPackTheme(active);
  }, [appearance, resolved, active]);

  useEffect(() => {
    void getDesktop()?.setWindowTheme?.(active ? active.theme.chrome : THEME_CHROME[resolved]);
  }, [resolved, active]);

  useEffect(() => {
    configureSounds({ enabled: appearance.soundEnabled, volume: appearance.soundVolume });
  }, [appearance.soundEnabled, appearance.soundVolume]);

  return { appearance, resolved, active };
}
