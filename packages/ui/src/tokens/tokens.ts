/**
 * TypeScript mirror of `tokens.css`, for the places a CSS variable cannot reach: canvas drawing
 * (the dynamic favicon), the Electron window chrome (title bar controls, first-paint
 * background) and the PDF report. Keep it in step with `tokens.css`; the values are the family
 * ones (Nebula Hub 05204fd, `packages/nebula-design/src/styles/tokens.css`).
 */
import type { ResolvedTheme } from '@nebula-clock/core/appearance';

export const nebulaTokens = {
  dark: {
    bgBase: '#0a0a0f',
    bgSurface: '#12121f',
    card: '#1a1a2e',
    cardAlt: '#231942',
    border: '#2a2a45',
    text: '#f1f1f6',
    textSecondary: '#9a94b8',
  },
  light: {
    bgBase: '#f4f3fb',
    bgSurface: '#ffffff',
    card: '#ffffff',
    cardAlt: '#ece9f9',
    border: '#ddd9ef',
    text: '#18172b',
    textSecondary: '#6b6584',
  },
  brand: {
    blue: '#4c6ef5',
    blueBright: '#5b5fef',
    violet: '#8b5cf6',
    violetBright: '#a855f7',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#fb7185',
    /** Break phases in the favicon: the positive and warning hues of the family. */
    teal: '#2dd4bf',
    orange: '#f97316',
  },
  radius: { control: 8, card: 12, panel: 18, pill: 999 },
  motion: { fast: 150, base: 220, slow: 420, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' },
} as const;

/** Page and ink colours of each theme, for the native window chrome. */
export const THEME_CHROME: Record<ResolvedTheme, { page: string; ink: string }> = {
  'nebula-dark': { page: '#0a0a0f', ink: '#f1f1f6' },
  'nebula-light': { page: '#f4f3fb', ink: '#18172b' },
  'glass-dark': { page: '#06060f', ink: '#f5f4ff' },
  'glass-light': { page: '#e9ebf8', ink: '#17162a' },
};

export type ThemeName = 'light' | 'dark';

/** Surface colours for a theme family, for canvas drawing. */
export function themeColors(theme: ThemeName) {
  return { ...nebulaTokens[theme], ...nebulaTokens.brand };
}
