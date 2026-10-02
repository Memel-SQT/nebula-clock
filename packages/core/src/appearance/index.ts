/**
 * The Nebula appearance model: themes, accent presets, animated background, motion level and
 * interface sounds. Framework-free and DOM-free, so the settings store, the import path and the
 * Nebula Hub mapping all share the same rules.
 *
 * Ported from Nebula Hub 05204fd, `packages/nebula-design/src/theme.ts` and `appearance.ts`
 * (themselves from Nebula Finterest v0.1.36): presets, parsers, `shade`, `rgba`, `luminance`
 * and `accentVariables` are unchanged. Nebula Clock differences:
 * - interface sounds are off by default (a focus app stays quiet unless asked);
 * - two accessibility fields live next to the family ones (`fontScale`, `highContrast`);
 * - the language stays a separate setting with a Clock-only `system` value;
 * - `migrateAppearance` also reads the pre-1.3 shape (`light | dark`, a hex accent,
 *   `reduceMotion`) so nobody loses their choice.
 */
import { LIMITS } from '../config/limits.js';

export type Theme = 'nebula-dark' | 'nebula-light' | 'glass-dark' | 'glass-light' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;
export type BackgroundEffect = 'glow' | 'aurora' | 'stars' | 'particles' | 'waves' | 'none';
export type MotionLevel = 'full' | 'reduced' | 'off';
export type AccentPresetId =
  'nebula' | 'aurora' | 'sunset' | 'ocean' | 'sakura' | 'ember' | 'custom';

/** Display order of the settings controls (family-wide). */
export const THEMES: readonly Theme[] = [
  'nebula-dark',
  'nebula-light',
  'glass-dark',
  'glass-light',
  'system',
];
export const DEFAULT_THEME: Theme = 'system';
export const BACKGROUNDS: readonly BackgroundEffect[] = [
  'glow',
  'aurora',
  'stars',
  'particles',
  'waves',
  'none',
];
export const MOTIONS: readonly MotionLevel[] = ['full', 'reduced', 'off'];

export interface AccentPreset {
  id: Exclude<AccentPresetId, 'custom'>;
  /** Main accent (buttons, active states); end of the accent gradient. */
  primary: string;
  /** Start of the accent gradient and the second ambient glow. */
  secondary: string;
}

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { id: 'nebula', primary: '#8b5cf6', secondary: '#4c6ef5' },
  { id: 'aurora', primary: '#10b981', secondary: '#06b6d4' },
  { id: 'ocean', primary: '#0ea5e9', secondary: '#6366f1' },
  { id: 'sunset', primary: '#ec4899', secondary: '#f97316' },
  { id: 'sakura', primary: '#f472b6', secondary: '#a78bfa' },
  { id: 'ember', primary: '#f59e0b', secondary: '#ef4444' },
];

/** The family's appearance (exactly what Nebula Hub broadcasts, minus theme and language). */
export interface FamilyAppearance {
  accentPreset: AccentPresetId;
  customPrimary: string;
  customSecondary: string;
  background: BackgroundEffect;
  motion: MotionLevel;
  soundEnabled: boolean;
  /** 0-100. */
  soundVolume: number;
}

/** What Nebula Clock persists: the family model, the theme, and two accessibility settings. */
export interface AppearanceSettings extends FamilyAppearance {
  theme: Theme;
  /** 0.875 .. 1.5 multiplier on the root font size. */
  fontScale: number;
  highContrast: boolean;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: DEFAULT_THEME,
  accentPreset: 'nebula',
  customPrimary: '#8b5cf6',
  customSecondary: '#4c6ef5',
  background: 'glow',
  motion: 'full',
  soundEnabled: false,
  soundVolume: 45,
  fontScale: 1,
  highContrast: false,
};

const PRESET_IDS: readonly AccentPresetId[] = [
  ...ACCENT_PRESETS.map((preset) => preset.id),
  'custom',
];
const HEX = /^#[0-9a-f]{6}$/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export const isHex = (value: unknown): value is string =>
  typeof value === 'string' && HEX.test(value);

/** `system` follows the OS between the two Nebula themes. */
export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return prefersDark ? 'nebula-dark' : 'nebula-light';
  return theme;
}

export function isLightTheme(theme: ResolvedTheme): boolean {
  return theme.endsWith('-light');
}

export function isGlassTheme(theme: ResolvedTheme): boolean {
  return theme.startsWith('glass-');
}

/** Before 1.3, Nebula Clock stored `light | dark | system` and the bright end of its gradient. */
const LEGACY_THEMES: Record<string, Theme> = {
  light: 'nebula-light',
  dark: 'nebula-dark',
  system: 'system',
};

/** Old accent (preset id or its bright hex) to the nearest family preset. */
const LEGACY_ACCENTS: Record<string, Exclude<AccentPresetId, 'custom'>> = {
  nebula: 'nebula',
  '#8b5cf6': 'nebula',
  blue: 'ocean',
  '#5b5fef': 'ocean',
  aurora: 'ocean',
  '#22d3ee': 'ocean',
  ember: 'ember',
  '#fbbf24': 'ember',
  rose: 'sunset',
  '#f43f5e': 'sunset',
  mint: 'aurora',
  '#34d399': 'aurora',
};

function clampVolume(value: unknown): number | null {
  // `Number(null)` is 0: a missing volume must fall back to the default, not mute the app.
  if (value === null || value === '' || value === undefined || typeof value === 'boolean') {
    return null;
  }
  const volume = Number(value);
  return Number.isFinite(volume) ? Math.min(100, Math.max(0, Math.round(volume))) : null;
}

/**
 * Field-by-field normalization of the family part (a parsed JSON, a Link message): every field
 * that is missing or invalid falls back to its own default without touching the others.
 */
export function normalizeFamilyAppearance(value: unknown): FamilyAppearance {
  const parsed = asRecord(value);
  return {
    accentPreset: PRESET_IDS.includes(parsed.accentPreset as AccentPresetId)
      ? (parsed.accentPreset as AccentPresetId)
      : DEFAULT_APPEARANCE.accentPreset,
    customPrimary: isHex(parsed.customPrimary)
      ? parsed.customPrimary.toLowerCase()
      : DEFAULT_APPEARANCE.customPrimary,
    customSecondary: isHex(parsed.customSecondary)
      ? parsed.customSecondary.toLowerCase()
      : DEFAULT_APPEARANCE.customSecondary,
    background: BACKGROUNDS.includes(parsed.background as BackgroundEffect)
      ? (parsed.background as BackgroundEffect)
      : DEFAULT_APPEARANCE.background,
    motion: MOTIONS.includes(parsed.motion as MotionLevel)
      ? (parsed.motion as MotionLevel)
      : DEFAULT_APPEARANCE.motion,
    soundEnabled:
      typeof parsed.soundEnabled === 'boolean'
        ? parsed.soundEnabled
        : DEFAULT_APPEARANCE.soundEnabled,
    soundVolume: clampVolume(parsed.soundVolume) ?? DEFAULT_APPEARANCE.soundVolume,
  };
}

/**
 * Reads any stored appearance, current or pre-1.3, field by field. The old fields are only
 * consulted when the new one is absent, so a migrated object never goes back.
 */
export function migrateAppearance(value: unknown): AppearanceSettings {
  const raw = asRecord(value);
  const patch: Record<string, unknown> = { ...raw };

  if (!isTheme(raw.theme) && typeof raw.theme === 'string' && LEGACY_THEMES[raw.theme]) {
    patch.theme = LEGACY_THEMES[raw.theme];
  }
  if (raw.accentPreset === undefined && typeof raw.accent === 'string') {
    const legacy = LEGACY_ACCENTS[raw.accent.toLowerCase()];
    if (legacy) {
      patch.accentPreset = legacy;
    } else if (isHex(raw.accent)) {
      patch.accentPreset = 'custom';
      patch.customPrimary = raw.accent;
      patch.customSecondary = DEFAULT_APPEARANCE.customSecondary;
    }
  }
  if (raw.motion === undefined && typeof raw.reduceMotion === 'boolean') {
    patch.motion = raw.reduceMotion ? 'reduced' : 'full';
  }

  const scale = Number(patch.fontScale);
  return {
    theme: isTheme(patch.theme) ? patch.theme : DEFAULT_APPEARANCE.theme,
    ...normalizeFamilyAppearance(patch),
    fontScale:
      typeof patch.fontScale === 'number' && Number.isFinite(scale)
        ? Math.min(LIMITS.fontScale.max, Math.max(LIMITS.fontScale.min, scale))
        : DEFAULT_APPEARANCE.fontScale,
    highContrast:
      typeof patch.highContrast === 'boolean'
        ? patch.highContrast
        : DEFAULT_APPEARANCE.highContrast,
  };
}

/**
 * The part of a Nebula appearance broadcast (`AppearanceV1`) that Nebula Clock applies: since
 * the model is the same, every valid field maps 1 for 1. Invalid or missing fields are left out
 * (the local value stays), never replaced by a default.
 */
export function familyAppearancePatch(value: unknown): Partial<AppearanceSettings> {
  const raw = asRecord(value);
  const normalized = normalizeFamilyAppearance(raw);
  const valid: Record<keyof FamilyAppearance, (field: unknown) => boolean> = {
    accentPreset: (field) => PRESET_IDS.includes(field as AccentPresetId),
    customPrimary: isHex,
    customSecondary: isHex,
    background: (field) => BACKGROUNDS.includes(field as BackgroundEffect),
    motion: (field) => MOTIONS.includes(field as MotionLevel),
    soundEnabled: (field) => typeof field === 'boolean',
    soundVolume: (field) => clampVolume(field) !== null,
  };
  const patch: Partial<AppearanceSettings> = {};
  if (isTheme(raw.theme)) patch.theme = raw.theme;
  for (const key of Object.keys(valid) as (keyof FamilyAppearance)[]) {
    if (valid[key](raw[key])) (patch as Record<string, unknown>)[key] = normalized[key];
  }
  return patch;
}

export function accentColors(appearance: FamilyAppearance): { primary: string; secondary: string } {
  if (appearance.accentPreset === 'custom') {
    return { primary: appearance.customPrimary, secondary: appearance.customSecondary };
  }
  const preset =
    ACCENT_PRESETS.find((candidate) => candidate.id === appearance.accentPreset) ??
    ACCENT_PRESETS[0]!;
  return { primary: preset.primary, secondary: preset.secondary };
}

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Mixes toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const weight = Math.abs(amount);
  return rgbToHex(
    hexToRgb(hex).map((channel) => channel + (target - channel) * weight) as [
      number,
      number,
      number,
    ],
  );
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const ACCENT_VARIABLES = [
  '--accent',
  '--accent-hover',
  '--accent-soft',
  '--accent-glow',
  '--on-accent',
  '--gold',
  '--gold-bright',
  '--gold-soft',
  '--focus-ring',
  '--glow-1',
  '--glow-2',
] as const;

export type AccentVariable = (typeof ACCENT_VARIABLES)[number];

/**
 * CSS variables for a custom accent, tuned per theme family: light themes get darker tones so
 * text on accent stays readable, glass themes get stronger glows since the translucent surfaces
 * let them through.
 */
export function accentVariables(
  primary: string,
  secondary: string,
  theme: ResolvedTheme,
): Record<AccentVariable, string> {
  const light = isLightTheme(theme);
  const glass = isGlassTheme(theme);
  const accent = light ? shade(primary, -0.18) : primary;
  const gold = light ? shade(secondary, -0.15) : secondary;
  const glowAlpha = glass ? (light ? 0.3 : 0.38) : light ? 0.1 : 0.16;
  const onAccent = luminance(accent) > 0.55 && luminance(gold) > 0.45 ? '#16151f' : '#ffffff';
  return {
    '--accent': accent,
    '--accent-hover': light ? shade(primary, -0.3) : shade(primary, 0.18),
    '--accent-soft': rgba(accent, light ? 0.1 : 0.16),
    '--accent-glow': rgba(accent, light ? 0.16 : 0.24),
    '--on-accent': onAccent,
    '--gold': gold,
    '--gold-bright': light ? shade(secondary, -0.25) : shade(secondary, 0.1),
    '--gold-soft': rgba(gold, light ? 0.1 : 0.18),
    '--focus-ring': rgba(primary, light ? 0.5 : 0.6),
    '--glow-1': rgba(secondary, glowAlpha),
    '--glow-2': rgba(primary, glowAlpha * 0.9),
  };
}

/**
 * The inline accent variables for an appearance, or `null` for the default Nebula accent (the
 * theme blocks already carry it).
 */
export function appearanceVariables(
  appearance: FamilyAppearance,
  theme: ResolvedTheme,
): Record<AccentVariable, string> | null {
  if (appearance.accentPreset === 'nebula') return null;
  const { primary, secondary } = accentColors(appearance);
  return accentVariables(primary, secondary, theme);
}
