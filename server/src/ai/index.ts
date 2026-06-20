import type { AIProvider } from "./provider.js";
import { ClaudeCodeProvider } from "./claude-code-provider.js";

export type { AIProvider, AIRunInput, AIRunResult, AIEvent, AIAvailability } from "./provider.js";

/**
 * Active AI engine selection (PRD §D.2). Defaults to Claude Code; an ApiProvider
 * is registered here in Phase 6 and chosen from the user's ai_settings.
 */
let current: AIProvider = new ClaudeCodeProvider();

export function getAIProvider(): AIProvider {
  return current;
}

export function setAIProvider(provider: AIProvider): void {
  current = provider;
}
