/**
 * The AI engine abstraction (PRD ADR-2 / §D.2).
 *
 * Everything that talks to "the AI" goes through an AIProvider so the engine is
 * swappable: ClaudeCodeProvider (default, the user's own Claude Code) today, and
 * an ApiProvider (user-supplied Anthropic/OpenAI key) added in Phase 6 — same
 * prompts, same streaming contract, so callers don't care which one ran.
 */

/** A streamed event from the engine (NDJSON-shaped, forwarded to the client). */
export type AIEvent = Record<string, unknown> & { type?: string };

export interface AIRunInput {
  /** The full prompt to run. */
  prompt: string;
  /** Resume a prior conversation (mock rounds), if the engine supports it. */
  sessionId?: string | null;
  /** Tier hint: "fast" for live turns, "strong" for scoring/analysis. */
  model?: "fast" | "strong";
  /** Image paths for vision (whiteboard screenshots) — used from Phase 5. */
  images?: string[];
}

export interface AIRunResult {
  /** Final text from the engine, if any. */
  text: string | null;
  /** Session id to resume later (null if the engine is stateless). */
  sessionId: string | null;
}

export interface AIAvailability {
  ok: boolean;
  version?: string;
  error?: string;
}

export interface AIProvider {
  /** Stable id, e.g. "claude_code" | "api". */
  readonly id: string;
  /** Is this engine usable right now? (installed / logged in / key present) */
  isAvailable(): Promise<AIAvailability>;
  /** Run a prompt, streaming events via onEvent, resolving with the result. */
  run(input: AIRunInput, onEvent: (event: AIEvent) => void): Promise<AIRunResult>;
}
