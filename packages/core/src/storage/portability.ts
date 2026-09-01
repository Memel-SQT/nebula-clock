/**
 * Export / import. The app is privacy-first: this module is the *only* way
 * data leaves the device, and it always goes to a file the user picked.
 */
import { DEFAULT_SETTINGS } from '../config/index.js';
import type { Preset, Session, Settings, Tag, Task } from '../types.js';

export const EXPORT_FORMAT_VERSION = 1;

export interface ExportBundle {
  format: 'nebula-clock';
  formatVersion: number;
  exportedAt: number;
  appVersion: string;
  settings: Settings;
  tasks: Task[];
  tags: Tag[];
  sessions: Session[];
  presets: Preset[];
}

export interface ExportInput {
  appVersion: string;
  settings: Settings;
  tasks: Task[];
  tags: Tag[];
  sessions: Session[];
  presets: Preset[];
}

export function buildExportBundle(input: ExportInput, now = Date.now()): ExportBundle {
  return {
    format: 'nebula-clock',
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: now,
    appVersion: input.appVersion,
    settings: input.settings,
    tasks: input.tasks,
    tags: input.tags,
    sessions: input.sessions,
    presets: input.presets,
  };
}

export function serializeJson(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/* -------------------------------------------------------------------- CSV */

/** RFC 4180 quoting: wrap in quotes and double any embedded quote. */
function csvCell(value: unknown): string {
  let text: string;
  if (value === null || value === undefined) {
    text = '';
  } else if (typeof value === 'string') {
    text = value;
  } else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    text = value.toString();
  } else {
    // Objects would otherwise stringify to "[object Object]"; serialise them
    // so no column ever silently loses its contents.
    text = JSON.stringify(value) ?? '';
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsvRows(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

const SESSION_COLUMNS = [
  'id',
  'phase',
  'startedAt',
  'endedAt',
  'durationSeconds',
  'plannedSeconds',
  'completed',
  'taskId',
  'taskTitle',
  'tags',
] as const;

export function sessionsToCsv(
  sessions: readonly Session[],
  tasks: readonly Task[] = [],
  tags: readonly Tag[] = [],
): string {
  const taskTitles = new Map(tasks.map((t) => [t.id, t.title]));
  const tagNames = new Map(tags.map((t) => [t.id, t.name]));
  const rows: unknown[][] = [[...SESSION_COLUMNS]];
  for (const s of sessions) {
    rows.push([
      s.id,
      s.phase,
      new Date(s.startedAt).toISOString(),
      new Date(s.endedAt).toISOString(),
      s.durationSeconds,
      s.plannedSeconds,
      s.completed,
      s.taskId ?? '',
      s.taskId ? (taskTitles.get(s.taskId) ?? '') : '',
      s.tagIds.map((id) => tagNames.get(id) ?? id).join(' | '),
    ]);
  }
  return toCsvRows(rows);
}

const TASK_COLUMNS = [
  'id',
  'title',
  'notes',
  'estimatedPomodoros',
  'completedPomodoros',
  'done',
  'tags',
  'createdAt',
  'completedAt',
] as const;

export function tasksToCsv(tasks: readonly Task[], tags: readonly Tag[] = []): string {
  const tagNames = new Map(tags.map((t) => [t.id, t.name]));
  const rows: unknown[][] = [[...TASK_COLUMNS]];
  for (const t of tasks) {
    rows.push([
      t.id,
      t.title,
      t.notes,
      t.estimatedPomodoros,
      t.completedPomodoros,
      t.done,
      t.tagIds.map((id) => tagNames.get(id) ?? id).join(' | '),
      new Date(t.createdAt).toISOString(),
      t.completedAt ? new Date(t.completedAt).toISOString() : '',
    ]);
  }
  return toCsvRows(rows);
}

/* ----------------------------------------------------------------- import */

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  return Array.isArray(value) ? value.filter(guard) : [];
}

const isSession = (v: unknown): v is Session =>
  isRecord(v) &&
  typeof v.id === 'string' &&
  typeof v.startedAt === 'number' &&
  typeof v.endedAt === 'number' &&
  (v.phase === 'focus' || v.phase === 'shortBreak' || v.phase === 'longBreak');

const isTask = (v: unknown): v is Task =>
  isRecord(v) && typeof v.id === 'string' && typeof v.title === 'string';

const isTag = (v: unknown): v is Tag =>
  isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string';

const isPreset = (v: unknown): v is Preset =>
  isRecord(v) && typeof v.id === 'string' && typeof v.focusMinutes === 'number';

/**
 * Merge an unknown settings object onto the defaults, one level deep.
 * Anything missing or the wrong shape falls back to the default, so an
 * export from an older version still imports cleanly.
 */
export function mergeSettings(incoming: unknown): Settings {
  if (!isRecord(incoming)) return DEFAULT_SETTINGS;

  // Written against an index-signature view of Settings: the per-key union
  // cannot be expressed generically, and the isRecord guards below are what
  // actually make the writes safe at runtime.
  const merged = { ...DEFAULT_SETTINGS } as unknown as Record<string, unknown>;
  const defaults = DEFAULT_SETTINGS as unknown as Record<string, unknown>;

  for (const key of Object.keys(defaults)) {
    const value = incoming[key];
    if (value === undefined) continue;
    const fallback = defaults[key];
    if (isRecord(fallback) && isRecord(value)) {
      merged[key] = { ...fallback, ...value };
    } else if (typeof value === typeof fallback) {
      merged[key] = value;
    }
  }

  const settings = merged as unknown as Settings;
  settings.version = DEFAULT_SETTINGS.version;
  return settings;
}

export interface ParsedImport {
  settings: Settings;
  tasks: Task[];
  tags: Tag[];
  sessions: Session[];
  presets: Preset[];
  /** Non-fatal problems worth surfacing to the user after the import. */
  warnings: string[];
}

export function parseImportBundle(raw: string): ParsedImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ImportError('invalidJson');
  }
  if (!isRecord(parsed)) throw new ImportError('invalidJson');
  if (parsed.format !== 'nebula-clock') throw new ImportError('notNebulaClock');

  const warnings: string[] = [];
  const version = typeof parsed.formatVersion === 'number' ? parsed.formatVersion : 0;
  if (version > EXPORT_FORMAT_VERSION) warnings.push('newerFormat');

  const sessions = asArray(parsed.sessions, isSession);
  const tasks = asArray(parsed.tasks, isTask);
  const tags = asArray(parsed.tags, isTag);
  const presets = asArray(parsed.presets, isPreset);

  const countDropped = (source: unknown, kept: number, label: string) => {
    if (Array.isArray(source) && source.length !== kept) {
      warnings.push(`${label}:${source.length - kept}`);
    }
  };
  countDropped(parsed.sessions, sessions.length, 'droppedSessions');
  countDropped(parsed.tasks, tasks.length, 'droppedTasks');
  countDropped(parsed.tags, tags.length, 'droppedTags');
  countDropped(parsed.presets, presets.length, 'droppedPresets');

  return {
    settings: mergeSettings(parsed.settings),
    tasks: tasks.map((t, index) => ({
      ...t,
      notes: t.notes ?? '',
      estimatedPomodoros: t.estimatedPomodoros ?? 1,
      completedPomodoros: t.completedPomodoros ?? 0,
      done: t.done ?? false,
      tagIds: Array.isArray(t.tagIds) ? t.tagIds : [],
      order: typeof t.order === 'number' ? t.order : index,
      createdAt: t.createdAt ?? Date.now(),
      updatedAt: t.updatedAt ?? Date.now(),
      completedAt: t.completedAt ?? null,
    })),
    tags,
    sessions: sessions.map((s) => ({
      ...s,
      durationSeconds: s.durationSeconds ?? Math.round((s.endedAt - s.startedAt) / 1000),
      plannedSeconds: s.plannedSeconds ?? Math.round((s.endedAt - s.startedAt) / 1000),
      completed: s.completed ?? true,
      taskId: s.taskId ?? null,
      tagIds: Array.isArray(s.tagIds) ? s.tagIds : [],
    })),
    presets: presets.map((p) => ({ ...p, builtIn: false })),
    warnings,
  };
}
