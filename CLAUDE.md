# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Interview Cracking Machine** — a local-first **interview-prep app** built around a three-level journey: **Learn → Practice → Mock Interview**. You upload your resume, pick an **interview round** (General/Behavioral, DSA, System Design, AI Engineering, Python, Backend, Frontend, Full-Stack — `server/src/prompts.ts` `ROUNDS`, served via `GET /api/rounds`), and Claude (the local `claude` CLI, behind the UI) drives all three modes, every one anchored in your resume's actual skills/projects.

The three modes (a landing page picks between them; the top nav switches; see **Modules** below):
- **Learn** — structured **curriculum tracks** per round (`learnTrack` → an ordered 6–8 lesson outline aimed at your resume gaps; `learnLesson` → one lesson as markdown). Stateless prompts (no file writes); track outline + progress + cached lessons live in **localStorage**.
- **Practice** — **single-question drills** (`practiceQuestion` → one question, avoiding ones already asked; `practiceFeedback` → honest markdown feedback on your answer). Stateless, no session, no file writes.
- **Mock Interview** — the original **voice-first** interview that writes an **honest, round-aware scored rubric** to `mocks/`. `startMock`/`scoreMock` take `{ round, role, level }` and use a persistent resumed `claude` session.

> History: this began as a multi-module study app (the 7 phases in [docs/ICM-BUILD-SPEC.md](docs/ICM-BUILD-SPEC.md)). It was deliberately **stripped down to the interview module only**. Today/Diary/Goals/Schedule/Review/Stats and their backend actions were removed (recoverable in git history before the rebuild commit). The build spec is now historical context, not the current scope.

## Architecture (the core loop)

Four layers, same live loop as before, now single-purpose:

1. **UI** — React + Vite + TypeScript + Tailwind v4 (+ Recharts for the score trend). `app/src/App.tsx` is a thin **shell/router**: it polls health + fetches rounds, then renders the `Landing` (3-mode picker) or one of the three **modules** under a shared `TopNav` (the Learn/Practice/Mock switcher). No real router — just a `mode` state.
2. **Local backend bridge** — Node + Express + `ws` + `chokidar` + `gray-matter` + `multer` (uploads) + `pdf-parse`/`mammoth` (resume parsing). Endpoints:
   - `POST /ask { action? | prompt?, params?, sessionId? }` → spawns the headless `claude` CLI and streams NDJSON events; one run at a time (409 if busy). Actions (resolved from `server/src/prompts.ts`): `startMock`, `scoreMock` (Mock); `learnTrack`, `learnLesson` (Learn); `practiceQuestion`, `practiceFeedback` (Practice). Only the Mock actions write files — the rest just reply.
   - `POST /api/resume` (multipart `file`) → extracts text → saves `data/resume.md`.
   - `GET /api/health` (claude installed? resume present?), `GET /api/file`, `GET /api/collection?dir=mocks` (score trend), `ws /watch` (file-change broadcast).
3. **AI brain** — the `claude` CLI spawned by the backend (`-p … --output-format stream-json --verbose --permission-mode bypassPermissions [--resume]`), using the user's Max-plan login — **no API key**. See [server/README.md](server/README.md).
4. **Files** — `data/resume.md` (parsed resume; **git-ignored**, it's personal data) and `mocks/<date>-<role>-<n>.md` (scored interviews: frontmatter rubric + transcript).

The interviewer is a persistent `claude` session: `startMock` opens it (reads `data/resume.md`), each candidate turn is a `POST /ask` with `sessionId` to resume, and `scoreMock` (resumed) writes the rubric file. Keep all prompts in `server/src/prompts.ts`.

## Modules (the three levels)

Each mode is a **self-contained module** under `app/src/modules/<mode>/`, so they stay independent and easy to evolve separately:

- `modules/mock/MockModule.tsx` — owns ALL the interview state + the voice engine (`useVoice`), the setup→live→scored stages, and the history/trend view. This is the original `App.tsx` logic, moved verbatim.
- `modules/learn/LearnModule.tsx` — picker → track outline → lesson. Persists track/progress/lessons in `localStorage` (`icm.learn.*` keys). No voice.
- `modules/practice/PracticeModule.tsx` — picker → drill (question → answer → feedback). Keeps an in-memory `asked[]` list to avoid repeats. No voice.

Shared UI: `components/Landing.tsx` (3-mode journey picker, `onPick`), `components/TopNav.tsx` (the Learn/Practice/Mock switcher, `Mode` type), `components/RoundSelect.tsx` (round grid + seniority, used by Learn + Practice), `components/Markdown.tsx` (tiny dependency-free renderer for lessons/feedback), `lib/roundMeta.ts` (per-round icons + `LEVELS`). App.tsx passes the `<TopNav/>` element into each module as a `nav` prop so the module decides where to render it (Mock's live call is fullscreen, no nav). Learn/Practice are intentionally a **functional-minimal v1** — flesh them out (spaced repetition, files-as-truth persistence, voice, etc.) when asked.

## Voice (always on, voice-first)

- **TTS = Kokoro** (free local neural TTS via `kokoro-js`), generated **server-side** in `server/src/tts.ts` and served as WAV from `POST /api/tts`; the model warms up on server start. Voices listed at `GET /api/tts/voices` (default `af_heart`). `app/src/lib/useVoice.ts` fetches and plays the WAV, splitting text into sentences/clauses so the first audio starts fast while the rest generate.
- **STT = browser Web Speech API** (free) for hearing the candidate; auto-listens after each interviewer turn. `sttSupported` gates the mic; typing always works as fallback.
- Voice is **always on, no toggle**; it starts automatically when the interview begins (the Start click unlocks audio autoplay). It can't be heard in a headless browser, but `POST /api/tts` returning valid WAV is verifiable.
- The live interview is a **video-call layout** (`app/src/components/LiveCall.tsx`): two tiles (an audio-reactive **RobotAvatar** that vibrates in sync with the voice via a Web Audio analyser from `useVoice.getAnalyser()`, and the candidate's **real webcam** via `getUserMedia` video-only), live captions, a collapsible transcript drawer, and Meet-style controls (mute → pauses STT listening, camera on/off, transcript, End & score). The camera is for realism only — not sent to the AI. The setup is a 3-step wizard (`SetupWizard.tsx`).

## Conventions / rules

- **Files are truth.** App state lives in files (`data/resume.md`, `mocks/`), the UI is a live view. Markdown + YAML frontmatter for human-readable data.
- **Write safely**: backend writes go through `atomicWrite` (temp file then rename).
- **Rubric**: 4 scores 1–4 — `communication`, `depth`, `problem_solving`, `confidence` (see `mockScore` in prompts). The trend averages whatever numeric rubric fields exist.
- Keep it simple. Three modes, each its own module (`app/src/modules/<mode>/`); keep them independent. Don't reintroduce the old study screens (Today/Diary/Goals/etc.) unless asked.
- **Stateless vs. session**: Mock uses a resumed `claude` session (continuity matters). Learn/Practice prompts are stateless one-shots — pass whatever context they need in `params` (e.g. Practice's `asked[]`), and they must NOT write files.

## Commands

**Backend (`server/`):** `cd server && npm install`, then `npm run dev` (tsx watch, http://localhost:4317). `npm run typecheck`. Requires the `claude` CLI installed + logged in.

**UI (`app/`):** `cd app && npm install`, then `npm run dev` (http://localhost:5317). `npm run build`, `npm run typecheck`. Vite proxies `/api`, `/ask`, `/watch` to :4317 — **run the backend too**. No test runner yet.

**Desktop (Tauri, scaffolded):** `app/src-tauri/` — `npm run tauri:dev` / `npm run tauri:build`. Needs the Rust toolchain (`rustup`), not installed yet; see [app/src-tauri/README.md](app/src-tauri/README.md).

## Layout

```
app/
  src/App.tsx              # thin shell/router: health + rounds, picks Landing or a module
  src/modules/mock/        # MockModule — voice interview (setup→live→scored) + history
  src/modules/learn/       # LearnModule — curriculum tracks (localStorage progress)
  src/modules/practice/    # PracticeModule — single-question drills
  src/components/          # Landing, TopNav, RoundSelect, Markdown, SetupWizard, LiveCall, ScoredResult, History, ...
  src/lib/                 # api, useVoice, useReveal, roundMeta
server/     # Node bridge: index.ts, prompts.ts, claude.ts, resume.ts, config.ts
data/       # resume.md (git-ignored)
mocks/      # scored interview results
docs/       # historical build spec + architecture
```


Instructions:

You may autonomously:

- Read and modify source code
- Create files and folders
- Install dependencies
- Run builds and tests
- Fix linting and type errors
- Refactor code

You must NOT:

- Deploy to production
- Migrations, edge function deployments to both test and prod
- Push to git
- Create commits
- Create pull requests
- Modify production databases
- Delete user data
- Change infrastructure

For any action above, stop and ask for approval.

Other than the above you don't need any approval you are free to continue without firing the approval

Assume a development environment unless explicitly told otherwise.