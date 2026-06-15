/**
 * All Claude prompts live here so they are easy to tune (spec section 4).
 * Every "AI action" in the UI is a POST /ask with one of these prompts.
 */

/**
 * Phase 1 smoke test: append a single timestamped line to today's daily log,
 * honoring the append-only + frontmatter rules from docs/data-schema.md.
 */
export function appendTestLine(date: string): string {
  return [
    `Append a single test line to today's daily log at data/logs/${date}.md.`,
    ``,
    `Rules:`,
    `- If the file does not exist, create it with valid YAML frontmatter:`,
    `  date: ${date}, hours: 0, tracks: [], mood: focused — then a "## What I did" section.`,
    `- The log is APPEND-ONLY. Never rewrite, reorder, or reformat existing content.`,
    `- Under "## What I did", append exactly one new bullet:`,
    `  "- AI bridge test line (${date})".`,
    `- Make no other changes and touch no other files.`,
    `- Reply with one short sentence confirming what you appended.`,
  ].join("\n");
}

/**
 * Diary: turn a raw, messy note into a clean dated daily-log entry.
 * Append-only, honoring docs/data-schema.md.
 */
export function writeDiaryLog(date: string, note: string): string {
  return [
    `The user wrote this raw diary note for today (${date}):`,
    `"""`,
    note,
    `"""`,
    ``,
    `Turn it into a clean entry in today's daily log at data/logs/${date}.md,`,
    `following docs/data-schema.md. Rules:`,
    `- If the file does not exist, create it with valid YAML frontmatter`,
    `  (date: ${date}, hours, tracks, mood) and "## What I did" /`,
    `  "## Weak / flagged" sections.`,
    `- The log is APPEND-ONLY: never rewrite, reorder, or reformat existing`,
    `  content. Only append new bullets under the right section.`,
    `- Rewrite the note into concise, well-phrased bullets under "## What I did".`,
    `- Put anything the user struggled with or flagged under "## Weak / flagged".`,
    `- If the note mentions hours studied, set/raise frontmatter "hours"; infer`,
    `  "tracks" (e.g. dsa, rag, evals, agents) and "mood" when clear. Never lower`,
    `  existing hours.`,
    `- Do not invent facts that are not in the note.`,
    `- Touch only this one file. Reply with one short sentence summarizing what`,
    `  you logged.`,
  ].join("\n");
}

/**
 * Draft a learning roadmap for a goal, written as editable nodes in
 * roadmaps/<goalId>.md per docs/data-schema.md.
 */
export function suggestRoadmap(goalId: string): string {
  return [
    `Read the goal at goals/${goalId}.md (its north_star, target_date, and`,
    `hours_per_week). Draft a learning roadmap and write it to`,
    `roadmaps/${goalId}.md following docs/data-schema.md.`,
    ``,
    `Frontmatter must include: id: ${goalId}, a human title, goal: ${goalId},`,
    `and a YAML "nodes:" list. Each node has: title, status (set every node to`,
    `"pending"), objective, checkpoint, est_hours (a number), and optional`,
    `depends_on (a list of earlier node titles).`,
    ``,
    `Produce 8–14 nodes ordered from fundamentals to advanced, tailored to the`,
    `goal's north star and realistic for the weekly hours before the target date.`,
    `If roadmaps/${goalId}.md already exists, overwrite it with a fresh draft`,
    `(roadmaps are editable drafts, not append-only).`,
    `Write only that one file. Reply with one sentence stating how many nodes.`,
  ].join("\n");
}

/**
 * Generate spaced-repetition review cards from a goal's weak areas / roadmap,
 * one markdown file each under data/reviews/ per docs/data-schema.md.
 */
export function suggestReviewCards(goalId: string, count: number): string {
  return [
    `Create ${count} spaced-repetition review cards for goal ${goalId}.`,
    ``,
    `Read goals/${goalId}.md and roadmaps/${goalId}.md if present, plus the most`,
    `recent daily logs in data/logs/ — pay attention to anything under`,
    `"Weak / flagged". Choose ${count} of the most valuable, interview-relevant`,
    `topics (RAG, evals, agents, LLM serving, fundamentals, DSA).`,
    ``,
    `For EACH card, create a new file data/reviews/<slug>.md following`,
    `docs/data-schema.md, with frontmatter: id (the slug), topic, status: yellow,`,
    `last_reviewed: "" (empty), interval_days: 1, confidence: 0. Body has a`,
    `"## Prompt" section (a sharp interview-style question) and a`,
    `"## Solution (hidden until attempted)" section (a concise correct answer).`,
    ``,
    `Use distinct slugs so you never overwrite an existing card. Create only`,
    `files under data/reviews/. Reply with one sentence stating how many cards.`,
  ].join("\n");
}

/**
 * Backward-plan a week of time-blocks from the goal's roadmap + weekly hours,
 * written to schedule/<week>.md per docs/data-schema.md.
 */
export function planWeek(goalId: string, week: string, todayDate: string): string {
  return [
    `Plan a realistic week of study time-blocks for goal ${goalId}, for ISO`,
    `week ${week} (today is ${todayDate}).`,
    ``,
    `First read goals/${goalId}.md (hours_per_week, target_date) and, if it`,
    `exists, roadmaps/${goalId}.md (the in-progress and pending nodes). Then`,
    `write schedule/${week}.md following docs/data-schema.md.`,
    ``,
    `Frontmatter must have: week: ${week}, and a "blocks:" YAML list. Each block:`,
    `id (short unique string), day (Mon..Sun), topic (tie to a roadmap node when`,
    `possible), start and end ("HH:MM", 24h), planned_min (number), actual_min: 0.`,
    ``,
    `Rules:`,
    `- Total planned minutes ≈ the goal's hours_per_week.`,
    `- Backward-plan from the target_date: prioritize in-progress then pending`,
    `  nodes; add a 20% buffer and include at least one review block.`,
    `- Spread blocks across days realistically (evenings on weekdays, longer on`,
    `  weekends); avoid scheduling in the past relative to today.`,
    `- If schedule/${week}.md already exists, overwrite it with the new plan`,
    `  (schedules are editable drafts).`,
    `Write only that one file. Reply with one sentence stating total planned hours.`,
  ].join("\n");
}

/**
 * Parse a course (name/link/syllabus) into roadmap nodes and merge them into
 * roadmaps/<goalId>.md without dropping existing nodes.
 */
export function ingestCourse(goalId: string, name: string, link: string, syllabus: string): string {
  return [
    `The user wants to ingest a course into their roadmap for goal ${goalId}.`,
    `Course name: ${name || "(none given)"}.`,
    `Link: ${link || "(none given)"}.`,
    `Syllabus / notes:`,
    `"""`,
    syllabus || "(none provided — infer a reasonable module list from the name/link)",
    `"""`,
    ``,
    `Parse this into roadmap nodes and merge them into roadmaps/${goalId}.md,`,
    `following docs/data-schema.md:`,
    `- If the file does not exist, create it (id: ${goalId}, goal: ${goalId},`,
    `  title, nodes: []) first.`,
    `- APPEND the new nodes to the existing "nodes:" list. Never remove or`,
    `  reorder existing nodes.`,
    `- Each new node: title (concise), status: pending, objective, checkpoint,`,
    `  est_hours. Group the course into coherent modules rather than one node per`,
    `  lecture.`,
    `Write only that one file. Reply with one sentence stating how many nodes you`,
    `added.`,
  ].join("\n");
}
