import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Repo root = the data home (per spec section 5b, data lives in the project
 * folder). server/src -> server -> repo root.
 */
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

export const PORT = Number(process.env.ICM_PORT ?? 4317);

/** Directories watched for live UI updates. */
export const WATCH_DIRS = ["data", "mocks"];

export const LOGS_DIR = path.join(REPO_ROOT, "data", "logs");

/**
 * Tools the spawned claude may use without prompting. We run the CLI in
 * bypassPermissions mode (trusted local single-user app); this list documents
 * intent and is the seam to tighten later via --allowedTools.
 */
export const ALLOWED_TOOLS = ["Read", "Edit", "Write", "Glob", "Grep", "Bash"];

/** Local date as YYYY-MM-DD (used for today's log filename). */
export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO week id like 2026-W25 for the given date (default now). */
export function isoWeek(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
