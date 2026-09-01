/** Pure task helpers: ordering, filtering and progress maths. */
import type { Task } from '../types.js';

/** Move `from` to `to` in a copy of the list (drag-and-drop reorder). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return next;
  next.splice(to, 0, moved);
  return next;
}

/** Renumber `order` so it matches array position after a reorder. */
export function normalizeOrder(tasks: readonly Task[]): Task[] {
  return tasks.map((task, index) => (task.order === index ? task : { ...task, order: index }));
}

export function sortTasks(tasks: readonly Task[]): Task[] {
  // Open tasks first, then manual order; finished ones sink to the bottom.
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.order - b.order;
  });
}

export interface TaskProgress {
  done: number;
  estimated: number;
  ratio: number;
  overrun: boolean;
}

export function taskProgress(task: Task): TaskProgress {
  const estimated = Math.max(1, task.estimatedPomodoros);
  return {
    done: task.completedPomodoros,
    estimated,
    ratio: Math.min(1, task.completedPomodoros / estimated),
    overrun: task.completedPomodoros > estimated,
  };
}

export interface TaskTotals {
  total: number;
  completed: number;
  estimatedPomodoros: number;
  completedPomodoros: number;
}

export function taskTotals(tasks: readonly Task[]): TaskTotals {
  return tasks.reduce<TaskTotals>(
    (acc, task) => ({
      total: acc.total + 1,
      completed: acc.completed + (task.done ? 1 : 0),
      estimatedPomodoros: acc.estimatedPomodoros + Math.max(1, task.estimatedPomodoros),
      completedPomodoros: acc.completedPomodoros + task.completedPomodoros,
    }),
    { total: 0, completed: 0, estimatedPomodoros: 0, completedPomodoros: 0 },
  );
}

export function filterTasksByTag(tasks: readonly Task[], tagId: string | null): Task[] {
  if (!tagId) return [...tasks];
  return tasks.filter((task) => task.tagIds.includes(tagId));
}

/** Remaining pomodoros across every unfinished task. */
export function remainingPomodoros(tasks: readonly Task[]): number {
  return tasks
    .filter((task) => !task.done)
    .reduce(
      (sum, task) =>
        sum + Math.max(0, Math.max(1, task.estimatedPomodoros) - task.completedPomodoros),
      0,
    );
}
