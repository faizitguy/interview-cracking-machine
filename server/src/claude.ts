import { spawn } from "node:child_process";
import readline from "node:readline";
import { REPO_ROOT } from "./config.js";

/** A parsed JSON event from `claude --output-format stream-json`. */
export type ClaudeEvent = Record<string, unknown> & { type?: string };

export interface RunHandlers {
  /** Called for every JSON event streamed from the CLI. */
  onEvent: (event: ClaudeEvent) => void;
}

export interface RunResult {
  sessionId: string | null;
  /** Final result text from the `result` event, if any. */
  result: string | null;
  exitCode: number | null;
}

/**
 * Spawn the headless `claude` CLI in the repo root and stream its JSON events.
 * Uses the user's existing CLI login (Max plan) — no API key. If `sessionId`
 * is given, the conversation is resumed.
 */
export function runClaude(
  prompt: string,
  sessionId: string | null,
  handlers: RunHandlers,
): Promise<RunResult> {
  const args = [
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--permission-mode",
    "bypassPermissions",
  ];
  if (sessionId) args.push("--resume", sessionId);

  const child = spawn("claude", args, {
    cwd: REPO_ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let resolvedSession: string | null = sessionId;
  let result: string | null = null;
  let stderr = "";

  const rl = readline.createInterface({ input: child.stdout });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event: ClaudeEvent;
    try {
      event = JSON.parse(trimmed);
    } catch {
      // Non-JSON line (shouldn't happen with stream-json); forward as text.
      handlers.onEvent({ type: "raw", text: trimmed });
      return;
    }
    if (typeof event.session_id === "string") resolvedSession = event.session_id;
    if (event.type === "result" && typeof event.result === "string") {
      result = event.result;
    }
    handlers.onEvent(event);
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  return new Promise<RunResult>((resolve, reject) => {
    child.on("error", (err) => {
      // e.g. claude not installed (ENOENT)
      reject(err);
    });
    child.on("close", (code) => {
      rl.close();
      if (code !== 0 && result === null) {
        handlers.onEvent({
          type: "error",
          message: stderr.trim() || `claude exited with code ${code}`,
        });
      }
      resolve({ sessionId: resolvedSession, result, exitCode: code });
    });
  });
}

/** Check that the `claude` CLI is installed and responds to --version. */
export function checkClaudeInstalled(): Promise<{ ok: boolean; version?: string; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn("claude", ["--version"], { env: process.env });
    let out = "";
    child.stdout.on("data", (c: Buffer) => (out += c.toString()));
    child.on("error", (err) => resolve({ ok: false, error: err.message }));
    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true, version: out.trim() });
      else resolve({ ok: false, error: `exited with code ${code}` });
    });
  });
}
