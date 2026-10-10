/**
 * Appearance packs of installed Nebula apps (Nebula Hub NEBULA_LINK.md § 18), desktop only: the
 * packs the shell read, and the pack theme the user chose. The choice is kept apart from the
 * persisted settings on purpose (adding a field there would reset them for existing installs, see
 * useNebulaHub.ts): the built-in theme stays in the settings and is the fallback when the pack goes.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import { asPackViews, findPackTheme, type ActivePack, type PackView } from '@nebula-clock/core';
import { getDesktop } from '../lib/platform.js';

const CHOICE_KEY = 'nebula-clock-pack-theme';

function readChoice(): string | null {
  try {
    return window.localStorage.getItem(CHOICE_KEY) || null;
  } catch {
    return null;
  }
}

interface PackState {
  packs: PackView[];
  choice: string | null;
  setChoice: (themeId: string | null) => void;
}

export const usePackStore = create<PackState>((set) => ({
  packs: [],
  choice: readChoice(),
  setChoice: (themeId) => {
    try {
      if (themeId) window.localStorage.setItem(CHOICE_KEY, themeId);
      else window.localStorage.removeItem(CHOICE_KEY);
    } catch {
      // Not persisted this session; the choice still applies.
    }
    set({ choice: themeId });
  },
}));

/** Loads the packs once and follows their changes (desktop only; nothing on the web). */
export function startPackSync(): () => void {
  const desktop = getDesktop();
  if (!desktop?.getAppearancePacks) return () => undefined;
  void desktop.getAppearancePacks().then(
    (value) => usePackStore.setState({ packs: asPackViews(value) }),
    () => undefined,
  );
  return (
    desktop.onAppearancePacks?.((value) => usePackStore.setState({ packs: asPackViews(value) })) ??
    (() => undefined)
  );
}

/** The active pack theme, or null when none is chosen or its pack is gone. */
export function useActivePack(): ActivePack | null {
  const packs = usePackStore((state) => state.packs);
  const choice = usePackStore((state) => state.choice);
  // Stable between renders: the appearance effects only re-run when the pack theme changes.
  return useMemo(() => findPackTheme(packs, choice), [packs, choice]);
}

/** The app's name and logo from the active pack, or nulls (then the app's own are shown). */
export function usePackBrand(): { name: string | null; markUrl: string | null } {
  const active = useActivePack();
  return { name: active?.pack.name ?? null, markUrl: active?.pack.markUrl ?? null };
}
