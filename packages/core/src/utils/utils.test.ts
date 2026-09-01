import { describe, expect, it } from 'vitest';
import {
  addDays,
  clamp,
  createId,
  daysBetween,
  deepClone,
  formatDuration,
  formatFocusTime,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toDayKey,
} from './index.js';

describe('createId', () => {
  it('produces unique, uuid-shaped identifiers', () => {
    const ids = new Set(Array.from({ length: 500 }, () => createId()));
    expect(ids.size).toBe(500);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });
});

describe('clamp', () => {
  it('keeps a value inside its bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('formatDuration', () => {
  it('renders mm:ss below an hour', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(9)).toBe('00:09');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(1500)).toBe('25:00');
  });

  it('adds the hour segment past 3600 seconds', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(5445)).toBe('1:30:45');
  });

  it('floors negatives to zero and rounds fractions', () => {
    expect(formatDuration(-30)).toBe('00:00');
    expect(formatDuration(59.6)).toBe('01:00');
  });
});

describe('formatFocusTime', () => {
  it('picks the coarsest useful unit', () => {
    expect(formatFocusTime(45)).toBe('45s');
    expect(formatFocusTime(600)).toBe('10m');
    expect(formatFocusTime(3600)).toBe('1h');
    expect(formatFocusTime(5100)).toBe('1h 25m');
    expect(formatFocusTime(0)).toBe('0s');
  });
});

describe('day keys and boundaries', () => {
  it('builds the day key from local time, not UTC', () => {
    // 23:30 local on the 14th must stay the 14th even at a positive offset.
    const local = new Date(2026, 2, 14, 23, 30, 0).getTime();
    expect(toDayKey(local)).toBe('2026-03-14');
  });

  it('zero-pads months and days', () => {
    expect(toDayKey(new Date(2026, 0, 5, 12).getTime())).toBe('2026-01-05');
  });

  it('startOfDay strips the time part', () => {
    const start = startOfDay(new Date(2026, 5, 10, 17, 45, 12).getTime());
    expect(new Date(start).getHours()).toBe(0);
    expect(new Date(start).getMinutes()).toBe(0);
  });

  it('startOfWeek is Monday-based', () => {
    // 2026-03-14 is a Saturday; its week starts Monday the 9th.
    const week = startOfWeek(new Date(2026, 2, 14, 12).getTime());
    expect(toDayKey(week)).toBe('2026-03-09');
    // A Sunday belongs to the week that started six days earlier.
    const sunday = startOfWeek(new Date(2026, 2, 15, 12).getTime());
    expect(toDayKey(sunday)).toBe('2026-03-09');
  });

  it('startOfMonth and startOfYear land on the first day', () => {
    expect(toDayKey(startOfMonth(new Date(2026, 7, 23).getTime()))).toBe('2026-08-01');
    expect(toDayKey(startOfYear(new Date(2026, 7, 23).getTime()))).toBe('2026-01-01');
  });

  it('addDays crosses month boundaries', () => {
    expect(toDayKey(addDays(new Date(2026, 0, 31, 12).getTime(), 1))).toBe('2026-02-01');
    expect(toDayKey(addDays(new Date(2026, 0, 1, 12).getTime(), -1))).toBe('2025-12-31');
  });

  it('daysBetween ignores the time of day', () => {
    const a = new Date(2026, 2, 10, 23, 59).getTime();
    const b = new Date(2026, 2, 11, 0, 1).getTime();
    expect(daysBetween(a, b)).toBe(1);
    expect(daysBetween(b, a)).toBe(-1);
    expect(daysBetween(a, a)).toBe(0);
  });

  it('survives a daylight-saving transition', () => {
    // Europe/Paris springs forward on 2026-03-29; that day is 23h long.
    const before = new Date(2026, 2, 28, 12).getTime();
    const after = new Date(2026, 2, 30, 12).getTime();
    expect(daysBetween(before, after)).toBe(2);
  });
});

describe('deepClone', () => {
  it('returns an equal but unshared structure', () => {
    const source = { a: 1, nested: { list: [1, 2, 3] } };
    const copy = deepClone(source);
    expect(copy).toEqual(source);
    expect(copy.nested).not.toBe(source.nested);
  });
});
