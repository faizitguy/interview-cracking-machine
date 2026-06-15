import express from "express";
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import chokidar from "chokidar";
import matter from "gray-matter";

import { PORT, REPO_ROOT, WATCH_DIRS, LOGS_DIR, today } from "./config.js";
import { runClaude, checkClaudeInstalled, type ClaudeEvent } from "./claude.js";
import { appendTestLine } from "./prompts.js";

/** Named AI actions → server-side prompts (spec section 4: prompts live here). */
const ACTIONS: Record<string, () => string> = {
  appendTestLine: () => appendTestLine(today()),
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

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
 * POST /ask  { action? | prompt?, sessionId? }
 * Provide a named `action` (resolved from server-side prompts) or a raw
 * `prompt`. Streams newline-delimited JSON: each line is a claude stream-json
 * event, plus a final { type: "done", sessionId } line.
 */
app.post("/ask", async (req, res) => {
  const { action, prompt: rawPrompt, sessionId } = req.body ?? {};
  let prompt: string | undefined;
  if (typeof action === "string") {
    const build = ACTIONS[action];
    if (!build) {
      res.status(400).json({ error: `unknown action: ${action}` });
      return;
    }
    prompt = build();
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
