import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../config/index.js';
import type { Session, Tag, Task } from '../types.js';
import {
  EXPORT_FORMAT_VERSION,
  ImportError,
  buildExportBundle,
  mergeSettings,
  parseImportBundle,
  serializeJson,
  sessionsToCsv,
  tasksToCsv,
  toCsvRows,
} from './portability.js';

const task: Task = {
  id: 't1',
  title: 'Write the report',
  notes: 'Say "hello", then stop',
  estimatedPomodoros: 3,
  completedPomodoros: 1,
  done: false,
  tagIds: ['g1'],
  order: 0,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  completedAt: null,
};

const tag: Tag = { id: 'g1', name: 'Work', color: '#8B5CF6', createdAt: 1_700_000_000_000 };

const session: Session = {
  id: 's1',
  phase: 'focus',
  startedAt: 1_700_000_000_000,
  endedAt: 1_700_000_001_500 + 1_498_500,
  durationSeconds: 1500,
  plannedSeconds: 1500,
  completed: true,
  taskId: 't1',
  tagIds: ['g1'],
};

const input = {
  appVersion: '1.2.3',
  settings: DEFAULT_SETTINGS,
  tasks: [task],
  tags: [tag],
  sessions: [session],
  presets: [],
};

describe('buildExportBundle', () => {
  it('stamps the format, version and export time', () => {
    const bundle = buildExportBundle(input, 42);
    expect(bundle.format).toBe('nebula-clock');
    expect(bundle.formatVersion).toBe(EXPORT_FORMAT_VERSION);
    expect(bundle.exportedAt).toBe(42);
    expect(bundle.appVersion).toBe('1.2.3');
    expect(bundle.sessions).toHaveLength(1);
  });

  it('round-trips through JSON without losing anything', () => {
    const bundle = buildExportBundle(input, 42);
    const parsed = parseImportBundle(serializeJson(bundle));
    expect(parsed.sessions[0]).toEqual(session);
    expect(parsed.tasks[0]).toEqual(task);
    expect(parsed.tags[0]).toEqual(tag);
    expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
    expect(parsed.warnings).toEqual([]);
  });
});

describe('CSV', () => {
  it('quotes every cell and doubles embedded quotes', () => {
    expect(toCsvRows([['plain', 'with "quotes"', 'a,b']])).toBe('"plain","with ""quotes""","a,b"');
  });

  it('separates rows with CRLF', () => {
    expect(toCsvRows([['a'], ['b']])).toBe('"a"\r\n"b"');
  });

  it('renders empty cells for null and undefined', () => {
    expect(toCsvRows([[null, undefined, 0, false]])).toBe('"","","0","false"');
  });

  it('exports sessions with a header and resolved task and tag names', () => {
    const csv = sessionsToCsv([session], [task], [tag]);
    const [header, row] = csv.split('\r\n');
    expect(header).toContain('"phase"');
    expect(header).toContain('"taskTitle"');
    expect(row).toContain('"focus"');
    expect(row).toContain('"Write the report"');
    expect(row).toContain('"Work"');
  });

  it('falls back to raw ids when the lookup tables are missing', () => {
    const csv = sessionsToCsv([session]);
    expect(csv.split('\r\n')[1]).toContain('"g1"');
  });

  it('exports tasks, escaping the quotes inside the notes', () => {
    const csv = tasksToCsv([task], [tag]);
    expect(csv).toContain('"Say ""hello"", then stop"');
    expect(csv).toContain('"Work"');
  });

  it('emits a header-only file for an empty list', () => {
    expect(sessionsToCsv([]).split('\r\n')).toHaveLength(1);
  });
});

describe('mergeSettings', () => {
  it('returns the defaults for anything that is not an object', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings([1, 2])).toEqual(DEFAULT_SETTINGS);
  });

  it('merges nested groups one level deep, keeping missing keys', () => {
    const merged = mergeSettings({ timer: { focusMinutes: 50 } });
    expect(merged.timer.focusMinutes).toBe(50);
    expect(merged.timer.shortBreakMinutes).toBe(DEFAULT_SETTINGS.timer.shortBreakMinutes);
    expect(merged.goals).toEqual(DEFAULT_SETTINGS.goals);
  });

  it('accepts scalar overrides of the right type and ignores the wrong ones', () => {
    const merged = mergeSettings({ language: 'fr', fullscreenOnFocus: 'yes' });
    expect(merged.language).toBe('fr');
    expect(merged.fullscreenOnFocus).toBe(DEFAULT_SETTINGS.fullscreenOnFocus);
  });

  it('always stamps the current settings version', () => {
    expect(mergeSettings({ version: 99 }).version).toBe(DEFAULT_SETTINGS.version);
  });
});

describe('parseImportBundle', () => {
  const wrap = (extra: Record<string, unknown>) =>
    JSON.stringify({ format: 'nebula-clock', formatVersion: 1, ...extra });

  it('rejects malformed JSON', () => {
    expect(() => parseImportBundle('{ not json')).toThrow(ImportError);
    expect(() => parseImportBundle('{ not json')).toThrow('invalidJson');
  });

  it('rejects a JSON document that is not an object', () => {
    expect(() => parseImportBundle('[1,2,3]')).toThrow('invalidJson');
  });

  it('rejects a file from another app', () => {
    expect(() => parseImportBundle('{"format":"other"}')).toThrow('notNebulaClock');
  });

  it('warns when the backup comes from a newer format', () => {
    const parsed = parseImportBundle(wrap({ formatVersion: 99 }));
    expect(parsed.warnings).toContain('newerFormat');
  });

  it('drops malformed records and reports how many', () => {
    const parsed = parseImportBundle(
      wrap({
        sessions: [session, { id: 'bad' }, null],
        tasks: [task, { title: 'no id' }],
        tags: [tag, 42],
        presets: [{ id: 'p', focusMinutes: 25 }, {}],
      }),
    );
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.warnings).toContain('droppedSessions:2');
    expect(parsed.warnings).toContain('droppedTasks:1');
    expect(parsed.warnings).toContain('droppedTags:1');
    expect(parsed.warnings).toContain('droppedPresets:1');
  });

  it('tolerates missing collections', () => {
    const parsed = parseImportBundle(wrap({}));
    expect(parsed.sessions).toEqual([]);
    expect(parsed.tasks).toEqual([]);
    expect(parsed.warnings).toEqual([]);
  });

  it('backfills fields an older export did not carry', () => {
    const parsed = parseImportBundle(
      wrap({
        sessions: [{ id: 's', phase: 'focus', startedAt: 1000, endedAt: 61_000 }],
        tasks: [{ id: 't', title: 'Legacy' }],
      }),
    );
    expect(parsed.sessions[0]).toMatchObject({
      durationSeconds: 60,
      plannedSeconds: 60,
      completed: true,
      taskId: null,
      tagIds: [],
    });
    expect(parsed.tasks[0]).toMatchObject({
      notes: '',
      estimatedPomodoros: 1,
      completedPomodoros: 0,
      done: false,
      tagIds: [],
      order: 0,
      completedAt: null,
    });
  });

  it('never imports a preset as built-in', () => {
    const parsed = parseImportBundle(
      wrap({ presets: [{ id: 'p1', focusMinutes: 25, builtIn: true }] }),
    );
    expect(parsed.presets[0]?.builtIn).toBe(false);
  });

  it('rejects a session with an unknown phase', () => {
    const parsed = parseImportBundle(
      wrap({ sessions: [{ id: 's', phase: 'nap', startedAt: 1, endedAt: 2 }] }),
    );
    expect(parsed.sessions).toEqual([]);
  });
});
