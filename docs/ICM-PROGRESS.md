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
| **M0.4** | Persistence bridge: server writes app data → Supabase + materializes scratch files | ✅ Done | 2026-06-20 (profile round-trip) |
| **M0.5** | Onboarding intake UI → `profiles` (first-run gate + edit) | ✅ Done | 2026-06-20 |
| **M0.6** | Resume upload → Supabase + scratch `resume.md`; health check extended | 🟡 awaiting your verification | — |
| M0.7 | Resume → profile auto-extraction (`extractProfile`) pre-fills intake | 🔲 | — |

---

## ▶ CURRENT STEP — M0.6: Resume upload → Supabase + extended health

**Status:** 🟡 In progress (awaiting your verification)
**Goal (PRD §C.1 / M0.6):** uploading a resume parses it, stores it in Supabase (`resumes`) as the source of truth, still writes the local `data/resume.md` scratch for Claude, and `/api/health` reports Claude + Supabase + resume status. (Auto-extraction into the profile is the NEXT step, M0.7.)

### Implementation prompt (for Claude)
> Extend resume handling (PRD §C.1, M0.6). Add `server/src/repo/resumes.ts` with `saveResume({filename, content_md, chars})` (insert) and `getLatestResume()` over the Supabase `resumes` table. In `server/src/index.ts`, after `/api/resume` writes the `data/resume.md` scratch, also `saveResume(...)` to Supabase and return the new `id`. Extend `GET /api/health` to report `provider` (the AIProvider id), `supabase: { configured }` (from `dbConfigured()`), and derive `hasResume`/`resumeName` from the latest Supabase resume (falling back to the local scratch). Keep the existing `claude` + `hasResume` fields so the frontend keeps working. Keep typecheck green. (No new UI — resume upload appears in onboarding in M0.7 with extraction.)

### What was built this step
- `server/src/repo/resumes.ts` — `saveResume()` / `getLatestResume()`.
- `server/src/index.ts` — `/api/resume` now also persists to Supabase (returns `id`); `/api/health` reports `provider`, `supabase.configured`, and resume status (Supabase-first, scratch fallback).
- A sample resume for testing is at `/tmp/sample-resume.txt`. Typecheck passes.

### How YOU verify (backend running, `server/.env` set)
1. **Upload the sample resume:**
   ```
   curl -s -F "file=@/tmp/sample-resume.txt" localhost:4317/api/resume
   ```
   Expect `{"ok":true,"id":"...","filename":"sample-resume.txt","chars":...}`.
2. **Health now reports Supabase + resume:**
   ```
   curl -s localhost:4317/api/health
   ```
   Expect `"provider":"claude_code"`, `"supabase":{"configured":true}`, `"hasResume":true`, `"resumeName":"sample-resume.txt"`.
3. **Scratch for Claude:** `cat ../data/resume.md` → the resume text with frontmatter.
4. *(Optional)* Supabase Studio → Table editor → `resumes` → see the row.

**Pass = upload returns an `id`, health shows `supabase.configured:true` + `hasResume:true`, and `data/resume.md` exists.**
Tell me it works (or paste output) and I'll mark M0.6 ✅ and write the **M0.7** prompt — the resume → profile auto-extraction (`extractProfile`) that pre-fills onboarding, the feature you asked for.

**Verified:** —

---

## Changelog

- **2026-06-20 — M0.6 built** (awaiting verification): resume upload persists to Supabase (`repo/resumes.ts`); `/api/health` extended (provider + supabase + resume).
- **2026-06-20 — M0.5 ✅ Done:** onboarding intake UI (`Onboarding.tsx`) + `getProfile`/`saveProfile`; App gates first-run; TopNav edit chip.
- **2026-06-20 — M0.4 ✅ Done:** persistence bridge verified via profile round-trip — `repo/profiles.ts`, `scratch.ts`, `GET/POST /api/profile`; `data/` fully git-ignored.
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
