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
| **M0.5** | Onboarding intake UI → `profiles` (first-run gate + edit) | 🟡 awaiting your verification | — |
| M0.6 | Resume upload → Supabase + scratch `resume.md`; health check extended | 🔲 | — |
| M0.7 | Resume → profile auto-extraction (`extractProfile`) pre-fills intake | 🔲 | — |

---

## ▶ CURRENT STEP — M0.5: Onboarding intake UI → profiles

**Status:** 🟡 In progress (awaiting your verification)
**Goal (PRD §C.1 / M0.5):** a real first-run onboarding screen that captures the personalised profile and saves it (via M0.4's `/api/profile`); if a profile already exists, skip straight into the app, and allow editing it.

### Implementation prompt (for Claude)
> Build first-run onboarding (PRD §C.1, M0.5). Add `getProfile()`/`saveProfile()` + a `Profile` type to `app/src/lib/api.ts`. Add `app/src/components/Onboarding.tsx` — a polished, on-theme intake form (name, target role, experience level, known languages, tech stack, hours/week, goal, teaching style) that POSTs to `/api/profile`; it doubles as the profile editor when given an existing profile. In `app/src/App.tsx`, load the profile on mount: while loading show a tiny loader; if null (or the user chose "edit") render `Onboarding` (blocking on first run); otherwise render the existing Landing/modules and pass `userName` + `onEditProfile` to the nav. Add an "edit profile" chip to `TopNav`. Keep `npm run typecheck` green. Resume auto-fill is the NEXT step (M0.6/M0.7), not this one.

### What was built this step
- `app/src/lib/api.ts` — `Profile` type + `getProfile()` / `saveProfile()`.
- `app/src/components/Onboarding.tsx` — intake form (create + edit) → `POST /api/profile`, themed with the aurora design system.
- `app/src/App.tsx` — loads the profile; gates first-run onboarding; passes `userName` + `onEditProfile` to the nav.
- `app/src/components/TopNav.tsx` — a profile chip that reopens onboarding as an editor.
- App typecheck passes.

### How YOU verify
Run **both** servers: `cd server && npm run dev` and (new terminal) `cd app && npm run dev`, then open http://localhost:5317.

Because the "Faiz" profile already exists (from M0.4), you'll see the **app skip onboarding** — that proves the gate. To check the rest:
1. **Edit path (proves save + edit):** open any mode from the landing → in the top nav click the **"Faiz" chip** → onboarding opens **prefilled** → change something (e.g. add a language) → **Save changes** → it closes and persists. Reload — your change is still there.
2. **First-run path (optional):** in Supabase Studio → Table editor → `profiles`, delete the row → reload the app → the **onboarding screen appears** → fill it in → **Start my journey** → lands in the app; reload goes straight in.

**Pass = the app skips onboarding when a profile exists, the editor saves changes that persist, and (optional) a fresh profile shows onboarding on first run.**
Tell me it works (or paste any issue) and I'll mark M0.5 ✅ and write the M0.6 prompt (resume upload → Supabase).

**Verified:** —

---

## Changelog

- **2026-06-20 — M0.5 built** (awaiting verification): onboarding intake UI (`Onboarding.tsx`) + `getProfile`/`saveProfile`; App gates first-run; TopNav edit chip.
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
