/**
 * Thin data-access layer over Dexie. Everything the UI needs is a function
 * call here; no component ever touches a `Table` directly.
 */
import type { Preset, Session, Tag, Task } from '../types.js';
import { createId } from '../utils/index.js';
import { getDb } from './db.js';

/* ------------------------------------------------------------------ tasks */

export interface NewTask {
  title: string;
  notes?: string;
  estimatedPomodoros?: number;
  tagIds?: string[];
}

export async function listTasks(): Promise<Task[]> {
  const tasks = await getDb().tasks.toArray();
  return tasks.sort((a, b) => a.order - b.order);
}

export async function createTask(input: NewTask): Promise<Task> {
  const now = Date.now();
  const existing = await getDb().tasks.count();
  const task: Task = {
    id: createId(),
    title: input.title.trim(),
    notes: input.notes?.trim() ?? '',
    estimatedPomodoros: Math.max(1, Math.round(input.estimatedPomodoros ?? 1)),
    completedPomodoros: 0,
    done: false,
    tagIds: input.tagIds ?? [],
    order: existing,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  await getDb().tasks.add(task);
  return task;
}

export async function updateTask(id: string, patch: Partial<Omit<Task, 'id'>>): Promise<void> {
  await getDb().tasks.update(id, { ...patch, updatedAt: Date.now() });
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  await updateTask(id, { done, completedAt: done ? Date.now() : null });
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.tasks, db.sessions, async () => {
    await db.tasks.delete(id);
    // Sessions survive their task; they just lose the link, so historical
    // focus time is never silently deleted along with a finished task.
    const linked = await db.sessions.where('taskId').equals(id).toArray();
    await Promise.all(linked.map((s) => db.sessions.update(s.id, { taskId: null })));
  });
}

/** Persist the order produced by a drag-and-drop reorder. */
export async function reorderTasks(orderedIds: string[]): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.tasks, async () => {
    await Promise.all(
      orderedIds.map((id, index) => db.tasks.update(id, { order: index, updatedAt: Date.now() })),
    );
  });
}

/** Called when a focus session completes against a task. */
export async function incrementTaskPomodoro(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.tasks, async () => {
    const task = await db.tasks.get(id);
    if (!task) return;
    await db.tasks.update(id, {
      completedPomodoros: task.completedPomodoros + 1,
      updatedAt: Date.now(),
    });
  });
}

export async function clearCompletedTasks(): Promise<number> {
  const db = getDb();
  const done = await db.tasks.filter((t) => t.done).toArray();
  await db.tasks.bulkDelete(done.map((t) => t.id));
  return done.length;
}

/* ------------------------------------------------------------------- tags */

export async function listTags(): Promise<Tag[]> {
  return getDb().tags.toArray();
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const tag: Tag = { id: createId(), name: name.trim(), color, createdAt: Date.now() };
  await getDb().tags.add(tag);
  return tag;
}

export async function updateTag(id: string, patch: Partial<Omit<Tag, 'id'>>): Promise<void> {
  await getDb().tags.update(id, patch);
}

/** Deleting a tag detaches it from every task rather than deleting them. */
export async function deleteTag(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.tags, db.tasks, async () => {
    await db.tags.delete(id);
    const tagged = await db.tasks.filter((t) => t.tagIds.includes(id)).toArray();
    await Promise.all(
      tagged.map((t) =>
        db.tasks.update(t.id, { tagIds: t.tagIds.filter((x) => x !== id), updatedAt: Date.now() }),
      ),
    );
  });
}

/* --------------------------------------------------------------- sessions */

export async function listSessions(): Promise<Session[]> {
  return getDb().sessions.orderBy('startedAt').toArray();
}

export async function listSessionsBetween(start: number, end: number): Promise<Session[]> {
  return getDb().sessions.where('startedAt').between(start, end, true, false).toArray();
}

export async function addSession(session: Session): Promise<void> {
  await getDb().sessions.put(session);
}

export async function deleteSession(id: string): Promise<void> {
  await getDb().sessions.delete(id);
}

/* ---------------------------------------------------------------- presets */

export async function listPresets(): Promise<Preset[]> {
  return getDb().presets.toArray();
}

export async function savePreset(preset: Preset): Promise<void> {
  await getDb().presets.put(preset);
}

export async function deletePreset(id: string): Promise<void> {
  await getDb().presets.delete(id);
}

/* ------------------------------------------------------------------- meta */

export async function readMeta<T>(key: string): Promise<T | undefined> {
  const row = await getDb().meta.get(key);
  return row?.value as T | undefined;
}

export async function writeMeta(key: string, value: unknown): Promise<void> {
  await getDb().meta.put({ key, value });
}

/** Wipe every table. Used by "delete all my data" in Settings. */
export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.sessions, db.tasks, db.tags, db.presets, db.meta, async () => {
    await Promise.all([
      db.sessions.clear(),
      db.tasks.clear(),
      db.tags.clear(),
      db.presets.clear(),
      db.meta.clear(),
    ]);
  });
}
