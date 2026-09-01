import type { Config } from 'tailwindcss';

/**
 * Shared Tailwind preset.
 *
 * Every colour maps onto a CSS custom property from `tokens.css` rather than
 * onto a literal, so a component written with `bg-card text-text` follows the
 * active theme (and the accent picker) with no extra work, and no component
 * ever hard-codes a Nebula colour.
 */
export const nebulaPreset = {
  // Tuple, not string[]: Tailwind's DarkModeConfig is a fixed-arity type.
  darkMode: ['class', '[data-theme="dark"]'] as ['class', string],
  content: [],
  theme: {
    extend: {
      colors: {
        // Deliberately not called `base`: Tailwind would then generate
        // `.text-base` as a colour and clobber the font-size utility.
        canvas: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        card: 'var(--card)',
        'card-alt': 'var(--card-alt)',
        border: 'var(--border)',
        blue: 'var(--blue)',
        'blue-bright': 'var(--blue-bright)',
        violet: 'var(--violet)',
        'violet-bright': 'var(--violet-bright)',
        accent: 'var(--accent-to)',
        'accent-from': 'var(--accent-from)',
        'accent-to': 'var(--accent-to)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        text: 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
      },
      backgroundImage: {
        'nebula-gradient': 'var(--accent-gradient)',
        'nebula-gradient-hover': 'var(--accent-gradient-hover)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        card: 'var(--shadow-card)',
        'ring-soft': 'var(--ring-soft)',
        'ring-strong': 'var(--ring-strong)',
        focus: 'var(--focus-ring)',
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
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up var(--motion-slow) var(--ease) forwards',
        'fade-in': 'fade-in var(--motion-base) var(--ease) forwards',
        'scale-in': 'scale-in var(--motion-base) var(--ease) forwards',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Omit<Config, 'content'> & { content: string[] };

export default nebulaPreset;
