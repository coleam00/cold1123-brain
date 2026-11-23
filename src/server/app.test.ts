import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database } from "bun:sqlite";
import { createApp } from "./app";
import { countEvents, openDb, recordEvent } from "./db";

let dir: string;
let notesDir: string;
let db: Database;
// A fixed local clock, so the note's date and time hold in every timezone.
const now = () => new Date(2026, 10, 23, 9, 5);
const notePath = () => join(notesDir, "2026-11-23.md");

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "app-test-"));
  notesDir = join(dir, "notes");
  db = openDb(join(dir, "app.db"));
});

afterEach(() => {
  db.close(); // close before deleting: Windows refuses to delete an open file
  rmSync(dir, { recursive: true, force: true });
});

const app = (d: Database = db) => createApp(d, { notesDir, now });
const capture = (a: ReturnType<typeof app>, text: unknown) =>
  a.request("/api/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

test("health answers ok", async () => {
  const res = await app().request("/health");
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("ok");
});

test("events are counted by type, with zeros for types not seen", async () => {
  expect(await (await app().request("/api/events/count")).json()).toEqual({ opened: 0, note_captured: 0 });
  recordEvent(db, "opened");
  recordEvent(db, "opened");
  expect(await (await app().request("/api/events/count")).json()).toEqual({ opened: 2, note_captured: 0 });
});

test("stats prints the same format with no database at all", () => {
  const empty = mkdtempSync(join(tmpdir(), "stats-test-"));
  try {
    const p = Bun.spawnSync(["bun", "scripts/stats.ts"], { env: { ...process.env, DATA_DIR: empty }, stdout: "pipe" });
    expect(p.stdout.toString().trim()).toBe("opened 0\nnote_captured 0");
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test("a capture is saved to today's note, returned, and counted once", async () => {
  const res = await capture(app(), "a thought");
  expect(res.status).toBe(201);
  const body = (await res.json()) as { date: string; markdown: string };
  expect(body.date).toBe("2026-11-23");
  expect(body.markdown).toContain("- 09:05 a thought");
  expect(readFileSync(notePath(), "utf8")).toContain("- 09:05 a thought");
  expect(countEvents(db).note_captured).toBe(1);
});

test("an empty capture is rejected and nothing is written", async () => {
  const res = await capture(app(), "  ");
  expect(res.status).toBe(400);
  expect(((await res.json()) as { error: string }).error).toBeString();
  expect(existsSync(notesDir)).toBe(false);
  expect(countEvents(db).note_captured).toBe(0);
});

test("a save that fails answers 500 with an error and records no event", async () => {
  writeFileSync(notesDir, ""); // a file where the notes folder should be: the write fails on every OS
  const error = spyOn(console, "error").mockImplementation(() => {});
  try {
    const res = await capture(app(), "a thought");
    expect(res.status).toBe(500);
    expect(((await res.json()) as { error: string }).error).toBeString();
  } finally {
    error.mockRestore();
  }
  expect(countEvents(db).note_captured).toBe(0);
});

test("a capture still succeeds when only the event write fails, and the failure is logged", async () => {
  const broken = openDb(join(dir, "broken.db"));
  broken.close(); // every write to a closed database throws
  const error = spyOn(console, "error").mockImplementation(() => {});
  try {
    const res = await capture(app(broken), "a thought");
    expect(res.status).toBe(201);
    expect(error).toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
  expect(readFileSync(notePath(), "utf8")).toContain("- 09:05 a thought");
});

test("today's note shows every capture after the app is reopened", async () => {
  const first = openDb(join(dir, "reopen.db"));
  try {
    await capture(app(first), "one");
    await capture(app(first), "two");
  } finally {
    first.close();
  }
  const again = openDb(join(dir, "reopen.db"));
  try {
    const res = await app(again).request("/api/today");
    expect(res.status).toBe(200);
    const expected = "# 2026-11-23\n\n- 09:05 one\n- 09:05 two\n";
    expect(await res.json()).toEqual({ date: "2026-11-23", markdown: expected });
    expect(readFileSync(notePath(), "utf8")).toBe(expected);
  } finally {
    again.close();
  }
});
