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
| **M0.1** | Supabase project + base schema (profiles, ai_settings, resumes, user_stats) | 🟡 awaiting your verification | — |
| M0.2 | First-run setup (optional single-account auth) | 🔲 | — |
| M0.3 | `AIProvider` abstraction; `ClaudeCodeProvider` reimplements today's behavior | 🔲 | — |
| M0.4 | Bridge persists AI output to Supabase + materializes scratch files | 🔲 | — |
| M0.5 | Onboarding intake UI → `profiles` | 🔲 | — |
| M0.6 | Resume upload → Supabase + scratch `resume.md`; health check extended | 🔲 | — |
| M0.7 | Resume → profile auto-extraction (`extractProfile`) pre-fills intake | 🔲 | — |

---

## ▶ CURRENT STEP — M0.1: Supabase project + base schema

**Status:** 🟡 In progress (awaiting your verification)
**Goal (PRD §F.1):** a Supabase instance exists with the Phase 0 base tables, and the app can read/write them.

### Implementation prompt (for Claude)
> Stand up the Supabase persistence layer for the single-user ICM. Create a SQL migration for the four Phase 0 tables — `profiles`, `ai_settings`, `resumes`, `user_stats` — single-user (no `user_id`, no RLS), matching PRD §D.4. Add a lazy, optional Supabase client in the server (`server/src/db.ts`) that reads `SUPABASE_URL` + service/anon key from `server/.env` and does **not** break startup when unset. Add a `db:check` script (`server/src/db-check.ts`) that connects and confirms all four tables exist (the DoD check). Provide `.env.example`. Do not wire endpoints yet — that's later milestones. Keep typecheck green.

### What was built this step
- `supabase/migrations/0001_init.sql` — the four base tables (single-user).
- `server/src/db.ts` — lazy/optional Supabase client (`getDb()`, `dbConfigured()`).
- `server/src/db-check.ts` + `npm run db:check` — connection + table-existence check.
- `server/.env.example` — `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`.
- Added deps `@supabase/supabase-js`, `dotenv`. Typecheck passes; `db:check` runs (reports "not configured" until you connect Supabase).

### How YOU verify (do this, then tell me if you see all ✓)
Pick **one** way to get a Supabase, then connect + check:

**Option A — Cloud (no Docker):**
1. Create a free project at supabase.com → open it.
2. **SQL Editor** → paste the contents of `supabase/migrations/0001_init.sql` → Run.
3. **Project Settings → API** → copy the **Project URL** and the **service_role** key.
4. `cp server/.env.example server/.env` and fill `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`.

**Option B — Local (needs Docker + Supabase CLI):**
1. `npx supabase init` (once), then `npx supabase start`.
2. `npx supabase db push` (applies the migration).
3. Put the printed API URL + service_role key into `server/.env`.

**Then, from `server/`:**
```
npm run db:check
```
**Pass = you see `✓ profiles`, `✓ ai_settings`, `✓ resumes`, `✓ user_stats` and "M0.1 verified."**
Tell me it passed (or paste any error) and I'll mark M0.1 ✅ and write the M0.2 prompt.

**Verified:** —

---

## Changelog

- _(pending)_ M0.1 scaffolding built; awaiting user verification.
- Pre-step: cleared throwaway local data (sample `mocks/*.md` + `data/resume.md`); wrote PRD + this tracker. Committed `1cb56c6`.

---

## Environment / setup notes

- **Backend:** `cd server && npm install`, `npm run dev` (http://localhost:4317), `npm run typecheck`, `npm run db:check`.
- **UI:** `cd app && npm install`, `npm run dev` (http://localhost:5317).
- **Secrets:** `server/.env` (git-ignored). Template in `server/.env.example`.
- **DB migrations:** `supabase/migrations/` — apply via Supabase Studio SQL editor or `supabase db push`.
- **Claude CLI** must be installed + logged in for AI actions (the default engine).
