import { describe, expect, it } from 'vitest';
import {
  NAMESPACES,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  normalizeLanguage,
  resolveLanguage,
  resources,
} from './index.js';

/** Every leaf path in a nested catalogue, so two languages can be compared. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [prefix];
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('language helpers', () => {
  it('recognises only the shipped languages', () => {
    expect(isSupportedLanguage('fr')).toBe(true);
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('de')).toBe(false);
  });

  it('normalises a regional tag down to its base language', () => {
    expect(normalizeLanguage('fr-CA')).toBe('fr');
    expect(normalizeLanguage('en_GB')).toBe('en');
    expect(normalizeLanguage('EN-us')).toBe('en');
  });

  it('falls back to English for anything unknown or missing', () => {
    expect(normalizeLanguage('de-DE')).toBe('en');
    expect(normalizeLanguage(undefined)).toBe('en');
    expect(normalizeLanguage(null)).toBe('en');
    expect(normalizeLanguage('')).toBe('en');
  });
});

describe('resolveLanguage', () => {
  it('honours an explicit choice regardless of the system list', () => {
    expect(resolveLanguage('fr', ['en-US'])).toBe('fr');
    expect(resolveLanguage('en', ['fr-FR'])).toBe('en');
  });

  it('takes the first supported entry of the system list', () => {
    expect(resolveLanguage('system', ['de-DE', 'fr-FR', 'en-US'])).toBe('fr');
    expect(resolveLanguage('system', ['en-GB'])).toBe('en');
  });

  it('falls back to English when the system offers nothing supported', () => {
    expect(resolveLanguage('system', ['de', 'it'])).toBe('en');
    expect(resolveLanguage('system', [])).toBe('en');
  });
});

describe('catalogues', () => {
  it('ships every namespace for every language', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      for (const namespace of NAMESPACES) {
        expect(resources[language][namespace], `${language}/${namespace}`).toBeTruthy();
      }
    }
  });

  it('keeps French and English structurally identical', () => {
    for (const namespace of NAMESPACES) {
      const en = keyPaths(resources.en[namespace]).sort();
      const fr = keyPaths(resources.fr[namespace]).sort();
      expect(fr, `namespace ${namespace}`).toEqual(en);
    }
  });

  it('has no empty strings left as placeholders', () => {
    const empties: string[] = [];
    for (const language of SUPPORTED_LANGUAGES) {
      for (const namespace of NAMESPACES) {
        const walk = (value: unknown, path: string): void => {
          if (typeof value === 'string') {
            if (value.trim() === '') empties.push(`${language}/${namespace}:${path}`);
            return;
          }
          if (Array.isArray(value)) {
            value.forEach((item, i) => walk(item, `${path}[${i}]`));
            return;
          }
          if (typeof value === 'object' && value !== null) {
            for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
          }
        };
        walk(resources[language][namespace], '');
      }
    }
    expect(empties).toEqual([]);
  });
});
