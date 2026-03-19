/**
 * Relink Madiheen Script
 *
 * Goes through all madha records that have a `madih` text value but no `madih_id`,
 * looks up or creates the corresponding madiheen record, and links them.
 *
 * Usage:
 *   npx tsx scripts/relink-madiheen.ts              # dry-run, shows what would happen
 *   npx tsx scripts/relink-madiheen.ts --limit 1    # process only 1 track (trial)
 *   npx tsx scripts/relink-madiheen.ts --limit 10   # process 10 tracks
 *   npx tsx scripts/relink-madiheen.ts --all        # process all unlinked tracks
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = "https://qbthyivzfucsqvcoztxc.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY env var.\n" +
      "Run with: SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/relink-madiheen.ts"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Parse args ──────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = !args.includes("--all") && !args.includes("--limit");
const limitIdx = args.indexOf("--limit");
const limit =
  args.includes("--all") ? null : limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;

if (limitIdx !== -1 && (isNaN(limit!) || limit! < 1)) {
  console.error("--limit requires a positive number");
  process.exit(1);
}

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log("─".repeat(60));
  console.log("Relink Madiheen Script");
  console.log("─".repeat(60));

  // 1. Fetch unlinked tracks (have madih text but no madih_id)
  let query = supabase
    .from("madha")
    .select("id, title, madih, madih_id")
    .not("madih", "is", null)
    .neq("madih", "")
    .is("madih_id", null)
    .order("created_at", { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: unlinkedTracks, error: fetchErr } = await query;
  if (fetchErr) {
    console.error("Failed to fetch tracks:", fetchErr.message);
    process.exit(1);
  }

  if (!unlinkedTracks || unlinkedTracks.length === 0) {
    console.log("\nNo unlinked tracks found. Nothing to do.");
    return;
  }

  console.log(`\nFound ${unlinkedTracks.length} unlinked track(s)${limit ? ` (limited to ${limit})` : ""}\n`);

  // 2. Fetch existing madiheen for lookup
  const { data: existingMadiheen, error: madihErr } = await supabase
    .from("madiheen")
    .select("id, name");

  if (madihErr) {
    console.error("Failed to fetch madiheen:", madihErr.message);
    process.exit(1);
  }

  // Build a name -> id map (case-trimmed)
  const madihMap = new Map<string, string>();
  for (const m of existingMadiheen || []) {
    madihMap.set(m.name.trim(), m.id);
  }

  console.log(`Existing madiheen in DB: ${madihMap.size}`);
  console.log("");

  // 3. Group tracks by madih name
  const grouped = new Map<string, typeof unlinkedTracks>();
  for (const track of unlinkedTracks) {
    const name = (track.madih as string).trim();
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(track);
  }

  console.log(`Unique madih names to process: ${grouped.size}\n`);

  // ── Dry run: just show what would happen ──
  if (isDryRun) {
    console.log("DRY RUN (no changes will be made)\n");
    for (const [name, tracks] of grouped) {
      const exists = madihMap.has(name);
      console.log(
        `  ${exists ? "LINK" : " NEW"} | "${name}" → ${tracks.length} track(s)` +
          (exists ? "" : " (will create madih)")
      );
      for (const t of tracks.slice(0, 3)) {
        console.log(`         └─ ${t.title}`);
      }
      if (tracks.length > 3) {
        console.log(`         └─ ... and ${tracks.length - 3} more`);
      }
    }
    console.log(
      "\nTo apply, run with --limit 1 (trial) or --all (everything)"
    );
    return;
  }

  // ── Apply changes ─────────────────────────────────────
  let created = 0;
  let linked = 0;
  let errors = 0;

  for (const [name, tracks] of grouped) {
    let madihId = madihMap.get(name);

    // Create madih if it doesn't exist
    if (!madihId) {
      const OWNER_ID = "f2c1f385-6e2b-4e74-96a1-fc7301e8d1cf";
      const { data: newMadih, error: createErr } = await supabase
        .from("madiheen")
        .insert({
          name,
          status: "approved",
          created_by: OWNER_ID,
          reviewed_by: OWNER_ID,
          reviewed_at: new Date().toISOString(),
          is_verified: true,
        })
        .select("id")
        .single();

      if (createErr) {
        // Could be a race condition / duplicate — try fetching
        if (createErr.code === "23505") {
          const { data: existing } = await supabase
            .from("madiheen")
            .select("id")
            .eq("name", name)
            .single();
          if (existing) {
            madihId = existing.id;
          }
        }
        if (!madihId) {
          console.error(`  FAIL creating "${name}": ${createErr.message}`);
          errors += tracks.length;
          continue;
        }
      } else {
        madihId = newMadih.id;
      }

      madihMap.set(name, madihId);
      created++;
      console.log(`  + Created madih: "${name}" (${madihId})`);
    }

    // Link all tracks for this madih name
    const trackIds = tracks.map((t) => t.id);
    const { error: updateErr, count } = await supabase
      .from("madha")
      .update({ madih_id: madihId })
      .in("id", trackIds);

    if (updateErr) {
      console.error(`  FAIL linking tracks to "${name}": ${updateErr.message}`);
      errors += tracks.length;
    } else {
      linked += tracks.length;
      console.log(`  ✓ Linked ${tracks.length} track(s) → "${name}"`);
    }
  }

  // ── Summary ───────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("Summary:");
  console.log(`  Madiheen created: ${created}`);
  console.log(`  Tracks linked:    ${linked}`);
  if (errors > 0) console.log(`  Errors:           ${errors}`);
  console.log("─".repeat(60));
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
