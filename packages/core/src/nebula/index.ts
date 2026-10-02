/**
 * Nebula Hub integration, pure rules (Nebula Link). Framework-free like the rest of core: the
 * desktop shell calls these with what the renderer published.
 *
 * Only public data leaves Nebula Clock: today's pomodoro count against the goal, the streak, and
 * the start of a break. No task, no session detail, no history.
 */
import type { Phase } from '../types.js';

/** What the renderer publishes for the Hub's "Today's focus" widget (texts already translated). */
export interface FocusTodayPublication {
  /** `YYYY-MM-DD`, local. */
  date: string;
  done: number;
  goal: number;
  streak: number;
  title: string;
  value: string;
  caption: string;
}

/** The Nebula Link widget shape (`WidgetV1`): short texts only, drawn by the Hub itself. */
export interface NebulaWidget {
  title: string;
  value?: string;
  caption?: string;
  deepLink?: string;
  updatedAt: string;
}

const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;

/** `clock.focus.today`: null until the renderer has published today's figures. */
export function focusTodayWidget(
  focus: FocusTodayPublication | null,
  now: Date,
): NebulaWidget | null {
  if (!focus) return null;
  return {
    title: clip(focus.title, 80),
    value: clip(focus.value, 80),
    caption: clip(focus.caption, 80),
    deepLink: 'nebula://clock/',
    updatedAt: now.toISOString(),
  };
}

/** The part of the timer snapshot needed to see a break begin. */
export interface PhaseState {
  phase: Phase;
  status: 'idle' | 'running' | 'paused';
  remainingSeconds: number;
}

/**
 * `clock.break.started` (`BreakStartedV1`): a break that just started running, coming from
 * anything else (a focus phase, or the same break being idle). Null otherwise, so a paused and
 * resumed break is not announced twice.
 */
export function breakStarted(
  previous: PhaseState | null,
  next: PhaseState,
): { kind: 'short' | 'long'; durationMin: number } | null {
  if (next.status !== 'running' || next.phase === 'focus') return null;
  if (previous && previous.phase === next.phase && previous.status !== 'idle') return null;
  return {
    kind: next.phase === 'longBreak' ? 'long' : 'short',
    durationMin: Math.min(240, Math.max(1, Math.round(next.remainingSeconds / 60))),
  };
}

/** Primary accent of each Nebula preset (the Hub broadcasts the preset id, `@nebula/design`). */
const HUB_ACCENTS: Record<string, string> = {
  nebula: '#8B5CF6',
  aurora: '#10B981',
  ocean: '#0EA5E9',
  sunset: '#EC4899',
  sakura: '#F472B6',
  ember: '#F59E0B',
};

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * What Nebula Clock takes from the Nebula appearance (`AppearanceV1`): the light or dark theme,
 * the accent colour and the language. Anything unknown is ignored, field by field.
 */
export function clockAppearanceFromHub(payload: unknown): {
  theme?: 'light' | 'dark' | 'system';
  accent?: string;
  language?: 'fr' | 'en';
} {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const result: { theme?: 'light' | 'dark' | 'system'; accent?: string; language?: 'fr' | 'en' } =
    {};
  if (record.theme === 'system') result.theme = 'system';
  else if (typeof record.theme === 'string' && /^(nebula|glass)-(dark|light)$/.test(record.theme)) {
    result.theme = record.theme.endsWith('-light') ? 'light' : 'dark';
  }
  if (
    record.accentPreset === 'custom' &&
    typeof record.customPrimary === 'string' &&
    HEX.test(record.customPrimary)
  ) {
    result.accent = record.customPrimary.toUpperCase();
  } else if (typeof record.accentPreset === 'string' && HUB_ACCENTS[record.accentPreset]) {
    result.accent = HUB_ACCENTS[record.accentPreset];
  }
  if (record.language === 'fr' || record.language === 'en') result.language = record.language;
  return result;
}
