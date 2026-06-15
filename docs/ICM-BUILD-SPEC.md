# ICM-BUILD-SPEC.md — Build spec for Claude Code

> **How to use this file:** This is the single instruction document for building the Interview Cracking Machine (ICM). Put it at the repo root. To build, tell Claude Code: **"Read ICM-BUILD-SPEC.md and do Phase N."** Build phases strictly in order. After each phase, stop, run the app, and confirm the Definition of Done. Do not start a phase until the previous one passes. Commit after every phase.

---

## 0. What we are building (context for the agent)

ICM is a **local-first desktop application** that helps the user become interview-ready as an AI Engineer. It is a guide, planner, tracker, practice arena, and diary. The defining trait: **Claude Code is the AI engine behind the UI** — the user clicks things in the app and Claude reads/edits local files to do the work; the UI updates live. The user runs the app on a Claude Max plan and does not use the terminal after launch.

**Single source of truth = plain files.** All app data is markdown + JSON on disk. The UI is only a live view of those files. Claude (you) reads and edits those files directly.

---

## 1. Non-negotiable rules (follow these in every phase)

1. **Keep it simple.** Prefer the smallest working solution. No frameworks beyond the stack below unless explicitly needed.
2. **Files are truth.** Never store app state only in the database/cache. Every meaningful piece of state is a file under `data/`, `goals/`, `roadmaps/`, `schedule/`, or `mocks/`. The UI reads those.
3. **Each phase must run.** At the end of every phase the app starts and the Definition of Done is demonstrable. Do not leave the build broken between phases.
4. **Don't break earlier phases.** Re-run prior Definition-of-Done checks if you touch shared code.
5. **Markdown for human-edited data, JSON for derived/cache.** Logs, goals, roadmaps, notes = markdown with YAML frontmatter. Generated indexes/caches = JSON (git-ignored).
6. **Append-only logs.** Never overwrite or reformat a past daily log. Only append.
7. **Ask before large rewrites.** If a phase seems to require changing the architecture in section 3, state why and propose it first.
8. **Commit at the end of each phase** with message `phase-N: <summary>`.

---

## 2. Tech stack (use exactly this)

- **UI:** React + Vite + TypeScript + Tailwind CSS.
- **Backend (local bridge):** Node + Express + `ws` (WebSocket) + `chokidar` (file watcher) + `gray-matter` (parse frontmatter).
- **AI engine:** the local `claude` CLI, spawned headless by the backend (see section 4).
- **Data:** markdown + YAML frontmatter (source of truth); a generated `data/index.json` cache for fast reads (git-ignored). **Data lives outside the app bundle** (see section 5b) so app updates never touch it.
- **Voice (Phase 6b):** STT = `whisper.cpp` (local) or browser Web Speech API; TTS = **Kokoro** (local, natural voice) or Piper, with browser `SpeechSynthesis` as the zero-setup fallback. All free, all local.
- **Desktop packaging:** Tauri (added only in the final phase).
- **Charts:** Recharts. **Icons:** lucide-react.
- Do not add other major dependencies without noting why.

---

## 3. Repository layout (create as you go)

```
interview-cracking-machine/
├── ICM-BUILD-SPEC.md          # this file
├── CLAUDE.md                  # project context for Claude (Phase 0)
├── docs/data-schema.md        # data format spec (Phase 0)
├── goals/                     # one file per goal
├── roadmaps/                  # one file per roadmap
├── schedule/                  # weekly time-blocks + plans
├── mocks/                     # one file per mock interview (transcript + scored rubric)
├── data/
│   ├── logs/YYYY-MM-DD.md      # daily logs (append-only)
│   ├── tracks/<track>/...      # topics & problems per track
│   ├── reviews/                # spaced-repetition cards/queue
│   └── index.json             # generated cache (git-ignored)
├── server/                    # Node backend (Phase 1)
└── app/                       # React UI (Phase 2+)
```

---

## 4. The AI bridge (core mechanism — built in Phase 1, reused everywhere)

The backend exposes one main capability: run a Claude instruction in the repo and stream the result.

- **Endpoint:** `POST /ask` with body `{ "prompt": string, "sessionId"?: string }`.
- **Action:** spawn `claude -p "<prompt>" --output-format stream-json` (resume with `--resume <sessionId>` if provided) with the working directory set to the repo root, pre-approving file + safe bash tools so it runs without prompts.
- **Streaming:** forward each JSON event from Claude's stdout to the client (Server-Sent Events or the WebSocket) so the UI shows live progress. Capture and return the session id.
- **File watch:** a `chokidar` watcher on `data/`, `goals/`, `roadmaps/`, `schedule/`, `mocks/` broadcasts changes over a WebSocket so the UI re-renders when Claude edits files.
- **Auth:** uses the user's existing `claude` login (Max plan) — **no API key**. If the current Claude Code docs require the Agent SDK + key for programmatic use, switch `/ask` to the Agent SDK; keep the same request/response shape so the UI is unaffected. State which path you used in `server/README.md`.

Every "AI action" in the UI (plan my day, ingest a course, run a mock, etc.) is just a `POST /ask` with a specific prompt. Keep the prompts in one file `server/prompts.ts` so they're easy to tune.

---

## 5. Data formats (write these into docs/data-schema.md in Phase 0)

**Daily log — `data/logs/2026-06-15.md`:**
```markdown
---
date: 2026-06-15
hours: 2.5
tracks: [dsa, ai-course]
mood: focused
---
## What I did
- ...
## Weak / flagged
- ...
```

**Goal — `goals/interview-ready-90d.md`:**
```markdown
---
id: interview-ready-90d
title: Interview Ready in 90 Days
north_star: Land an AI Engineer role at a product company
target_date: 2026-09-13
hours_per_week: 14
status: active
---
## Milestones
- [ ] RAG + LLM systems module
- [ ] Pass 5 mocks >= 80%
```

**Roadmap node — `roadmaps/ai-engineer-90d.md`:** list of nodes, each with `title`, `status` (pending/in-progress/done/skipped), `objective`, `checkpoint`, optional `est_hours`, `depends_on`.

**Schedule block — `schedule/2026-W25.md`:** blocks with `topic`, `day`, `start`, `end`, `planned_min`; and logged `actual_min` per topic.

**Review card — `data/reviews/<id>.md`:** `topic`, `status`, `last_reviewed`, `interval_days`, `confidence`, plus the prompt + hidden solution.

**Mock — `mocks/2026-06-15-rag.md`:** `type`, `level`, `date`, `verdict`, rubric scores (1–4) for the four dimensions, plus the transcript and evidence notes.

Keep formats stable; later phases depend on them.

---

## 5b. Data persistence, app updates & resilience (READ before any coding)

This protects the user's data forever. Follow it exactly.

1. **Data lives outside the app bundle.** Never store data inside the packaged app (the `.app`/`.exe`) or in browser `localStorage`/`sessionStorage` — both can be wiped on update. The data home is a fixed folder: **the ICM project/repo folder** (preferred — it's also git, so every change is versioned and revertible) or, once packaged, the OS user-data dir (`app.getPath('userData')` in Electron / the equivalent in Tauri). Store the chosen data path in a small `config.json` in the user-data dir and reuse it across versions.
2. **Rebuilding/shipping a new version must never delete data.** Only the code bundle is replaced; the data folder persists because it lives elsewhere (rule 1). Verify this: after any packaging change, reinstall the app and confirm existing logs/goals/mocks are still there.
3. **Schema migrations, not breakage.** Put a `schema_version` in `data/index.json` (and optionally in file frontmatter). When a new feature changes a file format, write a small idempotent migration that upgrades old files on startup and bumps the version — never silently break or discard old data. Keep migrations in `server/migrations/`.
4. **Backups are automatic.** Because the data home is a git repo, commit after every AI action (or on app close). Optionally keep the last N snapshots. This makes accidental data loss recoverable.
5. **Resilience / error states (handle gracefully, never crash):**
   - `claude` not installed or not logged in → show a friendly setup card, don't hang.
   - No network / Claude unavailable → the app still opens and shows all data (it's local); only AI actions are disabled with a clear message.
   - Two AI actions at once → queue them or disable the trigger while one runs (avoid concurrent edits to the same file).
   - A Claude run fails mid-way → surface the error in the assistant panel; never leave a half-written file (write to a temp file then move).

---

## 6. The phases (build in order)

> **Thinnest MVP first:** Phases 0–2 already produce a real, usable app — Claude has your context, the live AI bridge works, and you can log your day in the UI. Stop and use it before adding the rest. Every later phase is independently testable via its Definition of Done. Build small, test by hand, then continue.

For each phase: do the **Build**, then verify the **Definition of Done (DoD)** by running the app, then commit.

### Phase 0 — Repo + context
**Build:** init git; create `CLAUDE.md` (goal, weekly hours, data rules from section 1, pointers to this spec and `docs/data-schema.md`); create all folders in section 3; write `docs/data-schema.md` from section 5; add one sample daily log and one sample goal file.
**DoD:** running `claude` in the repo and asking "what is my goal and data layout?" returns a correct answer sourced from `CLAUDE.md`.

### Phase 1 — AI bridge + bare test page
**Build:** the `server/` backend per section 4 (`/ask` streaming + file watcher WebSocket); a single bare page with one button that calls `/ask` to append a test line to today's log, shows the streamed output, and live-lists `data/logs/`.
**DoD:** clicking the button streams Claude's output, creates/updates today's log file, and the file list updates with no page refresh.

### Phase 2 — UI shell + Today + Diary + assistant panel
**Build:** the React app shell (sidebar, top bar with ⌘K, calm dark design — match `ICM-dashboard-mockup.html`); **Today** screen reading real data; **Diary** screen where a typed note → Claude writes a clean dated log; the **assistant panel** wired to `/ask` with streaming.
**DoD:** open app → type a note in Diary → Claude writes a log file → it appears on Today, live.

### Phase 3 — Goals + roadmaps
**Build:** **Goals** screen (north star → milestones → tasks, stored in `goals/`); "Suggest a roadmap" (Claude drafts editable nodes in `roadmaps/`); "Ingest a course" (paste name/link/syllabus → Claude parses to nodes); node editing writes back to files.
**DoD:** create a goal, generate a roadmap, edit a node, and the change persists in the file and shows in the UI.

### Phase 4 — Schedule + focus timer + discipline
**Build:** **Schedule** screen (calendar time-blocks in `schedule/`); a **focus timer** that logs actual minutes to a topic on stop; **discipline charts** (planned vs actual, adherence %, time-by-topic, smart streak where only an *unplanned* miss breaks it); a "plan course day-wise" action (backward-plan from deadline + 20% buffer + review days, editable).
**DoD:** block time → run timer → stop → logged minutes appear in the planned-vs-actual chart.

### Phase 5 — Review (spaced repetition) + readiness
**Build:** **Review** screen with a due-today queue (intervals 1·3·7·14·30; rating reschedules; old solution hidden until attempted); per-topic traffic-lights; a per-goal readiness score (breadth + consistency + depth) with a skills radar.
**DoD:** complete and rate a review → its next-due date and the topic status update automatically.

### Phase 6 — Mock interview (text first, then voice/vision)
**Build (6a, text):** **Mock** screen where Claude runs a phased interview (intro → clarify → approach → coding → testing → follow-ups → wrap), reads the user's actual code file, withholds constraints, gives graduated hints, shows a clock, and writes an honest 1–4 rubric + verdict + evidence to `mocks/`, with a score trend. Use an AI-Engineer question bank (RAG, evals, agents, LLM serving, fundamentals, DSA).
**Build (6b, voice/vision — only after 6a works):** make it feel like talking to a real person.
- **Speech in:** mic → STT (whisper.cpp local, or browser Web Speech API), with **VAD** (voice-activity detection) to know when the user has stopped talking (end-of-turn).
- **Voice out:** interviewer speaks via local **Kokoro** (natural voice) / Piper, or browser `SpeechSynthesis` as fallback.
- **Streaming conversation:** stream Claude's reply token-by-token **straight into the TTS** so the interviewer starts speaking before the full answer is generated (cuts perceived latency). Target a sub-1s response; a small natural pause is fine.
- **Barge-in:** if the user starts talking while the interviewer is speaking, stop the TTS immediately and listen (real interviews allow interruption).
- **Use a fast model for live turns, a stronger model for the final scored feedback.**
- **Vision:** read the user's *actual code file* for correctness (configure which file/folder to watch); send periodic **screenshots** only for diagrams/screen-share/progress, on events (pause, "I'm done", phase change), not a tight timer.
- Honest limit to note in the UI: this is a stitched STT→Claude→TTS pipeline (Claude has no native realtime-audio API), so expect a small turn delay — acceptable and human-feeling.
**DoD (6a):** finish a text mock → a scored feedback file is saved and the trend updates. **DoD (6b):** you can speak to it and hear it reply.

### Phase 7 — Package + polish
**Build:** wrap UI + backend in **Tauri**; first-run check that `claude` is installed and logged in (guide if not); polish (empty states, gentle nudges, keyboard shortcuts); optional Supabase sync.
**DoD:** double-click the app → it opens → the full loop works with no terminal. **Also verify persistence:** create some data, install a new build over it, reopen — all previous logs/goals/mocks are still present (per section 5b).

---

## 7. Definition of "good" for the whole project

- The user opens the app, sets a goal, gets/edits a roadmap, time-blocks and runs a focus timer, reviews due cards, runs a mock, and logs their day — **entirely in the UI**.
- Every action is Claude editing local files; the dashboard reflects file changes live.
- Nothing requires the terminal after launch; no API key is wired in.

**Start by reading `CLAUDE.md` (after Phase 0 creates it) and then doing the requested phase.**
