/**
 * Track (madhaat) read + CRUD operations.
 *
 * Reads come from the `v_tracks` and `v_tracks_admin` views (joined with
 * artist/narrator/tariqa/fan). The lightweight "minimal" reads go straight
 * to the `madha` table since they don't need joins.
 */

import type {
  Madha,
  MadhaInsert,
  MadhaWithRelations,
  Madih,
  Rawi,
} from "@/types/database";

import { deleteFromStorage, paginate, supabase } from "./_shared";

// ============================================================================
// Public reads — approved tracks
// ============================================================================

/** Paginated, ordered list of approved tracks for the user-facing feeds. */
export async function getApprovedMadhaat(options?: {
  limit?: number;
  offset?: number;
  orderBy?: "created_at" | "title" | "play_count";
  ascending?: boolean;
}): Promise<MadhaWithRelations[]> {
  const {
    limit = 50,
    offset = 0,
    orderBy = "created_at",
    ascending = false,
  } = options || {};

  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .order(orderBy, { ascending })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data as unknown as MadhaWithRelations[]) || [];
}

export async function getApprovedMadhaatCount(): Promise<number> {
  const { count, error } = await supabase
    .from("v_tracks")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count || 0;
}

/**
 * Lightweight ALL-tracks fetch for the playlist picker (dashboard only).
 * Pages through the table because PostgREST's default per-request cap is
 * 1000 rows and the library is bigger than that. Use the generic
 * `paginate` helper instead of inlining the loop.
 */
export async function getAllMadhaatMinimal(): Promise<
  {
    id: string;
    title: string;
    madih: string | null;
    madih_id: string | null;
    rawi_id: string | null;
    created_at: string;
  }[]
> {
  return paginate<{
    id: string;
    title: string;
    madih: string | null;
    madih_id: string | null;
    rawi_id: string | null;
    created_at: string;
  }>((from, to) =>
    supabase
      .from("madha")
      .select("id, title, madih, madih_id, rawi_id, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(from, to)
  );
}

/**
 * Lightweight all-tracks fetch with the fields needed for find-and-replace
 * + bulk-upload inheritance (artist, narrator, tariqa, fan, content type,
 * lyrics, writer).
 */
export async function getAllMadhaatForReplace(): Promise<
  {
    id: string;
    title: string;
    madih_id: string | null;
    rawi_id: string | null;
    tariqa_id: string | null;
    fan_id: string | null;
    content_type: string | null;
    lyrics: string | null;
    writer: string | null;
  }[]
> {
  type TrackRow = {
    id: string;
    title: string;
    madih_id: string | null;
    rawi_id: string | null;
    tariqa_id: string | null;
    fan_id: string | null;
    content_type: string | null;
    lyrics: string | null;
    writer: string | null;
  };
  return paginate<TrackRow>((from, to) =>
    supabase
      .from("madha")
      .select(
        "id, title, madih_id, rawi_id, tariqa_id, fan_id, content_type, lyrics, writer"
      )
      .order("created_at", { ascending: false })
      .range(from, to)
  );
}

// ============================================================================
// Admin reads — full table view including pending / rejected
// ============================================================================

export async function getAdminMadhaat(options?: {
  page?: number;
  limit?: number;
  searchQuery?: string;
  artistId?: string;
  narratorId?: string;
  tariqa?: string;
  statusMode?: "all" | "approved" | "pending";
  contentType?: string;
  sortBy?: "created_at" | "play_count";
  sortAscending?: boolean;
}): Promise<{ data: MadhaWithRelations[]; count: number }> {
  const {
    page = 1,
    limit = 25,
    searchQuery = "",
    artistId = "",
    narratorId = "",
    statusMode = "all",
    contentType = "",
    sortBy = "created_at",
    sortAscending = false,
  } = options || {};

  const offset = (page - 1) * limit;

  let query = supabase
    .from("v_tracks_admin")
    .select("*", { count: "exact" });

  if (statusMode === "approved") {
    query = query.eq("status", "approved");
  } else if (statusMode === "pending") {
    query = query.eq("status", "pending");
  }

  if (searchQuery.trim()) {
    query = query.or(
      `title.ilike.%${searchQuery}%,madih.ilike.%${searchQuery}%,writer.ilike.%${searchQuery}%`
    );
  }

  if (contentType) query = query.eq("content_type", contentType);
  if (artistId) query = query.eq("madih_id", artistId);
  if (narratorId) query = query.eq("rawi_id", narratorId);

  query = query
    .order(sortBy, { ascending: sortAscending })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data as unknown as MadhaWithRelations[]) || [],
    count: count || 0,
  };
}

/** Map of content_type → total count (all records, regardless of status). */
export async function getContentTypeCounts(): Promise<Record<string, number>> {
  const contentTypes = ["madha", "quran", "lecture", "dhikr", "inshad"];
  const counts: Record<string, number> = {};

  await Promise.all(
    contentTypes.map(async (ct) => {
      const { count, error } = await supabase
        .from("madha")
        .select("*", { count: "exact", head: true })
        .eq("content_type", ct);
      if (!error) counts[ct] = count || 0;
    })
  );

  return counts;
}

// ============================================================================
// Single-track + by-relation reads
// ============================================================================

export async function getMadhaById(
  id: string
): Promise<MadhaWithRelations | null> {
  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as MadhaWithRelations;
}

export async function getMadhaatByIds(
  ids: string[]
): Promise<MadhaWithRelations[]> {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .in("id", ids);

  if (error) throw error;
  return (data as unknown as MadhaWithRelations[]) || [];
}

export async function getMadhaatByMadih(
  madihId: string
): Promise<MadhaWithRelations[]> {
  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .eq("madih_id", madihId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as MadhaWithRelations[]) || [];
}

export async function getMadhaatByRawi(
  rawiId: string
): Promise<MadhaWithRelations[]> {
  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .eq("rawi_id", rawiId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as MadhaWithRelations[]) || [];
}

export async function getMadhaatByTariqa(
  tariqaId: string
): Promise<MadhaWithRelations[]> {
  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .eq("tariqa_id", tariqaId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as MadhaWithRelations[]) || [];
}

export async function getMadhaatByFan(
  fanId: string
): Promise<MadhaWithRelations[]> {
  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .eq("fan_id", fanId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as MadhaWithRelations[]) || [];
}

// ============================================================================
// Featured / popular / trending feeds
// ============================================================================

export async function getFeaturedMadhaat(): Promise<MadhaWithRelations[]> {
  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .eq("is_featured", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as MadhaWithRelations[]) || [];
}

export async function getPopularMadhaat(
  limit = 20
): Promise<MadhaWithRelations[]> {
  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .order("play_count", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as MadhaWithRelations[]) || [];
}

/**
 * Get trending tracks from the last N days via the `get_trending_tracks`
 * RPC. Falls back to all-time `play_count` if no recent play events exist.
 */
export async function getTrendingTracks(
  daysWindow = 7,
  limit = 10
): Promise<MadhaWithRelations[]> {
  const { data, error } = await supabase.rpc("get_trending_tracks", {
    days_window: daysWindow,
    max_results: limit,
  });

  if (error) throw error;

  // The RPC returns raw madha rows — enrich via v_tracks view.
  if (data && data.length > 0) {
    const ids = (data as { id: string }[]).map((r) => r.id);
    const { data: enriched, error: enrichErr } = await supabase
      .from("v_tracks")
      .select("*")
      .in("id", ids);
    if (!enrichErr && enriched) {
      // Preserve the trending order from the RPC.
      const byId = new Map(
        (enriched as { id: string }[]).map((r) => [r.id, r])
      );
      return ids
        .map((id) => byId.get(id))
        .filter(Boolean) as unknown as MadhaWithRelations[];
    }
  }

  // Fallback: no trending data yet, use all-time play_count.
  return getPopularMadhaat(limit);
}

// ============================================================================
// Track CRUD (admin / dashboard mutations)
// ============================================================================

export async function createMadha(
  data: Partial<MadhaInsert> & { madih_name?: string }
): Promise<string> {
  const { data: newMadha, error } = await supabase
    .from("madha")
    .insert([
      {
        title: data.title!,
        madih: data.madih_name || data.title || "",
        madih_id: data.madih_id || null,
        rawi_id: data.rawi_id || null,
        tariqa_id: data.tariqa_id || null,
        fan_id: data.fan_id || null,
        lyrics: data.lyrics || null,
        writer: data.writer || null,
        recording_place: data.recording_place || null,
        duration_seconds: data.duration_seconds || null,
        audio_url: data.audio_url || null,
        image_url: data.image_url || null,
        thumbnail_url: data.thumbnail_url || null,
        content_type: data.content_type || "madha",
        status: "approved",
      },
    ])
    .select("id")
    .single();

  if (error) throw error;
  return newMadha!.id;
}

export async function updateMadha(
  id: string,
  updates: Partial<MadhaInsert>
): Promise<void> {
  const { error } = await supabase.from("madha").update(updates).eq("id", id);
  if (error) throw error;
}

/**
 * Delete tracks AND their referenced media in storage. Note: related rows
 * in `user_favorites`, `user_plays`, and `collection_items` should cascade
 * via the FK constraints; we just nuke the parent rows here.
 */
export async function deleteMadhaat(ids: string[]): Promise<void> {
  const { data: records } = await supabase
    .from("madha")
    .select("audio_url, image_url, thumbnail_url")
    .in("id", ids);

  const urlsToDelete: string[] = [];
  if (records) {
    records.forEach((r) => {
      if (r.audio_url) urlsToDelete.push(r.audio_url);
      if (r.image_url) urlsToDelete.push(r.image_url);
      if (r.thumbnail_url) urlsToDelete.push(r.thumbnail_url);
    });
  }

  if (urlsToDelete.length > 0) {
    await deleteFromStorage(urlsToDelete).catch(console.error);
  }

  const { error } = await supabase.from("madha").delete().in("id", ids);
  if (error) throw error;
}

/**
 * Set a single field on many tracks (e.g. flip `is_featured`, change
 * `tariqa_id`). One round trip via PostgREST's `.in()` filter.
 */
export async function bulkUpdateMadhaat(
  ids: string[],
  field: keyof MadhaInsert,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
): Promise<void> {
  const { error } = await supabase
    .from("madha")
    .update({ [field]: value })
    .in("id", ids);
  if (error) throw error;
}

/**
 * Apply different changes to different tracks in batches of 10. Audit note:
 * this is the N+1 bulk-update pattern that should ideally become a single
 * `batch_update_madhaat(rows JSONB[])` RPC at scale.
 */
export async function batchUpdateMadhaat(
  updates: { id: string; changes: Partial<MadhaInsert> }[]
): Promise<void> {
  if (!updates.length) return;
  const BATCH_SIZE = 10;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(({ id, changes }) =>
        supabase
          .from("madha")
          .update(changes)
          .eq("id", id)
          .then(({ error }) => {
            if (error) throw error;
          })
      )
    );
  }
}

// ============================================================================
// Re-exported track types for convenience
// ============================================================================

export type { Madha, MadhaInsert, MadhaWithRelations, Madih, Rawi };
