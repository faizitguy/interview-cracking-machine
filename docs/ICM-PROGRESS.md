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
| **M0.6** | Resume upload → Supabase + scratch `resume.md`; health check extended | ✅ Done | 2026-06-20 |
| **M0.7** | Resume → profile auto-extraction (`extractProfile`) pre-fills intake | 🟡 awaiting your verification | — |

---

## ▶ CURRENT STEP — M0.7: Resume → profile auto-extraction (last Phase 0 step)

**Status:** 🟡 In progress (awaiting your verification)
**Goal (PRD §C.1 / M0.7):** upload a resume → the AI reads it → proposes a structured profile (role, languages, stack, projects, strengths, gaps, goal) → onboarding pre-fills those fields for you to confirm + edit. First real "AI generates structured JSON → backend parses + persists" action (ADR-3).

### Implementation prompt (for Claude)
> Build resume → profile auto-extraction (PRD §C.1, M0.7). Backend: add `extractProfile(resumeText)` to `server/src/prompts.ts` returning a prompt that asks for STRICT JSON (display_name, target_role, experience_level∈new/junior/mid/senior, known_languages[], tech_stack[], projects[], strengths[], gaps[], suggested_goal). Add `server/src/json.ts` `parseJsonObject()` (tolerates fences/prose). Add `setLatestResumeInsights()` to `repo/resumes.ts`. Add `POST /api/extract-profile` to `index.ts` — read the latest resume (or `resumeText` body), run the AIProvider, parse JSON, persist insights on the resume row, return the proposal (use the `busy` lock). Frontend: add `extractProfile()` + `ExtractedProfile` to `lib/api.ts`; in `Onboarding.tsx` add a resume Upload control (first-run) that calls `uploadResume` then `extractProfile`, pre-fills the form, shows strengths/gaps, and includes the insights as `resume_insights` when saving. Keep both typechecks green.

### What was built this step
- `server/src/prompts.ts` — `extractProfile(resumeText)` (strict-JSON prompt).
- `server/src/json.ts` — `parseJsonObject()`.
- `server/src/repo/resumes.ts` — `setLatestResumeInsights()`.
- `server/src/index.ts` — `POST /api/extract-profile` (AI → parse → persist → return).
- `app/src/lib/api.ts` — `extractProfile()` + `ExtractedProfile`.
- `app/src/components/Onboarding.tsx` — resume Upload that auto-fills the form + shows strengths/gaps; saves `resume_insights`. Both typechecks pass.

### How YOU verify
**Quick backend check** (a resume must be uploaded first — the M0.6 curl, or upload below):
```
curl -s -X POST localhost:4317/api/extract-profile -H 'content-type: application/json' -d '{}'
```
Expect `{"ok":true,"profile":{"display_name":"Faiz Ahmed Khan","target_role":"AI Engineer","known_languages":[...],"strengths":[...],"gaps":[...],...}}`.

**Full UI flow** (both servers running):
1. In Supabase Studio → Table editor → `profiles`, **delete the row** (so onboarding shows).
2. Reload http://localhost:5317 → the onboarding screen appears.
3. Click **Upload** → choose `/tmp/sample-resume.txt` (or your real resume).
4. It shows "Reading your resume…", then **auto-fills** name/role/level/languages/stack/goal and lists **strengths/gaps**.
5. Review/edit → **Start my journey** → lands in the app; reload goes straight in.

**Pass = the endpoint returns structured JSON, and in the UI the resume auto-fills the form; saving persists.**
Tell me it works (or paste output) and I'll mark M0.7 ✅ — **which completes Phase 0** — and write the first **Phase 1** prompt (the Learn-Python roadmap).

**Verified:** —

---

## Changelog

- **2026-06-20 — M0.7 built** (awaiting verification): resume → profile auto-extraction — `extractProfile` prompt, `json.ts`, `POST /api/extract-profile`, onboarding auto-fill. Last Phase 0 step.
- **2026-06-20 — M0.6 ✅ Done:** resume upload persists to Supabase (`repo/resumes.ts`); `/api/health` extended (provider + supabase + resume).
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
