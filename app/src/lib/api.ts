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

export async function fetchCollection(dir: string): Promise<CollectionItem[]> {
  const r = await fetch(`/api/collection?dir=${encodeURIComponent(dir)}`);
  if (!r.ok) return [];
  return (await r.json()).items ?? [];
}

export interface Health {
  ok: boolean;
  error?: string;
  hasResume: boolean;
}

export async function checkHealth(): Promise<Health> {
  try {
    const r = await fetch("/api/health");
    const j = await r.json();
    return { ok: j.claude?.ok ?? false, error: j.claude?.error, hasResume: !!j.hasResume };
  } catch (e) {
    return { ok: false, error: (e as Error).message, hasResume: false };
  }
}

/** Upload a resume (PDF/DOCX/txt) — parsed server-side into data/resume.md. */
export async function uploadResume(file: File): Promise<{ filename: string; chars: number }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/resume", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Upload failed (${r.status})`);
  return j;
}

/** Today's date as YYYY-MM-DD (local). */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
