# Engineering

- **One command checks everything:** `bun run check` runs type checks and every test. Every change keeps it green.
- **Tests:** every behavior change comes with a test that fails without it. Tests are `*.test.ts` beside the code they test, run by `bun test`. Server tests use a temporary `DATA_DIR` per test, never the real `data/`.
- **Runs everywhere:** commands and scripts work on Windows, macOS and Linux, and CI runs the checks on Linux and Windows. No bash-only scripts in the app, and no hard-coded paths or path separators (build paths with `node:path`). Tests close every file and database handle before deleting their temporary folders (Windows refuses to delete an open file).
- **Dependencies:** add one only when it removes real work. Say why in the pull request.
- **Data:** never commit the `data/` folder. Schema changes are additive. The markdown files are the source of truth: anything in SQLite other than events must be rebuildable from them.
- **Never lose or delete a note:** the app only appends to a note file or creates a new one. Write daily notes with the local date and local time.
- **Failures are never silent:** a save or load that fails shows the user an error and keeps what they typed. Once the user's data is saved, the request succeeds even if a follow-up write (an event, an index) fails; log that failure instead of reporting the save as failed, so a retry never duplicates data.
- **UI state follows the server:** after each request, update the screen from what the server returned (or a functional state update), never from a copy taken before the request, so two quick actions can't overwrite each other.
- **Event and status names live in one list** (`EVENT_TYPES` in `src/server/db.ts`); code imports it rather than typing the strings.
- **Secrets:** read from the environment; `.env.example` lists every variable with a fake value. The app needs none to start or to pass `bun run check`.
- **No outside network calls** in this release. A change that adds one is out of scope.
- **UI:** every screen works at 390 px wide; every action is reachable by keyboard; the capture key never fires while a text field has focus.
- **Small changes:** one outcome per pull request.
