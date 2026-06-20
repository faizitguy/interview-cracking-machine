import fs from "node:fs/promises";
import path from "node:path";
import { REPO_ROOT } from "./config.js";
import type { Profile } from "./repo/profiles.js";

/**
 * Scratch files (PRD ADR-4): disposable local context the bridge materializes
 * so Claude Code can read the user's data. NOT the source of truth — Supabase
 * is. Lives under data/ (git-ignored).
 */
const SCRATCH_DIR = path.join(REPO_ROOT, "data");

/** Atomic write of a scratch file under data/ (temp file then rename). */
export async function writeScratch(name: string, content: string): Promise<string> {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "");
  const abs = path.join(SCRATCH_DIR, safe);
  await fs.mkdir(SCRATCH_DIR, { recursive: true });
  const tmp = `${abs}.${process.pid}.tmp`;
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, abs);
  return abs;
}

/** Render the profile to data/profile.md so Claude has the user's context. */
export async function materializeProfile(p: Profile): Promise<void> {
  const lines = [
    "# Candidate profile (auto-generated scratch — source of truth is Supabase)",
    "",
    `- Name: ${p.display_name ?? "—"}`,
    `- Target role: ${p.target_role ?? "—"}`,
    `- Experience level: ${p.experience_level ?? "—"}`,
    `- Known languages: ${(p.known_languages ?? []).join(", ") || "—"}`,
    `- Tech stack: ${(p.tech_stack ?? []).join(", ") || "—"}`,
    `- Hours/week: ${p.hours_per_week ?? "—"}`,
    `- Goal: ${p.goal ?? "—"}`,
    `- North star: ${p.north_star ?? "—"}`,
    "",
  ];
  await writeScratch("profile.md", lines.join("\n"));
}
