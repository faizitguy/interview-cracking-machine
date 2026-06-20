// Thin client over the local interview backend. Every AI action is a POST /ask.

export type ClaudeEvent = Record<string, unknown> & { type?: string };

export interface CollectionItem {
  file: string;
  frontmatter: Record<string, unknown>;
  content: string;
}

export interface AskRequest {
  action?: string;
  prompt?: string;
  params?: Record<string, unknown>;
  sessionId?: string | null;
}

export interface AskResult {
  sessionId: string | null;
  result: string | null;
}

/**
 * Stream an AI action. Calls `onEvent` for every claude stream-json event and
 * resolves with the final session id + result text.
 */
export async function askStream(
  req: AskRequest,
  onEvent: (event: ClaudeEvent) => void,
): Promise<AskResult> {
  const res = await fetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok || !res.body) {
    const j = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(j.error || `Request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let sessionId: string | null = req.sessionId ?? null;
  let result: string | null = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const ev = JSON.parse(line) as ClaudeEvent;
      if (typeof ev.session_id === "string") sessionId = ev.session_id;
      if (ev.type === "done") {
        if (typeof ev.sessionId === "string") sessionId = ev.sessionId;
        if (typeof ev.result === "string") result = ev.result;
      }
      onEvent(ev);
    }
  }
  return { sessionId, result };
}

/** Plain text from an assistant stream event. */
export function eventText(ev: ClaudeEvent): string {
  if (ev.type !== "assistant") return "";
  const content = (ev as any).message?.content ?? [];
  return content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
}

export interface Round {
  id: string;
  label: string;
}

export async function fetchRounds(): Promise<Round[]> {
  try {
    const r = await fetch("/api/rounds");
    const j = await r.json();
    return j.rounds ?? [];
  } catch {
    return [];
  }
}

export async function fetchCollection(dir: string): Promise<CollectionItem[]> {
  const r = await fetch(`/api/collection?dir=${encodeURIComponent(dir)}`);
  if (!r.ok) return [];
  return (await r.json()).items ?? [];
}

export interface Health {
  ok: boolean;
  error?: string;
  hasResume: boolean;
  resumeName?: string;
}

export async function checkHealth(): Promise<Health> {
  try {
    const r = await fetch("/api/health");
    const j = await r.json();
    return { ok: j.claude?.ok ?? false, error: j.claude?.error, hasResume: !!j.hasResume, resumeName: j.resumeName };
  } catch (e) {
    return { ok: false, error: (e as Error).message, hasResume: false };
  }
}

/** Append text to a data file (used to save the verbatim transcript). */
export async function appendFile(path: string, content: string): Promise<void> {
  await fetch("/api/append", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
}

/** Upload a resume (PDF/DOCX/txt) — parsed + stored in Supabase + scratch. */
export async function uploadResume(file: File): Promise<{ filename: string; chars: number }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/resume", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Upload failed (${r.status})`);
  return j;
}

/** AI-proposed profile fields read from the uploaded resume (M0.7). */
export interface ExtractedProfile {
  display_name?: string;
  target_role?: string;
  experience_level?: string;
  known_languages?: string[];
  tech_stack?: string[];
  projects?: string[];
  strengths?: string[];
  gaps?: string[];
  suggested_goal?: string;
}

/** Ask the AI to read the latest uploaded resume and propose profile fields. */
export async function extractProfile(): Promise<ExtractedProfile> {
  const r = await fetch("/api/extract-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Extraction failed (${r.status})`);
  return j.profile;
}

/** The single-user profile (mirrors the Supabase `profiles` row). */
export interface Profile {
  id?: string;
  display_name?: string | null;
  target_role?: string | null;
  experience_level?: string | null;
  known_languages?: string[];
  tech_stack?: string[];
  goal?: string | null;
  north_star?: string | null;
  hours_per_week?: number | null;
  timezone?: string | null;
  default_teaching_style?: string | null;
  resume_insights?: unknown;
}

/** Load the profile (null if onboarding hasn't run, or the backend is unreachable). */
export async function getProfile(): Promise<Profile | null> {
  try {
    const r = await fetch("/api/profile");
    if (!r.ok) return null;
    return (await r.json()).profile ?? null;
  } catch {
    return null;
  }
}

/** Upsert the profile; returns the saved row. */
export async function saveProfile(patch: Partial<Profile>): Promise<Profile> {
  const r = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Save failed (${r.status})`);
  return j.profile;
}

/** Today's date as YYYY-MM-DD (local). */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
