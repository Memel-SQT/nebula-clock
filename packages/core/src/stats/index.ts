/**
 * Statistics derived from the session log.
 *
 * Every function here is pure and takes the sessions it needs, so the whole
 * module is unit-testable with hand-written fixtures and the UI can memoise
 * freely.
 */
import { BADGES } from '../config/index.js';
import type { BadgeDefinition, DayKey, EarnedBadge, GoalSettings, Session } from '../types.js';
import {
  addDays,
  daysBetween,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toDayKey,
} from '../utils/index.js';

export type RangeKind = 'day' | 'week' | 'month' | 'year';

export interface DateRange {
  start: number;
  /** Exclusive. */
  end: number;
}

/** The range containing `reference`, in the user's local timezone. */
export function getRange(kind: RangeKind, reference: number = Date.now()): DateRange {
  switch (kind) {
    case 'day': {
      const start = startOfDay(reference);
      return { start, end: addDays(start, 1) };
    }
    case 'week': {
      const start = startOfWeek(reference);
      return { start, end: addDays(start, 7) };
    }
    case 'month': {
      const start = startOfMonth(reference);
      const next = new Date(start);
      next.setMonth(next.getMonth() + 1);
      return { start, end: next.getTime() };
    }
    case 'year': {
      const start = startOfYear(reference);
      const next = new Date(start);
      next.setFullYear(next.getFullYear() + 1);
      return { start, end: next.getTime() };
    }
  }
}

export function filterByRange(sessions: readonly Session[], range: DateRange): Session[] {
  return sessions.filter((s) => s.startedAt >= range.start && s.startedAt < range.end);
}

export const isFocus = (s: Session): boolean => s.phase === 'focus';
/** A "pomodoro" is a focus phase that ran to completion. */
export const isPomodoro = (s: Session): boolean => s.phase === 'focus' && s.completed;

export interface StatsSummary {
  /** Seconds of focus actually spent, including abandoned attempts. */
  focusSeconds: number;
  /** Seconds spent on breaks. */
  breakSeconds: number;
  /** Completed focus sessions. */
  pomodoros: number;
  /** Focus sessions started, completed or not. */
  focusAttempts: number;
  /** `pomodoros / focusAttempts`, 0 when nothing was attempted. */
  completionRate: number;
  /** Mean length of a completed focus session, in seconds. */
  averagePomodoroSeconds: number;
  /** Distinct local days with at least one completed focus session. */
  activeDays: number;
}

export function summarize(sessions: readonly Session[]): StatsSummary {
  let focusSeconds = 0;
  let breakSeconds = 0;
  let pomodoros = 0;
  let focusAttempts = 0;
  let pomodoroSeconds = 0;
  const days = new Set<DayKey>();

  for (const session of sessions) {
    if (isFocus(session)) {
      focusSeconds += session.durationSeconds;
      focusAttempts += 1;
      if (session.completed) {
        pomodoros += 1;
        pomodoroSeconds += session.durationSeconds;
        days.add(toDayKey(session.startedAt));
      }
    } else {
      breakSeconds += session.durationSeconds;
    }
  }

  return {
    focusSeconds,
    breakSeconds,
    pomodoros,
    focusAttempts,
    completionRate: focusAttempts === 0 ? 0 : pomodoros / focusAttempts,
    averagePomodoroSeconds: pomodoros === 0 ? 0 : Math.round(pomodoroSeconds / pomodoros),
    activeDays: days.size,
  };
}

export interface Bucket {
  /** Stable key: `YYYY-MM-DD`, `YYYY-MM`, or `HH` for the hourly view. */
  key: string;
  start: number;
  end: number;
  focusSeconds: number;
  pomodoros: number;
}

/**
 * Split a range into chart buckets: hours for a day, days for a week or a
 * month, months for a year. Empty buckets are kept so the chart keeps a
 * stable x-axis instead of collapsing quiet periods.
 */
export function bucketize(
  sessions: readonly Session[],
  kind: RangeKind,
  reference: number = Date.now(),
): Bucket[] {
  const range = getRange(kind, reference);
  const buckets: Bucket[] = [];

  if (kind === 'day') {
    for (let hour = 0; hour < 24; hour += 1) {
      const start = range.start + hour * 3_600_000;
      buckets.push({
        key: `${hour}`.padStart(2, '0'),
        start,
        end: start + 3_600_000,
        focusSeconds: 0,
        pomodoros: 0,
      });
    }
  } else if (kind === 'year') {
    const year = new Date(range.start).getFullYear();
    for (let month = 0; month < 12; month += 1) {
      const start = new Date(year, month, 1).getTime();
      const end = new Date(year, month + 1, 1).getTime();
      buckets.push({
        key: `${year}-${`${month + 1}`.padStart(2, '0')}`,
        start,
        end,
        focusSeconds: 0,
        pomodoros: 0,
      });
    }
  } else {
    for (let cursor = range.start; cursor < range.end; cursor = addDays(cursor, 1)) {
      buckets.push({
        key: toDayKey(cursor),
        start: cursor,
        end: addDays(cursor, 1),
        focusSeconds: 0,
        pomodoros: 0,
      });
    }
  }

  for (const session of sessions) {
    if (!isFocus(session)) continue;
    if (session.startedAt < range.start || session.startedAt >= range.end) continue;
    const index = buckets.findIndex(
      (b) => session.startedAt >= b.start && session.startedAt < b.end,
    );
    const bucket = buckets[index];
    if (!bucket) continue;
    bucket.focusSeconds += session.durationSeconds;
    if (session.completed) bucket.pomodoros += 1;
  }

  return buckets;
}

export interface DayTotal {
  day: DayKey;
  pomodoros: number;
  focusSeconds: number;
}

/** Per-day totals across the whole history; the basis for streaks and the calendar. */
export function dailyTotals(sessions: readonly Session[]): Map<DayKey, DayTotal> {
  const totals = new Map<DayKey, DayTotal>();
  for (const session of sessions) {
    if (!isFocus(session)) continue;
    const day = toDayKey(session.startedAt);
    const current = totals.get(day) ?? { day, pomodoros: 0, focusSeconds: 0 };
    current.focusSeconds += session.durationSeconds;
    if (session.completed) current.pomodoros += 1;
    totals.set(day, current);
  }
  return totals;
}

export interface StreakInfo {
  /** Consecutive goal-hit days ending today (or yesterday, if today is still open). */
  current: number;
  /** Best run ever recorded. */
  longest: number;
  /** Whether today's goal is already met. */
  achievedToday: boolean;
}

/**
 * A day counts toward the streak when its completed pomodoros reach the
 * daily goal. Today is allowed to be "not yet done" without breaking the
 * run -- the streak only dies once a *finished* day is missed.
 */
export function computeStreak(
  sessions: readonly Session[],
  dailyGoal: number,
  today: number = Date.now(),
): StreakInfo {
  const goal = Math.max(1, dailyGoal);
  const totals = dailyTotals(sessions);
  const hit = (timestamp: number): boolean =>
    (totals.get(toDayKey(timestamp))?.pomodoros ?? 0) >= goal;

  const achievedToday = hit(today);
  let cursor = achievedToday ? startOfDay(today) : addDays(startOfDay(today), -1);
  let current = 0;
  while (hit(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // Longest run: walk the goal-hit days in chronological order.
  const achievedDays = [...totals.values()]
    .filter((t) => t.pomodoros >= goal)
    .map((t) => startOfDay(new Date(`${t.day}T00:00:00`).getTime()))
    .sort((a, b) => a - b);

  let longest = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of achievedDays) {
    run = previous !== null && daysBetween(previous, day) === 1 ? run + 1 : 1;
    previous = day;
    if (run > longest) longest = run;
  }

  return { current, longest: Math.max(longest, current), achievedToday };
}

export interface GoalProgress {
  done: number;
  target: number;
  /** 0..1, clamped. */
  ratio: number;
  reached: boolean;
}

function progressOf(done: number, target: number): GoalProgress {
  const safeTarget = Math.max(1, target);
  return {
    done,
    target: safeTarget,
    ratio: Math.min(1, done / safeTarget),
    reached: done >= safeTarget,
  };
}

export function dailyGoalProgress(
  sessions: readonly Session[],
  goals: GoalSettings,
  reference: number = Date.now(),
): GoalProgress {
  const today = filterByRange(sessions, getRange('day', reference));
  return progressOf(today.filter(isPomodoro).length, goals.dailyPomodoros);
}

export function weeklyGoalProgress(
  sessions: readonly Session[],
  goals: GoalSettings,
  reference: number = Date.now(),
): GoalProgress {
  const week = filterByRange(sessions, getRange('week', reference));
  return progressOf(week.filter(isPomodoro).length, goals.weeklyPomodoros);
}

/** Badge state for the whole history, including progress toward locked ones. */
export function evaluateBadges(
  sessions: readonly Session[],
  goals: GoalSettings,
  today: number = Date.now(),
  definitions: readonly BadgeDefinition[] = BADGES,
): EarnedBadge[] {
  const summary = summarize(sessions);
  const streak = computeStreak(sessions, goals.dailyPomodoros, today);
  const focusHours = summary.focusSeconds / 3600;

  return definitions.map((definition) => {
    const value =
      definition.kind === 'sessions'
        ? summary.pomodoros
        : definition.kind === 'streak'
          ? streak.longest
          : focusHours;
    return {
      ...definition,
      earned: value >= definition.threshold,
      progress: Math.min(1, value / definition.threshold),
    };
  });
}

export interface TimelineEntry extends Session {
  /** Resolved for display so the timeline does not need a second lookup. */
  taskTitle: string | null;
}

/** Most recent first, ready to render as a timeline. */
export function buildTimeline(
  sessions: readonly Session[],
  taskTitles: ReadonlyMap<string, string>,
  limit = 100,
): TimelineEntry[] {
  return [...sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit)
    .map((session) => ({
      ...session,
      taskTitle: session.taskId ? (taskTitles.get(session.taskId) ?? null) : null,
    }));
}

export interface CalendarCell {
  day: DayKey;
  date: number;
  pomodoros: number;
  focusSeconds: number;
  /** 0..4 heat level, for the calendar colour ramp. */
  level: number;
  inMonth: boolean;
}

/**
 * A Monday-first calendar grid for `reference`'s month, padded with the
 * neighbouring days so every row has seven cells.
 */
export function buildCalendar(
  sessions: readonly Session[],
  goals: GoalSettings,
  reference: number = Date.now(),
): CalendarCell[] {
  const totals = dailyTotals(sessions);
  const monthStart = startOfMonth(reference);
  const gridStart = startOfWeek(monthStart);
  const monthIndex = new Date(monthStart).getMonth();
  const goal = Math.max(1, goals.dailyPomodoros);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(gridStart, i);
    const day = toDayKey(date);
    const total = totals.get(day);
    const pomodoros = total?.pomodoros ?? 0;
    cells.push({
      day,
      date,
      pomodoros,
      focusSeconds: total?.focusSeconds ?? 0,
      level: pomodoros === 0 ? 0 : Math.min(4, Math.ceil((pomodoros / goal) * 4)),
      inMonth: new Date(date).getMonth() === monthIndex,
    });
  }
  return cells;
}
