// `bun test` runs in UTC, where local and UTC dates agree and a UTC-bucketing bug would pass.
// Pin a zone far from UTC before any Date is built, so the 00:05 / 23:55 events below fall on
// a different UTC day than their local one. Spawned scripts get the same TZ (see runStats), so
// the test and the script agree on what "today" is.
process.env.TZ = "Asia/Tokyo";

import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database } from "bun:sqlite";
import { openDb, recordEvent } from "./db";
import { localDate, statsLines } from "./stats";

// Timestamps are built with the local Date constructor (never ISO literals), so they are local
// times in the pinned zone.
const TODAY = new Date(2026, 10, 12, 15, 0);

let dir: string;
let db: Database | null;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "stats-test-"));
  db = null;
});

afterEach(() => {
  db?.close(); // close before deleting: Windows refuses to delete an open file
  rmSync(dir, { recursive: true, force: true });
});

function openTestDb(): Database {
  db = openDb(join(dir, "app.db"));
  return db;
}

function runStats() {
  const p = Bun.spawnSync(["bun", "scripts/stats.ts"], { env: { ...process.env, DATA_DIR: dir, TZ: process.env.TZ }, stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode, lines: p.stdout.toString().trimEnd().split(/\r?\n/), stderr: p.stderr.toString() };
}

test("events count on their local day; outside the window and unknown types are ignored", () => {
  const events = openTestDb();
  recordEvent(events, "note_captured", new Date(2026, 10, 12, 0, 5));
  recordEvent(events, "note_captured", new Date(2026, 10, 12, 0, 5));
  recordEvent(events, "note_captured", new Date(2026, 10, 11, 23, 55));
  recordEvent(events, "note_captured", new Date(2026, 9, 30, 0, 0)); // first day of the window
  recordEvent(events, "note_captured", new Date(2026, 9, 29, 23, 59)); // the day before: outside
  recordEvent(events, "note_captured", new Date(2026, 10, 13, 0, 1)); // after today: outside
  recordEvent(events, "old_note_opened", new Date(2026, 10, 12, 9, 0));
  events.query("INSERT INTO events (type, at) VALUES ('opened', ?)").run(new Date(2026, 10, 12, 9, 0).toISOString());

  const lines = statsLines(events, TODAY);
  expect(lines).toHaveLength(17);
  expect(lines[1]).toBe("2026-10-30  1         0");
  expect(lines[2]).toBe("2026-10-31  0         0");
  expect(lines[13]).toBe("2026-11-11  1         0");
  expect(lines[14]).toBe("2026-11-12  2         1");
  expect(lines[15]).toBe("captured    total=4 avg_per_day=0.3 days_with_any=3/14");
  expect(lines[16]).toBe("old_opened  total=1 days_with_any=1/14");
});

test("bun run stats with no database prints zeros, exits 0, and creates nothing", () => {
  const { code, lines, stderr } = runStats();
  expect(stderr).toBe("");
  expect(code).toBe(0);
  expect(lines).toHaveLength(17);
  expect(lines[0]).toBe("date        captured  old_opened");
  for (const row of lines.slice(1, 15)) expect(row).toMatch(/^\d{4}-\d{2}-\d{2} {2}0 {9}0$/);
  expect(lines[14]!.slice(0, 10)).toBe(localDate(new Date()));
  expect(lines[15]).toBe("captured    total=0 avg_per_day=0.0 days_with_any=0/14");
  expect(lines[16]).toBe("old_opened  total=0 days_with_any=0/14");
  expect(existsSync(join(dir, "app.db"))).toBe(false);
});

test("bun run stats counts events across several days", () => {
  const events = openTestDb();
  const now = new Date();
  const noon = (daysAgo: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 12);
  recordEvent(events, "note_captured", noon(0));
  recordEvent(events, "note_captured", noon(3));
  recordEvent(events, "old_note_opened", noon(0));
  events.close();
  db = null; // closed: the script must be able to open the file on Windows
  const { code, lines } = runStats();
  expect(code).toBe(0);
  expect(lines[14]).toBe(`${localDate(now)}  1         1`);
  expect(lines[11]).toBe(`${localDate(noon(3))}  1         0`);
  expect(lines[15]).toBe("captured    total=2 avg_per_day=0.1 days_with_any=2/14");
  expect(lines[16]).toBe("old_opened  total=1 days_with_any=1/14");
});
