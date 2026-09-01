/**
 * Tasks, tags, sessions and custom presets.
 *
 * IndexedDB (via `@nebula-clock/core/storage`) is the source of truth; this
 * store keeps an in-memory mirror so statistics can be derived synchronously
 * without a query on every render.
 */
import { create } from 'zustand';
import {
  BUILT_IN_PRESETS,
  addSession as addSessionToDb,
  clearAllData,
  clearCompletedTasks,
  createTag,
  createTask,
  deletePreset,
  deleteTag,
  deleteTask,
  getDb,
  incrementTaskPomodoro,
  listPresets,
  listSessions,
  listTags,
  listTasks,
  reorderTasks,
  savePreset,
  setTaskDone,
  updateTag,
  updateTask,
} from '@nebula-clock/core';
import type { NewTask, ParsedImport, Preset, Session, Tag, Task } from '@nebula-clock/core';

interface DataStore {
  tasks: Task[];
  tags: Tag[];
  sessions: Session[];
  /** Custom presets only; the built-ins come from config. */
  customPresets: Preset[];
  loaded: boolean;
  error: string | null;

  load: () => Promise<void>;

  addTask: (input: NewTask) => Promise<Task>;
  editTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => Promise<void>;
  toggleTaskDone: (id: string, done: boolean) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  clearDoneTasks: () => Promise<number>;

  addTag: (name: string, color: string) => Promise<Tag>;
  editTag: (id: string, patch: Partial<Omit<Tag, 'id'>>) => Promise<void>;
  removeTag: (id: string) => Promise<void>;

  /** Writes the session and, for a completed focus phase, credits the task. */
  recordSession: (session: Session) => Promise<void>;

  addPreset: (preset: Preset) => Promise<void>;
  removePreset: (id: string) => Promise<void>;

  importAll: (parsed: ParsedImport) => Promise<void>;
  clearEverything: () => Promise<void>;
}

/** Built-ins first, then the user's own, so the list order is stable. */
export function allPresets(customPresets: readonly Preset[]): Preset[] {
  return [...BUILT_IN_PRESETS, ...customPresets];
}

export const useDataStore = create<DataStore>()((set) => {
  /** Re-read everything from IndexedDB into the mirror. */
  const refresh = async (): Promise<void> => {
    const [tasks, tags, sessions, presets] = await Promise.all([
      listTasks(),
      listTags(),
      listSessions(),
      listPresets(),
    ]);
    set({ tasks, tags, sessions, customPresets: presets, loaded: true, error: null });
  };

  return {
    tasks: [],
    tags: [],
    sessions: [],
    customPresets: [],
    loaded: false,
    error: null,

    load: async () => {
      try {
        await refresh();
      } catch (error) {
        // A blocked or unavailable IndexedDB (private mode, locked profile)
        // must not take the timer down with it.
        set({
          loaded: true,
          error: error instanceof Error ? error.message : 'storage-unavailable',
        });
      }
    },

    addTask: async (input) => {
      const task = await createTask(input);
      set((state) => ({ tasks: [...state.tasks, task] }));
      return task;
    },

    editTask: async (id, patch) => {
      await updateTask(id, patch);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...patch, updatedAt: Date.now() } : task,
        ),
      }));
    },

    toggleTaskDone: async (id, done) => {
      await setTaskDone(id, done);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, done, completedAt: done ? Date.now() : null } : task,
        ),
      }));
    },

    removeTask: async (id) => {
      await deleteTask(id);
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        // Sessions survive their task, they just lose the link.
        sessions: state.sessions.map((session) =>
          session.taskId === id ? { ...session, taskId: null } : session,
        ),
      }));
    },

    reorder: async (orderedIds) => {
      const position = new Map(orderedIds.map((id, index) => [id, index]));
      set((state) => ({
        tasks: [...state.tasks]
          .map((task) => ({ ...task, order: position.get(task.id) ?? task.order }))
          .sort((a, b) => a.order - b.order),
      }));
      await reorderTasks(orderedIds);
    },

    clearDoneTasks: async () => {
      const removed = await clearCompletedTasks();
      set((state) => ({ tasks: state.tasks.filter((task) => !task.done) }));
      return removed;
    },

    addTag: async (name, color) => {
      const tag = await createTag(name, color);
      set((state) => ({ tags: [...state.tags, tag] }));
      return tag;
    },

    editTag: async (id, patch) => {
      await updateTag(id, patch);
      set((state) => ({
        tags: state.tags.map((tag) => (tag.id === id ? { ...tag, ...patch } : tag)),
      }));
    },

    removeTag: async (id) => {
      await deleteTag(id);
      set((state) => ({
        tags: state.tags.filter((tag) => tag.id !== id),
        tasks: state.tasks.map((task) => ({
          ...task,
          tagIds: task.tagIds.filter((tagId) => tagId !== id),
        })),
      }));
    },

    recordSession: async (session) => {
      set((state) => ({ sessions: [...state.sessions, session] }));
      await addSessionToDb(session);

      if (session.phase === 'focus' && session.completed && session.taskId) {
        await incrementTaskPomodoro(session.taskId);
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === session.taskId
              ? { ...task, completedPomodoros: task.completedPomodoros + 1 }
              : task,
          ),
        }));
      }
    },

    addPreset: async (preset) => {
      await savePreset(preset);
      set((state) => ({
        customPresets: [...state.customPresets.filter((p) => p.id !== preset.id), preset],
      }));
    },

    removePreset: async (id) => {
      await deletePreset(id);
      set((state) => ({ customPresets: state.customPresets.filter((p) => p.id !== id) }));
    },

    importAll: async (parsed) => {
      const db = getDb();
      // One transaction: a half-applied import would be worse than a failed one.
      await db.transaction('rw', db.tasks, db.tags, db.sessions, db.presets, async () => {
        await Promise.all([
          db.tasks.clear(),
          db.tags.clear(),
          db.sessions.clear(),
          db.presets.clear(),
        ]);
        await Promise.all([
          db.tasks.bulkAdd(parsed.tasks),
          db.tags.bulkAdd(parsed.tags),
          db.sessions.bulkAdd(parsed.sessions),
          db.presets.bulkAdd(parsed.presets),
        ]);
      });
      await refresh();
    },

    clearEverything: async () => {
      await clearAllData();
      set({ tasks: [], tags: [], sessions: [], customPresets: [] });
    },
  };
});
