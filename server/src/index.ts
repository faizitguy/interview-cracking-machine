import express from "express";
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import chokidar from "chokidar";
import matter from "gray-matter";
import multer from "multer";

import { PORT, REPO_ROOT, WATCH_DIRS, today } from "./config.js";
import { runClaude, checkClaudeInstalled, type ClaudeEvent } from "./claude.js";
import { mockInterviewer, mockScore } from "./prompts.js";
import { parseResume } from "./resume.js";

/** Named AI actions → server-side prompts (spec section 4: prompts live here). */
type Action = (params: Record<string, unknown>) => string;
const ACTIONS: Record<string, Action> = {
  startMock: (p) => mockInterviewer(String(p.role ?? ""), String(p.level ?? "mid")),
  scoreMock: (p) => mockScore(String(p.role ?? ""), String(p.level ?? "mid"), today()),
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

/** Resolve a repo-relative path and confirm it's inside a watched data dir. */
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

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// --- AI bridge: one run at a time (avoid concurrent edits, spec section 5b) ---
let busy = false;

app.get("/api/health", async (_req, res) => {
  const claude = await checkClaudeInstalled();
  const hasResume = await fs
    .access(path.join(REPO_ROOT, "data", "resume.md"))
    .then(() => true)
    .catch(() => false);
  res.json({ ok: true, claude, hasResume });
});

/** Read a single data file (raw + frontmatter). Path-guarded to data dirs. */
app.get("/api/file", async (req, res) => {
  const abs = resolveSafe(String(req.query.path ?? ""));
  if (!abs) {
    res.status(400).json({ error: "path must be inside a data directory" });
    return;
  }
  try {
    const raw = await fs.readFile(abs, "utf8");
    const { data, content } = matter(raw);
    res.json({ path: req.query.path, raw, frontmatter: data, content });
  } catch {
    res.status(404).json({ error: "not found" });
  }
});

/** List a data dir's .md files with frontmatter (used for the mock score trend). */
app.get("/api/collection", async (req, res) => {
  const dir = String(req.query.dir ?? "");
  const base = resolveSafe(dir);
  if (!base) {
    res.status(400).json({ error: "dir must be inside a data directory" });
    return;
  }
  try {
    const names = (await fs.readdir(base).catch(() => [] as string[])).filter((f) => f.endsWith(".md")).sort();
    const items = await Promise.all(
      names.map(async (file) => {
        const { data, content } = matter(await fs.readFile(path.join(base, file), "utf8"));
        return { file: `${dir}/${file}`, frontmatter: data, content };
      }),
    );
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/resume (multipart, field "file") — parse a PDF/DOCX/txt resume to
 * text and save it to data/resume.md for the interviewer to read.
 */
app.post("/api/resume", upload.single("file"), async (req, res) => {
  const file = (req as any).file as { buffer: Buffer; originalname: string } | undefined;
  if (!file) {
    res.status(400).json({ error: "no file uploaded (field 'file')" });
    return;
  }
  try {
    const text = await parseResume(file.buffer, file.originalname);
    if (!text || text.length < 30) {
      res.status(422).json({ error: "couldn't extract readable text from that file" });
      return;
    }
    const content = matter.stringify(`\n${text}\n`, {
      filename: file.originalname,
      uploaded: new Date().toISOString().slice(0, 10),
      chars: text.length,
    });
    await atomicWrite(path.join(REPO_ROOT, "data", "resume.md"), content);
    res.json({ ok: true, filename: file.originalname, chars: text.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /ask  { action? | prompt?, params?, sessionId? }
 * Streams newline-delimited JSON claude events, then { type: "done", sessionId }.
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
  res.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" });
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
  for (const client of wss.clients) if (client.readyState === WebSocket.OPEN) client.send(data);
}
const watcher = chokidar.watch(
  WATCH_DIRS.map((d) => path.join(REPO_ROOT, d)),
  { ignoreInitial: true, ignored: (p) => p.endsWith("index.json") || p.includes("/.git/") },
);
for (const evt of ["add", "change", "unlink"] as const) {
  watcher.on(evt, (filePath) => broadcast({ type: "change", event: evt, path: path.relative(REPO_ROOT, filePath) }));
}

server.listen(PORT, () => {
  console.log(`ICM interview server on http://localhost:${PORT}  (data home: ${REPO_ROOT})`);
});
