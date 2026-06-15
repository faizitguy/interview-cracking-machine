// Thin client over the local backend bridge. Every AI action is a POST /ask.

export type ClaudeEvent = Record<string, unknown> & { type?: string };

export interface LogEntry {
  file: string;
  frontmatter: Record<string, unknown>;
}

export interface FileResult {
  path: string;
  raw: string;
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

/** Extract human-readable text from an assistant stream event. */
export function eventText(ev: ClaudeEvent): { text: string; tools: string[] } {
  if (ev.type !== "assistant") return { text: "", tools: [] };
  const content = (ev as any).message?.content ?? [];
  const text = content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
  const tools = content.filter((c: any) => c.type === "tool_use").map((c: any) => c.name as string);
  return { text, tools };
}

export async function fetchLogs(): Promise<LogEntry[]> {
  const r = await fetch("/api/logs");
  const j = await r.json();
  return j.logs ?? [];
}

export async function readFile(path: string): Promise<FileResult | null> {
  const r = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
  if (!r.ok) return null;
  return r.json();
}

export interface CollectionItem {
  file: string;
  frontmatter: Record<string, unknown>;
  content: string;
}

export async function fetchCollection(dir: string): Promise<CollectionItem[]> {
  const r = await fetch(`/api/collection?dir=${encodeURIComponent(dir)}`);
  if (!r.ok) return [];
  const j = await r.json();
  return j.items ?? [];
}

async function postJson(url: string, body: unknown): Promise<any> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}

/** Atomic deterministic write (milestone toggles, etc.). */
export function writeFile(path: string, content: string): Promise<any> {
  return postJson("/api/write", { path, content });
}

export interface NewGoal {
  title: string;
  north_star: string;
  target_date: string;
  hours_per_week: number;
  milestones?: string[];
}

export function createGoal(goal: NewGoal): Promise<{ id: string; path: string }> {
  return postJson("/api/goals", goal);
}

export function patchRoadmapNode(
  path: string,
  index: number,
  patch: Record<string, unknown>,
): Promise<any> {
  return postJson("/api/roadmap-node", { path, index, patch });
}

export async function checkHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch("/api/health");
    const j = await r.json();
    return j.claude ?? { ok: false };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Today's date as YYYY-MM-DD (local). */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
