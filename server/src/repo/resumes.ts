import { getDb } from "../db.js";

/**
 * Uploaded resumes (parsed to markdown), stored in Supabase (PRD §D.4). The
 * latest one is the user's active resume; `insights` is filled by the M0.7
 * extractProfile step.
 */
export interface Resume {
  id?: string;
  filename?: string | null;
  content_md?: string | null;
  chars?: number | null;
  insights?: unknown;
  uploaded_at?: string;
}

const TABLE = "resumes";

function db() {
  const client = getDb();
  if (!client) throw new Error("Supabase not configured — set SUPABASE_URL + a key in server/.env");
  return client;
}

/** Insert a parsed resume; returns the saved row. */
export async function saveResume(r: { filename: string; content_md: string; chars: number }): Promise<Resume> {
  const { data, error } = await db()
    .from(TABLE)
    .insert({ filename: r.filename, content_md: r.content_md, chars: r.chars })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Resume;
}

/** The most recently uploaded resume, or null. */
export async function getLatestResume(): Promise<Resume | null> {
  const { data, error } = await db()
    .from(TABLE)
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Resume) ?? null;
}

/** Attach extracted insights (from extractProfile) to the latest resume row. */
export async function setLatestResumeInsights(insights: unknown): Promise<void> {
  const latest = await getLatestResume();
  if (!latest?.id) return;
  const { error } = await db().from(TABLE).update({ insights }).eq("id", latest.id);
  if (error) throw new Error(error.message);
}
