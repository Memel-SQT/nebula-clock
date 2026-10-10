/**
 * Appearance packs (Nebula Hub NEBULA_LINK.md § 18): extra themes that an installed Nebula app
 * shares with the family, with display names and logos. The desktop shell reads and checks them
 * (`@nebula/link` `readAppearancePacks`); the window only receives what it shows, never the
 * owner's executable path. A pack theme is drawn over the built-in theme of its scheme.
 */
export const OWN_APP_ID = 'nebula.clock';

export interface PackThemeView {
  id: string;
  scheme: 'dark' | 'light';
  label: { fr: string; en?: string };
  /** CSS custom properties set on the root while the theme is active. */
  tokens: Record<string, string>;
  /** Native window chrome colours. */
  chrome: { page: string; ink: string };
}

export interface PackView {
  id: string;
  themes: PackThemeView[];
  /** This app's display name while one of the pack's themes is active (install name unchanged). */
  name: string | null;
  /** This app's logo as a `data:image/svg+xml` URL, shown in an `<img>` only. */
  markUrl: string | null;
}

/** What `@nebula/link` hands over (only the fields used here). */
export interface PackSource {
  id: string;
  themes: PackThemeView[];
  names: Record<string, string>;
  marks: Record<string, string>;
}

export function packViewOf(pack: PackSource, svgUrl: (svg: string) => string): PackView {
  const mark = pack.marks[OWN_APP_ID];
  return {
    id: pack.id,
    themes: pack.themes.map(({ id, scheme, label, tokens, chrome }) => ({
      id,
      scheme,
      label,
      tokens,
      chrome,
    })),
    name: pack.names[OWN_APP_ID] ?? null,
    markUrl: mark ? svgUrl(mark) : null,
  };
}

export interface ActivePack {
  pack: PackView;
  theme: PackThemeView;
}

/** The chosen pack theme while its pack is there; otherwise the built-in theme applies. */
export function findPackTheme(
  packs: readonly PackView[],
  themeId: string | null | undefined,
): ActivePack | null {
  if (!themeId) return null;
  for (const pack of packs) {
    const theme = pack.themes.find((candidate) => candidate.id === themeId);
    if (theme) return { pack, theme };
  }
  return null;
}

export function packLabel(label: PackThemeView['label'], language: string): string {
  return (language.startsWith('en') ? label.en : undefined) ?? label.fr;
}

/** The built-in theme a pack theme is drawn over (every shared selector keeps matching). */
export function packBaseTheme(scheme: PackThemeView['scheme']): 'nebula-dark' | 'nebula-light' {
  return scheme === 'light' ? 'nebula-light' : 'nebula-dark';
}

/** Checks what the desktop shell sent: a list of packs in the shape above, or nothing. */
export function asPackViews(value: unknown): PackView[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (pack): pack is PackView =>
      Boolean(pack) &&
      typeof pack === 'object' &&
      typeof (pack as PackView).id === 'string' &&
      Array.isArray((pack as PackView).themes),
  );
}
