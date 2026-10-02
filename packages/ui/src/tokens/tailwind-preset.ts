import type { Config } from 'tailwindcss';

/**
 * Shared Tailwind preset, from nebula-design-system/tokens/tailwind-preset.ts.
 *
 * Every colour maps onto a CSS custom property from `tokens.css` rather than onto a literal, so
 * a component written with `bg-card text-text` follows the active theme (and the accent picker)
 * with no extra work, and no component ever hard-codes a Nebula colour. Nebula Clock changes:
 * the variables are the family's (`--page`, `--surface`, `--ink`…, see tokens.css), and each
 * colour goes through `color-mix` so opacity modifiers (`bg-accent/10`) work on variables.
 */
function token(variable: string): string {
  // Tailwind substitutes <alpha-value> with the modifier (1 when there is none).
  return `color-mix(in srgb, var(${variable}) calc(<alpha-value> * 100%), transparent)`;
}

export const nebulaPreset = {
  // Tuple, not string[]: Tailwind's DarkModeConfig is a fixed-arity type.
  darkMode: ['class', '[data-theme$="-dark"]'] as ['class', string],
  content: [],
  theme: {
    extend: {
      colors: {
        // Deliberately not called `base`: Tailwind would then generate `.text-base` as a
        // colour and clobber the font-size utility.
        canvas: token('--page'),
        surface: token('--surface-muted'),
        card: token('--surface'),
        'card-alt': token('--surface-raised'),
        border: token('--line'),
        'border-strong': token('--line-strong'),
        accent: token('--accent'),
        'accent-hover': token('--accent-hover'),
        'accent-from': token('--gold'),
        'accent-to': token('--accent'),
        success: token('--positive'),
        warning: token('--warning'),
        danger: token('--danger'),
        text: token('--ink'),
        'text-secondary': token('--muted'),
        'on-accent': token('--on-accent'),
      },
      backgroundImage: {
        'nebula-gradient': 'var(--accent-gradient)',
        'nebula-gradient-hover': 'var(--accent-gradient-hover)',
      },
      borderRadius: {
        sm: 'var(--radius-control)',
        DEFAULT: 'var(--radius-control)',
        md: 'var(--radius)',
        lg: 'var(--radius)',
        xl: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow)',
        strong: 'var(--shadow-strong)',
        glow: '0 10px 26px -12px var(--accent-glow)',
        focus: '0 0 0 2px var(--focus-ring)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      transitionTimingFunction: {
        nebula: 'var(--ease)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
    },
  },
  plugins: [],
} satisfies Omit<Config, 'content'> & { content: string[] };

export default nebulaPreset;
