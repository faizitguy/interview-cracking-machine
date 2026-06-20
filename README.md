# Interview Cracking Machine

A **local-first, voice-first mock-interview app**. Upload your resume, pick an interview round, and Claude (running locally behind the UI) conducts a realistic spoken interview anchored in your real skills and projects — then writes you an honest, round-aware scored rubric.

Everything runs on your machine. Your resume stays local and git-ignored. There's **no API key** — the interviewer is the `claude` CLI signed in with your Max-plan login.

---

## How it works

```
┌──────────────┐     POST /ask        ┌──────────────────┐    spawns    ┌────────────┐
│   React UI   │ ───────────────────▶ │  Node bridge      │ ───────────▶ │ claude CLI │
│  (Vite)      │ ◀─── NDJSON stream ── │  (Express + ws)   │ ◀─ stream ── │ (headless) │
│  :5317       │                       │  :4317            │              └────────────┘
└──────────────┘                       └──────────────────┘
                                              │  reads / writes
                                              ▼
                                   data/resume.md  ·  mocks/*.md
```

1. **UI** — React 19 + Vite + TypeScript + Tailwind v4 (+ Recharts for the score trend). One screen, three stages in `app/src/App.tsx`:
   **setup** (resume upload + round/role/level) → **live** (Google-Meet-style voice interview) → **scored** (verdict + trend).
2. **Local backend bridge** — Node + Express + `ws` + `chokidar` + `gray-matter`, with `multer` + `pdf-parse`/`mammoth` for resume parsing. Spawns the headless `claude` CLI, streams its output to the UI, and watches the data files.
3. **AI brain** — the `claude` CLI, spawned headless (`-p … --output-format stream-json --permission-mode bypassPermissions [--resume]`). Uses your existing Claude login — no API key.
4. **Files are truth** — app state lives in markdown files: `data/resume.md` (your parsed resume, git-ignored) and `mocks/<date>-<round>-<n>.md` (a frontmatter rubric + the full transcript).

The interviewer is a single persistent `claude` session: `startMock` opens it (reading your resume), each of your answers resumes it via `POST /ask`, and `scoreMock` writes the final rubric file.

### Voice

- **TTS = Kokoro** — free local neural TTS (`kokoro-js`), generated server-side and served as WAV from `POST /api/tts`. The model warms up on server start.
- **STT = browser Web Speech API** — free; auto-listens after each interviewer turn. Typing always works as a fallback.
- Voice is **always on** and starts when the interview begins. The live view is a video-call layout: an audio-reactive robot interviewer, your real webcam tile (for realism — not sent to the AI), live captions, a transcript drawer, and Meet-style controls.

### Interview rounds

General / Behavioral · DSA / Coding · System Design · AI Engineering · Python · Backend · Frontend · Full-Stack
(defined in `server/src/prompts.ts` → `ROUNDS`, served via `GET /api/rounds`).

### Scoring

Each interview is scored 1–4 on four axes — **communication**, **depth**, **problem_solving**, **confidence** — written as YAML frontmatter to a file in `mocks/`. The score trend on the results screen averages whatever numeric rubric fields exist.

---

## Prerequisites

- **Node.js** 20+ (developed on v25).
- **`claude` CLI** installed **and logged in** — this is the AI engine. Verify with `claude --version`. The app's health check confirms it's reachable.
- A modern Chromium-based browser is recommended for the best Web Speech (STT) support.

---

## Getting started

The app is two processes — **run both**. Use two terminals.

### 1. Backend (`server/`) — http://localhost:4317

```bash
cd server
npm install
npm run dev        # tsx watch; Kokoro TTS warms up on boot
```

### 2. UI (`app/`) — http://localhost:5317

```bash
cd app
npm install
npm run dev        # Vite; proxies /api, /ask, /watch → :4317
```

Then open **http://localhost:5317**, upload your resume, pick a round + role + level, and start the interview.

> Vite proxies API calls to the backend, so the backend **must** be running or the UI can't reach Claude.

### Quick health check

```bash
curl -s http://localhost:4317/api/health
# → {"ok":true,"claude":{"ok":true,"version":"…"},"hasResume":true,...}
```

---

## Scripts

**Backend (`server/`)**

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with `tsx watch` (auto-reload) on :4317 |
| `npm start` | Start once (no watch) |
| `npm run build` | Type-check + emit with `tsc` |
| `npm run typecheck` | Type-check only |

**UI (`app/`)**

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :5317 |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Type-check only |
| `npm run tauri:dev` / `tauri:build` | Desktop build (Tauri — needs the Rust toolchain; see `app/src-tauri/README.md`) |

The backend port is configurable via `ICM_PORT` (default `4317`).

---

## API surface (backend)

| Endpoint | Purpose |
| --- | --- |
| `POST /ask` | `{ action? \| prompt?, params?, sessionId? }` → spawns `claude`, streams NDJSON events. One run at a time (409 if busy). Actions: `startMock`, `scoreMock`. |
| `POST /api/resume` | multipart `file` → extracts text → saves `data/resume.md` |
| `GET /api/health` | Is `claude` installed? Is a resume present? |
| `GET /api/rounds` | List of interview rounds |
| `GET /api/file` | Read a data/mock file |
| `GET /api/collection?dir=mocks` | Score-trend data |
| `POST /api/tts` | Kokoro TTS → WAV |
| `GET /api/tts/voices` | Available voices (default `af_heart`) |
| `ws /watch` | File-change broadcast |

---

## Project layout

```
app/        # React UI: App.tsx (the whole experience), components/ (LiveCall, SetupWizard, …), lib/api, lib/useVoice
server/     # Node bridge: index.ts, prompts.ts, claude.ts, resume.ts, tts.ts, config.ts
data/       # resume.md (parsed resume — git-ignored, personal data)
mocks/      # scored interview results (frontmatter rubric + transcript)
docs/       # historical build spec + architecture
```

---

## Conventions

- **Files are truth.** App state lives in markdown + YAML frontmatter; the UI is a live view of those files.
- **Writes are atomic** — backend writes go through `atomicWrite` (temp file → rename).
- **Keep prompts in `server/src/prompts.ts`.**
- The app is intentionally **one module** (mock interviews). It began as a larger multi-module study app (see `docs/ICM-BUILD-SPEC.md`) and was deliberately stripped down — that spec is historical context, not the current scope.

---

## Troubleshooting

- **`/api/health` shows `claude` not ok** → install the `claude` CLI and run `claude` once to log in.
- **Port already in use** → an instance is already running. Reuse it, or set `ICM_PORT` for the backend. If Vite's port is taken it auto-bumps to the next one (e.g. :5318) and prints the URL.
- **UI loads but can't reach Claude** → the backend isn't running; start `server/` first.
- **No interviewer voice** → Kokoro warms up on backend start (first call can lag); voice can't be heard in a headless browser, but `POST /api/tts` returning a valid WAV confirms it works.
- **Mic not working** → STT uses the browser Web Speech API; use a Chromium-based browser and allow microphone access. Typing is always available as a fallback.
