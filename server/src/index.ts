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
import { getAIProvider } from "./ai/index.js";
import { dbConfigured } from "./db.js";
import { parseJsonObject } from "./json.js";
import { getProfile, upsertProfile, type Profile } from "./repo/profiles.js";
import { saveResume, getLatestResume, setLatestResumeInsights } from "./repo/resumes.js";
import { materializeProfile } from "./scratch.js";
import {
  mockInterviewer,
  mockScore,
  learnTrack,
  learnLesson,
  practiceQuestion,
  practiceFeedback,
  extractProfile,
  ROUNDS,
} from "./prompts.js";
import { parseResume } from "./resume.js";
import { synth, loadTTS, ttsReady, VOICES, DEFAULT_VOICE } from "./tts.js";

/** Named AI actions → server-side prompts (spec section 4: prompts live here). */
type Action = (params: Record<string, unknown>) => string;
const ACTIONS: Record<string, Action> = {
  startMock: (p) => mockInterviewer(String(p.round ?? "general"), String(p.role ?? ""), String(p.level ?? "mid")),
  scoreMock: (p) =>
    mockScore(
      String(p.round ?? "general"),
      String(p.role ?? ""),
      String(p.level ?? "mid"),
      today(),
      // sanitize the client-provided filename to a bare mocks/*.md name
      String(p.file ?? `${today()}-mock.md`).replace(/[^a-zA-Z0-9._-]/g, "") || `${today()}-mock.md`,
    ),
  // Learn module — curriculum tracks (stateless, no file writes).
  learnTrack: (p) => learnTrack(String(p.round ?? "general"), String(p.role ?? ""), String(p.level ?? "mid")),
  learnLesson: (p) =>
    learnLesson(String(p.round ?? "general"), String(p.topic ?? ""), String(p.role ?? ""), String(p.level ?? "mid")),
  // Practice module — single-question drills (stateless, no file writes).
  practiceQuestion: (p) =>
    practiceQuestion(
      String(p.round ?? "general"),
      String(p.role ?? ""),
      String(p.level ?? "mid"),
      Array.isArray(p.asked) ? (p.asked as unknown[]).map(String) : [],
    ),
  practiceFeedback: (p) =>
    practiceFeedback(
      String(p.round ?? "general"),
      String(p.question ?? ""),
      String(p.answer ?? ""),
      String(p.role ?? ""),
      String(p.level ?? "mid"),
    ),
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
  const provider = getAIProvider();
  const claude = await provider.isAvailable();
  const supabase = { configured: dbConfigured() };
  let resumeName: string | undefined;
  let hasResume = false;
  // Supabase is the source of truth for the resume; fall back to the local scratch.
  if (supabase.configured) {
    try {
      const latest = await getLatestResume();
      if (latest) {
        hasResume = true;
        resumeName = latest.filename ?? "résumé on file";
      }
    } catch {
      /* db unreachable — fall through to scratch */
    }
  }
  if (!hasResume) {
    try {
      const { data } = matter(await fs.readFile(path.join(REPO_ROOT, "data", "resume.md"), "utf8"));
      resumeName = String((data as any).filename ?? "résumé on file");
      hasResume = true;
    } catch {
      /* no resume yet */
    }
  }
  res.json({ ok: true, provider: provider.id, claude, supabase, hasResume, resumeName });
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
    // Persist to Supabase (source of truth); the scratch file above is for Claude.
    const saved = await saveResume({ filename: file.originalname, content_md: text, chars: text.length });
    res.json({ ok: true, id: saved.id, filename: file.originalname, chars: text.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/extract-profile — read the latest resume (or `resumeText` from the
 * body) with the AI and return a structured profile proposal to pre-fill
 * onboarding (M0.7). Insights are persisted on the resume row.
 */
app.post("/api/extract-profile", async (req, res) => {
  if (busy) {
    res.status(409).json({ error: "An AI action is already running. Try again in a moment." });
    return;
  }
  let resumeText = String(req.body?.resumeText ?? "");
  if (!resumeText) {
    const latest = await getLatestResume().catch(() => null);
    resumeText = String(latest?.content_md ?? "");
  }
  if (resumeText.trim().length < 30) {
    res.status(422).json({ error: "no resume on file — upload one first" });
    return;
  }
  busy = true;
  try {
    const result = await getAIProvider().run({ prompt: extractProfile(resumeText) }, () => {});
    const parsed = parseJsonObject(result.text ?? "");
    if (!parsed) {
      res.status(502).json({ error: "couldn't parse the extracted profile" });
      return;
    }
    await setLatestResumeInsights(parsed).catch(() => {});
    res.json({ ok: true, profile: parsed });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  } finally {
    busy = false;
  }
});

/** POST /api/append { path, content } — append text to a data file (atomic). */
app.post("/api/append", async (req, res) => {
  const abs = resolveSafe(String(req.body?.path ?? ""));
  const content = req.body?.content;
  if (!abs || typeof content !== "string") {
    res.status(400).json({ error: "path (in a data dir) and content are required" });
    return;
  }
  try {
    let existing = "";
    try {
      existing = await fs.readFile(abs, "utf8");
    } catch {
      /* new file */
    }
    await atomicWrite(abs, existing + content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/rounds — selectable interview rounds (id + label). */
app.get("/api/rounds", (_req, res) => {
  res.json({ rounds: ROUNDS.map((r) => ({ id: r.id, label: r.label })) });
});

/** GET /api/profile — the single-user profile (or null if onboarding hasn't run). */
app.get("/api/profile", async (_req, res) => {
  try {
    res.json({ profile: await getProfile() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** POST /api/profile — upsert the profile (Supabase) and materialize scratch for Claude. */
app.post("/api/profile", async (req, res) => {
  try {
    const saved = await upsertProfile((req.body ?? {}) as Partial<Profile>);
    await materializeProfile(saved);
    res.json({ ok: true, profile: saved });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/tts/voices — Kokoro voice catalog + whether the model is loaded. */
app.get("/api/tts/voices", (_req, res) => {
  res.json({ ready: ttsReady(), default: DEFAULT_VOICE, voices: VOICES });
});

/** POST /api/tts { text, voice } — neural TTS, returns audio/wav (Kokoro). */
app.post("/api/tts", async (req, res) => {
  const text = String(req.body?.text ?? "").trim();
  const voice = String(req.body?.voice ?? DEFAULT_VOICE);
  const speed = req.body?.speed != null ? Number(req.body.speed) : undefined;
  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  try {
    const wav = await synth(text, voice, speed);
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", String(wav.length));
    res.end(wav);
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
    const result = await getAIProvider().run(
      { prompt, sessionId: typeof sessionId === "string" ? sessionId : null },
      (event) => send(event),
    );
    send({ type: "done", sessionId: result.sessionId, result: result.text });
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
  // Warm up the Kokoro model in the background so the first turn speaks fast.
  loadTTS()
    .then(() => console.log("Kokoro TTS ready"))
    .catch((e) => console.warn("Kokoro TTS warmup failed:", e?.message));
});
