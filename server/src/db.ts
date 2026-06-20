import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for the local bridge (single-user, ADR-4).
 *
 * Lazy + optional: if the env isn't configured yet the app still runs (AI and
 * file features keep working); DB-backed features just report "not configured".
 * Prefer the service key on the server (full access, single trusted local user);
 * fall back to the anon key for read-mostly setups.
 */
let client: SupabaseClient | null = null;

export function dbConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY));
}

export function getDb(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
