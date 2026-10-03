import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  clockAppearanceFromHub,
  computeStreak,
  filterByRange,
  getRange,
  isPomodoro,
} from '@nebula-clock/core';
import { getDesktop, type HubState } from '../lib/platform.js';
import { useDataStore } from '../store/dataStore.js';
import { useSettingsStore } from '../store/settingsStore.js';

/**
 * Nebula Hub, renderer side (optional, desktop only). Its preferences are kept out of the
 * persisted settings on purpose: adding fields there would reset them for existing installs (the
 * store replaces the whole object on load). "Follow the Nebula appearance" lives in localStorage,
 * "updates by the Hub" and "reading suggestions during breaks" in the main process.
 */
const FOLLOW_KEY = 'nebula-clock-follow-nebula';

function readFollow(): boolean {
  try {
    return window.localStorage.getItem(FOLLOW_KEY) !== 'false';
  } catch {
    return true;
  }
}

/**
 * Mounted once, by the main window: publishes today's focus for the Hub's widget and applies
 * the Nebula appearance when the user follows it.
 */
export function useNebulaHubSync(): void {
  const { t, i18n } = useTranslation(['settings']);
  const sessions = useDataStore((state) => state.sessions);
  const goal = useSettingsStore((state) => state.settings.goals.dailyPomodoros);
  const updateAppearance = useSettingsStore((state) => state.updateAppearance);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  // Today's focus: count, goal, streak, already translated (the main process has no i18n).
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop?.publishFocus) return;
    const now = new Date();
    const done = filterByRange(sessions, getRange('day')).filter(isPomodoro).length;
    const streak = computeStreak(sessions, goal, now.getTime()).current;
    const pad = (value: number) => String(value).padStart(2, '0');
    desktop.publishFocus({
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      done,
      goal,
      streak,
      title: t('settings:nebula.widget.title'),
      value: t('settings:nebula.widget.value', { done, goal }),
      caption: t('settings:nebula.widget.caption', { count: streak }),
    });
  }, [sessions, goal, t, i18n.language]);

  // The Nebula appearance, 1 for 1 (same model): theme, accents, background, motion, sounds
  // and language — only while the user follows it. Accessibility settings stay local.
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop?.onNebulaAppearance) return undefined;
    return desktop.onNebulaAppearance((payload) => {
      if (!readFollow()) return;
      const { appearance, language } = clockAppearanceFromHub(payload);
      if (Object.keys(appearance).length > 0) updateAppearance(appearance);
      if (language) setLanguage(language);
    });
  }, [updateAppearance, setLanguage]);
}

/** For Settings: the Hub's state and its preferences. */
export function useNebulaHub(): {
  state: HubState | null;
  follow: boolean;
  setFollow: (follow: boolean) => void;
  setUpdatesByHub: (enabled: boolean) => void;
  setBreakReading: (enabled: boolean) => void;
} {
  const [state, setState] = useState<HubState | null>(null);
  const [follow, setFollowState] = useState(readFollow);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop?.getHubState) return undefined;
    void desktop.getHubState().then(setState, () => undefined);
    return desktop.onHubState?.(setState);
  }, []);

  const setFollow = useCallback((next: boolean) => {
    setFollowState(next);
    try {
      window.localStorage.setItem(FOLLOW_KEY, String(next));
    } catch {
      // Not persisted this session; the choice still applies.
    }
  }, []);

  const setUpdatesByHub = useCallback((enabled: boolean) => {
    void getDesktop()
      ?.setUpdatesByHub?.(enabled)
      .then(setState, () => undefined);
  }, []);

  const setBreakReading = useCallback((enabled: boolean) => {
    void getDesktop()
      ?.setBreakReading?.(enabled)
      .then(setState, () => undefined);
  }, []);

  return { state, follow, setFollow, setUpdatesByHub, setBreakReading };
}
