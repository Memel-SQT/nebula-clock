import { useEffect } from 'react';
import { resolveAccent } from '@nebula-clock/core';
import { useSettingsStore } from '../store/settingsStore.js';

/**
 * Reflects the appearance settings onto the document root.
 *
 * Everything visual is a CSS custom property, so this is the only place that
 * needs to know about theming: set the attributes and the whole design system
 * follows. Mirrors the inline bootstrap script in `index.html`.
 */
export function useTheme(): void {
  const appearance = useSettingsStore((state) => state.settings.appearance);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const prefersLight =
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches;
      const resolved =
        appearance.theme === 'system' ? (prefersLight ? 'light' : 'dark') : appearance.theme;

      root.setAttribute('data-theme', resolved);
      // Keeps the mobile browser chrome and the PWA splash on-brand.
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', resolved === 'light' ? '#F4F3FB' : '#0A0A0F');
    };

    apply();

    // Only listen while actually following the system.
    if (appearance.theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [appearance.theme]);

  useEffect(() => {
    const root = document.documentElement;
    const { from, to } = resolveAccent(appearance.accent);
    root.style.setProperty('--accent-from', from);
    root.style.setProperty('--accent-to', to);
    root.style.setProperty('--font-scale', String(appearance.fontScale));

    // The stylesheet matches on the literal value, so these are set rather
    // than toggled: toggleAttribute would leave an empty string behind.
    if (appearance.reduceMotion) root.setAttribute('data-reduce-motion', 'true');
    else root.removeAttribute('data-reduce-motion');

    if (appearance.highContrast) root.setAttribute('data-contrast', 'high');
    else root.removeAttribute('data-contrast');
  }, [appearance.accent, appearance.fontScale, appearance.reduceMotion, appearance.highContrast]);
}
