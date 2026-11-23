# Second Brain: capture a thought in one keystroke, and get your old notes back without looking

> **Release:** first release · **Kind:** web app · **Owner:** coleam00

## Problem

A developer who reads and learns a lot forgets most of it. Ideas and links end up scattered across five places (Slack DMs to themself, browser bookmarks, a notes app, loose markdown files) and are almost never looked at again. When they need something they saved, they spend 10+ minutes hunting for it or give up. Tools that ask them to organize notes get abandoned, because organizing feels like work.

## Evidence

- Saves ideas and links in five different places today (owner's own account).
- Spends 10+ minutes hunting for a saved item, or gives up (owner's own estimate).
- Set up a structured notes tool twice and abandoned it both times because organizing felt like work (owner's own account).
- Assumption: capture that is faster than a Slack DM is enough to make this the one place ideas go. Validate by the bet's capture numbers over 14 days.
- Assumption: notes that come back on their own get opened, where saved notes otherwise don't. Validate by the bet's old-notes-opened numbers over 14 days.

## Why build it, and why now

Today's tools fail at both ends: capture is scattered, and nothing comes back unless the owner goes looking. Second Brain wins on three points: capture is one key away, nothing needs organizing (every thought lands in today's daily note), and old notes come back to the owner each day instead of waiting to be searched for. Now: the owner is learning a new field (AI engineering) and losing what they learn every week, and a factory can build this in about a day, so trying it costs little.

## Users and the job

- **Primary user:** the owner, a developer learning a new field, on their own machine.
- **Job:** When I read or think something worth keeping, I want to get it down in seconds without deciding where it goes, so I can find it again and actually see it again later.
- **Not for:** teams, shared knowledge bases, or anyone who wants folders, tags and a curated system.

## The bet

- **Hypothesis:** If we ship Second Brain, the owner will capture their ideas in it every day and open the old notes it brings back, because capture is faster than a Slack DM and resurfacing brings notes back without a search.
- **Signal:** notes captured per day, and distinct notes older than 7 days opened per day.
- **Command:** `bun run stats` prints the last 14 days, one row per day with `captured` and `old_opened` counts, then two summary lines: `captured total=<n> avg_per_day=<x.x> days_with_any=<d>/14` and `old_opened total=<n> days_with_any=<d>/14`. Phase 1 builds this command.
- **Threshold:** captured `avg_per_day` at least 3.0 with `days_with_any` at least 10/14, and old_opened `days_with_any` at least 7/14.
- **Window:** 14 days, starting the day the last phase of this release merges.
- **Wrong if:** captures stop for 3 or more days in a row in the first week (the owner is back to Slack-to-myself), or old_opened is 0 for the last 7 days of the window (resurfaced notes are being ignored).

## Outcome

- One key, from anywhere in the app, opens capture; Enter saves the thought into today's daily note.
- Every note is a plain markdown file on disk that opens in any editor.
- Typing a word finds every note that contains it.
- Each day the app shows a few old notes the owner would otherwise never see again.
- Notes link to each other with [[double brackets]], and each note shows what links to it.
- `bun run stats` tells the owner whether the bet is working.

## Invariants

- Notes never leave the machine. The app makes no outside network calls in this release.
- Notes are plain markdown files, one per note, readable and editable without the app.
- Nothing is deleted without the owner confirming it. This release has no delete action at all.
- A failed save shows an error and keeps the typed text.
- The app starts and every test passes with no API keys set.

## Acceptance

- [ ] From a fresh start, pressing the capture key, typing a thought and pressing Enter shows it in today's daily note within 1 second, and it is still there after restarting the app.
- [ ] The daily note's file opens in a plain text editor and reads as ordinary markdown.
- [ ] With 1,000 notes, typing a word in search shows only notes containing that word within half a second.
- [ ] The home screen shows 3 notes older than 7 days, the same 3 all day, and a different set the next day when at least 6 old notes exist.
- [ ] Writing `[[Some Title]]` in a capture makes a clickable link; the linked note lists the daily note under its backlinks.
- [ ] `bun run stats` shows each capture and each old note opened on the day it happened.
- [ ] One command runs every test, and CI runs it on every pull request.

## Phases

The factory files one phase at a time. Each phase leaves the product working.

### Phase 1: Capture into today's note

- **Proves:** a thought can go from keyboard to a markdown file on disk in one keystroke and survive a restart, and the bet can be measured.
- **Outcome:** the owner opens the app, presses the capture key, types a thought, presses Enter, and sees it in today's daily note. Closing and reopening the app shows it again.
- **Acceptance:**
  - [ ] The app starts with one command and the owner can press the capture key, type a thought, press Enter, and see it in today's daily note, start to finish.
  - [ ] After a restart, today's note still shows every captured thought, and its markdown file on disk contains them.
  - [ ] `bun run stats` exists and prints the 14-day table and the two summary lines, even if the numbers are zero; each capture adds 1 to today's `captured`.
  - [ ] One command runs every test, and CI runs it on every pull request.
  - [ ] An empty capture is not saved, and a save that fails shows an error and keeps the typed text.
- **Before Phase 2 is filed:** Phase 1 is merged, and capturing three thoughts, restarting, and running `bun run stats` shows all three in today's note and `captured` 3 for today.

### Phase 2: Search, and open any note

- **Proves:** a saved thought can be found again in seconds instead of 10 minutes.
- **Outcome:** the owner types a word and sees every note containing it, opens one, and reads it. Opening a note older than 7 days counts toward `old_opened`.
- **Acceptance:**
  - [ ] With 1,000 notes, typing a word shows only notes containing it, with the matching line, within half a second.
  - [ ] Clicking a result opens that note; opening a note older than 7 days adds 1 to today's `old_opened` (once per note per day).
  - [ ] A note edited in a text editor while the app is stopped is found by its new text after the app starts.
- **Before Phase 3 is filed:** Phase 2 is merged, and searching a word captured in Phase 1 finds that note.

### Phase 3: Resurface old notes

- **Proves:** old notes come back to the owner without a search.
- **Outcome:** the home screen shows 3 notes older than 7 days, picked fresh each day; opening one counts toward `old_opened`.
- **Acceptance:**
  - [ ] With at least 3 notes older than 7 days, the home screen shows exactly 3 of them; with fewer, it shows the ones there are and says so.
  - [ ] The list is the same across restarts on the same day, and changes on the next day when at least 6 old notes exist.
  - [ ] Opening a resurfaced note adds 1 to today's `old_opened`.
- **Before Phase 4 is filed:** Phase 3 is merged, and with old-dated test notes in place the home screen shows 3 of them and opening one moves `old_opened`.

### Phase 4: Links and backlinks

- **Proves:** notes connect to each other without folders or tags.
- **Outcome:** `[[Title]]` in a capture becomes a link; following it opens that note (creating it, empty, if it doesn't exist); every note lists the notes that link to it.
- **Acceptance:**
  - [ ] `[[Some Title]]` in a capture renders as a link; clicking it opens the note "Some Title", and an empty note is created as a markdown file if it did not exist.
  - [ ] The note "Some Title" lists every note that links to it under Backlinks.
  - [ ] The owner can capture into an open note, not only today's daily note.
- **Before the bet's window starts:** Phase 4 is merged and the release-level Acceptance list passes.

## Non-goals

- Asking questions of notes with an AI model (a later release, only with a key set).
- Importing existing markdown files (a later release).
- Accounts, sync, sharing or any multi-device use.
- Folders, tags or any manual organizing.
- Editing or deleting existing text inside the app. In-app writing is append-only; edits happen in any text editor.
- A mobile app or a browser extension for capture.

## Open questions

- [ ] Confirm: the product is named "Second Brain". Settle by picking a name.
- [ ] Confirm: the threshold is captured avg 3.0/day on at least 10 of 14 days, and old notes opened on at least 7 of 14 days. Your requirements named the signals but gave no numbers.
- [ ] Confirm: the 14-day window starts the day Phase 4 merges, not Phase 1.
- [ ] Confirm: search moved out of Phase 1 into Phase 2, though your first flow said "Search finds it". Phase 1 stays a walking skeleton.
- [ ] Confirm: the phase order is capture, search, resurface, links. Swap 3 and 4 if links matter more to you than resurfacing.
- [ ] Confirm: the capture key is `n` (when no text field has focus). Settle by using it for a day.
- [ ] Confirm: a capture is one line; Enter saves. Multi-line capture is not in this release.
- [ ] Confirm: "old" means created more than 7 days before the day it is opened, and each old note counts once per day in `old_opened`.
- [ ] Confirm: resurfacing shows 3 notes a day, picked at random from notes older than 7 days, fixed for the day.
- [ ] Confirm: in-app writing is append-only, with no edit or delete in the app. Edits happen in a text editor.
- [ ] Confirm: following a link to a missing note creates it as an empty markdown file.
- [ ] Confirm: "today" uses the machine's local time zone.
- [ ] Confirm: the app listens on localhost only, port 3000, with no login.
- [ ] Confirm: the "wrong if" is 3+ days in a row with no capture in week one, or zero old notes opened in the last 7 days.
- [ ] Confirm: captures always go into a daily note (or, from Phase 4, an open note); titled notes come only from following a [[link]].
- [ ] Confirm: the repository starts from the kit's scaffolded default stack, so Phase 1 does not scaffold.
- [x] Confirm: the owner field is set to the GitHub login `coleam00`.
