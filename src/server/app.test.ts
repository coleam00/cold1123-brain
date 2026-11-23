import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database } from "bun:sqlite";
import { createApp } from "./app";
import { openDb, recordEvent } from "./db";

let dir: string;
let db: Database;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "app-test-"));
  db = openDb(join(dir, "app.db"));
});

afterEach(() => {
  db.close(); // close before deleting: Windows refuses to delete an open file
  rmSync(dir, { recursive: true, force: true });
});

test("health answers ok", async () => {
  const res = await createApp(db).request("/health");
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("ok");
});

test("events are counted by type, with zeros for types not seen", async () => {
  const count = async () => (await createApp(db).request("/api/events/count")).json();
  expect(await count()).toEqual({ note_captured: 0, old_note_opened: 0 });
  recordEvent(db, "note_captured");
  recordEvent(db, "note_captured");
  recordEvent(db, "old_note_opened");
  expect(await count()).toEqual({ note_captured: 2, old_note_opened: 1 });
});
