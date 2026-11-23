import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Every event the app records, named once. The server writes them and `bun run stats` reads them,
// so both import this list instead of typing the strings.
// note_captured: one capture appended to a daily note. old_note_opened: an old note was opened.
export const EVENT_TYPES = ["note_captured", "old_note_opened"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// One SQLite file holds the app's data. Tables are created here, and schema changes
// are additive: add a table or a column, never drop or rename one.
export function openDb(path: string): Database {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    at TEXT NOT NULL
  );`);
  return db;
}

export function recordEvent(db: Database, type: EventType, at = new Date()): void {
  db.query("INSERT INTO events (type, at) VALUES (?, ?)").run(type, at.toISOString());
}

/** How many events of each type were recorded. Types with none still appear, with 0. */
export function countEvents(db: Database): Record<EventType, number> {
  const counts = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) as Record<EventType, number>;
  const rows = db.query("SELECT type, COUNT(*) AS n FROM events GROUP BY type").all() as { type: string; n: number }[];
  for (const row of rows) {
    if ((EVENT_TYPES as readonly string[]).includes(row.type)) counts[row.type as EventType] = row.n;
  }
  return counts;
}

/**
 * Every known event at or after `since`, oldest first. Rows whose type is no longer in EVENT_TYPES
 * are skipped. Comparing ISO strings is safe because recordEvent always writes fixed-width UTC.
 */
export function eventsSince(db: Database, since: Date): { type: EventType; at: Date }[] {
  const rows = db
    .query("SELECT type, at FROM events WHERE at >= ? ORDER BY at")
    .all(since.toISOString()) as { type: string; at: string }[];
  return rows
    .filter((r) => (EVENT_TYPES as readonly string[]).includes(r.type))
    .map((r) => ({ type: r.type as EventType, at: new Date(r.at) }));
}
