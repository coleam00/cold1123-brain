import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import { countEvents, recordEvent } from "./db";
import { EmptyCaptureError, appendCapture, readDaily } from "./notes";

export type AppOptions = {
  /** `<DATA_DIR>/notes`, where the markdown notes live. */
  notesDir: string;
  /** The clock. Tests pass a fixed one. */
  now?: () => Date;
};

const NOTHING_TO_SAVE = "Nothing to save";
const SAVE_FAILED = "Could not save. Your text is still in the box.";
const LOAD_FAILED = "Could not load today's note";

// The API. Every route the UI calls lives under /api. /health answers once the app can serve.
export function createApp(db: Database, opts: AppOptions): Hono {
  const now = opts.now ?? (() => new Date());
  const app = new Hono();
  app.get("/health", (c) => c.text("ok"));
  app.get("/api/events/count", (c) => c.json(countEvents(db)));

  app.get("/api/today", (c) => {
    try {
      return c.json(readDaily(opts.notesDir, now()));
    } catch (e) {
      console.error("loading today's note failed", e);
      return c.json({ error: LOAD_FAILED }, 500);
    }
  });

  app.post("/api/capture", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: NOTHING_TO_SAVE }, 400);
    }
    const text = (body as { text?: unknown } | null)?.text;
    let note;
    try {
      note = appendCapture(opts.notesDir, text, now());
    } catch (e) {
      if (e instanceof EmptyCaptureError) return c.json({ error: NOTHING_TO_SAVE }, 400);
      console.error("capture failed", e);
      return c.json({ error: SAVE_FAILED }, 500);
    }
    // The thought is saved. A failed event write is logged, not reported, so a retry never duplicates it.
    try {
      recordEvent(db, "note_captured");
    } catch (e) {
      console.error("note_captured event failed", e);
    }
    return c.json(note, 201);
  });

  return app;
}
