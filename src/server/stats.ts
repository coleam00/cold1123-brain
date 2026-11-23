// The bet's numbers for `bun run stats`. Pure: the caller passes the database (or null when none
// exists yet) and `today`, so tests can fix the clock. Days are local dates, like daily notes.
import type { Database } from "bun:sqlite";
import { EVENT_TYPES, type EventType, eventsSince } from "./db";

export const DAYS = 14;

// How each event shows up. Typed by EventType, so a renamed or missing event fails the type check.
const COLUMNS: Record<EventType, { label: string; avg: boolean }> = {
  note_captured: { label: "captured", avg: true },
  old_note_opened: { label: "old_opened", avg: false },
};

/** `YYYY-MM-DD` of `d` in local time (toISOString would give the UTC date). */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function zeros(): Record<EventType, number> {
  return Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) as Record<EventType, number>;
}

/** The output of `bun run stats`: a header, one row per day for the 14 days ending `today`, two summary lines. */
export function statsLines(db: Database | null, today: Date): string[] {
  // Build each day from its calendar fields, not by subtracting milliseconds, so DST can't skip or repeat a day.
  const days: Date[] = [];
  for (let i = DAYS - 1; i >= 0; i--) days.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
  const counts = new Map(days.map((d) => [localDate(d), zeros()]));

  if (db) {
    for (const e of eventsSince(db, days[0]!)) {
      const day = counts.get(localDate(e.at)); // undefined for events dated after today
      if (day) day[e.type]++;
    }
  }

  const line = (...cols: string[]) => cols.map((c, i) => (i < cols.length - 1 ? c.padEnd(i === 0 ? 12 : 10) : c)).join("");
  const lines = [line("date", ...EVENT_TYPES.map((t) => COLUMNS[t].label))];
  for (const [date, c] of counts) lines.push(line(date, ...EVENT_TYPES.map((t) => String(c[t]))));

  for (const t of EVENT_TYPES) {
    const perDay = [...counts.values()].map((c) => c[t]);
    const total = perDay.reduce((a, b) => a + b, 0);
    const withAny = perDay.filter((n) => n > 0).length;
    const avg = COLUMNS[t].avg ? ` avg_per_day=${(total / DAYS).toFixed(1)}` : "";
    lines.push(`${COLUMNS[t].label.padEnd(12)}total=${total}${avg} days_with_any=${withAny}/${DAYS}`);
  }
  return lines;
}
