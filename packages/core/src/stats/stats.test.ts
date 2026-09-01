import { describe, expect, it } from 'vitest';
import type { GoalSettings, Phase, Session } from '../types.js';
import { toDayKey } from '../utils/index.js';
import {
  bucketize,
  buildCalendar,
  buildTimeline,
  computeStreak,
  dailyGoalProgress,
  dailyTotals,
  evaluateBadges,
  filterByRange,
  getRange,
  isPomodoro,
  summarize,
  weeklyGoalProgress,
} from './index.js';

const goals: GoalSettings = { dailyPomodoros: 4, weeklyPomodoros: 20 };

let counter = 0;
function session(startedAt: number, overrides: Partial<Session> = {}): Session {
  const phase: Phase = overrides.phase ?? 'focus';
  const durationSeconds = overrides.durationSeconds ?? 1500;
  counter += 1;
  return {
    id: `s${counter}`,
    phase,
    startedAt,
    endedAt: startedAt + durationSeconds * 1000,
    durationSeconds,
    plannedSeconds: 1500,
    completed: true,
    taskId: null,
    tagIds: [],
    ...overrides,
  };
}

/** Local noon on a given day, so no test ever straddles midnight. */
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

describe('getRange', () => {
  it('bounds a day, week, month and year in local time', () => {
    const reference = at(2026, 3, 14, 15);

    const day = getRange('day', reference);
    expect(toDayKey(day.start)).toBe('2026-03-14');
    expect(day.end - day.start).toBe(86_400_000);

    const week = getRange('week', reference);
    expect(toDayKey(week.start)).toBe('2026-03-09');
    expect(toDayKey(week.end - 1)).toBe('2026-03-15');

    const month = getRange('month', reference);
    expect(toDayKey(month.start)).toBe('2026-03-01');
    expect(toDayKey(month.end)).toBe('2026-04-01');

    const year = getRange('year', reference);
    expect(toDayKey(year.start)).toBe('2026-01-01');
    expect(toDayKey(year.end)).toBe('2027-01-01');
  });
});

describe('filterByRange', () => {
  it('keeps sessions that started inside the half-open range', () => {
    const range = getRange('day', at(2026, 3, 14));
    const sessions = [
      session(at(2026, 3, 13, 23)),
      session(range.start),
      session(at(2026, 3, 14, 20)),
      session(range.end),
    ];
    expect(filterByRange(sessions, range)).toHaveLength(2);
  });
});

describe('summarize', () => {
  it('separates focus from break time and counts only completed pomodoros', () => {
    const day = at(2026, 3, 14);
    const summary = summarize([
      session(day, { durationSeconds: 1500 }),
      session(day + 1, { durationSeconds: 600, completed: false }),
      session(day + 2, { phase: 'shortBreak', durationSeconds: 300 }),
      session(day + 3, { phase: 'longBreak', durationSeconds: 900 }),
    ]);

    expect(summary.focusSeconds).toBe(2100);
    expect(summary.breakSeconds).toBe(1200);
    expect(summary.pomodoros).toBe(1);
    expect(summary.focusAttempts).toBe(2);
    expect(summary.completionRate).toBe(0.5);
    expect(summary.averagePomodoroSeconds).toBe(1500);
    expect(summary.activeDays).toBe(1);
  });

  it('returns zeroes rather than NaN for an empty history', () => {
    const summary = summarize([]);
    expect(summary.completionRate).toBe(0);
    expect(summary.averagePomodoroSeconds).toBe(0);
    expect(summary.activeDays).toBe(0);
  });

  it('counts distinct active days', () => {
    const summary = summarize([
      session(at(2026, 3, 12)),
      session(at(2026, 3, 12, 15)),
      session(at(2026, 3, 13)),
    ]);
    expect(summary.activeDays).toBe(2);
  });
});

describe('isPomodoro', () => {
  it('is true only for completed focus phases', () => {
    expect(isPomodoro(session(at(2026, 3, 14)))).toBe(true);
    expect(isPomodoro(session(at(2026, 3, 14), { completed: false }))).toBe(false);
    expect(isPomodoro(session(at(2026, 3, 14), { phase: 'shortBreak' }))).toBe(false);
  });
});

describe('bucketize', () => {
  it('produces 24 hourly buckets for a day and files sessions by hour', () => {
    const reference = at(2026, 3, 14);
    const buckets = bucketize(
      [session(at(2026, 3, 14, 9)), session(at(2026, 3, 14, 9, 30))],
      'day',
      reference,
    );
    expect(buckets).toHaveLength(24);
    expect(buckets[9]?.pomodoros).toBe(2);
    expect(buckets[10]?.pomodoros).toBe(0);
  });

  it('produces seven daily buckets for a week', () => {
    const reference = at(2026, 3, 14);
    const buckets = bucketize([session(at(2026, 3, 11))], 'week', reference);
    expect(buckets).toHaveLength(7);
    expect(buckets[0]?.key).toBe('2026-03-09');
    expect(buckets[2]?.pomodoros).toBe(1);
  });

  it('produces one bucket per day of the month', () => {
    const buckets = bucketize([], 'month', at(2026, 2, 10));
    expect(buckets).toHaveLength(28);
  });

  it('produces twelve monthly buckets for a year', () => {
    const buckets = bucketize([session(at(2026, 5, 4))], 'year', at(2026, 1, 1));
    expect(buckets).toHaveLength(12);
    expect(buckets[4]?.key).toBe('2026-05');
    expect(buckets[4]?.pomodoros).toBe(1);
  });

  it('keeps empty buckets so the axis stays stable', () => {
    const buckets = bucketize([], 'week', at(2026, 3, 14));
    expect(buckets.every((b) => b.pomodoros === 0 && b.focusSeconds === 0)).toBe(true);
  });

  it('ignores breaks and sessions outside the range', () => {
    const buckets = bucketize(
      [
        session(at(2026, 3, 11), { phase: 'shortBreak', durationSeconds: 300 }),
        session(at(2026, 4, 11)),
      ],
      'week',
      at(2026, 3, 14),
    );
    expect(buckets.reduce((sum, b) => sum + b.focusSeconds, 0)).toBe(0);
  });

  it('counts an abandoned focus in the time total but not in the pomodoro count', () => {
    const buckets = bucketize(
      [session(at(2026, 3, 11), { completed: false, durationSeconds: 400 })],
      'week',
      at(2026, 3, 14),
    );
    expect(buckets[2]?.focusSeconds).toBe(400);
    expect(buckets[2]?.pomodoros).toBe(0);
  });
});

describe('dailyTotals', () => {
  it('groups focus time and pomodoros per local day', () => {
    const totals = dailyTotals([
      session(at(2026, 3, 14, 9)),
      session(at(2026, 3, 14, 11), { completed: false, durationSeconds: 300 }),
      session(at(2026, 3, 15, 9)),
      session(at(2026, 3, 15, 10), { phase: 'longBreak' }),
    ]);

    expect(totals.get('2026-03-14')).toEqual({
      day: '2026-03-14',
      pomodoros: 1,
      focusSeconds: 1800,
    });
    expect(totals.get('2026-03-15')?.pomodoros).toBe(1);
  });
});

describe('computeStreak', () => {
  const daysOf = (dates: number[]) =>
    dates.flatMap((d) => Array.from({ length: 4 }, () => session(d)));

  it('counts consecutive days that hit the daily goal', () => {
    const today = at(2026, 3, 14);
    const streak = computeStreak(
      daysOf([at(2026, 3, 12), at(2026, 3, 13), today]),
      goals.dailyPomodoros,
      today,
    );
    expect(streak.current).toBe(3);
    expect(streak.achievedToday).toBe(true);
    expect(streak.longest).toBe(3);
  });

  it('keeps the streak alive while today is still unfinished', () => {
    const today = at(2026, 3, 14);
    const streak = computeStreak(
      daysOf([at(2026, 3, 12), at(2026, 3, 13)]),
      goals.dailyPomodoros,
      today,
    );
    expect(streak.achievedToday).toBe(false);
    expect(streak.current).toBe(2);
  });

  it('breaks the streak on a missed day', () => {
    const today = at(2026, 3, 14);
    const streak = computeStreak(
      daysOf([at(2026, 3, 10), at(2026, 3, 11), at(2026, 3, 13), today]),
      goals.dailyPomodoros,
      today,
    );
    expect(streak.current).toBe(2);
    expect(streak.longest).toBe(2);
  });

  it('does not count a day that falls short of the goal', () => {
    const today = at(2026, 3, 14);
    const streak = computeStreak([session(today), session(today + 1)], goals.dailyPomodoros, today);
    expect(streak.current).toBe(0);
    expect(streak.achievedToday).toBe(false);
  });

  it('reports the historical best even when the current run is shorter', () => {
    const today = at(2026, 3, 20);
    const streak = computeStreak(
      daysOf([
        at(2026, 3, 1),
        at(2026, 3, 2),
        at(2026, 3, 3),
        at(2026, 3, 4),
        at(2026, 3, 19),
        today,
      ]),
      goals.dailyPomodoros,
      today,
    );
    expect(streak.current).toBe(2);
    expect(streak.longest).toBe(4);
  });

  it('handles an empty history', () => {
    expect(computeStreak([], 4, at(2026, 3, 14))).toEqual({
      current: 0,
      longest: 0,
      achievedToday: false,
    });
  });

  it('treats a goal of zero as one', () => {
    const today = at(2026, 3, 14);
    expect(computeStreak([session(today)], 0, today).current).toBe(1);
  });
});

describe('goal progress', () => {
  it('measures today against the daily goal', () => {
    const today = at(2026, 3, 14);
    const progress = dailyGoalProgress([session(today), session(today + 1)], goals, today);
    expect(progress).toEqual({ done: 2, target: 4, ratio: 0.5, reached: false });
  });

  it('clamps the ratio once the goal is beaten', () => {
    const today = at(2026, 3, 14);
    const sessions = Array.from({ length: 9 }, (_, i) => session(today + i));
    const progress = dailyGoalProgress(sessions, goals, today);
    expect(progress.ratio).toBe(1);
    expect(progress.reached).toBe(true);
  });

  it('measures the whole week against the weekly goal', () => {
    const reference = at(2026, 3, 14);
    const progress = weeklyGoalProgress(
      [session(at(2026, 3, 9)), session(at(2026, 3, 12)), session(at(2026, 3, 2))],
      goals,
      reference,
    );
    expect(progress.done).toBe(2);
    expect(progress.target).toBe(20);
  });
});

describe('evaluateBadges', () => {
  it('unlocks milestones as the totals grow', () => {
    const today = at(2026, 3, 14);
    const sessions = Array.from({ length: 12 }, (_, i) => session(today - i * 60_000));
    const badges = evaluateBadges(sessions, goals, today);

    const first = badges.find((b) => b.id === 'first-focus');
    const ten = badges.find((b) => b.id === 'ten-sessions');
    const fifty = badges.find((b) => b.id === 'fifty-sessions');

    expect(first?.earned).toBe(true);
    expect(ten?.earned).toBe(true);
    expect(fifty?.earned).toBe(false);
    expect(fifty?.progress).toBeCloseTo(12 / 50);
  });

  it('reports zero progress on an empty history', () => {
    const badges = evaluateBadges([], goals, at(2026, 3, 14));
    expect(badges.every((b) => !b.earned && b.progress === 0)).toBe(true);
  });

  it('scores focus-hour badges from accumulated time', () => {
    const today = at(2026, 3, 14);
    const sessions = Array.from({ length: 30 }, (_, i) =>
      session(today - i * 3_600_000, { durationSeconds: 3600 }),
    );
    const tenHours = evaluateBadges(sessions, goals, today).find((b) => b.id === 'ten-hours');
    expect(tenHours?.earned).toBe(true);
  });
});

describe('buildTimeline', () => {
  it('sorts newest first, resolves task titles and honours the limit', () => {
    const titles = new Map([['t1', 'Write the report']]);
    const entries = buildTimeline(
      [
        session(at(2026, 3, 12), { taskId: 't1' }),
        session(at(2026, 3, 14), { taskId: 'gone' }),
        session(at(2026, 3, 13)),
      ],
      titles,
      2,
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]?.startedAt).toBe(at(2026, 3, 14));
    expect(entries[0]?.taskTitle).toBeNull();
    expect(entries[1]?.taskTitle).toBeNull();

    const all = buildTimeline([session(at(2026, 3, 12), { taskId: 't1' })], titles);
    expect(all[0]?.taskTitle).toBe('Write the report');
  });
});

describe('buildCalendar', () => {
  it('returns a six-week Monday-first grid flagged by month', () => {
    const cells = buildCalendar([], goals, at(2026, 3, 14));
    expect(cells).toHaveLength(42);
    expect(cells[0]?.day).toBe('2026-02-23');
    expect(cells[0]?.inMonth).toBe(false);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });

  it('ramps the heat level with pomodoros against the daily goal', () => {
    const day = at(2026, 3, 10);
    const sessions = Array.from({ length: 4 }, (_, i) => session(day + i * 60_000));
    const cells = buildCalendar(sessions, goals, day);
    const cell = cells.find((c) => c.day === '2026-03-10');
    expect(cell?.pomodoros).toBe(4);
    expect(cell?.level).toBe(4);

    const quiet = cells.find((c) => c.day === '2026-03-11');
    expect(quiet?.level).toBe(0);
  });

  it('caps the heat level at 4 for a day well past the goal', () => {
    const day = at(2026, 3, 10);
    const sessions = Array.from({ length: 20 }, (_, i) => session(day + i * 60_000));
    const cell = buildCalendar(sessions, goals, day).find((c) => c.day === '2026-03-10');
    expect(cell?.level).toBe(4);
  });
});
