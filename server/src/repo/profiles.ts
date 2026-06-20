import { getDb } from "../db.js";

/**
 * The single-user profile (PRD §D.4). Treated as a singleton: one row that
 * onboarding creates and edits. This is the first consumer of the persistence
 * bridge (M0.4) — the server reads/writes Supabase; the UI talks to the bridge.
 */
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
  created_at?: string;
  updated_at?: string;
}

const TABLE = "profiles";

function db() {
  const client = getDb();
  if (!client) throw new Error("Supabase not configured — set SUPABASE_URL + a key in server/.env");
  return client;
}

/** The single-user profile (first/only row), or null if onboarding hasn't run. */
export async function getProfile(): Promise<Profile | null> {
  const { data, error } = await db()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile) ?? null;
}

/** Insert the profile if none exists, else update the existing row. Returns the saved row. */
export async function upsertProfile(patch: Partial<Profile>): Promise<Profile> {
  const existing = await getProfile();
  const now = new Date().toISOString();
  if (existing?.id) {
    const { data, error } = await db()
      .from(TABLE)
      .update({ ...patch, updated_at: now })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as Profile;
  }
  const { data, error } = await db()
    .from(TABLE)
    .insert({ ...patch, updated_at: now })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}
