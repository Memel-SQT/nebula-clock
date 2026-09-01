import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '../types.js';
import { NebulaClockDatabase, setDb } from './db.js';
import {
  addSession,
  clearAllData,
  clearCompletedTasks,
  createTag,
  createTask,
  deleteSession,
  deleteTag,
  deleteTask,
  incrementTaskPomodoro,
  listPresets,
  listSessions,
  listSessionsBetween,
  listTags,
  listTasks,
  readMeta,
  reorderTasks,
  savePreset,
  deletePreset,
  setTaskDone,
  updateTag,
  updateTask,
  writeMeta,
} from './repositories.js';

let db: NebulaClockDatabase;
let counter = 0;

beforeEach(async () => {
  counter += 1;
  db = new NebulaClockDatabase(`nebula-clock-test-${counter}`);
  setDb(db);
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
  setDb(null);
});

const session = (overrides: Partial<Session> = {}): Session => ({
  id: `s${Math.random()}`,
  phase: 'focus',
  startedAt: 1_000,
  endedAt: 2_000,
  durationSeconds: 1,
  plannedSeconds: 1,
  completed: true,
  taskId: null,
  tagIds: [],
  ...overrides,
});

describe('tasks', () => {
  it('creates a task with sane defaults and an appended order', async () => {
    const first = await createTask({ title: '  Write the report  ' });
    const second = await createTask({ title: 'Review', estimatedPomodoros: 4 });

    expect(first.title).toBe('Write the report');
    expect(first.estimatedPomodoros).toBe(1);
    expect(first.completedPomodoros).toBe(0);
    expect(first.done).toBe(false);
    expect(first.order).toBe(0);
    expect(second.order).toBe(1);
    expect(second.estimatedPomodoros).toBe(4);
  });

  it('forces the estimate to at least one pomodoro', async () => {
    const task = await createTask({ title: 'x', estimatedPomodoros: 0 });
    expect(task.estimatedPomodoros).toBe(1);
  });

  it('lists tasks in manual order', async () => {
    const a = await createTask({ title: 'A' });
    const b = await createTask({ title: 'B' });
    await reorderTasks([b.id, a.id]);
    expect((await listTasks()).map((t) => t.title)).toEqual(['B', 'A']);
  });

  it('updates fields and stamps updatedAt', async () => {
    const task = await createTask({ title: 'A' });
    await updateTask(task.id, { title: 'B' });
    const [stored] = await listTasks();
    expect(stored?.title).toBe('B');
    expect(stored?.updatedAt).toBeGreaterThanOrEqual(task.updatedAt);
  });

  it('records and clears the completion timestamp', async () => {
    const task = await createTask({ title: 'A' });
    await setTaskDone(task.id, true);
    expect((await listTasks())[0]?.completedAt).toBeTypeOf('number');
    await setTaskDone(task.id, false);
    expect((await listTasks())[0]?.completedAt).toBeNull();
  });

  it('counts pomodoros against a task', async () => {
    const task = await createTask({ title: 'A' });
    await incrementTaskPomodoro(task.id);
    await incrementTaskPomodoro(task.id);
    expect((await listTasks())[0]?.completedPomodoros).toBe(2);
  });

  it('ignores a pomodoro logged against a task that no longer exists', async () => {
    await expect(incrementTaskPomodoro('missing')).resolves.toBeUndefined();
  });

  it('keeps the sessions of a deleted task, only unlinking them', async () => {
    const task = await createTask({ title: 'A' });
    await addSession(session({ id: 'linked', taskId: task.id }));
    await deleteTask(task.id);

    expect(await listTasks()).toHaveLength(0);
    const sessions = await listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.taskId).toBeNull();
  });

  it('clears finished tasks and reports how many went', async () => {
    const done = await createTask({ title: 'done' });
    await createTask({ title: 'open' });
    await setTaskDone(done.id, true);

    expect(await clearCompletedTasks()).toBe(1);
    expect((await listTasks()).map((t) => t.title)).toEqual(['open']);
  });
});

describe('tags', () => {
  it('creates, lists and updates tags', async () => {
    const tag = await createTag('  Work  ', '#8B5CF6');
    expect(tag.name).toBe('Work');
    expect(await listTags()).toHaveLength(1);

    await updateTag(tag.id, { color: '#4C6EF5' });
    expect((await listTags())[0]?.color).toBe('#4C6EF5');
  });

  it('detaches a deleted tag from every task instead of deleting them', async () => {
    const tag = await createTag('Work', '#8B5CF6');
    const other = await createTag('Home', '#34D399');
    const task = await createTask({ title: 'A', tagIds: [tag.id, other.id] });

    await deleteTag(tag.id);

    expect(await listTags()).toHaveLength(1);
    const stored = await listTasks();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tagIds).toEqual([other.id]);
    expect(stored[0]?.id).toBe(task.id);
  });
});

describe('sessions', () => {
  it('stores sessions and reads them back in chronological order', async () => {
    await addSession(session({ id: 'b', startedAt: 2_000 }));
    await addSession(session({ id: 'a', startedAt: 1_000 }));
    expect((await listSessions()).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('queries a half-open time range', async () => {
    await addSession(session({ id: 'before', startedAt: 999 }));
    await addSession(session({ id: 'inside', startedAt: 1_000 }));
    await addSession(session({ id: 'edge', startedAt: 2_000 }));

    const found = await listSessionsBetween(1_000, 2_000);
    expect(found.map((s) => s.id)).toEqual(['inside']);
  });

  it('is idempotent on re-adding the same id', async () => {
    await addSession(session({ id: 'x', durationSeconds: 1 }));
    await addSession(session({ id: 'x', durationSeconds: 5 }));
    const all = await listSessions();
    expect(all).toHaveLength(1);
    expect(all[0]?.durationSeconds).toBe(5);
  });

  it('deletes a single session', async () => {
    await addSession(session({ id: 'x' }));
    await deleteSession('x');
    expect(await listSessions()).toHaveLength(0);
  });
});

describe('presets', () => {
  it('saves, lists and deletes custom presets', async () => {
    await savePreset({
      id: 'p1',
      name: 'Mine',
      focusMinutes: 40,
      shortBreakMinutes: 8,
      longBreakMinutes: 20,
      cyclesBeforeLongBreak: 3,
      builtIn: false,
    });
    expect(await listPresets()).toHaveLength(1);
    await deletePreset('p1');
    expect(await listPresets()).toHaveLength(0);
  });
});

describe('meta', () => {
  it('round-trips arbitrary values and returns undefined for a miss', async () => {
    await writeMeta('lastSeen', { at: 42 });
    expect(await readMeta<{ at: number }>('lastSeen')).toEqual({ at: 42 });
    expect(await readMeta('nope')).toBeUndefined();
  });
});

describe('clearAllData', () => {
  it('empties every table', async () => {
    await createTask({ title: 'A' });
    await createTag('Work', '#8B5CF6');
    await addSession(session());
    await writeMeta('k', 1);

    await clearAllData();

    expect(await listTasks()).toHaveLength(0);
    expect(await listTags()).toHaveLength(0);
    expect(await listSessions()).toHaveLength(0);
    expect(await readMeta('k')).toBeUndefined();
  });
});
