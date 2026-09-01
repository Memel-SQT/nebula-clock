/**
 * TypeScript mirror of `tokens.css`.
 *
 * Needed where a value cannot come from CSS: canvas drawing (the dynamic
 * favicon), the Electron tray/window chrome, and PDF report generation.
 * Keep the two files in step.
 */
export const nebulaTokens = {
  dark: {
    bgBase: '#0A0A0F',
    bgSurface: '#12121F',
    card: '#1A1A2E',
    cardAlt: '#231942',
    border: '#2A2A45',
    text: '#F1F1F6',
    textSecondary: '#9A94B8',
  },
  light: {
    bgBase: '#F4F3FB',
    bgSurface: '#FFFFFF',
    card: '#FFFFFF',
    cardAlt: '#ECE9F9',
    border: '#DDD9EF',
    text: '#18172B',
    textSecondary: '#6B6584',
  },
  brand: {
    blue: '#4C6EF5',
    blueBright: '#5B5FEF',
    violet: '#8B5CF6',
    violetBright: '#A855F7',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F43F5E',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 14,
    xl: 18,
    pill: 999,
  },
  motion: {
    fast: 150,
    base: 220,
    slow: 420,
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type ThemeName = 'light' | 'dark';

/** Surface colours for the active theme, for canvas and native chrome. */
export function themeColors(theme: ThemeName) {
  return { ...nebulaTokens[theme], ...nebulaTokens.brand };
}
