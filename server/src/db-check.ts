import "dotenv/config";
import { getDb, dbConfigured } from "./db.js";

/**
 * Verifies the Supabase connection and that the Phase 0 base tables exist.
 * Run with: `npm run db:check` (from server/). This is the M0.1 DoD check.
 */
const TABLES = ["profiles", "ai_settings", "resumes", "user_stats"];

async function main() {
  if (!dbConfigured()) {
    console.error("✗ Supabase not configured. Copy server/.env.example to server/.env and set");
    console.error("  SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY).");
    process.exit(1);
  }
  const db = getDb()!;
  let ok = true;
  for (const t of TABLES) {
    const { error } = await db.from(t).select("*", { count: "exact", head: true });
    if (error) {
      console.error(`✗ ${t.padEnd(12)} ${error.message}`);
      ok = false;
    } else {
      console.log(`✓ ${t}`);
    }
  }
  if (ok) console.log("\nAll Phase 0 tables present — M0.1 verified.");
  else console.error("\nSome tables are missing. Apply supabase/migrations/0001_init.sql first.");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("✗ db:check failed:", e?.message ?? e);
  process.exit(1);
});
