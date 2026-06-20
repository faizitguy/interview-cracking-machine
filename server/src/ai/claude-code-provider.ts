import { runClaude, checkClaudeInstalled } from "../claude.js";
import type { AIProvider, AIRunInput, AIRunResult, AIAvailability, AIEvent } from "./provider.js";

/**
 * Default engine: the user's own headless `claude` CLI (Max plan, no API key).
 * Thin wrapper over the existing runClaude so behavior is unchanged — it just
 * now lives behind the AIProvider interface (PRD M0.3).
 */
export class ClaudeCodeProvider implements AIProvider {
  readonly id = "claude_code";

  isAvailable(): Promise<AIAvailability> {
    return checkClaudeInstalled();
  }

  async run(input: AIRunInput, onEvent: (event: AIEvent) => void): Promise<AIRunResult> {
    const res = await runClaude(input.prompt, input.sessionId ?? null, { onEvent });
    return { text: res.result, sessionId: res.sessionId };
  }
}
