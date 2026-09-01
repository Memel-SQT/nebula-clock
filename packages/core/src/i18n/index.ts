/**
 * Translation catalogues, organised by domain so a screen only pulls in the
 * namespace it needs. The i18next *instance* is created by each app (the web
 * app wires react-i18next); core owns the resources and the language rules.
 */
import type { LanguageSetting, SupportedLanguage } from '../types.js';

import enCommon from './locales/en/common.json' with { type: 'json' };
import enTimer from './locales/en/timer.json' with { type: 'json' };
import enTasks from './locales/en/tasks.json' with { type: 'json' };
import enStats from './locales/en/stats.json' with { type: 'json' };
import enSettings from './locales/en/settings.json' with { type: 'json' };
import enNotifications from './locales/en/notifications.json' with { type: 'json' };

import frCommon from './locales/fr/common.json' with { type: 'json' };
import frTimer from './locales/fr/timer.json' with { type: 'json' };
import frTasks from './locales/fr/tasks.json' with { type: 'json' };
import frStats from './locales/fr/stats.json' with { type: 'json' };
import frSettings from './locales/fr/settings.json' with { type: 'json' };
import frNotifications from './locales/fr/notifications.json' with { type: 'json' };

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['fr', 'en'];

export const NAMESPACES = [
  'common',
  'timer',
  'tasks',
  'stats',
  'settings',
  'notifications',
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE: Namespace = 'common';

export const resources = {
  en: {
    common: enCommon,
    timer: enTimer,
    tasks: enTasks,
    stats: enStats,
    settings: enSettings,
    notifications: enNotifications,
  },
  fr: {
    common: frCommon,
    timer: frTimer,
    tasks: frTasks,
    stats: frStats,
    settings: frSettings,
    notifications: frNotifications,
  },
} as const;

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Turn a BCP-47 tag (`fr-CA`, `en-GB`) into one of the two shipped
 * languages, falling back to English for anything else.
 */
export function normalizeLanguage(tag: string | undefined | null): SupportedLanguage {
  if (!tag) return 'en';
  const base = tag.toLowerCase().split(/[-_]/)[0] ?? '';
  return isSupportedLanguage(base) ? base : 'en';
}

/**
 * Resolve the setting into an actual language. `system` reads the
 * browser/OS preference list on first launch; an explicit choice wins.
 */
export function resolveLanguage(
  setting: LanguageSetting,
  systemLanguages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): SupportedLanguage {
  if (setting !== 'system') return setting;
  for (const tag of systemLanguages) {
    const base = tag.toLowerCase().split(/[-_]/)[0] ?? '';
    if (isSupportedLanguage(base)) return base;
  }
  return 'en';
}
