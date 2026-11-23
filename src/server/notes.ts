import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The only code that touches <DATA_DIR>/notes/. It reads note files, creates a new one, or
// appends to one. It never rewrites, truncates or deletes a file: the markdown is the source of truth.

export type DailyNote = { date: string; markdown: string };

/** A capture with no text in it. Nothing is written for it. */
export class EmptyCaptureError extends Error {
  constructor() {
    super("Nothing to save");
    this.name = "EmptyCaptureError";
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` in local time (never toISOString, which is UTC). */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `HH:MM` in local time. */
export function localTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The text of one capture as a single trimmed line, or EmptyCaptureError if there is none. */
export function normalizeCapture(text: unknown): string {
  if (typeof text !== "string") throw new EmptyCaptureError();
  const line = text.replace(/[\r\n]+/g, " ").trim();
  if (line === "") throw new EmptyCaptureError();
  return line;
}

function dailyPath(notesDir: string, date: string): string {
  return join(notesDir, `${date}.md`);
}

/** Today's daily note. A missing file reads as just its heading; reading never creates anything. */
export function readDaily(notesDir: string, now = new Date()): DailyNote {
  const date = localDate(now);
  const path = dailyPath(notesDir, date);
  const markdown = existsSync(path) ? readFileSync(path, "utf8") : `# ${date}\n`;
  return { date, markdown };
}

/** Appends `- HH:MM <text>` to today's daily note, creating it with its heading if missing. */
export function appendCapture(notesDir: string, text: unknown, now = new Date()): DailyNote {
  const line = normalizeCapture(text); // first, so an empty capture touches nothing
  const date = localDate(now);
  const path = dailyPath(notesDir, date);
  mkdirSync(notesDir, { recursive: true });
  try {
    writeFileSync(path, `# ${date}\n\n`, { flag: "wx" }); // "wx": never overwrites an existing file
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  const existing = readFileSync(path, "utf8");
  const sep = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  appendFileSync(path, `${sep}- ${localTime(now)} ${line}\n`);
  return readDaily(notesDir, now);
}
