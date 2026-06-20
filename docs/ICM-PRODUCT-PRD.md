# Interview Cracking Machine — Product Requirements & Phased Build Plan (PRD)

> **Status:** Draft v1 · Owner: Faiz · Last updated: 2026-06-20
> **This document is the single source of intent** for the next major version of ICM. It defines *what* we are building, *why*, *for whom*, the *architecture*, and a *phase-by-phase plan with milestones and a live tracker*.
>
> **How to use this file**
> - Read top-to-bottom once for context, then work **phase by phase** (Part F).
> - Each phase has **Milestones** (numbered `Mx.y`), a **Definition of Done (DoD)**, and a **tracker table**. Update the **Status** column as work progresses using the legend below.
> - The **Master Milestone Tracker** (§F.0) is the at-a-glance "where are we" board. Keep it in sync with the per-phase tables.
> - Decisions already locked are in §B (Architecture Decision Records). Don't relitigate them silently — if a phase needs to change one, add an ADR and flag it.
>
> **Status legend:** 🔲 Not started · 🟡 In progress · ✅ Done · ⏸️ Blocked · 🔁 Needs rework

---

## Table of contents

- **Part A — Product vision**
  - A.1 What we are building (and the one-line promise)
  - A.2 Who it's for (personas)
  - A.3 The core insight & differentiators
  - A.4 Product pillars & the user journey
- **Part B — Locked decisions (ADRs)**
- **Part C — Functional requirements (by pillar)**
  - C.1 Onboarding & personalization
  - C.2 Learn — Language track (Python first)
  - C.3 Learn — Roadmap & daily-content engine
  - C.4 The in-app code runner (Pyodide + Judge0)
  - C.5 Teaching styles & regeneration
  - C.6 DSA — learning track
  - C.7 DSA — contests
  - C.8 DSA — whiteboard interview round
  - C.9 System Design — whiteboard round
  - C.10 Mock interview (voice) — enhanced
  - C.11 Practice drills
  - C.12 Gamification (solo RPG)
  - C.13 Visual learning system
  - C.14 Progress, analytics & the dashboard
- **Part D — Technical architecture**
  - D.1 System overview
  - D.2 The AIProvider abstraction (Claude Code + API fallback)
  - D.3 Source-of-truth & sync model
  - D.4 Supabase data model (schema)
  - D.5 Backend bridge (endpoints)
  - D.6 Security, privacy & multi-tenancy
  - D.7 Offline & resilience
- **Part E — Non-functional requirements**
- **Part F — Phased delivery plan + trackers**
  - F.0 Master milestone tracker
  - F.1 … F.8 Phases
- **Part G — Risks & open questions**
- **Part H — Out of scope / future**
- **Part I — Appendices** (prompt catalog, teaching personas, glossary)

---

# Part A — Product vision

## A.1 What we are building

**Interview Cracking Machine (ICM)** is a **personalised, AI-mentored interview-preparation kit**. It behaves like an *experienced, patient senior engineer who mentors one learner at a time* — it understands your **goal, experience, and tech stack**, builds a **realistic roadmap around your time commitment**, then walks you through it **day by day** with the **simplest possible explanations, lots of hands-on practice, in-app coding, realistic contests, and realistic interview rounds** — adapting continuously to how you're actually doing.

**The one-line promise:** *"Tell me your goal and how much time you have. I'll make you job-ready — one simple, hands-on day at a time."*

It is **not** a passive course library. It is an **active mentor + practice arena + interview simulator** in one, where:
- **Learning is short, practice is long.** Every concept is immediately followed by *doing* — in an embedded compiler, on real assignments, in contests, in mock rounds.
- **Everything is personalised** to the individual and **regenerable** in whatever teaching style clicks for them ("explain like I'm 5", "just real examples", "show me visually").
- **Everything is recorded** — content, attempts, code, scores, progress — so the learner can see exactly how far they've come, and the mentor can adapt.

ICM today is a working **voice-first mock interviewer** (local, single-user, file-based). This PRD takes it to a **persistent, personalised single-user learning platform built for you** while preserving its defining trait: **the AI engine is your own Claude Code** (free on a Max plan), with an **optional API key** if you want it.

## A.2 Who it's for

**ICM v-next is built for one person — you.** It's a personal, single-user interview-prep kit tuned to *your* goal, experience, and tech stack. There are no accounts, tenants, or other users to design around; every decision optimises for your experience. The different situations you might use it in (and what ICM gives you in each):

| Your situation | What ICM gives you |
|---|---|
| **Building from a weaker base** | A from-zero roadmap in the simplest language, daily hands-on assignments, and gamified momentum to keep going. |
| **Grinding DSA for big-tech** | Topic-targeted DSA roadmap, LeetCode-style timed contests with AI analysis, and realistic whiteboard DSA + System Design rounds. |
| **Rusty / switching stack** | "Learn a second language as an extension of your first", targeted gap-closing, and mock interviews anchored to your resume. |
| **Power-user / builder** | The local-first, no-API-cost path (your own Claude Code) and full control of your own data. |

## A.3 The core insight & differentiators

1. **A mentor, not a catalogue.** The roadmap, the daily plan, the explanations, and the feedback are all generated *for this person, today*, and adapt to their performance. There is no fixed content库; the AI authors it on demand and the system remembers it.
2. **Learn short, practice long.** Theory is compressed; doing is maximised — embedded compiler, many small assignments, contests, and realistic rounds.
3. **Personalised teaching styles.** The same concept can be re-taught as "explain like I'm 5", "real-world examples only", "visual-first", etc., on demand. This is a first-class feature, not a gimmick.
4. **Visual-first for hard things.** DSA and System Design lean on diagrams, interactive algorithm visualizers, and step-through code execution — because seeing it is understanding it.
5. **Realistic interview simulation.** Voice mock rounds *and* screen-shared whiteboard rounds (DSA + System Design) with periodic screenshots and in-the-moment conversational feedback — the closest thing to the real chair.
6. **Your AI, your data.** Local-first and single-user: the AI is *your* Claude Code (no API cost), and the data is yours alone in your own Supabase. API key optional.
7. **Gamified urge to return.** XP, levels, streaks, badges, daily quests — designed to make the learner *want* to come back tomorrow.

## A.4 Product pillars & the user journey

ICM is organised into **five pillars** the learner moves through, all sharing one personalised profile:

```
                         ┌─────────────────────────────────────────────┐
   ONBOARDING  ───────▶  │  Goal · Experience · Tech stack · Time/week  │
   (who are you,         │  Known languages · Target role · Teaching     │
    what's the goal)     │  style preference                             │
                         └──────────────────────┬──────────────────────┘
                                                │  (the personalised profile feeds everything)
        ┌───────────────────┬───────────────────┼───────────────────┬───────────────────┐
        ▼                   ▼                   ▼                   ▼                   ▼
   ① LEARN             ② DSA               ③ PRACTICE         ④ CONTESTS         ⑤ MOCK ROUNDS
   Language + roadmap   Roadmap + topics    Quick drills       Timed, realistic   Voice interview +
   + daily content +    + visual daily      (one Q at a time,  LeetCode-style     Whiteboard DSA +
   assignments +        content + problem   instant feedback)  with AI analysis   Whiteboard SysD
   compiler             practice
        └───────────────────┴───────────────────┴───────────────────┴───────────────────┘
                                                │
                                                ▼
                       PROGRESS & GAMIFICATION (XP · streaks · levels · badges · analytics)
                            persisted in Supabase, visible as a live dashboard
```

The journey is **non-linear** — a learner can be doing a Python roadmap, drilling DSA, and running a weekly contest in parallel — but every activity writes to the same progress record and feeds the same gamified dashboard.

---

# Part B — Locked decisions (ADRs)

These were decided during scoping (2026-06-20) and are the foundation for everything below.

| # | Decision | Choice | Rationale / implication |
|---|---|---|---|
| **ADR-1** | **Deployment & user model** | **Single-user, local-first — built for one person (you).** Runs on your machine with **your own Claude Code**. | No accounts, no tenants, no shared compute. *Revised 2026-06-20: multi-tenant explicitly dropped in favour of a personal, single-user app.* |
| **ADR-2** | **AI engine** | **Claude Code primary + API fallback**, behind one `AIProvider` interface. | Default path uses the user's Max-plan Claude Code (free). Optional user-supplied Anthropic/OpenAI key as fallback. Same prompts, same streaming contract. |
| **ADR-3** | **Content generation model** | **Claude generates content; the backend persists it to Supabase.** (Shift away from "Claude writes files".) | Makes the API fallback viable (both providers only need text/vision generation + streaming) and makes Supabase the clean source of truth. |
| **ADR-4** | **Source of truth** | **Supabase Postgres is primary** for all structured data (your single personal store). **Local files are disposable scratch** the backend materializes for Claude Code to read. | Relational features (contests, submissions, progress, analytics) need a real DB. *Single-user note: a local DB (SQLite/Postgres) is a valid simpler alternative; we keep Supabase per your preference + for cross-device sync (see OQ-7).* |
| **ADR-5** | **Code execution** | **Pyodide (in-browser, Python) + Judge0 (server, multi-language).** | Pyodide = free, instant, client-side for learning assignments. Judge0 = real multi-language judging with test cases / time & memory limits for DSA + contests. |
| **ADR-6** | **Learn-track launch scope** | **Python first only.** | Prove the full roadmap→daily→assignment→compiler loop end-to-end before adding languages. |
| **ADR-7** | **Gamification** | **Solo RPG**: XP, levels, streaks (with freezes), badges, daily quests. | Creates the "urge to return". Social/leaderboards are out of scope — it's a single-user app (§H). |
| **ADR-8** | **Visual learning** | **All four:** AI Mermaid diagrams · interactive DSA visualizers · code-execution traces · Excalidraw-style sketches. | Visual-first is a core differentiator, especially for DSA + System Design. Built incrementally across phases. |
| **ADR-9** | **First features after foundation** | **Learn-language (Python) + DSA.** Existing `mocks/*.md` data is throwaway — **no migration.** | Focus the early phases on the highest-value new pillars. |
| **ADR-10** | **Auth** | **Minimal — single-account or none.** Since it's just you, no multi-user auth/RLS. Either no login (purely local) or one Supabase account to protect your cloud data. | Removes signup/login friction; simplifies the schema. |
| **ADR-11** *(default, confirm)* | **Connectivity** | **Online required** (Supabase + Claude Code both need network). Graceful read-only degradation where feasible. | The DB is in the cloud; a local-DB option (ADR-4 note) would relax this. |

---

# Part C — Functional requirements (by pillar)

Each subsection lists **user stories**, **functional requirements (FR)**, and **acceptance criteria (AC)**. Requirements are tagged `[P0]` (must, launch), `[P1]` (should, soon after), `[P2]` (later).

## C.1 Onboarding & personalization

**Goal:** capture exactly enough about the learner to personalise everything, in a delightful, low-friction flow.

**User stories**
- On first launch, I tell ICM my **goal**, **experience level**, **known languages**, **target role**, and **weekly time commitment**, so every roadmap and question fits me.
- I can **optionally upload my resume** and ICM **reads it to fill in most of my profile for me** (skills, stack, experience, projects), so I barely have to type — I just confirm and tweak.
- As a returning user, I can **edit my profile** and ICM adapts going forward.

**Functional requirements**
- `[P0]` **First-run setup** — single-user, so no signup flow: on first launch, go straight to profile intake (optionally protected by one Supabase account if you enable cloud sync).
- `[P0]` **Profile intake** collecting: `display_name`, `target_role`, `experience_level` (new / junior / mid / senior), `known_languages[]`, `primary_tech_stack[]`, `goal` (free text + north-star), `hours_per_week`, `timezone`, default `teaching_style`.
- `[P0]` **Resume upload (optional, but encouraged)** — reuse existing PDF/DOCX/TXT parsing; store parsed markdown in Supabase (`resumes`) and materialize to local `data/resume.md` for Claude context.
- `[P0]` **Resume → profile auto-extraction** *(the high-value step)* — when a resume is uploaded, run an AI action (`extractProfile`) that reads it and **proposes a structured profile**: inferred `target_role`/seniority, `known_languages[]`, `primary_tech_stack[]`, notable **projects**, **strengths**, and **likely gaps** for the target role. Pre-fill the intake form with these; the user **reviews, confirms, and edits** (never silently trusted). This makes onboarding nearly one-click and gives the mentor deep context from day one.
- `[P0]` **Resume-derived insights stored** — persist the extracted structure (skills, projects, strengths, gaps) on the profile/`resumes` record so every downstream feature (roadmap gaps, resume-anchored mocks, "close this gap" quests) can use it without re-parsing.
- `[P1]` **Gap-aware first roadmap** — the proposed first roadmap explicitly targets the **gaps** the resume revealed for the user's target role (ties to §C.3).
- `[P1]` **Re-extract on re-upload** — uploading a newer resume re-runs extraction and proposes a profile diff to apply.
- `[P0]` **AI engine setup** — detect local Claude Code; if absent, offer the **API-key fallback** path (ADR-2). Show a clear status card (reuse today's health check).
- `[P1]` **"Mentor intro" moment** — after intake, the AI greets you by name, reflects your goal (and what it learned from your resume) back, and proposes the first roadmap (sets the mentor tone).

**Acceptance criteria**
- First launch → complete intake in < 2 min (or **upload a resume and mostly auto-fill it**) → land on a personalised home with at least one suggested next action.
- Uploading a resume pre-fills role, languages, stack, and surfaces projects/strengths/gaps for confirmation; confirmed values persist and visibly shape the next generated roadmap.
- Profile edits persist to Supabase and change the next generated roadmap/content.

## C.2 Learn — Language track (Python first)

**Goal:** teach a programming language from the learner's current level, "learn short / practice long", with the simplest language and many small assignments.

**User stories**
- As a beginner, I pick **"Learn Python"**, tell ICM I'm starting fresh and have ~5 hrs/week, and get a **step-by-step roadmap** in the simplest terms.
- As someone who already knows one language, ICM teaches the **second language as an extension of the first** ("you already know loops in X — here's how Python does it").
- Each day I get a **short concept + several hands-on assignments** I solve in an **embedded compiler**, submit, and track.

**Functional requirements**
- `[P0]` **Language picker** (Python at launch; architecture supports more — ADR-6).
- `[P0]` **"Second language as extension" mode** — if `known_languages` is non-empty, the roadmap + explanations explicitly bridge from a known language.
- `[P0]` **Roadmap generation** from goal + level + time (delegated to §C.3 engine).
- `[P0]` **Daily content**: short concept explanation (simplest language) + **2–5 assignments** with starter code and visible/hidden test cases.
- `[P0]` **Embedded Python compiler** (Pyodide) — write, run, see output, run tests, submit (§C.4).
- `[P0]` **Submission tracking** — each submission stored with code + result; day marked complete when assignments pass.
- `[P1]` **Adaptive difficulty** — if a learner breezes/struggles, the next day's content adjusts.

**Acceptance criteria**
- A learner can go intake → Python roadmap → Day 1 content → solve an assignment in the compiler → submit → see it pass → day marked done → XP awarded → progress persisted.

## C.3 Learn — Roadmap & daily-content engine

This engine is **shared** by the Language track (C.2) and the DSA track (C.6). It is the heart of "the personalised mentor".

**Flow:** `Goal + Time commitment + Level (+ topics for DSA)` → **Roadmap proposal** → *user reviews/edits/approves* → **per-day content generated on demand** (not all upfront) → *learner can regenerate any day in any teaching style* → **everything persisted + progress tracked**.

**Functional requirements**
- `[P0]` **Roadmap proposal**: AI drafts an ordered set of **days/units**, each with `title`, `objective`, `est_minutes`, `checkpoint`, optional `depends_on`, scaled to `hours_per_week` (backward-plan from any deadline with a buffer).
- `[P0]` **Review & approve gate**: the learner sees the whole roadmap, can **edit/reorder/remove** units and **approve**. Only on approval does the track become "active". (Matches "once the user agrees with the roadmap, prepare content".)
- `[P0]` **On-demand daily content**: generate one day at a time (cheaper, fresher, adapts to recent performance) — concept + assignments/problems. Give the AI a **focused, single-day prompt** rather than the whole roadmap (your explicit ask: "instead of giving a hard thing to the AI, give the best thing focused on each day").
- `[P0]` **Persistence + versioning**: every generated day is stored in Supabase with a **version**; regeneration creates a new version (history kept). Progress is a separate record so regenerating content doesn't wipe completion.
- `[P0]` **Editable content**: when the learner regenerates/updates a day's content with the AI, **the new version is saved to the DB** (your requirement #5).
- `[P1]` **Roadmap adaptation**: as progress data accrues, the AI can propose roadmap adjustments (insert review days, slow down, skip mastered units).

**Acceptance criteria**
- Approving a roadmap creates a persisted track; opening Day N generates+stores its content; regenerating Day N stores a new version and the UI shows the latest while keeping history.

## C.4 The in-app code runner (Pyodide + Judge0)

**Goal:** a real, fast, LeetCode-grade coding surface used by Learn assignments, DSA problems, and contests.

**Functional requirements**
- `[P0]` **Pyodide runner (client)** for Python learning assignments: run user code, capture stdout/stderr, run provided test cases, show pass/fail. Zero backend cost.
- `[P0]` **Judge0 runner (server)** for DSA problems + contests: submit code in a chosen language, run against **hidden test cases** with **time & memory limits**, return per-test verdicts (`AC / WA / TLE / RE / CE`). Self-hosted via Docker (dev: RapidAPI Judge0 acceptable).
- `[P0]` **Monaco-based editor** with language modes, theme matching the app, run/submit controls, test-result panel.
- `[P1]` **Code-execution trace / Python Tutor-style step-through** (also a visual-learning feature — §C.13) for learning mode.
- `[P1]` **Multi-language support** in the editor/runner (Python first; C++/Java/JS/Go as Judge0 languages are enabled).
- `[P2]` **Custom test input** box (run with your own stdin).

**Acceptance criteria**
- Learning assignment: code runs client-side and reports pass/fail in < 1s for typical snippets.
- DSA/contest submission: code is judged against hidden tests with limits and returns accurate per-test verdicts.

## C.5 Teaching styles & regeneration

**Goal:** the learner can have *anything* re-explained in the style that works for them — a first-class, prominent feature (your requirement #4).

**Functional requirements**
- `[P0]` **Regenerate** button on any AI-authored content (a day's concept, an explanation, an editorial).
- `[P0]` **Teaching-style selector** with presets (see Appendix I.2): **Explain like I'm 5**, **Real-world examples only**, **Visual-first**, **Analogy-driven**, **First-principles / deep**, **Concise cheat-sheet**. Plus a **custom style** free-text ("teach me like a sports coach").
- `[P0]` **Default teaching style** (from onboarding) + per-content override.
- `[P0]` **Versioned persistence**: each regeneration is saved (§C.3) tagged with its style; the learner can switch between saved versions.
- `[P1]` **"I don't understand this part"** — targeted regeneration of a *section*, not the whole day.

**Acceptance criteria**
- From a lesson, choosing "Explain like I'm 5" produces a new, persisted version in that style without losing the original or the learner's progress.

## C.6 DSA — learning track

**Goal:** a visual, personalised DSA curriculum scaled to the learner's level, depth ambition, chosen topics, and target volume.

**User stories**
- As a learner, I set my **current DSA level** (starter / some knowledge / strong), my **depth goal** (manageable / expert / competition), how many **questions** I want to solve, and which **topics** (arrays, strings, stacks, trees, graphs, DP, …), and ICM builds a **solid, visual roadmap**.
- Each day I get **simple, visual explanations** and **problems to solve** in the compiler.

**Functional requirements**
- `[P0]` **DSA intake**: `level`, `depth` (manageable / expert / competition), `target_question_count`, `topics[]` from a **canonical topic catalogue** (Appendix-listed: Arrays, Strings, Hashing, Two Pointers, Sliding Window, Stack, Queue, Linked List, Trees, BST, Heaps, Graphs, BFS/DFS, Backtracking, Greedy, Binary Search, Recursion, Dynamic Programming, Tries, Bit Manipulation, Math, Intervals, Union-Find, Segment/Fenwick trees, …), plus "anything else important" auto-suggested.
- `[P0]` **Visual roadmap** generated via the shared engine (§C.3), ordered by dependency (e.g. arrays before two-pointers before sliding-window).
- `[P0]` **Daily content with visuals**: simple explanation + **Mermaid diagrams**, **interactive DSA visualizers**, and **code-execution traces** where they help (§C.13) + curated/generated **problems** to solve.
- `[P0]` **Per-day focused generation** (one day at a time, like Learn).
- `[P0]` **Problem practice** via Judge0 with editorial/hints available on request.
- `[P1]` **Spaced repetition** of previously-solved problem patterns.

**Acceptance criteria**
- A learner sets level/depth/topics/count → gets a visual roadmap → opens a day → sees a simple explanation *with a working visual* → solves a problem in the judge → progress recorded.

## C.7 DSA — contests

**Goal:** realistic, timed, LeetCode/Codeforces-style contests with full recording and AI analysis (your requirement #6).

**User stories**
- As a learner, I start a **30 / 60 / custom-minute contest**; ICM assembles problems (from my practiced topics/level), runs a **real timer**, and gives me a **LeetCode-like environment**.
- When time ends, ICM **records everything** (problems, my code, verdicts, score) and an **AI analyzer gives me proper feedback**.
- I can **revisit any past contest** and see exactly how I performed, including my code.

**Functional requirements**
- `[P0]` **Contest setup**: duration (30 / 60 / custom), number/difficulty of problems, topic scope. AI assembles a problem set (generated and/or curated, calibrated to the learner).
- `[P0]` **Realistic contest UI**: countdown timer, problem tabs, Monaco editor, submit-to-judge (Judge0) with verdicts, scoreboard of *your* solved/attempted, "time remaining" pressure cues.
- `[P0]` **Full recording**: contest metadata, every submission (code + language + verdict + timestamp), per-problem score, total score — all in Supabase.
- `[P0]` **AI post-contest analysis**: at the end, the AI reviews the learner's code and performance and writes **proper feedback** (what went well, where time was lost, weak patterns, what to study, better approaches) — persisted with the contest.
- `[P0]` **Contest history**: list + detail view replaying any past contest with code, verdicts, and the AI analysis.
- `[P1]` **Auto-submit on timeout** and "virtual contest" replays.
- *Leaderboards are out of scope — it's a single-user app (see §H).*

**Acceptance criteria**
- Start a 30-min contest → solve/attempt problems against the judge → timer ends → results + AI analysis persisted → reopen later and see code + verdicts + analysis intact.

## C.8 DSA — whiteboard interview round

**Goal:** a realistic DSA interview round with **screen sharing**, **periodic screenshots to the AI (vision)**, and **in-the-moment conversational feedback** (your requirement #7).

**User stories**
- As a learner, I start a **DSA whiteboard round**: I get a problem, **share my screen / coding surface**, and the AI interviewer watches by taking **frequent screenshots**, talks me through it, **probes and hints conversationally**, and gives a **proper scored result with feedback** at the end.

**Functional requirements**
- `[P0]` **Round setup**: pick difficulty/topic; AI presents a single problem and the interview persona (builds on existing mock interviewer).
- `[P0]` **Coding surface + screen share**: an in-app coding/whiteboard surface, plus `getDisplayMedia` screen-share capture (so it works even if the learner codes elsewhere).
- `[P0]` **Periodic screenshots → vision**: capture frames on events (pause, "I'm done", phase change) and/or a gentle interval; send to the AI as images so it reasons about the learner's actual progress (Claude Code reads image files; ApiProvider uses vision). Store snapshots in Supabase Storage.
- `[P0]` **Conversational, in-the-moment feedback**: voice/text interviewer reacts to what it sees ("I see you're brute-forcing — what's the complexity?"), gives graduated hints.
- `[P0]` **Scored result**: an honest rubric + verdict + evidence + improvement notes, persisted (reuse mock scoring model, extended for code/whiteboard).
- `[P1]` **Reduced-vision fallback**: if screen capture is unavailable, fall back to reading the in-app editor contents directly.

**Acceptance criteria**
- Start a DSA round → share screen → code → the AI references what it *saw* in its hints → end → a scored, persisted result with evidence tied to observed work.

## C.9 System Design — whiteboard round

**Goal:** the same realistic, screen-shared whiteboard experience for **System Design** (your requirement #8).

**Functional requirements**
- `[P0]` **System-design problem** presented (scaled to level/role), with an **in-app whiteboard** (Excalidraw-style — §C.13) the learner draws on, plus screen-share capture.
- `[P0]` **Periodic screenshots → vision**: the AI watches the evolving diagram and converses (push on requirements, data model, scaling, bottlenecks, "what breaks at 10×?").
- `[P0]` **Scored result** with rubric + evidence referencing the diagram, persisted.
- `[P1]` **AI can sketch back** / annotate the whiteboard to illustrate a point.

**Acceptance criteria**
- Start a SysD round → draw an architecture → the AI critiques what it *sees* on the board → end → scored, persisted result.

## C.10 Mock interview (voice) — enhanced

**Goal:** keep and improve the existing **voice-first** mock interview, now persisted to Supabase.

**Functional requirements**
- `[P0]` **Preserve current voice round** (Kokoro TTS + Web Speech STT, video-call layout, robot avatar, captions, transcript) — reuse as-is.
- `[P0]` **Persist to Supabase** instead of `mocks/*.md`: session, turns/transcript, rubric, verdict, summary.
- `[P0]` **Resume-anchored** questions (reuse existing prompts) using the profile's resume.
- `[P1]` **Provider-agnostic** scoring via `AIProvider` (works with API fallback).
- `[P1]` **Round catalogue** unchanged (General, DSA, System Design, AI Eng, Python, Backend, Frontend, Full-Stack) but DSA/SysD can launch the **whiteboard** variants (§C.8–C.9).

**Acceptance criteria**
- A voice mock runs as today, but the result is stored in Supabase and appears in the unified progress dashboard.

## C.11 Practice drills

**Goal:** keep the lightweight **one-question-at-a-time** drill, now persisted and gamified.

**Functional requirements**
- `[P0]` **Preserve drill loop** (question → answer → instant feedback), reuse existing prompts.
- `[P1]` **Persist** asked questions + answers + feedback (so it remembers across sessions and avoids repeats long-term).
- `[P1]` **Award XP** for drills (§C.12).

## C.12 Gamification (solo RPG)

**Goal:** create a genuine **urge to return and do more** (your requirement #2), single-player, no social.

**Functional requirements**
- `[P0]` **XP** awarded for meaningful actions (completing a day, passing assignments, solving DSA problems, finishing contests/rounds), with sensible weights.
- `[P0]` **Levels** derived from cumulative XP, with satisfying **level-up** moments.
- `[P0]` **Daily streak** with **streak freezes** (a missed day doesn't instantly destroy a long streak — configurable freezes).
- `[P0]` **Badges / achievements** (e.g. "First contest", "7-day streak", "Solved 50 problems", "Closed a resume gap").
- `[P0]` **Daily quest** — a small suggested set of actions for today, tuned to the active roadmap.
- `[P0]` **Skill rings / mastery per topic** — visual fill as the learner improves in a topic.
- `[P1]` **Animated, juicy feedback** (XP burst, confetti on level-up) — restrained, premium feel, not cheesy.
- *Leaderboards / social — out of scope (single-user); see §H.*

**Acceptance criteria**
- Completing actions visibly increases XP, advances levels, maintains the streak, and unlocks badges — all persisted and reflected on the dashboard.

## C.13 Visual learning system

**Goal:** make hard concepts *visible* (your strong emphasis), via four complementary systems (ADR-8). Built incrementally.

| System | What it does | Where used | Tech |
|---|---|---|---|
| **AI Mermaid diagrams** `[P0]` | AI emits Mermaid code in content (flowcharts, trees, graphs, sequence) → rendered inline. | Learn + DSA daily content, explanations. | `mermaid` renderer in the Markdown component. |
| **Interactive DSA visualizers** `[P1]` | Pre-built, steppable animations: array/stack/queue ops, sorting, BFS/DFS, recursion stack, tree/BST/heap, DP tables. Play/pause/step. | DSA daily content, editorials. | Custom React + SVG/Canvas components, driven by structured "steps" the AI or code produces. |
| **Code-execution traces** `[P1]` | Python-Tutor-style step-through: variables, call stack, heap, line highlight. | Learn assignments, DSA solutions. | Trace from Pyodide instrumentation (or a tracer); custom viewer. |
| **Excalidraw-style sketches** `[P1]` | Hand-drawn-feel diagrams/whiteboard the AI or learner annotates. | System Design whiteboard round, "sketch this for me". | Excalidraw component / `rough.js`. Shared with §C.9. |

**Acceptance criteria**
- A DSA lesson on BFS shows a **Mermaid graph**, a **steppable BFS visualizer**, and (for the solution) a **code-execution trace** — all in one day's content.

## C.14 Progress, analytics & the dashboard

**Goal:** the learner always **understands how they're progressing** (your requirement: "the UI should make the user understand how they are being progressed") — and the mentor uses the same data to adapt.

**Functional requirements**
- `[P0]` **Home dashboard**: current level/XP, streak, today's quest, active roadmaps with % complete, recent activity, "continue where you left off".
- `[P0]` **Per-track progress**: days complete, assignments passed, problems solved, mastery rings per topic.
- `[P1]` **Skill radar + trend charts** (reuse Recharts): score trends across mocks/contests, topic mastery radar, time-on-task.
- `[P1]` **Contest & round history** with deep-dive (code, verdicts, AI analysis).
- `[P1]` **Mentor insights**: AI-surfaced "you're strongest in X, weakest in Y — here's what to do next."

**Acceptance criteria**
- From the home screen a learner can, in one glance, see where they are, what's next, and how they're trending.

---

# Part D — Technical architecture

## D.1 System overview

ICM runs **locally for you** (web app + local Node bridge, packageable as Tauri), talks to **Supabase** for durable personal storage, uses **your own Claude Code** (or your API key) as the AI engine, and uses **Pyodide (client)** + **Judge0 (server/self-host)** for code execution.

```
┌──────────────────────────── User's machine ────────────────────────────┐
│                                                                          │
│   Browser / Tauri shell (React + Vite + Tailwind)                        │
│     • Modules: Onboarding, Learn, DSA, Contests, Mock, Whiteboard        │
│     • Monaco editor · Pyodide (Python, in-browser) · Visualizers         │
│     • useVoice (Kokoro TTS + Web Speech STT)                             │
│            │  REST / NDJSON stream                 │ supabase-js (auth+data) │
│            ▼                                        ▼                      │
│   Local Node bridge (Express + ws)            ┌──────────────────────────┐│
│     • AIProvider:                             │  Supabase (cloud)        ││
│         ├─ ClaudeCodeProvider (spawns CLI)    │   • Single-user (no RLS) ││
│         └─ ApiProvider (Anthropic/OpenAI)     │   • Postgres (truth)     ││
│     • Persists AI output → Supabase           │   • Storage (snapshots,  ││
│     • Materializes scratch files for Claude   │     resumes)             ││
│     • Judge0 client (submit/poll)             │   • Realtime (optional)  ││
│            │                                  └──────────────────────────┘│
│            ▼                                                               │
│   Judge0 (self-hosted Docker, or RapidAPI in dev) — multi-language judge   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Why a local bridge at all (vs. browser → Supabase directly)?** Because the **AI engine is local Claude Code** (a CLI the browser can't spawn) and because the bridge is the natural place to (a) run the `AIProvider`, (b) persist AI output to Supabase with service-role where needed, (c) materialize scratch files, and (d) talk to Judge0. The browser still uses `supabase-js` directly for most reads/writes; the bridge handles AI + privileged writes.

## D.2 The AIProvider abstraction (Claude Code + API fallback)

The single most important refactor. Today the backend hard-codes `spawn("claude", …)`. We introduce:

```ts
interface AIProvider {
  // Streams events; resolves with final text + (for Claude Code) a session id to resume.
  run(input: {
    prompt: string;
    sessionId?: string | null;     // conversational continuity (mock rounds)
    images?: ImageRef[];           // vision (whiteboard screenshots)
    model?: "fast" | "strong";     // fast for live turns, strong for scoring
  }, onEvent: (e: AIEvent) => void): Promise<{ text: string; sessionId: string | null }>;
}

class ClaudeCodeProvider implements AIProvider { /* spawns `claude -p … --output-format stream-json [--resume]` (today's code) */ }
class ApiProvider       implements AIProvider { /* Anthropic Messages API (streaming, vision, tool-use as needed), user-supplied key */ }
```

- **Selection:** per-user setting (`ai_settings.provider`). Default `claude_code`; `api` if the user provides a key (stored encrypted) or Claude Code is absent.
- **Same prompts** (`server/src/prompts.ts`) feed both. Because of **ADR-3**, prompts mostly ask the AI to **return content**, and the **bridge persists** it — neither provider needs file-write tools for the new features. (Legacy "write a file" prompts are replaced by "return structured content".)
- **Streaming contract** stays NDJSON to the client, unchanged, so the UI doesn't care which provider ran.
- **Models:** `fast` vs `strong` mapping per provider (e.g. live interview turns = fast; final scoring/analysis = strong). For Claude Code, use the model the CLI is configured with (or pass `--model`); for API, choose the latest appropriate Claude models.

## D.3 Source-of-truth & sync model (ADR-3 + ADR-4)

- **Supabase Postgres = truth** for all structured data (profiles, tracks, days, content versions, assignments, submissions, progress, gamification, contests, mock sessions, snapshots metadata).
- **Local files = disposable scratch** the bridge writes so Claude Code has context to read, e.g.:
  - `data/<scratch>/resume.md` — current user's resume (for anchoring).
  - `data/<scratch>/current-problem.md`, `current-day.md` — the active task the AI is generating/critiquing.
  - whiteboard screenshots written to a temp path for Claude Code's vision read; canonical copy lives in Supabase Storage.
- **Write path:** UI action → bridge → `AIProvider.run()` → AI returns content → bridge **validates + persists to Supabase** → UI reads updated row (via `supabase-js` or the response). Scratch files are regenerated as needed and are never the record of truth.
- **Multi-device:** because truth is in Supabase, the same user on another machine sees their data after login (the only local thing is their Claude Code + transient scratch).

## D.4 Supabase data model (schema)

Core tables (illustrative — refine in Phase 0). **Single-user build: no `user_id`/RLS isolation is required — every row is yours.** The `user_id` columns shown below can be dropped (or kept as a constant) and added back only if you ever introduce a second account.

```
profiles            (id=auth.uid, display_name, target_role, experience_level,
                     known_languages[], tech_stack[], goal, north_star,
                     hours_per_week, timezone, default_teaching_style, created_at)
ai_settings         (user_id, provider 'claude_code'|'api', api_key_encrypted,
                     model_prefs jsonb)
resumes             (user_id, filename, content_md, uploaded_at)

tracks              (id, user_id, kind 'language'|'dsa', language, level, depth,
                     topics[], target_count, status 'draft'|'active'|'done',
                     created_at)                       -- a roadmap
track_units         (id, track_id, user_id, day_index, title, objective,
                     est_minutes, checkpoint, depends_on[], status)
unit_content        (id, unit_id, user_id, teaching_style, content_md,
                     diagrams jsonb, version, created_at)   -- versioned, regen-friendly
assignments         (id, unit_id, user_id, prompt_md, language, starter_code,
                     tests jsonb, difficulty)
submissions         (id, assignment_id, user_id, code, language,
                     result jsonb, passed bool, submitted_at)

dsa_problems        (id, user_id?, slug, title, topic, difficulty, statement_md,
                     constraints, examples jsonb, starter_code jsonb, tests jsonb,
                     editorial_md, source 'generated'|'curated')
contests            (id, user_id, duration_min, problem_ids[], status,
                     started_at, ended_at, total_score, analysis_md)
contest_submissions (id, contest_id, problem_id, user_id, code, language,
                     result jsonb, score, submitted_at)

mock_sessions       (id, user_id, round, role, level, mode 'voice'|'dsa_wb'|'sysd_wb',
                     status, started_at, ended_at, rubric jsonb, verdict, summary_md)
mock_turns          (id, session_id, user_id, speaker 'interviewer'|'candidate',
                     text, ts)
wb_snapshots        (id, session_id, user_id, storage_path, kind 'screenshot'|'drawing',
                     ai_note, taken_at)

progress            (id, user_id, track_id, unit_id, status, completed_at, xp)
user_stats          (user_id, xp, level, streak_current, streak_best,
                     freezes, last_active_date)
badges              (id, code, name, description, icon)
user_badges         (user_id, badge_id, earned_at)
```

**Storage buckets:** `resumes/`, `wb-snapshots/` (private signed URLs).
**Secrets:** `api_key_encrypted` encrypted at rest (pgcrypto or app-level); never sent to the client.

## D.5 Backend bridge (endpoints)

Evolve today's Express server. Keep the NDJSON streaming contract.

- `POST /ask { action|prompt, params, sessionId?, images? }` → runs the selected `AIProvider`, streams events, **persists results to Supabase** per the action, returns `{ done, sessionId, recordId }`. Actions extended: `proposeRoadmap`, `generateDay`, `regenerateContent`, `dsaIntakeRoadmap`, `assembleContest`, `analyzeContest`, `startWhiteboardRound`, `whiteboardObserve` (vision), `scoreRound`, plus existing `startMock`/`scoreMock`/`learn*`/`practice*`.
- `POST /api/run` → **Judge0** submit + poll for DSA/contest submissions; returns verdicts. (Pyodide runs purely client-side, no endpoint.)
- `POST /api/resume` → parse + store resume (Supabase + scratch file).
- `GET /api/health` → Claude Code installed? API key present? Judge0 reachable? Supabase reachable?
- **Auth:** minimal — single-user. If cloud auth is enabled, the bridge verifies the one Supabase session; otherwise it talks to your project directly.
- Reads (dashboards, history, content) primarily go **browser → Supabase** via `supabase-js`; the bridge is for AI + judging + privileged writes.

## D.6 Security & privacy (single-user)

- **Single-user, single-owner data.** No tenants, no cross-user reads, no RLS isolation to design. If cloud auth is enabled, one account guards your Supabase project; if run purely local, access is your machine.
- **API keys** encrypted at rest, only decrypted in the bridge, never shipped to the client.
- **Screen-share & webcam** are **opt-in, per-session**: round screenshots go to your own private Supabase Storage. The camera is realism-only and not sent to the AI (as today); screenshots *are* sent to the AI (vision) — surfaced clearly so it's a conscious choice.
- **PII:** resume + profile are your personal data (and now drive auto-extraction); easy to wipe/delete.
- **Untrusted code:** all multi-language execution is sandboxed in Judge0 (never `eval` on the bridge). Pyodide runs in the browser sandbox.

## D.7 Offline & resilience

- **Online required** (ADR-11). On Supabase/network loss: app still opens, shows cached/last-loaded data where possible, disables writes with a clear banner.
- **Claude Code absent / not logged in** → friendly setup card + offer API-key path (don't hang) — extend today's health check.
- **One AI run at a time** per local bridge (today's `busy` lock) — keep, with clear UI feedback; queue or disable triggers.
- **No half-writes** — AI output is validated before the Supabase write; partial failures surface as errors, never corrupt a record. Content versioning means a bad regen never destroys a good prior version.
- **Judge0 down** → clear error, ret[ry; learning assignments (Pyodide) still work offline-of-Judge0.

---

# Part E — Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | Daily-content generation streams first tokens < 3s; Pyodide assignment run < 1s typical; Judge0 verdict < ~5s typical; live interview turn latency kept low (fast model + streamed TTS). |
| **Scalability** | Single-user, so no multi-tenant load; the cloud store handles your personal data volume easily; AI is local. Judge0 sized for your own submission rate. |
| **Reliability** | No data loss: versioned content, atomic writes, validated persistence. Graceful degradation (§D.7). |
| **Security/Privacy** | Single-owner data, encrypted keys, consented capture, easy data deletion (§D.6). |
| **Accessibility** | Keyboard navigable, captions for voice, sufficient contrast, reduced-motion option for animations/visualizers. |
| **UX/Design** | Premium, creative, attractive (your explicit ask): cohesive aurora dark theme, juicy-but-restrained gamification, visual-first learning, fast and responsive. |
| **Maintainability** | Keep prompts centralized (`prompts.ts`); modules independent (`app/src/modules/<mode>/`); typed end-to-end; documented schema + migrations. |
| **Cost** | Default path is free (user's Claude Code + Pyodide). Server costs = Supabase + Judge0 host only. API path cost borne by the user (their key). |

---

# Part F — Phased delivery plan + trackers

> **Build order rationale:** Foundation (auth + DB + AIProvider) must come first because nothing is durable or multi-user without it. Then the two highest-value pillars — **Learn-Python** and **DSA** (ADR-9) — each as a vertical slice that's usable on its own. Contests, whiteboard rounds, full gamification, and the API fallback layer follow. Packaging last.
>
> Each phase ends **runnable** with its DoD demonstrable. Don't start a phase until the prior DoD passes.

## F.0 Master milestone tracker

| Phase | Theme | Milestones | Status | Target |
|---|---|---|---|---|
| **0** | Foundation: Supabase, AIProvider, onboarding, resume extraction | M0.1–M0.7 | 🟡 | M0.1/M0.3 ✅ · M0.4 in verify |
| **1** | Learn engine v1 (Python): roadmap → daily → compiler → progress | M1.1–M1.7 | 🔲 | — |
| **2** | DSA learning track + visual learning v1 | M2.1–M2.6 | 🔲 | — |
| **3** | DSA contests (timed, judged, recorded, AI analysis) | M3.1–M3.5 | 🔲 | — |
| **4** | Gamification + progress dashboard (full) | M4.1–M4.5 | 🔲 | — |
| **5** | Whiteboard rounds: DSA, then System Design | M5.1–M5.6 | 🔲 | — |
| **6** | API fallback provider + multi-device + voice mock on Supabase | M6.1–M6.4 | 🔲 | — |
| **7** | Visual learning v2 + advanced visualizers + polish + packaging | M7.1–M7.5 | 🔲 | — |

> Update each phase's table below as you go, then reflect the rolled-up status here.

---

## F.1 Phase 0 — Foundation (Supabase + AIProvider + Onboarding + Resume extraction)

**Outcome:** a personal foundation: first-run onboarding (optionally seeded from your resume), your profile persists in Supabase, and the AI engine runs through the new `AIProvider` abstraction.

| ID | Milestone | DoD | Status |
|---|---|---|---|
| M0.1 | Supabase project + base schema (profiles, ai_settings, resumes, user_stats) | Tables exist; reads/writes work from the app. | ✅ |
| M0.2 | First-run setup (optional single-account auth) | First launch → straight into onboarding; cloud data reachable. | ⏭️ decided: no login for now |
| M0.3 | `AIProvider` abstraction; `ClaudeCodeProvider` reimplements today's behavior | Existing actions run unchanged through the new interface. | ✅ |
| M0.4 | Bridge persists app data to Supabase (ADR-3 pattern) + materializes scratch files | Profile round-trips through Supabase; scratch file written for Claude. | 🟡 |
| M0.5 | Onboarding intake UI → `profiles` | Complete intake; profile row persists; edits work. | 🔲 |
| M0.6 | Resume upload → Supabase + scratch `resume.md`; health check extended | Resume stored; health shows Claude/API/Supabase status. | 🔲 |
| M0.7 | **Resume → profile auto-extraction** (`extractProfile`): parse resume → propose role/languages/stack/projects/strengths/gaps → pre-fill intake for confirmation | Uploading a resume auto-fills the intake form; extracted insights persist on the profile. | 🔲 |

**DoD (phase):** First launch → onboard (or **upload a resume and let ICM auto-fill most of your profile**) → (optionally) confirm the extracted details → the app greets you by name with your goal reflected back — all data in Supabase, AI running via `AIProvider`.

## F.2 Phase 1 — Learn engine v1 (Python)

**Outcome:** the complete personalised daily-learning loop for **Python**, with the embedded compiler and basic gamification — a usable product on its own.

| ID | Milestone | DoD | Status |
|---|---|---|---|
| M1.1 | Roadmap proposal from goal+time+level (shared engine) + review/edit/approve gate | User approves a roadmap → `tracks` + `track_units` persisted as "active". | 🔲 |
| M1.2 | On-demand daily content generation (focused single-day prompt) + versioned persistence | Opening Day N generates + stores `unit_content`. | 🔲 |
| M1.3 | Teaching-style selector + **Regenerate** (versioned) | Regenerating in "ELI5" stores a new version; switch between versions. | 🔲 |
| M1.4 | Pyodide compiler + Monaco editor (run, output, tests) | Run Python in-browser, see output + test pass/fail. | 🔲 |
| M1.5 | Assignments + submissions persistence; day completion logic | Pass assignments → submission stored → day marked done. | 🔲 |
| M1.6 | Basic gamification: XP + streak on completion | Completing a day awards XP + advances streak (persisted). | 🔲 |
| M1.7 | "Second language as extension" mode (uses known_languages) | Roadmap/explanations bridge from a known language when present. | 🔲 |

**DoD (phase):** intake → Python roadmap → approve → Day 1 → solve assignment in compiler → submit → pass → day done → XP+streak update → everything persisted and visible on return.

## F.3 Phase 2 — DSA learning track + visual learning v1

**Outcome:** a visual, personalised DSA curriculum with problem practice via Judge0.

| ID | Milestone | DoD | Status |
|---|---|---|---|
| M2.1 | DSA intake (level/depth/topics/count) + topic catalogue | User configures DSA track; persisted. | 🔲 |
| M2.2 | DSA visual roadmap via shared engine (dependency-ordered) | Approved DSA roadmap persisted. | 🔲 |
| M2.3 | DSA daily content with **Mermaid diagrams** (visual v1) | A DSA day renders an inline Mermaid diagram. | 🔲 |
| M2.4 | Judge0 integration (`/api/run`) + Monaco multi-language | Submit a solution → judged against hidden tests → verdicts. | 🔲 |
| M2.5 | Problem practice loop (generated/curated problems, hints/editorial on request) | Solve a DSA problem end-to-end; progress recorded. | 🔲 |
| M2.6 | DSA XP + topic mastery rings | Solving problems advances topic mastery + XP. | 🔲 |

**DoD (phase):** DSA intake → visual roadmap → open a day → simple explanation **with a Mermaid diagram** → solve a problem in the Judge0-backed compiler → progress + mastery recorded.

## F.4 Phase 3 — DSA contests

**Outcome:** realistic, timed, recorded contests with AI analysis.

| ID | Milestone | DoD | Status |
|---|---|---|---|
| M3.1 | Contest setup + AI problem-set assembly (duration/topics/difficulty) | Start a contest → calibrated problem set assembled + persisted. | 🔲 |
| M3.2 | Realistic contest UI (timer, problem tabs, editor, submit-to-judge) | A 30-min contest runs with live timer + judged submissions. | 🔲 |
| M3.3 | Full recording (submissions, code, verdicts, scores) to Supabase | Every submission + score persisted. | 🔲 |
| M3.4 | AI post-contest analysis (persisted) | End contest → AI writes proper feedback → stored. | 🔲 |
| M3.5 | Contest history + replay (code, verdicts, analysis) | Reopen a past contest and see everything intact. | 🔲 |

**DoD (phase):** start a timed contest → solve/attempt against the judge → timer ends → results + AI analysis persisted → revisit later with full fidelity.

## F.5 Phase 4 — Gamification + progress dashboard (full)

**Outcome:** the "urge to return" system and the unified progress view.

| ID | Milestone | DoD | Status |
|---|---|---|---|
| M4.1 | Levels from cumulative XP + level-up moments | XP thresholds advance level with a celebratory cue. | 🔲 |
| M4.2 | Streak freezes + daily quest | Missing a day with a freeze preserves streak; daily quest shown. | 🔲 |
| M4.3 | Badges/achievements engine + unlocks | Earning a badge persists + surfaces. | 🔲 |
| M4.4 | Home dashboard (level/XP/streak/quest/active tracks/continue) | One-glance "where am I + what's next". | 🔲 |
| M4.5 | Trend + radar analytics (Recharts) + mentor insights | Score/mastery trends render; AI surfaces strengths/gaps. | 🔲 |

**DoD (phase):** the home screen shows level, XP, streak, today's quest, active roadmaps with %, recent activity, and trend/radar charts — all live from Supabase.

## F.6 Phase 5 — Whiteboard rounds (DSA → System Design)

**Outcome:** realistic screen-shared, vision-assisted interview rounds.

| ID | Milestone | DoD | Status |
|---|---|---|---|
| M5.1 | Screen-share capture (`getDisplayMedia`) + periodic screenshot pipeline | Frames captured on events/interval, stored in Storage. | 🔲 |
| M5.2 | Vision wiring: screenshots → `AIProvider` (Claude Code image read / API vision) | The AI references what it *saw* in its response. | 🔲 |
| M5.3 | DSA whiteboard round (problem + coding surface + conversational hints) | Run a DSA round where hints reflect observed code. | 🔲 |
| M5.4 | Scored result for rounds (rubric/verdict/evidence) persisted | A DSA round ends with a stored, evidence-backed score. | 🔲 |
| M5.5 | Excalidraw whiteboard surface (visual system) | Learner can draw an architecture diagram in-app. | 🔲 |
| M5.6 | System Design whiteboard round (draw + vision critique + score) | Run a SysD round critiqued from the diagram; scored + stored. | 🔲 |

**DoD (phase):** both a DSA and a System Design round run with screen-share/whiteboard, the AI converses based on what it *sees*, and each ends with a persisted, evidence-tied score.

## F.7 Phase 6 — API fallback + multi-device + voice mock on Supabase

**Outcome:** the optional API path works, the existing voice mock is migrated, and multi-device is solid.

| ID | Milestone | DoD | Status |
|---|---|---|---|
| M6.1 | `ApiProvider` (Anthropic/OpenAI, streaming + vision) behind `AIProvider` | With a user key, all actions run via API identically. | 🔲 |
| M6.2 | API-key management UI (encrypted storage, provider toggle) | User adds a key; provider switches; key never reaches client. | 🔲 |
| M6.3 | Voice mock interview migrated to Supabase persistence | A voice mock stores session/turns/rubric. | 🔲 |
| M6.4 | Multi-device verification | Same user on another machine sees all their data after login. | 🔲 |

**DoD (phase):** a user without Claude Code can run the whole product via their own API key; a user with Claude Code is unaffected; voice mocks persist to Supabase; data follows the user across machines.

## F.8 Phase 7 — Visual learning v2 + polish + packaging

**Outcome:** the "wow" visuals, final polish, and a double-click app.

| ID | Milestone | DoD | Status |
|---|---|---|---|
| M7.1 | Interactive DSA visualizers (sorting, BFS/DFS, recursion, trees, DP) | A DSA topic shows a steppable algorithm animation. | 🔲 |
| M7.2 | Code-execution traces (Python-Tutor-style) | Step through a solution's variables/call stack. | 🔲 |
| M7.3 | Adaptive difficulty + roadmap adaptation | Roadmap/content shifts based on performance data. | 🔲 |
| M7.4 | Design polish pass (premium, animated, accessible) | Cohesive, attractive, reduced-motion-aware UI throughout. | 🔲 |
| M7.5 | Tauri packaging + first-run checks | Double-click app; checks Claude Code/API/Supabase; full loop works. | 🔲 |

**DoD (phase):** the full, polished product runs as a packaged app with the headline visual-learning experiences in place.

---

# Part G — Risks & open questions

**Risks**
1. **Local-first + cloud-truth seam.** The bridge mediating Claude Code ↔ Supabase is novel; keep the persistence path strict (validate → write) to avoid drift. *Mitigation:* ADR-3/4 discipline, content versioning.
2. **Claude Code as a programmatic engine.** Spawning the CLI per action is already proven here, but the new content-generation actions must return **parseable, structured** output reliably. *Mitigation:* strict output formats in prompts + validation; the API path as backstop.
3. **Judge0 ops & security.** Running untrusted code at scale needs a sized, sandboxed self-host. *Mitigation:* start with RapidAPI Judge0 in dev; self-host with limits before any real load.
4. **Vision rounds latency/cost.** Frequent screenshots → vision can be slow/expensive on the API path. *Mitigation:* event-driven capture (not tight interval), downscale images, fast model for live commentary.
5. **Content quality variance.** On-demand generation can be uneven. *Mitigation:* per-day focused prompts (your insight), regeneration, teaching styles, and human-edit/versioning.
6. **Scope.** This is a large product. *Mitigation:* strict vertical-slice phases, each independently usable.

**Open questions (for you to confirm/edit)**
- **OQ-1 (Auth):** Single-user — do you want *any* login at all (one account to guard your cloud data), or no auth (purely local access to your Supabase)?
- **OQ-2 (Judge0):** Self-host from Phase 2, or start on RapidAPI and self-host later?
- **OQ-3 (Languages):** After Python proves out, what's the next language priority (JS/TS, Java, C++)?
- **OQ-4 (Teaching styles):** Confirm the preset list (Appendix I.2) — add/remove any?
- **OQ-5 (Contest problems):** AI-generated, a curated bank, or both? (PRD assumes both; confirm emphasis.)
- **OQ-6 (Whiteboard capture):** Comfortable with screenshots being sent to the AI (vision)? Any privacy constraints to bake in?
- **OQ-7 (Storage):** Keep cloud **Supabase** (syncs across your devices) or switch to a simpler **local DB (SQLite)** since it's single-user? (PRD keeps Supabase per your earlier preference.)
- **OQ-8 (Packaging):** Web-app first, or Tauri desktop as the primary distribution?

---

# Part H — Out of scope / future

- **Multi-tenant / multiple-user accounts** — explicitly dropped; ICM is a single-user app (ADR-1).
- **Social & leaderboards**, friend challenges, shared contests (would require multi-user + privacy design).
- **Mobile apps** (native iOS/Android).
- **Team/cohort/coach features** (one mentor managing many learners).
- **Marketplace** of curated tracks/problem sets.
- **Realtime collaborative** whiteboard/pairing.
- **Non-Claude/OpenAI providers** beyond the two in `ApiProvider`.
- **Spoken-language (human language) learning** — this PRD is scoped to *programming* languages.

---

# Part I — Appendices

## I.1 Prompt catalog (to live in `server/src/prompts.ts`)

| Action | Purpose | Returns | Persists to |
|---|---|---|---|
| `extractProfile` | Read an uploaded resume → propose a structured profile (role, languages, stack, projects, strengths, gaps) | Structured profile proposal | `profiles`, `resumes` (on confirm) |
| `proposeRoadmap` | Draft a roadmap from goal+time+level (+topics) | Ordered units (strict format) | `tracks`, `track_units` (on approve) |
| `generateDay` | Focused single-day content + assignments | Concept md + diagrams + assignments | `unit_content`, `assignments` |
| `regenerateContent` | Re-teach in a chosen teaching style | New content version | `unit_content` (new version) |
| `dsaIntakeRoadmap` | DSA roadmap from level/depth/topics/count | Ordered DSA units | `tracks`, `track_units` |
| `assembleContest` | Build a calibrated contest problem set | Problem set | `contests`, `dsa_problems` |
| `analyzeContest` | Post-contest feedback on code + performance | Analysis md | `contests.analysis_md` |
| `startWhiteboardRound` | Open a DSA/SysD round persona + problem | First turn | `mock_sessions` |
| `whiteboardObserve` | Vision commentary on a screenshot | Conversational turn | `mock_turns`, `wb_snapshots.ai_note` |
| `scoreRound` | Honest rubric + verdict + evidence | Scored result | `mock_sessions` |
| `startMock`/`scoreMock` | Existing voice mock (kept) | Turn / scored result | `mock_sessions`, `mock_turns` |
| `learnTrack`/`learnLesson` | Existing Learn prompts (folded into engine) | Outline / lesson | `tracks`/`unit_content` |
| `practiceQuestion`/`practiceFeedback` | Existing drills (kept) | Question / feedback | `submissions`/practice log |

## I.2 Teaching personas (presets)

| Style | Voice |
|---|---|
| **Explain like I'm 5** | Tiny words, everyday metaphors, no jargon. |
| **Real-world examples only** | Concrete, practical examples; minimal theory. |
| **Visual-first** | Lead with diagrams (Mermaid)/sketches; words support the picture. |
| **Analogy-driven** | Teach each idea through a sustained analogy. |
| **First-principles / deep** | Build from fundamentals; rigorous, "why it works". |
| **Concise cheat-sheet** | Dense, skimmable, bullet-first reference. |
| **Custom** | Free-text ("teach me like a sports coach"). |

## I.3 DSA topic catalogue (canonical)

Arrays · Strings · Hashing · Two Pointers · Sliding Window · Prefix Sums · Stack · Queue · Linked List · Trees · Binary Search Trees · Heaps/Priority Queues · Graphs · BFS · DFS · Topological Sort · Union-Find · Backtracking · Greedy · Binary Search · Recursion · Dynamic Programming (1D/2D/knapsack/intervals/strings) · Tries · Bit Manipulation · Math/Number Theory · Intervals · Matrix · Segment/Fenwick Trees · Sorting algorithms. *(AI auto-suggests "other important" topics for the learner's depth.)*

## I.4 Glossary

- **AIProvider** — the interface abstracting Claude Code vs API as the AI engine.
- **Track** — a roadmap (language or DSA) for one user.
- **Unit / Day** — one step in a track; has versioned content + assignments.
- **Round** — an interview simulation (voice mock, DSA whiteboard, SysD whiteboard).
- **Scratch file** — a disposable local file the bridge writes so Claude Code has context; never the source of truth.
- **Judge0** — open-source multi-language code-execution/judging engine.
- **Pyodide** — Python compiled to WASM, runs in the browser.

---

> **Next step:** review this PRD top-to-bottom, edit anything (the **Open Questions** in Part G are the fastest place to steer it), and when you're happy, we start **Phase 0** and build the foundation. Update the trackers (§F.0 + per-phase) as we land each milestone.
