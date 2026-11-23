// `bun run stats`: prints the PRD's bet signal for the 14 local days ending today (format in
// architecture.md). It prints the same format whether or not any data exists yet (zeros on a
// fresh clone), and never creates the database: openDb would make data/ and app.db.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { openDb } from "../src/server/db";
import { statsLines } from "../src/server/stats";

const path = join(process.env.DATA_DIR ?? "data", "app.db");
let lines: string[];
if (existsSync(path)) {
  const db = openDb(path);
  try {
    lines = statsLines(db, new Date());
  } finally {
    db.close();
  }
} else {
  lines = statsLines(null, new Date());
}
for (const l of lines) console.log(l);
