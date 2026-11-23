import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EmptyCaptureError, appendCapture, readDaily } from "./notes";

let dir: string;
let notesDir: string;
// Local-time constructor, so the expected date and time hold in every timezone.
const at = (h: number, m: number) => new Date(2026, 10, 23, h, m);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "notes-test-"));
  notesDir = join(dir, "notes");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("the first capture creates the notes folder and today's note with its heading", () => {
  expect(existsSync(notesDir)).toBe(false);
  const note = appendCapture(notesDir, "hello", at(9, 5));
  const file = readFileSync(join(notesDir, "2026-11-23.md"), "utf8");
  expect(file).toBe("# 2026-11-23\n\n- 09:05 hello\n");
  expect(note).toEqual({ date: "2026-11-23", markdown: file });
});

test("a second capture appends a line and leaves the first as it was", () => {
  appendCapture(notesDir, "hello", at(9, 5));
  appendCapture(notesDir, "again", at(9, 7));
  expect(readFileSync(join(notesDir, "2026-11-23.md"), "utf8")).toBe("# 2026-11-23\n\n- 09:05 hello\n- 09:07 again\n");
});

test("a note edited to end without a newline gets one before the new line", () => {
  mkdirSync(notesDir);
  writeFileSync(join(notesDir, "2026-11-23.md"), "# 2026-11-23\n\nmy own words");
  appendCapture(notesDir, "hello", at(9, 5));
  expect(readFileSync(join(notesDir, "2026-11-23.md"), "utf8")).toBe("# 2026-11-23\n\nmy own words\n- 09:05 hello\n");
});

test("an empty capture is rejected and writes nothing", () => {
  for (const text of ["", "   ", "\n\t ", undefined, 42]) {
    expect(() => appendCapture(notesDir, text, at(9, 5))).toThrow(EmptyCaptureError);
  }
  expect(existsSync(notesDir)).toBe(false);
});

test("a multi-line capture is stored as one line", () => {
  appendCapture(notesDir, "  one\r\ntwo\n\nthree  ", at(9, 5));
  expect(readFileSync(join(notesDir, "2026-11-23.md"), "utf8")).toBe("# 2026-11-23\n\n- 09:05 one two three\n");
});

test("reading a day with no note returns its heading and creates nothing", () => {
  expect(readDaily(notesDir, at(9, 5))).toEqual({ date: "2026-11-23", markdown: "# 2026-11-23\n" });
  expect(existsSync(notesDir)).toBe(false);
});
