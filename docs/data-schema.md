# ICM Data Schema

This is the on-disk format spec for all ICM data. **Files are the single source of truth** — the UI is only a live view of these files. Human-edited data is **markdown with YAML frontmatter**; derived/cache data is **JSON** (git-ignored).

These formats are stable contracts: later build phases depend on them. Change them only via an idempotent migration (`server/migrations/`) that bumps `schema_version` in `data/index.json`.

General rules:
- Frontmatter is parsed with `gray-matter`. Dates are `YYYY-MM-DD`. Times are 24h `HH:MM`.
- Daily logs are **append-only** — never overwrite or reformat a past log.
- Filenames are stable ids where noted; do not rename without a migration.

---

## Daily log — `data/logs/YYYY-MM-DD.md`

One file per day, named by date. Append-only.

```markdown
---
date: 2026-06-15
hours: 2.5
tracks: [dsa, ai-course]
mood: focused
---
## What I did
- ...
## Weak / flagged
- ...
```

| Field    | Type            | Notes                                              |
|----------|-----------------|----------------------------------------------------|
| `date`   | date            | Must match the filename.                            |
| `hours`  | number          | Hours studied that day.                             |
| `tracks` | list of strings | Track ids touched (e.g. `dsa`, `ai-course`).        |
| `mood`   | string          | Free-form (e.g. `focused`, `tired`, `motivated`).   |

Body: `## What I did` and `## Weak / flagged` sections. Flagged items feed review and readiness.

---

## Goal — `goals/<id>.md`

One file per goal; filename is the `id`.

```markdown
---
id: interview-ready-90d
title: Interview Ready in 90 Days
north_star: Land an AI Engineer role at a product company
target_date: 2026-09-13
hours_per_week: 14
status: active
---
## Milestones
- [ ] RAG + LLM systems module
- [ ] Pass 5 mocks >= 80%
```

| Field            | Type   | Notes                                          |
|------------------|--------|------------------------------------------------|
| `id`             | string | Matches filename; stable.                       |
| `title`          | string | Display title.                                  |
| `north_star`     | string | The one outcome that matters.                   |
| `target_date`    | date   | Deadline.                                       |
| `hours_per_week` | number | Planned weekly study hours.                     |
| `status`         | enum   | `active` \| `done` \| `paused` \| `archived`.   |

Body: `## Milestones` as a markdown checklist (`- [ ]` / `- [x]`).

---

## Roadmap — `roadmaps/<id>.md`

One file per roadmap. Body is an ordered list of **nodes**, each with frontmatter-style fields. Suggested representation: a YAML `nodes` list in frontmatter, or per-node headings in the body. Each node has:

| Field        | Type            | Notes                                                       |
|--------------|-----------------|-------------------------------------------------------------|
| `title`      | string          | Node name.                                                  |
| `status`     | enum            | `pending` \| `in-progress` \| `done` \| `skipped`.          |
| `objective`  | string          | What mastering this node means.                             |
| `checkpoint` | string          | How you prove the node is done.                             |
| `est_hours`  | number (opt)    | Estimated hours.                                            |
| `depends_on` | list of strings | Node titles/ids this depends on.                            |

Example:

```markdown
---
id: ai-engineer-90d
title: AI Engineer 90-Day Roadmap
nodes:
  - title: Python + DSA foundations
    status: in-progress
    objective: Comfortable with arrays, hashing, two-pointer, graphs
    checkpoint: Solve 3 medium problems unaided in 45 min
    est_hours: 30
  - title: RAG systems
    status: pending
    objective: Build and evaluate a retrieval-augmented pipeline
    checkpoint: Ship a RAG demo with an eval harness
    est_hours: 20
    depends_on: [Python + DSA foundations]
---
```

---

## Schedule — `schedule/YYYY-Www.md`

One file per ISO week (e.g. `2026-W25.md`). Time-blocks plus logged actuals.

| Field         | Type   | Notes                                          |
|---------------|--------|------------------------------------------------|
| `topic`       | string | What the block is for.                          |
| `day`         | string | Day of week or date.                            |
| `start`/`end` | time   | 24h `HH:MM`.                                     |
| `planned_min` | number | Planned minutes.                                |
| `actual_min`  | number | Logged minutes (from the focus timer, Phase 4). |

```markdown
---
week: 2026-W25
blocks:
  - topic: DSA practice
    day: Mon
    start: "18:00"
    end: "19:30"
    planned_min: 90
    actual_min: 0
logged:
  - topic: DSA practice
    actual_min: 75
---
```

---

## Review card — `data/reviews/<id>.md`

One file per spaced-repetition card; filename is the `id`.

| Field           | Type   | Notes                                                   |
|-----------------|--------|---------------------------------------------------------|
| `topic`         | string | Topic this card reinforces.                              |
| `status`        | enum   | Traffic-light: `red` \| `yellow` \| `green`.            |
| `last_reviewed` | date   | Last attempt date.                                      |
| `interval_days` | number | Current interval (intervals: 1·3·7·14·30).              |
| `confidence`    | number | 1–4 rating from the last attempt; reschedules the card. |

```markdown
---
id: rag-chunking-strategies
topic: RAG
status: yellow
last_reviewed: 2026-06-14
interval_days: 3
confidence: 2
---
## Prompt
Explain chunking strategies for RAG and their trade-offs.

## Solution (hidden until attempted)
- Fixed-size vs semantic chunking...
```

The solution stays hidden in the UI until the user attempts the card.

---

## Mock interview — `mocks/YYYY-MM-DD-<slug>.md`

One file per mock interview: transcript + scored rubric.

| Field     | Type   | Notes                                                           |
|-----------|--------|-----------------------------------------------------------------|
| `type`    | string | e.g. `rag`, `dsa`, `system-design`, `evals`, `agents`.          |
| `level`   | string | e.g. `junior`, `mid`, `senior`.                                 |
| `date`    | date   | Interview date.                                                 |
| `verdict` | string | Honest overall outcome.                                         |
| `rubric`  | object | Four dimensions scored **1–4** (see below).                     |

The rubric scores the four dimensions (1–4 each):

```markdown
---
type: rag
level: mid
date: 2026-06-15
verdict: Borderline — strong approach, weak on evaluation
rubric:
  problem_solving: 3
  technical_depth: 2
  communication: 3
  code_quality: 3
---
## Transcript
...

## Evidence notes
- Clarified constraints well before coding.
- Could not articulate an eval strategy for retrieval quality.
```

---

## Generated cache — `data/index.json` (git-ignored)

Derived index for fast UI reads. Rebuilt by the backend from the markdown files; never the source of truth.

```json
{
  "schema_version": 1,
  "generated_at": "2026-06-15T00:00:00Z",
  "logs": [],
  "goals": [],
  "roadmaps": [],
  "reviews": [],
  "mocks": []
}
```

`schema_version` drives migrations (`server/migrations/`). Bump it whenever a file format above changes.
