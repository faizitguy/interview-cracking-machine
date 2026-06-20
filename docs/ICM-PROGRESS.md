# ICM Build Progress Tracker

> **This is the "where are we" file. Read it FIRST in any new chat before doing build work.**
> Pairs with the full plan: [ICM-PRODUCT-PRD.md](ICM-PRODUCT-PRD.md). Decisions live in the PRD's ADR table (Part B) and in Claude memory (`icm-vnext-decisions`).

---

## How this works (the loop — for Claude in any session)

We build **one step at a time**, and a step is only ✅ Done after the **user verifies it works**.

1. **Read this file top to bottom.** Find **▶ CURRENT STEP**.
2. Read that step's **Implementation prompt** — it's written for you. Implement exactly that, nothing more.
3. **Run what you can** (typecheck, scripts) to self-check, then tell the user the **exact steps to verify**.
4. **Wait for the user to confirm it works.** Do **not** mark Done on your own.
5. When the user confirms:
   - Set the step's status to **✅ Done** and fill **Verified**.
   - Add a line to the **Changelog**.
   - Move **▶ CURRENT STEP** to the next milestone and **write its Implementation prompt**.
   - Update the **Status board** + the PRD's trackers (§F.0 and the phase table) to match.
6. If the user reports a problem, keep the step 🟡 and fix; don't advance.

**Status legend:** 🔲 Not started · 🟡 In progress (awaiting verification) · ✅ Done · ⏸️ Blocked

---

## Locked context (don't relitigate — see PRD Part B)

- **Single-user, local-first** app built for the owner. No multi-tenant / accounts / RLS.
- **AI engine:** the owner's own **Claude Code** (default) behind an `AIProvider` interface; optional **API key** fallback.
- **AI generates content → backend persists to Supabase** (not "Claude writes files").
- **Source of truth:** **Supabase Postgres**; local files are disposable scratch for Claude to read.
- **Code execution:** Pyodide (browser Python) + Judge0 (server, multi-language).
- **First features after foundation:** Learn-Python + DSA. Gamification = solo RPG. Visuals = Mermaid + DSA visualizers + code traces + Excalidraw.
- Open questions still parked: PRD Part G (esp. **OQ-7** Supabase vs local SQLite, **OQ-1** auth-or-none).

---

## Status board (mirror of PRD Part F)

| Phase | Theme | Milestones | Status |
|---|---|---|---|
| **0** | Foundation: Supabase, AIProvider, onboarding, resume extraction | M0.1 … M0.7 | 🟡 in progress |
| **1** | Learn engine v1 (Python): roadmap → daily → compiler → progress | M1.1–M1.7 | 🔲 |
| **2** | DSA learning track + visual learning v1 | M2.1–M2.6 | 🔲 |
| **3** | DSA contests (timed, judged, recorded, AI analysis) | M3.1–M3.5 | 🔲 |
| **4** | Gamification + progress dashboard (full) | M4.1–M4.5 | 🔲 |
| **5** | Whiteboard rounds: DSA, then System Design | M5.1–M5.6 | 🔲 |
| **6** | API fallback provider + multi-device + voice mock on Supabase | M6.1–M6.4 | 🔲 |
| **7** | Visual learning v2 + advanced visualizers + polish + packaging | M7.1–M7.5 | 🔲 |

### Phase 0 milestones

| ID | Milestone | Status | Verified |
|---|---|---|---|
| **M0.1** | Supabase project + base schema (profiles, ai_settings, resumes, user_stats) | ✅ Done | 2026-06-20 (`db:check`) |
| M0.2 | First-run setup / auth | ⏭️ Decided — no login for now (local single-user); revisit only if cloud sync needs it | 2026-06-20 |
| **M0.3** | `AIProvider` abstraction; `ClaudeCodeProvider` reimplements today's behavior | ✅ Done | 2026-06-20 (`/ask` round-trip) |
| **M0.4** | Persistence bridge: server writes app data → Supabase + materializes scratch files | 🟡 awaiting your verification | — |
| M0.5 | Onboarding intake UI → `profiles` | 🔲 | — |
| M0.6 | Resume upload → Supabase + scratch `resume.md`; health check extended | 🔲 | — |
| M0.7 | Resume → profile auto-extraction (`extractProfile`) pre-fills intake | 🔲 | — |

---

## ▶ CURRENT STEP — M0.4: Persistence bridge (server → Supabase) + scratch files

**Status:** 🟡 In progress (awaiting your verification)
**Goal (PRD ADR-3/ADR-4 / M0.4):** establish the pattern where the server persists app data to Supabase and materializes disposable scratch files for Claude. Demonstrated with a real `profiles` read/write round-trip.

### Implementation prompt (for Claude)
> Build the persistence bridge (PRD ADR-3/ADR-4). Add `server/src/repo/profiles.ts` with `getProfile()` (the singleton profile or null) and `upsertProfile(patch)` (insert if none, else update) over the Supabase `profiles` table via `getDb()`. Add `server/src/scratch.ts` with `writeScratch(name, content)` (atomic write under `data/`) and `materializeProfile(profile)` (renders `data/profile.md` for Claude). Add `GET /api/profile` and `POST /api/profile` to `server/src/index.ts` — POST upserts then materializes the scratch file. Ensure `data/` scratch is git-ignored (keep the folder via `.gitkeep`). Keep typecheck green. (No UI yet — that's M0.5.)

### What was built this step
- `server/src/repo/profiles.ts` — `getProfile()` / `upsertProfile()` (singleton) + `Profile` type.
- `server/src/scratch.ts` — `writeScratch()` (atomic) + `materializeProfile()` → `data/profile.md`.
- `server/src/index.ts` — `GET /api/profile` and `POST /api/profile` (upsert → materialize scratch).
- `.gitignore` — now ignores all of `data/` (scratch); `data/.gitkeep` keeps the folder. Typecheck passes.

### How YOU verify (do this, then tell me the round-trip works)
With `server/.env` set (from M0.1) and the backend running (`npm run dev`):
1. **Write a profile** (this hits Supabase + writes the scratch file):
   ```
   curl -s -X POST localhost:4317/api/profile \
     -H 'content-type: application/json' \
     -d '{"display_name":"Faiz","target_role":"AI Engineer","experience_level":"mid","known_languages":["Python"],"hours_per_week":10,"goal":"Land an AI Eng role"}'
   ```
   Expect `{"ok":true,"profile":{...,"id":"...","display_name":"Faiz",...}}`.
2. **Read it back:**
   ```
   curl -s localhost:4317/api/profile
   ```
   Expect the same profile returned.
3. **Scratch file written for Claude:**
   ```
   cat ../data/profile.md
   ```
   Expect a markdown profile with your name/role/goal.
4. *(Optional)* In Supabase Studio → Table editor → `profiles` → see the one row.

**Pass = POST returns the saved profile with an `id`, GET returns it, and `data/profile.md` exists.**
Tell me it works (or paste output) and I'll mark M0.4 ✅ and write the M0.5 prompt (onboarding intake UI).

**Verified:** —

---

## Changelog

- **2026-06-20 — M0.4 built** (awaiting verification): persistence bridge — `repo/profiles.ts`, `scratch.ts`, `GET/POST /api/profile`; `data/` fully git-ignored.
- **2026-06-20 — M0.3 ✅ Done:** AIProvider abstraction verified via `/ask` round-trip (`server/src/ai/*`); `/ask` + `/api/health` routed through it.
- **2026-06-20 — M0.2 decided:** no login for now (local single-user); folds into M0.5 onboarding.
- **2026-06-20 — M0.1 ✅ Done:** Supabase base schema verified via `db:check` (all 4 tables present).
- M0.1 scaffolding committed (`1cb56c6`, `b988cc2`).
- Pre-step: cleared throwaway local data (sample `mocks/*.md` + `data/resume.md`); wrote PRD + this tracker.

---

## Environment / setup notes

- **Backend:** `cd server && npm install`, `npm run dev` (http://localhost:4317), `npm run typecheck`, `npm run db:check`.
- **UI:** `cd app && npm install`, `npm run dev` (http://localhost:5317).
- **Secrets:** `server/.env` (git-ignored). Template in `server/.env.example`.
- **DB migrations:** `supabase/migrations/` — apply via Supabase Studio SQL editor or `supabase db push`.
- **Claude CLI** must be installed + logged in for AI actions (the default engine).
