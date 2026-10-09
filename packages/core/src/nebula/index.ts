/**
 * Nebula Hub integration, pure rules (Nebula Link). Framework-free like the rest of core: the
 * desktop shell calls these with what the renderer published.
 *
 * Only public data leaves Nebula Clock: today's pomodoro count against the goal, the streak, and
 * the start of a break. No task, no session detail, no history.
 */
import { familyAppearancePatch, type AppearanceSettings } from '../appearance/index.js';
import type { TimerStatus } from '../timer/types.js';
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

/** What Nebula Link answered to a query (the SDK's `LinkResult`, without depending on it). */
export type LinkAnswer = { ok: true; value: unknown } | { ok: false; error: string };

/** A Nebula News theme, ready to show during a break: plain texts, a link into News. */
export interface BreakReading {
  title: string;
  caption?: string;
  /** One line per article: its title and its source. */
  items: { label: string; value: string }[];
  /** `nebula://news/…` (the theme), opened by the main process only. */
  deepLink: string;
  updatedAt: string;
}

const MAX_TEXT = 80;
const MAX_ITEMS = 3;
// Control characters, and anything that looks like markup: the card is plain text only.
// eslint-disable-next-line no-control-regex
const UNSAFE_TEXT = /[\u0000-\u001f\u007f]|<\s*[a-z!/?]/i;
const NEWS_LINK = /^nebula:\/\/news\/[a-z0-9/-]{0,60}$/;

function plainText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= MAX_TEXT &&
    !UNSAFE_TEXT.test(value)
  );
}

/** `news.focus.today` refreshes every 900 s on News' side: an answer is kept that long. */
export const READING_REFRESH_MS = 15 * 60 * 1000;
/** No answer (Hub or News absent, News still starting, timeout): asked again this soon. */
export const READING_RETRY_MS = 30 * 1000;

/** How long an answer of News is kept before News is asked again. */
export function readingKeptMs(answer: LinkAnswer): number {
  return answer.ok ? READING_REFRESH_MS : READING_RETRY_MS;
}

/**
 * Where the reading card shows: during a break, and while the timer is idle. Never during a focus
 * session, running or paused: the card must not pull the user away from the work.
 */
export function readingShown(phase: Phase, status: TimerStatus): boolean {
  return phase !== 'focus' || status === 'idle';
}

/**
 * `news.focus.today` (`WidgetV1`), checked before anything reaches the renderer. Any failure —
 * no Hub, no News, consent refused, timeout, an empty theme (`null`) or a payload that breaks a
 * rule — gives null, and the card simply does not show.
 */
export function breakReadingFromLink(answer: LinkAnswer): BreakReading | null {
  if (!answer.ok) return null;
  const value = answer.value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const widget = value as Record<string, unknown>;

  if (!plainText(widget.title)) return null;
  if (widget.caption !== undefined && !plainText(widget.caption)) return null;
  // No dot, query or fragment can pass: only a News path the Hub will check again.
  if (typeof widget.deepLink !== 'string' || !NEWS_LINK.test(widget.deepLink)) return null;
  if (typeof widget.updatedAt !== 'string' || Number.isNaN(Date.parse(widget.updatedAt))) {
    return null;
  }

  const items = widget.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) return null;
  const lines: BreakReading['items'] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') return null;
    const { label, value: source } = item as Record<string, unknown>;
    if (!plainText(label) || !plainText(source)) return null;
    lines.push({ label, value: source });
  }

  return {
    title: widget.title,
    ...(widget.caption !== undefined ? { caption: widget.caption } : {}),
    items: lines,
    deepLink: widget.deepLink,
    updatedAt: widget.updatedAt,
  };
}

/**
 * Hub mode (Nebula Hub ADR-032): what the docked window does for a visible `nebula.hub.dock`
 * message. It is shown again if it was hidden, and raised above the Hub when it reappears or when
 * the Hub asks for it.
 */
export function dockedWindowSteps(
  wasVisible: boolean,
  raise: boolean,
): { show: boolean; raise: boolean } {
  return { show: !wasVisible, raise: raise || !wasVisible };
}

/** Longest wait for the docked window's page before the next Hub messages are handled. */
export const DOCK_LOAD_TIMEOUT_MS = 8000;

/** One article of the "Nebula News" tab (Nebula Hub ADR-036, `ArticlesV1`): plain texts only. */
export interface NewsArticle {
  title: string;
  source: string;
  publishedAt: string;
  summary?: string;
  /** `nebula://news/article?id=…`, opened by the main process only. */
  deepLink: string;
}

export interface NewsArticles {
  title: string;
  updatedAt: string;
  items: NewsArticle[];
}

/** `unavailable`: News did not answer (yet), `empty`: it has no article for the theme. */
export type NewsTab =
  { state: 'ready'; articles: NewsArticles } | { state: 'empty' | 'unavailable' };

export const NEWS_ARTICLES_CAPABILITY = 'news.focus.articles';
export const NEWS_ARTICLES_MAX = 20;
/** The tab keeps an answer of News this long, and no answer only `READING_RETRY_MS`. */
export const NEWS_TAB_REFRESH_MS = 5 * 60 * 1000;
const ARTICLE_LINK = /^nebula:\/\/news\/article\?id=[a-z0-9]{6,40}$/i;

function boundedText(value: unknown, max: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= max &&
    !UNSAFE_TEXT.test(value)
  );
}

/**
 * What Nebula News answered to `news.focus.articles`, checked before the renderer sees it: plain
 * bounded texts, valid dates, a link to one article in News, at most 20. Anything unexpected
 * rejects the whole list ("empty"); no answer at all is "unavailable" (asked again soon).
 */
export function newsTabFromLink(answer: LinkAnswer): NewsTab {
  if (!answer.ok) return { state: 'unavailable' };
  const value = answer.value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { state: 'empty' };
  const list = value as Record<string, unknown>;
  if (!boundedText(list.title, 80)) return { state: 'empty' };
  if (typeof list.updatedAt !== 'string' || Number.isNaN(Date.parse(list.updatedAt)))
    return { state: 'empty' };
  if (
    !Array.isArray(list.items) ||
    list.items.length === 0 ||
    list.items.length > NEWS_ARTICLES_MAX
  )
    return { state: 'empty' };
  const items: NewsArticle[] = [];
  for (const raw of list.items) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { state: 'empty' };
    const item = raw as Record<string, unknown>;
    if (!boundedText(item.title, 200) || !boundedText(item.source, 80)) return { state: 'empty' };
    if (item.summary !== undefined && !boundedText(item.summary, 400)) return { state: 'empty' };
    if (typeof item.publishedAt !== 'string' || Number.isNaN(Date.parse(item.publishedAt)))
      return { state: 'empty' };
    if (typeof item.deepLink !== 'string' || !ARTICLE_LINK.test(item.deepLink))
      return { state: 'empty' };
    items.push({
      title: item.title,
      source: item.source,
      publishedAt: item.publishedAt,
      ...(item.summary !== undefined ? { summary: item.summary } : {}),
      deepLink: item.deepLink,
    });
  }
  return { state: 'ready', articles: { title: list.title, updatedAt: list.updatedAt, items } };
}

/** How long the tab keeps what News answered. */
export function newsTabKeptMs(tab: NewsTab): number {
  return tab.state === 'unavailable' ? READING_RETRY_MS : NEWS_TAB_REFRESH_MS;
}

/** The only links the main process opens from the tab: one article in Nebula News. */
export function isNewsArticleLink(value: unknown): value is string {
  return typeof value === 'string' && ARTICLE_LINK.test(value);
}
