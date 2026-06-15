import express from "express";
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import chokidar from "chokidar";
import matter from "gray-matter";

import { PORT, REPO_ROOT, WATCH_DIRS, LOGS_DIR, today, isoWeek } from "./config.js";
import { runClaude, checkClaudeInstalled, type ClaudeEvent } from "./claude.js";
import {
  appendTestLine,
  writeDiaryLog,
  suggestRoadmap,
  ingestCourse,
  planWeek,
  suggestReviewCards,
} from "./prompts.js";

/** Named AI actions → server-side prompts (spec section 4: prompts live here). */
type Action = (params: Record<string, unknown>) => string;
const ACTIONS: Record<string, Action> = {
  appendTestLine: () => appendTestLine(today()),
  writeDiaryNote: (p) => writeDiaryLog(today(), String(p.note ?? "")),
  suggestRoadmap: (p) => suggestRoadmap(String(p.goalId ?? "")),
  ingestCourse: (p) =>
    ingestCourse(String(p.goalId ?? ""), String(p.name ?? ""), String(p.link ?? ""), String(p.syllabus ?? "")),
  planWeek: (p) => planWeek(String(p.goalId ?? ""), String(p.week ?? isoWeek()), today()),
  suggestReviewCards: (p) => suggestReviewCards(String(p.goalId ?? ""), Number(p.count ?? 6)),
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

/**
 * Resolve a repo-relative path and confirm it lives inside a watched data dir.
 * Returns the absolute path, or null if it escapes the allowed roots.
 */
function resolveSafe(rel: string): string | null {
  if (!rel) return null;
  const abs = path.resolve(REPO_ROOT, rel);
  const ok = WATCH_DIRS.some(
    (d) => abs === path.join(REPO_ROOT, d) || abs.startsWith(path.join(REPO_ROOT, d) + path.sep),
  );
  return ok ? abs : null;
}

/** Atomic write: temp file then rename, so a failure never leaves a half file. */
async function atomicWrite(abs: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.tmp`;
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, abs);
}

/** kebab-case slug for ids/filenames. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));

// --- AI bridge: one run at a time (avoid concurrent edits, spec section 5b) ---
let busy = false;

app.get("/api/health", async (_req, res) => {
  const claude = await checkClaudeInstalled();
  res.json({ ok: true, claude });
});

/** List daily logs with parsed frontmatter (newest first). */
app.get("/api/logs", async (_req, res) => {
  try {
    const entries = await fs.readdir(LOGS_DIR).catch(() => [] as string[]);
    const files = entries.filter((f) => f.endsWith(".md")).sort().reverse();
    const logs = await Promise.all(
      files.map(async (file) => {
        const raw = await fs.readFile(path.join(LOGS_DIR, file), "utf8");
        const { data } = matter(raw);
        return { file, frontmatter: data };
      }),
    );
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/file?path=<relative path>
 * Returns a single file's raw content + parsed frontmatter. Path is guarded to
 * the data dirs so the UI can't read arbitrary files.
 */
app.get("/api/file", async (req, res) => {
  const rel = String(req.query.path ?? "");
  const abs = resolveSafe(rel);
  if (!abs) {
    res.status(400).json({ error: "path must be inside a data directory" });
    return;
  }
  try {
    const raw = await fs.readFile(abs, "utf8");
    const { data, content } = matter(raw);
    res.json({ path: rel, raw, frontmatter: data, content });
  } catch {
    res.status(404).json({ error: "not found", path: rel });
  }
});

/**
 * GET /api/collection?dir=goals
 * List every .md file in a top-level data dir with parsed frontmatter + body.
 */
app.get("/api/collection", async (req, res) => {
  const dir = String(req.query.dir ?? "");
  const base = resolveSafe(dir);
  if (!base) {
    res.status(400).json({ error: "dir must be inside a data directory" });
    return;
  }
  try {
    const names = (await fs.readdir(base).catch(() => [] as string[]))
      .filter((f) => f.endsWith(".md"))
      .sort();
    const items = await Promise.all(
      names.map(async (file) => {
        const raw = await fs.readFile(path.join(base, file), "utf8");
        const { data, content } = matter(raw);
        return { file: `${dir}/${file}`, frontmatter: data, content };
      }),
    );
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** POST /api/write { path, content } — atomic deterministic write (UI edits). */
app.post("/api/write", async (req, res) => {
  const { path: rel, content } = req.body ?? {};
  const abs = resolveSafe(String(rel ?? ""));
  if (!abs || typeof content !== "string") {
    res.status(400).json({ error: "path (inside a data dir) and content are required" });
    return;
  }
  try {
    await atomicWrite(abs, content);
    res.json({ ok: true, path: rel });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/goals { title, north_star, target_date, hours_per_week, milestones? }
 * Create a goal file from structured fields (valid frontmatter guaranteed).
 */
app.post("/api/goals", async (req, res) => {
  const b = req.body ?? {};
  const title = String(b.title ?? "").trim();
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const id = slugify(String(b.id || title));
  const milestones: string[] = Array.isArray(b.milestones) ? b.milestones.map(String) : [];
  const frontmatter = {
    id,
    title,
    north_star: String(b.north_star ?? ""),
    target_date: String(b.target_date ?? ""),
    hours_per_week: Number(b.hours_per_week ?? 0),
    status: "active",
  };
  const body =
    "## Milestones\n" + (milestones.length ? milestones.map((m) => `- [ ] ${m}`).join("\n") : "- [ ] ");
  const content = matter.stringify(`\n${body}\n`, frontmatter);
  const rel = `goals/${id}.md`;
  try {
    await atomicWrite(path.join(REPO_ROOT, rel), content);
    res.json({ ok: true, path: rel, id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/roadmap-node { path, index, patch }
 * Patch a single node in a roadmap's frontmatter `nodes` list, atomically.
 */
app.post("/api/roadmap-node", async (req, res) => {
  const { path: rel, index, patch } = req.body ?? {};
  const abs = resolveSafe(String(rel ?? ""));
  if (!abs || typeof index !== "number" || typeof patch !== "object" || !patch) {
    res.status(400).json({ error: "path, index (number) and patch (object) are required" });
    return;
  }
  try {
    const raw = await fs.readFile(abs, "utf8");
    const parsed = matter(raw);
    const nodes = Array.isArray((parsed.data as any).nodes) ? (parsed.data as any).nodes : [];
    if (index < 0 || index >= nodes.length) {
      res.status(400).json({ error: "index out of range" });
      return;
    }
    nodes[index] = { ...nodes[index], ...patch };
    (parsed.data as any).nodes = nodes;
    await atomicWrite(abs, matter.stringify(parsed.content, parsed.data));
    res.json({ ok: true, path: rel, node: nodes[index] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/schedule/block { week, op, block? | id? | patch? | minutes? }
 * Mutate a week's time-blocks (add | update | delete | log) atomically, so the
 * UI never has to rewrite YAML. `log` adds focus-timer minutes to a block.
 */
app.post("/api/schedule/block", async (req, res) => {
  const { week, op, block, id, patch, minutes } = req.body ?? {};
  if (typeof week !== "string" || !/^\d{4}-W\d{2}$/.test(week)) {
    res.status(400).json({ error: "week (YYYY-Www) is required" });
    return;
  }
  const rel = `schedule/${week}.md`;
  const abs = path.join(REPO_ROOT, rel);
  try {
    let data: any = { week, blocks: [] };
    let body = "";
    try {
      const parsed = matter(await fs.readFile(abs, "utf8"));
      data = { week, blocks: [], ...parsed.data };
      body = parsed.content;
    } catch {
      /* new week file */
    }
    if (!Array.isArray(data.blocks)) data.blocks = [];

    if (op === "add") {
      const newId = `b${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
      data.blocks.push({ id: newId, actual_min: 0, planned_min: 0, ...(block ?? {}) });
    } else if (op === "update") {
      const i = data.blocks.findIndex((b: any) => b.id === id);
      if (i >= 0) data.blocks[i] = { ...data.blocks[i], ...(patch ?? {}) };
    } else if (op === "delete") {
      data.blocks = data.blocks.filter((b: any) => b.id !== id);
    } else if (op === "log") {
      const i = data.blocks.findIndex((b: any) => b.id === id);
      if (i >= 0) data.blocks[i].actual_min = (Number(data.blocks[i].actual_min) || 0) + Number(minutes || 0);
    } else {
      res.status(400).json({ error: "op must be add | update | delete | log" });
      return;
    }
    await atomicWrite(abs, matter.stringify(body || "\n", data));
    res.json({ ok: true, path: rel, blocks: data.blocks });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/reviews { topic, prompt, solution } — create a spaced-repetition card.
 */
app.post("/api/reviews", async (req, res) => {
  const b = req.body ?? {};
  const topic = String(b.topic ?? "").trim();
  const prompt = String(b.prompt ?? "").trim();
  if (!topic || !prompt) {
    res.status(400).json({ error: "topic and prompt are required" });
    return;
  }
  const id = `${slugify(topic)}-${Date.now().toString(36)}`;
  const frontmatter = {
    id,
    topic,
    status: "yellow",
    last_reviewed: "",
    interval_days: 1,
    confidence: 0,
  };
  const body = `## Prompt\n${prompt}\n\n## Solution (hidden until attempted)\n${String(b.solution ?? "")}\n`;
  const rel = `data/reviews/${id}.md`;
  try {
    await atomicWrite(path.join(REPO_ROOT, rel), matter.stringify(`\n${body}`, frontmatter));
    res.json({ ok: true, path: rel, id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/review/rate { id, confidence } — reschedule a card by rating.
 * Intervals ladder 1·3·7·14·30; confidence>=3 advances, ==2 holds, <=1 resets.
 */
const LADDER = [1, 3, 7, 14, 30];
app.post("/api/review/rate", async (req, res) => {
  const { id, confidence } = req.body ?? {};
  const c = Number(confidence);
  if (!id || !(c >= 1 && c <= 4)) {
    res.status(400).json({ error: "id and confidence (1–4) are required" });
    return;
  }
  const rel = `data/reviews/${id}.md`;
  const abs = path.join(REPO_ROOT, rel);
  try {
    const parsed = matter(await fs.readFile(abs, "utf8"));
    const data = parsed.data as any;
    const curIdx = Math.max(0, LADDER.indexOf(Number(data.interval_days) || 1));
    let nextIdx = curIdx;
    if (c >= 3) nextIdx = Math.min(curIdx + 1, LADDER.length - 1);
    else if (c <= 1) nextIdx = 0;
    data.interval_days = LADDER[nextIdx];
    data.confidence = c;
    data.last_reviewed = today();
    data.status = c >= 3 ? "green" : c === 2 ? "yellow" : "red";
    await atomicWrite(abs, matter.stringify(parsed.content, data));
    res.json({ ok: true, path: rel, interval_days: data.interval_days, status: data.status });
  } catch {
    res.status(404).json({ error: "card not found", path: rel });
  }
});

/**
 * POST /ask  { action? | prompt?, params?, sessionId? }
 * Provide a named `action` (resolved from server-side prompts) or a raw
 * `prompt`. Streams newline-delimited JSON: each line is a claude stream-json
 * event, plus a final { type: "done", sessionId } line.
 */
app.post("/ask", async (req, res) => {
  const { action, params, prompt: rawPrompt, sessionId } = req.body ?? {};
  let prompt: string | undefined;
  if (typeof action === "string") {
    const build = ACTIONS[action];
    if (!build) {
      res.status(400).json({ error: `unknown action: ${action}` });
      return;
    }
    prompt = build((params ?? {}) as Record<string, unknown>);
  } else if (typeof rawPrompt === "string") {
    prompt = rawPrompt;
  }
  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: "action or prompt is required" });
    return;
  }
  if (busy) {
    res.status(409).json({ error: "An AI action is already running. Try again in a moment." });
    return;
  }
  busy = true;

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (obj: unknown) => res.write(JSON.stringify(obj) + "\n");

  try {
    const result = await runClaude(prompt, typeof sessionId === "string" ? sessionId : null, {
      onEvent: (event: ClaudeEvent) => send(event),
    });
    send({ type: "done", sessionId: result.sessionId, result: result.result });
  } catch (err) {
    send({ type: "error", message: (err as Error).message });
  } finally {
    busy = false;
    res.end();
  }
});

// --- HTTP + WebSocket file-watch broadcast ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/watch" });

function broadcast(message: unknown) {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

const watchPaths = WATCH_DIRS.map((d) => path.join(REPO_ROOT, d));
const watcher = chokidar.watch(watchPaths, {
  ignoreInitial: true,
  ignored: (p) => p.endsWith("index.json") || p.includes("/.git/"),
});
for (const evt of ["add", "change", "unlink"] as const) {
  watcher.on(evt, (filePath) => {
    broadcast({ type: "change", event: evt, path: path.relative(REPO_ROOT, filePath) });
  });
}

server.listen(PORT, () => {
  console.log(`ICM server on http://localhost:${PORT}  (data home: ${REPO_ROOT})`);
});
