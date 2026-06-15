# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Interview Cracking Machine** — a local-first **mock-interview app**. You upload your resume, and Claude (the local `claude` CLI, behind the UI) runs a realistic **voice-first** interview that mixes questions about your actual experience with the top common questions for your target role, then writes an **honest scored rubric** to `mocks/`.

> History: this began as a multi-module study app (the 7 phases in [docs/ICM-BUILD-SPEC.md](docs/ICM-BUILD-SPEC.md)). It was deliberately **stripped down to the interview module only**. Today/Diary/Goals/Schedule/Review/Stats and their backend actions were removed (recoverable in git history before the rebuild commit). The build spec is now historical context, not the current scope.

## Architecture (the core loop)

Four layers, same live loop as before, now single-purpose:

1. **UI** — React + Vite + TypeScript + Tailwind v4 (+ Recharts for the score trend). One screen with three stages in `app/src/App.tsx`: **setup** (resume upload + role/level + voice toggle) → **live** (voice-first interview) → **scored** (verdict + trend). No sidebar/router.
2. **Local backend bridge** — Node + Express + `ws` + `chokidar` + `gray-matter` + `multer` (uploads) + `pdf-parse`/`mammoth` (resume parsing). Endpoints:
   - `POST /ask { action? | prompt?, params?, sessionId? }` → spawns the headless `claude` CLI and streams NDJSON events; one run at a time (409 if busy). Actions: `startMock`, `scoreMock` (resolved from `server/src/prompts.ts`).
   - `POST /api/resume` (multipart `file`) → extracts text → saves `data/resume.md`.
   - `GET /api/health` (claude installed? resume present?), `GET /api/file`, `GET /api/collection?dir=mocks` (score trend), `ws /watch` (file-change broadcast).
3. **AI brain** — the `claude` CLI spawned by the backend (`-p … --output-format stream-json --verbose --permission-mode bypassPermissions [--resume]`), using the user's Max-plan login — **no API key**. See [server/README.md](server/README.md).
4. **Files** — `data/resume.md` (parsed resume; **git-ignored**, it's personal data) and `mocks/<date>-<role>-<n>.md` (scored interviews: frontmatter rubric + transcript).

The interviewer is a persistent `claude` session: `startMock` opens it (reads `data/resume.md`), each candidate turn is a `POST /ask` with `sessionId` to resume, and `scoreMock` (resumed) writes the rubric file. Keep all prompts in `server/src/prompts.ts`.

## Voice (voice-first by default)

`app/src/lib/useVoice.ts` uses the **browser Web Speech API** (STT) + `SpeechSynthesis` (TTS) — zero-setup, the spec's fallback path. After each interviewer turn the app auto-listens; the **Start** click is the user gesture that unlocks audio, so the first line won't speak before then. Local whisper.cpp/Kokoro can later swap in behind the same `useVoice` interface. Voice needs a real browser with mic permission — it can't be exercised headlessly.

## Conventions / rules

- **Files are truth.** App state lives in files (`data/resume.md`, `mocks/`), the UI is a live view. Markdown + YAML frontmatter for human-readable data.
- **Write safely**: backend writes go through `atomicWrite` (temp file then rename).
- **Rubric**: 4 scores 1–4 — `communication`, `depth`, `problem_solving`, `confidence` (see `mockScore` in prompts). The trend averages whatever numeric rubric fields exist.
- Keep it simple; the app is intentionally one module. Don't reintroduce the old screens unless asked.

## Commands

**Backend (`server/`):** `cd server && npm install`, then `npm run dev` (tsx watch, http://localhost:4317). `npm run typecheck`. Requires the `claude` CLI installed + logged in.

**UI (`app/`):** `cd app && npm install`, then `npm run dev` (http://localhost:5317). `npm run build`, `npm run typecheck`. Vite proxies `/api`, `/ask`, `/watch` to :4317 — **run the backend too**. No test runner yet.

**Desktop (Tauri, scaffolded):** `app/src-tauri/` — `npm run tauri:dev` / `npm run tauri:build`. Needs the Rust toolchain (`rustup`), not installed yet; see [app/src-tauri/README.md](app/src-tauri/README.md).

## Layout

```
app/        # React UI: App.tsx (the whole experience), components/ResumeUpload, SetupBanner; lib/api, lib/useVoice
server/     # Node bridge: index.ts, prompts.ts, claude.ts, resume.ts, config.ts
data/       # resume.md (git-ignored)
mocks/      # scored interview results
docs/       # historical build spec + architecture
```
