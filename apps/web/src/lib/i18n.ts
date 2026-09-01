/**
 * react-i18next wiring.
 *
 * The catalogues and the language rules live in `@nebula-clock/core/i18n`;
 * this module only builds the runtime instance and keeps it in step with the
 * user's setting.
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_NAMESPACE,
  NAMESPACES,
  type SupportedLanguage,
  resolveLanguage,
  resources,
} from '@nebula-clock/core';
import type { LanguageSetting } from '@nebula-clock/core';

export async function initI18n(setting: LanguageSetting): Promise<typeof i18next> {
  const language = resolveLanguage(setting);

  await i18next.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    ns: [...NAMESPACES],
    defaultNS: DEFAULT_NAMESPACE,
    returnObjects: false,
    interpolation: {
      // React already escapes everything it renders.
      escapeValue: false,
    },
    react: { useSuspense: false },
  });

  syncDocumentLanguage(language);
  return i18next;
}

export function changeLanguage(setting: LanguageSetting): void {
  const language = resolveLanguage(setting);
  if (i18next.language === language) return;
  void i18next.changeLanguage(language);
  syncDocumentLanguage(language);
}

/** Keeps `<html lang>` truthful, which screen readers rely on. */
function syncDocumentLanguage(language: SupportedLanguage): void {
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}

export { i18next };
