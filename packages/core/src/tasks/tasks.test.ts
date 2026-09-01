import { describe, expect, it } from 'vitest';
import type { Task } from '../types.js';
import {
  filterTasksByTag,
  moveItem,
  normalizeOrder,
  remainingPomodoros,
  sortTasks,
  taskProgress,
  taskTotals,
} from './index.js';

let seq = 0;
function task(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Task ${seq}`,
    notes: '',
    estimatedPomodoros: 2,
    completedPomodoros: 0,
    done: false,
    tagIds: [],
    order: seq - 1,
    createdAt: 0,
    updatedAt: 0,
    completedAt: null,
    ...overrides,
  };
}

describe('moveItem', () => {
  it('moves an element forwards and backwards', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('is a no-op for out-of-range indices', () => {
    expect(moveItem(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(moveItem([], 0, 0)).toEqual([]);
  });

  it('does not mutate the source array', () => {
    const source = ['a', 'b', 'c'];
    moveItem(source, 0, 2);
    expect(source).toEqual(['a', 'b', 'c']);
  });
});

describe('normalizeOrder', () => {
  it('renumbers order to match array position', () => {
    const tasks = [task({ order: 7 }), task({ order: 3 })];
    const normalized = normalizeOrder(tasks);
    expect(normalized.map((t) => t.order)).toEqual([0, 1]);
  });

  it('keeps the identical object when the order is already right', () => {
    const first = task({ order: 0 });
    const normalized = normalizeOrder([first]);
    expect(normalized[0]).toBe(first);
  });
});

describe('sortTasks', () => {
  it('puts open tasks first, each group in manual order', () => {
    const a = task({ id: 'a', order: 2, done: false });
    const b = task({ id: 'b', order: 0, done: true });
    const c = task({ id: 'c', order: 1, done: false });
    expect(sortTasks([a, b, c]).map((t) => t.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('taskProgress', () => {
  it('reports the ratio against the estimate', () => {
    expect(taskProgress(task({ estimatedPomodoros: 4, completedPomodoros: 1 }))).toEqual({
      done: 1,
      estimated: 4,
      ratio: 0.25,
      overrun: false,
    });
  });

  it('clamps the ratio and flags an overrun', () => {
    const progress = taskProgress(task({ estimatedPomodoros: 2, completedPomodoros: 5 }));
    expect(progress.ratio).toBe(1);
    expect(progress.overrun).toBe(true);
  });

  it('treats a zero estimate as one', () => {
    expect(taskProgress(task({ estimatedPomodoros: 0, completedPomodoros: 1 })).estimated).toBe(1);
  });
});

describe('taskTotals', () => {
  it('sums counts and estimates across the list', () => {
    expect(
      taskTotals([
        task({ estimatedPomodoros: 3, completedPomodoros: 2, done: true }),
        task({ estimatedPomodoros: 1, completedPomodoros: 0 }),
      ]),
    ).toEqual({ total: 2, completed: 1, estimatedPomodoros: 4, completedPomodoros: 2 });
  });

  it('returns zeroes for an empty list', () => {
    expect(taskTotals([])).toEqual({
      total: 0,
      completed: 0,
      estimatedPomodoros: 0,
      completedPomodoros: 0,
    });
  });
});

describe('filterTasksByTag', () => {
  it('returns everything when no tag is selected', () => {
    const tasks = [task(), task()];
    expect(filterTasksByTag(tasks, null)).toHaveLength(2);
  });

  it('keeps only tasks carrying the tag', () => {
    const tagged = task({ tagIds: ['work'] });
    expect(filterTasksByTag([tagged, task()], 'work')).toEqual([tagged]);
  });
});

describe('remainingPomodoros', () => {
  it('counts what is left on unfinished tasks only', () => {
    expect(
      remainingPomodoros([
        task({ estimatedPomodoros: 4, completedPomodoros: 1 }),
        task({ estimatedPomodoros: 3, completedPomodoros: 0, done: true }),
      ]),
    ).toBe(3);
  });

  it('never goes negative when the estimate is beaten', () => {
    expect(remainingPomodoros([task({ estimatedPomodoros: 1, completedPomodoros: 9 })])).toBe(0);
  });
});
