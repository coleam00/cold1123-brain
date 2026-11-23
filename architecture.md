# Architecture

## Stack
- Bun (runtime, package manager, test runner, SQLite), TypeScript strict, React + Vite for the UI, Hono on Bun for the API, SQLite through `bun:sqlite`, tests with `bun test`, type check with `tsc --noEmit`.
- Why: the bootcamp's supported stack, with the same commands on Windows, macOS and Linux. It is already scaffolded from the kit's `stack/` folder, so Phase 1 does not scaffold.

## How it runs
- Install: `bun install`
- Develop: `bun run dev` (Vite dev server for the UI, with the API server beside it)
- Start (production mode): `bun run start`, one Bun process serving the API and the built UI, reading the port from `PORT` (default 3000), bound to `127.0.0.1`
- Build the UI: `bun run build` (into `dist/`)
- Health: `GET /health` answers `200 ok` once the app is ready
- Test everything: `bun run check` (`tsc --noEmit`, then `bun test`). CI runs exactly this.
- The bet's command: `bun run stats`

## Shape
- Browser UI -> HTTP API under `/api` -> markdown files and one SQLite file.
- `src/server/app.ts`: the API routes under `/api`, plus `/health`.
- `src/server/db.ts`: the SQLite file and its tables (schema changes are additive), and `EVENT_TYPES`, the one list of event names the server writes and `bun run stats` reads.
- `src/server/notes.ts` (new in Phase 1): reads and appends markdown note files. The only code that touches the notes folder.
- `src/server/main.ts`: production entry; reads `PORT` and `DATA_DIR` (default `data/`).
- `src/web/`: the React UI. `App.tsx` is the home screen: today's daily note with the capture box.
- `scripts/stats.ts`: the bet's command. `scripts/dev.ts`: the dev servers.
- Tests are `*.test.ts` beside the code.

## Data
- **Notes are markdown files**, the source of truth, under `<DATA_DIR>/notes/`.
  - A daily note is `YYYY-MM-DD.md` (local date), starting with `# YYYY-MM-DD`. Each capture appends one line: `- HH:MM <text>` (local time).
  - A titled note (Phase 4) is `<Title>.md`, with characters that are invalid in file names on Windows, macOS or Linux replaced by `-`. It starts with `# <Title>`.
  - A note's created date: the date in a daily note's name; for a titled note, the date it was first created, recorded in SQLite.
- **SQLite at `<DATA_DIR>/app.db`**, created on first start, never committed. Holds:
  - Events: `note_captured` and `old_note_opened` (the note's id and the local date). `bun run stats` reads only these.
  - Phase 2: a search index of note text, rebuilt from the files on start and updated on each capture.
  - Phase 4: links between notes, derived from `[[...]]` in the files and rebuildable from them.
- "Old" means a note created more than 7 days before the day it is opened. `old_note_opened` is written at most once per note per day.
- Resurfacing (Phase 3) picks 3 old notes at random with the local date as the seed, so the list is stable all day and across restarts.

## `bun run stats` output
Prints, for the 14 local days ending today:
```
date        captured  old_opened
2026-10-30  0         0
...
2026-11-12  3         1
captured    total=<n> avg_per_day=<x.x> days_with_any=<d>/14
old_opened  total=<n> days_with_any=<d>/14
```
With no data (or no database file yet), it prints 14 zero rows and zero totals, and exits 0.

## Boundaries
- Local only: the server binds to `127.0.0.1`, no auth because it is single user on localhost.
- No outside network calls in this release. No API keys are needed; `.env.example` exists for the later optional `ANTHROPIC_API_KEY`.
- The app never deletes or rewrites a note file. Writes are appends, or creating a new file.
- Path safety: note names from the browser are never used as paths directly; `src/server/notes.ts` resolves them and refuses anything outside `<DATA_DIR>/notes/`.

## Decisions deferred
- Search ranking beyond "contains the word": settle when search results exceed one screen in real use.
- Watching the notes folder for edits while the app runs: Phase 2 rebuilds the index on start only. Settle if the owner edits files with the app open and misses results.
- Asking notes with an AI model: a later release, using the Anthropic SDK with `ANTHROPIC_API_KEY`, and a fake in tests.
