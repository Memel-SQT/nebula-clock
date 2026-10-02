import {
  DEFAULT_APPEARANCE,
  accentVariables,
  appearanceVariables,
  migrateAppearance,
  normalizeFamilyAppearance,
  resolveTheme,
} from './index.js';

describe('migrateAppearance', () => {
  it('returns the defaults for anything that is not an object', () => {
    expect(migrateAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    expect(migrateAppearance('dark')).toEqual(DEFAULT_APPEARANCE);
    expect(migrateAppearance([1, 2])).toEqual(DEFAULT_APPEARANCE);
  });

  it('keeps interface sounds off by default in Nebula Clock', () => {
    expect(DEFAULT_APPEARANCE.soundEnabled).toBe(false);
    expect(DEFAULT_APPEARANCE.soundVolume).toBe(45);
  });

  it('reads the pre-1.3 shape: theme, preset accent and reduced motion', () => {
    expect(
      migrateAppearance({
        theme: 'light',
        accent: '#5B5FEF',
        fontScale: 1.25,
        reduceMotion: true,
        highContrast: true,
      }),
    ).toEqual({
      ...DEFAULT_APPEARANCE,
      theme: 'nebula-light',
      accentPreset: 'ocean',
      motion: 'reduced',
      fontScale: 1.25,
      highContrast: true,
    });
  });

  it('maps every old accent preset to the nearest family preset', () => {
    const map = (accent: string) => migrateAppearance({ accent }).accentPreset;
    expect(map('#8B5CF6')).toBe('nebula');
    expect(map('#22D3EE')).toBe('ocean');
    expect(map('#FBBF24')).toBe('ember');
    expect(map('#F43F5E')).toBe('sunset');
    expect(map('#34D399')).toBe('aurora');
    expect(map('mint')).toBe('aurora');
  });

  it('turns an old custom colour into a custom pair', () => {
    expect(migrateAppearance({ theme: 'dark', accent: '#12AB34' })).toMatchObject({
      theme: 'nebula-dark',
      accentPreset: 'custom',
      customPrimary: '#12ab34',
      customSecondary: DEFAULT_APPEARANCE.customSecondary,
    });
  });

  it('never lets old fields override a migrated value', () => {
    expect(
      migrateAppearance({
        theme: 'glass-dark',
        motion: 'off',
        reduceMotion: false,
        accent: 'mint',
        accentPreset: 'sakura',
      }),
    ).toMatchObject({ theme: 'glass-dark', motion: 'off', accentPreset: 'sakura' });
  });

  it('falls back field by field without breaking the others', () => {
    expect(
      migrateAppearance({
        theme: 'old-lux',
        accentPreset: 'sunset',
        background: 'lava',
        motion: 'reduced',
        soundVolume: 'loud',
        fontScale: 9,
        highContrast: 'yes',
      }),
    ).toEqual({
      ...DEFAULT_APPEARANCE,
      accentPreset: 'sunset',
      motion: 'reduced',
      fontScale: 1.5,
    });
  });

  it('is stable on its own output', () => {
    const once = migrateAppearance({ theme: 'dark', accent: '#12AB34', reduceMotion: true });
    expect(migrateAppearance(once)).toEqual(once);
  });
});

describe('normalizeFamilyAppearance', () => {
  it('clamps the volume and treats a missing one as the default, not silence', () => {
    expect(normalizeFamilyAppearance({ soundVolume: 140 }).soundVolume).toBe(100);
    expect(normalizeFamilyAppearance({ soundVolume: -3 }).soundVolume).toBe(0);
    expect(normalizeFamilyAppearance({ soundVolume: null }).soundVolume).toBe(45);
  });
});

describe('theme and accent variables', () => {
  it('resolves system to a Nebula theme', () => {
    expect(resolveTheme('system', true)).toBe('nebula-dark');
    expect(resolveTheme('system', false)).toBe('nebula-light');
    expect(resolveTheme('glass-light', true)).toBe('glass-light');
  });

  it('needs no inline variables for the default accent', () => {
    expect(appearanceVariables(DEFAULT_APPEARANCE, 'nebula-dark')).toBeNull();
  });

  it('darkens a custom accent on light themes and keeps text readable on it', () => {
    const dark = accentVariables('#f59e0b', '#ef4444', 'nebula-dark');
    const light = accentVariables('#f59e0b', '#ef4444', 'nebula-light');
    expect(dark['--accent']).toBe('#f59e0b');
    expect(light['--accent']).not.toBe('#f59e0b');
    expect(accentVariables('#fde68a', '#fef3c7', 'nebula-dark')['--on-accent']).toBe('#16151f');
  });
});
