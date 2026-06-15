# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repo is **pre-Phase-0**: only `docs/` exists (the build spec and an architecture diagram). No code, no `git` repo, no `package.json` yet. The application is built in numbered phases defined by the spec.

- **[docs/ICM-BUILD-SPEC.md](docs/ICM-BUILD-SPEC.md)** is the single source of truth for *what* to build and *in what order*. Read it before doing any build work.
- **[docs/ICM-HLD-architecture.html](docs/ICM-HLD-architecture.html)** is the high-level architecture diagram (open in a browser to view).

To build, the user will say: **"Read ICM-BUILD-SPEC.md and do Phase N."** Build phases strictly in order (0 → 7). After each phase, stop, run the app, verify that phase's **Definition of Done (DoD)**, then commit with message `phase-N: <summary>`. Do not start a phase until the previous one's DoD passes.

## Goal & cadence

- **North star:** land an AI Engineer role at a product company.
- **Goal:** Interview Ready in 90 Days (`target_date: 2026-09-13`), at **14 hours/week**.
- Authoritative goal state lives in [goals/interview-ready-90d.md](goals/interview-ready-90d.md); this is a pointer, not the source of truth.

## What ICM is

Interview Cracking Machine — a **local-first desktop app** that helps the user become interview-ready as an AI Engineer (guide, planner, tracker, practice arena, diary). The defining trait: **Claude Code is the AI engine behind the UI.** The user clicks in the app, the backend spawns the local `claude` CLI to read/edit local files, and the UI re-renders live as files change. Runs on the user's Claude Max plan — **no API key**.

## Architecture (the core loop)

Four layers, top to bottom, forming a live loop:

1. **UI** — React + Vite + TypeScript + Tailwind. Screens: Today, Goals, Schedule, Review, Mock, Diary, Stats, and an Assistant panel (⌘K). The UI is *only a live view of files on disk* — it holds no authoritative state.
2. **Local backend bridge** — Node + Express + `ws` + `chokidar` + `gray-matter`. Two responsibilities:
   - `POST /ask` with `{ prompt, sessionId? }` → spawns `claude -p "<prompt>" --output-format stream-json` (with `--resume <sessionId>` if given) at the repo root, pre-approving file + safe bash tools, and **streams each JSON event** back to the client (SSE or WebSocket). Returns the session id.
   - A `chokidar` watcher on `data/`, `goals/`, `roadmaps/`, `schedule/`, `mocks/` broadcasts file changes over a WebSocket so the UI re-renders.
3. **AI brain** — the headless `claude` CLI spawned by the backend. If programmatic use requires the Agent SDK + key, switch `/ask` to the Agent SDK but **keep the same request/response shape** and note which path was used in `server/README.md`.
4. **Files** — plain markdown + JSON on disk (see below).

**Every "AI action" in the UI is just a `POST /ask` with a specific prompt.** Keep all prompts in one file, `server/prompts.ts`, so they are easy to tune.

## The non-negotiable data rule

**Files are the single source of truth.** Never store meaningful app state only in a database, cache, or browser storage. Every piece of state is a file under `data/`, `goals/`, `roadmaps/`, `schedule/`, or `mocks/`; the UI reads those.

- **Markdown + YAML frontmatter** for human-edited data (logs, goals, roadmaps, notes). **JSON** for derived/cache (`data/index.json`, git-ignored).
- **Append-only logs** — never overwrite or reformat a past daily log; only append.
- Data formats are specified in **`docs/data-schema.md`** (created in Phase 0). Keep formats stable across phases — later phases depend on them.

## Data persistence rules (read section 5b of the spec before any packaging work)

- **Data lives outside the app bundle** — never inside the `.app`/`.exe` or in `localStorage`/`sessionStorage` (both wiped on update). Data home is the project/repo folder (preferred — it's git, so versioned/revertible) or the OS user-data dir once packaged. Store the chosen path in a `config.json` in the user-data dir.
- **Migrations, not breakage** — `data/index.json` carries a `schema_version`; format changes get an idempotent startup migration in `server/migrations/` that bumps the version. Never silently discard old data.
- **Write safely** — write to a temp file then move; never leave a half-written file if a `claude` run fails mid-way.

## Resilience expectations

The app must never crash on these; handle gracefully:
- `claude` not installed / not logged in → friendly setup card.
- Claude unavailable / no network → app still opens and shows all data (it's local); only AI actions are disabled with a clear message.
- Two AI actions at once → queue or disable the trigger while one runs (avoid concurrent edits to the same file).

## Tech stack (use exactly this)

UI: React + Vite + TypeScript + Tailwind. Backend: Node + Express + `ws` + `chokidar` + `gray-matter`. Charts: Recharts. Icons: lucide-react. Voice (Phase 6b): STT via whisper.cpp or Web Speech API; TTS via Kokoro/Piper with browser `SpeechSynthesis` fallback. Packaging (Phase 7): Tauri. Do not add other major dependencies without noting why.

## Conventions

- Keep it simple — prefer the smallest working solution; no frameworks beyond the stack above unless explicitly needed.
- Don't break earlier phases — re-run prior DoD checks if you touch shared code.
- Ask before large rewrites — if a phase seems to need an architecture change (section 3 of the spec), propose it first.

## Repository layout (created as phases progress)

```
goals/        roadmaps/     schedule/     mocks/
data/logs/YYYY-MM-DD.md   data/tracks/<track>/   data/reviews/   data/index.json (git-ignored)
server/       # Node backend (Phase 1)
app/          # React UI (Phase 2+)
docs/         # spec, schema, architecture
```

## Commands

No build tooling exists yet — commands are established per phase. Once scaffolded, expect:
- Backend: `cd server && npm install && npm run dev`
- UI: `cd app && npm install && npm run dev`

Update this section with the real build / dev / test / single-test commands as soon as Phase 1+ creates them.
