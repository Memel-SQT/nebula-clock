/**
 * IndexedDB schema, shared verbatim by the web app and the Electron renderer
 * (Chromium provides IndexedDB in both, so there is no second storage path
 * to maintain and no data ever leaves the machine).
 */
import Dexie, { type Table } from 'dexie';
import type { Preset, Session, Tag, Task } from '../types.js';

export interface MetaRow {
  key: string;
  value: unknown;
}

export class NebulaClockDatabase extends Dexie {
  declare sessions: Table<Session, string>;
  declare tasks: Table<Task, string>;
  declare tags: Table<Tag, string>;
  declare presets: Table<Preset, string>;
  declare meta: Table<MetaRow, string>;

  constructor(name = 'nebula-clock') {
    super(name);
    // Indexes are chosen for the two hot queries: sessions in a date range,
    // and tasks in manual (drag-and-drop) order.
    this.version(1).stores({
      sessions: 'id, startedAt, endedAt, phase, taskId, completed',
      tasks: 'id, order, done, createdAt',
      tags: 'id, name',
      presets: 'id, name',
      meta: 'key',
    });

    // `completed` and `done` are booleans, and IndexedDB has no boolean key
    // type: records were silently left out of those indexes, so a query like
    // `where('completed').equals(true)` would have returned nothing at all.
    // They are dropped rather than left as a trap; both fields are filtered
    // in memory, which is what the code already does.
    this.version(2).stores({
      sessions: 'id, startedAt, endedAt, phase, taskId',
      tasks: 'id, order, createdAt',
    });
  }
}

let instance: NebulaClockDatabase | null = null;

/** Lazily created singleton so importing the module never opens a database. */
export function getDb(): NebulaClockDatabase {
  instance ??= new NebulaClockDatabase();
  return instance;
}

/** Test hook: swap in a uniquely named database, or reset back to default. */
export function setDb(next: NebulaClockDatabase | null): void {
  instance = next;
}
