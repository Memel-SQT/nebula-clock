/**
 * Nebula Hub integration, pure rules (Nebula Link). Framework-free like the rest of core: the
 * desktop shell calls these with what the renderer published.
 *
 * Only public data leaves Nebula Clock: today's pomodoro count against the goal, the streak, and
 * the start of a break. No task, no session detail, no history.
 */
import { familyAppearancePatch, type AppearanceSettings } from '../appearance/index.js';
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

/**
 * What Nebula Clock takes from the Nebula appearance (`AppearanceV1`): Nebula Clock uses the
 * family model, so the theme, the accent (preset or custom pair), the background, the motion
 * level and the interface sounds map 1 for 1, plus the language. Anything unknown or invalid is
 * left out, field by field, and the local value stays.
 */
export function clockAppearanceFromHub(payload: unknown): {
  appearance: Partial<AppearanceSettings>;
  language?: 'fr' | 'en';
} {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const language =
    record.language === 'fr' || record.language === 'en' ? record.language : undefined;
  return { appearance: familyAppearancePatch(record), ...(language ? { language } : {}) };
}
