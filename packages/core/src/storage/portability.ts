/**
 * Export / import. The app is privacy-first: this module is the *only* way
 * data leaves the device, and it always goes to a file the user picked.
 */
import { BUILT_IN_PRESETS, LIMITS, TAG_COLORS } from '../config/index.js';
import { clamp } from '../utils/index.js';
import { normalizeSettings } from './settings.js';
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
  isRecord(v) && typeof v.id === 'string' && Number.isFinite(v.focusMinutes);

/**
 * An unknown settings object, normalized field by field (`normalizeSettings`): anything
 * missing, out of range or of the wrong type falls back to its default, so an export from an
 * older version, or a hand-edited one, still imports cleanly.
 */
export function mergeSettings(incoming: unknown): Settings {
  return normalizeSettings(incoming);
}

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const text = (value: unknown, fallback = '', max = 500): string =>
  typeof value === 'string' ? value.slice(0, max) : fallback;

const ids = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];

/** Keeps the first occurrence of each id: a duplicate would abort the whole import. */
function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const BUILT_IN_IDS = new Set(BUILT_IN_PRESETS.map((preset) => preset.id));

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

  const sessions = uniqueById(asArray(parsed.sessions, isSession));
  const tasks = uniqueById(asArray(parsed.tasks, isTask));
  const tags = uniqueById(asArray(parsed.tags, isTag));
  // The built-in presets ship with the app: a copy in the file would show up twice.
  const presets = uniqueById(asArray(parsed.presets, isPreset)).filter(
    (preset) => !BUILT_IN_IDS.has(preset.id),
  );

  const countDropped = (source: unknown, kept: number, label: string) => {
    if (Array.isArray(source) && source.length !== kept) {
      warnings.push(`${label}:${source.length - kept}`);
    }
  };
  countDropped(parsed.sessions, sessions.length, 'droppedSessions');
  countDropped(parsed.tasks, tasks.length, 'droppedTasks');
  countDropped(parsed.tags, tags.length, 'droppedTags');
  countDropped(parsed.presets, presets.length, 'droppedPresets');

  const now = Date.now();
  // Only the known fields are kept, each with its own type check: a value of the wrong type
  // would otherwise reach the UI (`notes.trim()` on a number) or the statistics.
  return {
    settings: mergeSettings(parsed.settings),
    tasks: tasks.map((t, index): Task => ({
      id: t.id,
      title: text(t.title),
      notes: text(t.notes, '', 5000),
      estimatedPomodoros: finite(t.estimatedPomodoros)
        ? clamp(
            Math.round(t.estimatedPomodoros),
            LIMITS.estimatedPomodoros.min,
            LIMITS.estimatedPomodoros.max,
          )
        : 1,
      completedPomodoros: finite(t.completedPomodoros)
        ? Math.max(0, Math.round(t.completedPomodoros))
        : 0,
      done: typeof t.done === 'boolean' ? t.done : false,
      tagIds: ids(t.tagIds),
      order: finite(t.order) ? t.order : index,
      createdAt: finite(t.createdAt) ? t.createdAt : now,
      updatedAt: finite(t.updatedAt) ? t.updatedAt : now,
      completedAt: finite(t.completedAt) ? t.completedAt : null,
    })),
    tags: tags.map((tag): Tag => ({
      id: tag.id,
      name: text(tag.name, '', 80),
      color: typeof tag.color === 'string' && HEX_COLOR.test(tag.color) ? tag.color : TAG_COLORS[0],
      createdAt: finite(tag.createdAt) ? tag.createdAt : now,
    })),
    sessions: sessions.map((s): Session => {
      const span = Math.max(0, Math.round((s.endedAt - s.startedAt) / 1000));
      return {
        id: s.id,
        phase: s.phase,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationSeconds: finite(s.durationSeconds) ? Math.max(0, s.durationSeconds) : span,
        plannedSeconds: finite(s.plannedSeconds) ? Math.max(0, s.plannedSeconds) : span,
        completed: typeof s.completed === 'boolean' ? s.completed : true,
        taskId: typeof s.taskId === 'string' ? s.taskId : null,
        tagIds: ids(s.tagIds),
      };
    }),
    presets: presets.map((p): Preset => ({
      id: p.id,
      name: text(p.name, p.id, 80),
      focusMinutes: clamp(
        Math.round(p.focusMinutes),
        LIMITS.focusMinutes.min,
        LIMITS.focusMinutes.max,
      ),
      shortBreakMinutes: finite(p.shortBreakMinutes)
        ? clamp(
            Math.round(p.shortBreakMinutes),
            LIMITS.shortBreakMinutes.min,
            LIMITS.shortBreakMinutes.max,
          )
        : 5,
      longBreakMinutes: finite(p.longBreakMinutes)
        ? clamp(
            Math.round(p.longBreakMinutes),
            LIMITS.longBreakMinutes.min,
            LIMITS.longBreakMinutes.max,
          )
        : 15,
      cyclesBeforeLongBreak: finite(p.cyclesBeforeLongBreak)
        ? clamp(
            Math.round(p.cyclesBeforeLongBreak),
            LIMITS.cyclesBeforeLongBreak.min,
            LIMITS.cyclesBeforeLongBreak.max,
          )
        : 4,
      builtIn: false,
    })),
    warnings,
  };
}
