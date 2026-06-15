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
