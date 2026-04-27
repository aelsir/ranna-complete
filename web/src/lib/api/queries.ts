/**
 * Data Access Layer - Supabase query functions
 * Mirrors ranna-core's lib/data/ but adapted for client-side SPA
 */

import { supabase } from "@/lib/supabase";
import { deleteFromStorage } from "../upload";
import type {
  Madha,
  MadhaInsert,
  MadhaWithRelations,
  Madih,
  MadihInsert,
  Rawi,
  RawiInsert,
  Tariqa,
  Fan,
  Collection,
  CollectionInsert,
  CollectionItem,
  UserFavorite,
  ListeningHistory,
} from "@/types/database";

// ============================================
// Madhaat (tracks)
// ============================================

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

/** Lightweight fetch of ALL approved tracks for playlist picker (dashboard only).
 *  NOTE: Supabase has a hard default of 1000 rows per request. The while-loop
 *  below pages through the full table to ensure no tracks are missed regardless
 *  of library size. Do not replace this with a single .select() call. */
export async function getAllMadhaatMinimal(): Promise<
  { id: string; title: string; madih: string | null; madih_id: string | null; rawi_id: string | null; created_at: string }[]
> {
  const allData: { id: string; title: string; madih: string | null; madih_id: string | null; rawi_id: string | null; created_at: string }[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("madha")
      .select("id, title, madih, madih_id, rawi_id, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allData.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allData;
}

/** Lightweight fetch of ALL tracks with fields needed for find & replace and bulk-upload inheritance. */
export async function getAllMadhaatForReplace(): Promise<
  { id: string; title: string; madih_id: string | null; rawi_id: string | null; tariqa_id: string | null; fan_id: string | null; content_type: string | null; lyrics: string | null; writer: string | null }[]
> {
  // Fetch all tracks in pages (Supabase default limit is 1000 rows)
  type TrackRow = { id: string; title: string; madih_id: string | null; rawi_id: string | null; tariqa_id: string | null; fan_id: string | null; content_type: string | null; lyrics: string | null; writer: string | null };
  const allData: TrackRow[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("madha")
      .select("id, title, madih_id, rawi_id, tariqa_id, fan_id, content_type, lyrics, writer")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return allData;
}

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
    tariqa = "",
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
  // tariqa logic: if filtering by name, wait, we probably join, or we might need to filter by tariqa_id instead. Let's just ilike search relation or skip standard filtering if complicated.
  // We'll rely on the dashboard parsing for standard ID matching if provided.

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

/** Returns a map of content_type → total count (all records, regardless of status). */
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

/** Unified search via RPC — Arabic normalization happens server-side */
export interface SearchAllResult {
  tracks: MadhaWithRelations[];
  lyrics: MadhaWithRelations[];
  artists: (Madih & { track_count: number })[];
  narrators: (Rawi & { track_count: number })[];
}

export async function searchAll(query: string): Promise<SearchAllResult> {
  const empty: SearchAllResult = { tracks: [], lyrics: [], artists: [], narrators: [] };
  if (!query.trim()) return empty;

  const { data, error } = await supabase.rpc("search_all", {
    p_query: query,
    p_limit: 30,
  });

  if (error) throw error;
  if (!data) return empty;

  const result = data as any;
  return {
    tracks: (result.tracks || []) as MadhaWithRelations[],
    lyrics: (result.lyrics || []) as MadhaWithRelations[],
    artists: (result.artists || []) as (Madih & { track_count: number })[],
    narrators: (result.narrators || []) as (Rawi & { track_count: number })[],
  };
}

/** Legacy wrapper — returns all matching tracks (title + lyrics combined) */
export async function searchMadhaat(query: string): Promise<Madha[]> {
  const result = await searchAll(query);
  return [...result.tracks, ...result.lyrics];
}

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
 * Get trending tracks from the last N days via the DB function.
 * Falls back to all-time play_count if no recent play events exist.
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

  // The RPC returns raw madha rows — enrich via v_tracks view
  if (data && data.length > 0) {
    const ids = (data as { id: string }[]).map((r) => r.id);
    const { data: enriched, error: enrichErr } = await supabase
      .from("v_tracks")
      .select("*")
      .in("id", ids);
    if (!enrichErr && enriched) {
      // Preserve the trending order from the RPC
      const byId = new Map(enriched.map((r: any) => [r.id, r]));
      return ids
        .map((id) => byId.get(id))
        .filter(Boolean) as unknown as MadhaWithRelations[];
    }
  }

  // Fallback: no trending data yet, use all-time play_count
  return getPopularMadhaat(limit);
}

// logPlayEvent removed — trending is now derived from user_plays

// ============================================
// Madiheen (artists/performers)
// ============================================

export async function getApprovedMadiheen(): Promise<(Madih & { track_count: number })[]> {
  const { data, error } = await supabase
    .from("v_artists")
    .select("*")
    .order("name");

  if (error) throw error;
  return (data as unknown as (Madih & { track_count: number })[]) || [];
}

/** Get only madiheen who have at least one approved madha, sorted by track count */
export async function getMadiheenWithMadhaat(limit = 10): Promise<Madih[]> {
  const { data, error } = await supabase
    .from("v_artists")
    .select("*")
    .gt("track_count", 0)
    .order("track_count", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as Madih[]) || [];
}

export async function getMadihById(id: string): Promise<(Madih & { track_count: number }) | null> {
  const { data, error } = await supabase
    .from("v_artists")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as (Madih & { track_count: number });
}

// ============================================
// Ruwat (narrators/writers)
// ============================================

export async function getApprovedRuwat(): Promise<(Rawi & { track_count: number })[]> {
  const { data, error } = await supabase
    .from("v_narrators")
    .select("*")
    .order("name");

  if (error) throw error;
  return (data as unknown as (Rawi & { track_count: number })[]) || [];
}

/** Get only ruwat who have at least one approved madha, sorted by track count */
export async function getRuwatWithMadhaat(limit = 10): Promise<Rawi[]> {
  const { data, error } = await supabase
    .from("v_narrators")
    .select("*")
    .gt("track_count", 0)
    .order("track_count", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as Rawi[]) || [];
}

export async function getRawiById(id: string): Promise<(Rawi & { track_count: number }) | null> {
  const { data, error } = await supabase
    .from("v_narrators")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as (Rawi & { track_count: number });
}

export async function createMadih(
  data: Partial<MadihInsert>
): Promise<string> {
  const { data: newMadih, error } = await supabase
    .from("madiheen")
    .insert([
      {
        name: data.name!,
        bio: data.bio || null,
        image_url: data.image_url || null,
        birth_year: data.birth_year || null,
        death_year: data.death_year || null,
        is_verified: data.is_verified || false,
        tariqa_id: data.tariqa_id || null,
        status: "approved",
      },
    ])
    .select("id")
    .single();

  if (error) throw error;
  return newMadih!.id;
}

export async function updateMadih(
  id: string,
  updates: Partial<MadihInsert>
): Promise<void> {
  const { error } = await supabase.from("madiheen").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteMadiheen(ids: string[]): Promise<void> {
  const { data: records } = await supabase.from("madiheen").select("image_url").in("id", ids);
  const urlsToDelete = records?.map((r) => r.image_url).filter(Boolean) as string[];
  if (urlsToDelete && urlsToDelete.length > 0) {
    await deleteFromStorage(urlsToDelete).catch(console.error);
  }

  const { error } = await supabase.from("madiheen").delete().in("id", ids);
  if (error) throw error;
}

export async function createRawi(
  data: Partial<RawiInsert>
): Promise<string> {
  const { data: newRawi, error } = await supabase
    .from("ruwat")
    .insert([
      {
        name: data.name!,
        bio: data.bio || null,
        image_url: data.image_url || null,
        birth_year: data.birth_year || null,
        death_year: data.death_year || null,
        status: "approved",
      },
    ])
    .select("id")
    .single();

  if (error) throw error;
  return newRawi!.id;
}

export async function updateRawi(
  id: string,
  updates: Partial<RawiInsert>
): Promise<void> {
  const { error } = await supabase.from("ruwat").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteRuwat(ids: string[]): Promise<void> {
  const { data: records } = await supabase.from("ruwat").select("image_url").in("id", ids);
  const urlsToDelete = records?.map((r) => r.image_url).filter(Boolean) as string[];
  if (urlsToDelete && urlsToDelete.length > 0) {
    await deleteFromStorage(urlsToDelete).catch(console.error);
  }

  const { error } = await supabase.from("ruwat").delete().in("id", ids);
  if (error) throw error;
}

// ============================================
// Turuq (Sufi orders)
// ============================================

export async function getTuruq(): Promise<Tariqa[]> {
  const { data, error } = await supabase
    .from("turuq")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getTariqaById(id: string): Promise<Tariqa | null> {
  const { data, error } = await supabase
    .from("turuq")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Funun (taar tones/music styles)
// ============================================

export async function getFunun(): Promise<Fan[]> {
  const { data, error } = await supabase
    .from("funun")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getFanById(id: string): Promise<Fan | null> {
  const { data, error } = await supabase
    .from("funun")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Collections (playlists)
// ============================================

export async function getActiveCollections(): Promise<(Collection & { item_count: number; collection_items: { track_id: string }[] })[]> {
  // Use v_collections for the item_count, but still fetch collection_items for the madha_ids
  // (admin pages and home page need the track IDs for display)
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_items(track_id)")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return (data as unknown as (Collection & { item_count: number; collection_items: { track_id: string }[] })[]) || [];
}

export async function getAdminCollections(): Promise<(Collection & { collection_items: { track_id: string }[] })[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_items(track_id)")
    .order("display_order");

  if (error) throw error;
  return (data as unknown as (Collection & { collection_items: { track_id: string }[] })[]) || [];
}

export async function getCollectionById(
  id: string
): Promise<Collection | null> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getCollectionItems(
  collectionId: string
): Promise<MadhaWithRelations[]> {
  const { data, error } = await supabase.rpc("get_collection_tracks", {
    p_collection_id: collectionId,
  });

  if (error) throw error;
  return (data as unknown as MadhaWithRelations[]) || [];
}

// ============================================
// User Favorites (requires auth)
// ============================================

export async function getUserFavoriteIds(
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("track_id")
    .eq("user_id", userId);

  if (error) throw error;
  return data?.map((f) => f.track_id) || [];
}

export async function getUserFavorites(
  userId: string
): Promise<MadhaWithRelations[]> {
  // Get favorite track IDs first, then fetch from v_tracks
  const ids = await getUserFavoriteIds(userId);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .in("id", ids);

  if (error) throw error;

  // Preserve favorites order (most recent first)
  const byId = new Map((data || []).map((d: any) => [d.id, d]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean) as unknown as MadhaWithRelations[];
}

export async function toggleFavorite(
  userId: string,
  madhaId: string
): Promise<boolean> {
  // Check if exists
  const { data: existing } = await supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("track_id", madhaId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
    return false; // unfavorited
  } else {
    const { error } = await supabase
      .from("user_favorites")
      .insert({ user_id: userId, track_id: madhaId });
    if (error) throw error;
    return true; // favorited
  }
}

// ============================================
// Listening History (requires auth)
// ============================================

const MAX_HISTORY_ITEMS = 10;

export async function getListeningHistory(
  userId: string
): Promise<MadhaWithRelations[]> {
  // Use v_recent_listens view (derived from user_plays)
  const { data: historyData, error: historyError } = await supabase
    .from("v_recent_listens")
    .select("track_id")
    .eq("user_id", userId)
    .order("listened_at", { ascending: false })
    .limit(MAX_HISTORY_ITEMS);

  if (historyError) throw historyError;
  const ids = historyData?.map((h) => h.track_id) || [];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .in("id", ids);

  if (error) throw error;

  // Preserve history order
  const byId = new Map((data || []).map((d: any) => [d.id, d]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean) as unknown as MadhaWithRelations[];
}

// addToListeningHistory removed — listening history is now derived from user_plays

// ============================================
// User Plays (analytics)
// ============================================

export async function recordPlay(params: {
  userId?: string;
  madhaId: string;
  durationSeconds?: number;
  completed?: boolean;
  deviceType?: string;
}): Promise<void> {
  const { error } = await supabase.from("user_plays").insert({
    user_id: params.userId || null,
    track_id: params.madhaId,
    duration_seconds: params.durationSeconds,
    completed: params.completed || false,
    device_type: params.deviceType,
  });

  if (error) throw error;

  // Increment play_count on madha
  await supabase.rpc("increment_play_count", {
    p_madha_id: params.madhaId,
  } as any).catch(() => {
    // Silently ignore if RPC fails
  });
}

// ============================================
// Home page aggregated data
// ============================================

export interface HomePageData {
  totalTracks: number;
  recentMadhaat: MadhaWithRelations[];
  popularMadhaat: MadhaWithRelations[];
  madiheen: (Madih & { track_count: number })[];
  ruwat: (Rawi & { track_count: number })[];
  turuq: Tariqa[];
  funun: Fan[];
  collections: Collection[];
}

export async function getHomePageData(): Promise<HomePageData> {
  // Single RPC call for the core home page data
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_home_data", {
    p_limit: 20,
  });

  if (rpcError) throw rpcError;

  // Turuq and funun aren't in the RPC — fetch in parallel (simple, rarely changes)
  const [turuq, funun] = await Promise.all([getTuruq(), getFunun()]);

  const homeData = rpcData as any;

  return {
    totalTracks: homeData?.total_tracks || 0,
    recentMadhaat: (homeData?.recent || []) as MadhaWithRelations[],
    popularMadhaat: (homeData?.trending || []) as MadhaWithRelations[],
    madiheen: (homeData?.artists || []) as (Madih & { track_count: number })[],
    ruwat: (homeData?.narrators || []) as (Rawi & { track_count: number })[],
    turuq,
    funun,
    collections: (homeData?.collections || []) as Collection[],
  };
}

// ============================================
// Dashboard Admin Mutations
// ============================================

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

export async function deleteMadhaat(ids: string[]): Promise<void> {
  const { data: records } = await supabase.from("madha").select("audio_url, image_url, thumbnail_url").in("id", ids);
  
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

  // Related records (user_favorites, user_plays, collection_items) 
  // should ideally cascade, but we delete from madha table directly
  const { error } = await supabase.from("madha").delete().in("id", ids);
  if (error) throw error;
}

export async function bulkUpdateMadhaat(
  ids: string[],
  field: keyof MadhaInsert,
  value: any
): Promise<void> {
  const { error } = await supabase
    .from("madha")
    .update({ [field]: value })
    .in("id", ids);
  if (error) throw error;
}

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

export async function createCollection(
  collection: Partial<CollectionInsert>,
  trackIds: string[]
): Promise<void> {
  // 1. Insert collection
  const { data: newCollection, error: collectionError } = await supabase
    .from("collections")
    .insert([
      {
        name: collection.name!,
        description: collection.description || null,
        image_url: collection.image_url || null,
        is_active: collection.is_active ?? true,
        display_order: collection.display_order || 0,
      },
    ])
    .select()
    .single();

  if (collectionError) throw collectionError;

  // 2. Insert items
  if (trackIds.length > 0) {
    const items = trackIds.map((madhaId, index) => ({
      collection_id: newCollection!.id,
      track_id: madhaId,
      position: index,
    }));
    
    const { error: itemsError } = await supabase
      .from("collection_items")
      .insert(items);
      
    if (itemsError) throw itemsError;
  }
}

export async function updateCollection(
  id: string,
  updates: Partial<CollectionInsert>,
  trackIds?: string[]
): Promise<void> {
  const { error } = await supabase.from("collections").update(updates).eq("id", id);
  if (error) throw error;

  if (trackIds !== undefined) {
    // Delete existing collection items
    const { error: deleteError } = await supabase
      .from("collection_items")
      .delete()
      .eq("collection_id", id);
      
    if (deleteError) throw deleteError;

    // Insert new collection items
    if (trackIds.length > 0) {
      const items = trackIds.map((madhaId, index) => ({
        collection_id: id,
        track_id: madhaId,
        position: index,
      }));
      
      const { error: insertError } = await supabase
        .from("collection_items")
        .insert(items);
        
      if (insertError) throw insertError;
    }
  }
}

// ============================================
// Platform Analytics (Admin only)
// ============================================

/** Paginated fetch of rows from `user_plays` since a given ISO timestamp.
 *  Overcomes Supabase's default 1000-row limit. */
async function fetchPlaysSince<T>(sinceIso: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("user_plays")
      .select(columns)
      .gte("played_at", sinceIso)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as T[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

/** Local YYYY-MM-DD (respects user's timezone). */
function toLocalDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

export async function getAnalyticsSummary() {
  // Compare last 7 days to previous 7 days for real trend %.
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const [
    { count: madhaCount },
    { count: madihCount },
    { count: rawiCount },
    allPlays,
  ] = await Promise.all([
    supabase.from("madha").select("*", { count: "exact", head: true }),
    supabase.from("madiheen").select("*", { count: "exact", head: true }),
    supabase.from("ruwat").select("*", { count: "exact", head: true }),
    // Paginated so totals aren't capped at 1000.
    (async () => {
      const rows: { played_at: string; duration_seconds: number | null }[] = [];
      const PAGE_SIZE = 1000;
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("user_plays")
          .select("played_at, duration_seconds")
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...(data as unknown as { played_at: string; duration_seconds: number | null }[]));
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      return rows;
    })(),
  ]);

  // Trend: plays last 7d vs prev 7d
  let thisWeek = 0;
  let prevWeek = 0;
  let thisWeekDuration = 0;
  let prevWeekDuration = 0;
  const sevenMs = sevenDaysAgo.getTime();
  const fourteenMs = fourteenDaysAgo.getTime();
  for (const p of allPlays) {
    const t = new Date(p.played_at).getTime();
    if (t >= sevenMs) {
      thisWeek++;
      thisWeekDuration += p.duration_seconds || 0;
    } else if (t >= fourteenMs) {
      prevWeek++;
      prevWeekDuration += p.duration_seconds || 0;
    }
  }

  const pctChange = (curr: number, prev: number): string => {
    if (prev === 0) return curr > 0 ? "+100%" : "0%";
    const pct = Math.round(((curr - prev) / prev) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}%`;
  };

  return {
    madhaCount: madhaCount || 0,
    madihCount: madihCount || 0,
    rawiCount: rawiCount || 0,
    totalPlays: allPlays.length,
    totalDuration: allPlays.reduce((acc, p) => acc + (p.duration_seconds || 0), 0),
    playsTrendPct: pctChange(thisWeek, prevWeek),
    durationTrendPct: pctChange(thisWeekDuration, prevWeekDuration),
  };
}

export async function getPlaysTrend(days = 14) {
  // Snap window start to start-of-day, days-1 back so the range spans exactly `days` days inclusive.
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const rows = await fetchPlaysSince<{ played_at: string; duration_seconds: number | null }>(
    start.toISOString(),
    "played_at, duration_seconds",
  );

  // Bucket by local date — track both play count and listened seconds per day.
  const counts = new Map<string, number>();
  const seconds = new Map<string, number>();
  for (const r of rows) {
    const day = toLocalDay(r.played_at);
    counts.set(day, (counts.get(day) ?? 0) + 1);
    // Plays from early installs may have NULL duration; treat as 0 minutes
    // contributed rather than poisoning the sum.
    seconds.set(day, (seconds.get(day) ?? 0) + (r.duration_seconds ?? 0));
  }

  // Zero-fill the full window so the chart always renders `days` evenly-spaced points.
  const result: { date: string; count: number; minutes: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toLocaleDateString("en-CA");
    result.push({
      date: key,
      count: counts.get(key) ?? 0,
      minutes: Math.round((seconds.get(key) ?? 0) / 60),
    });
  }
  return result;
}

// ── Engagement Metrics ────────────────────────────────────

export interface EngagementMetrics {
  uniqueListeners: number;
  completionRate: number; // 0–100
  avgDurationSeconds: number;
  deviceBreakdown: Record<string, number>;
  totalFavorites: number;
}

export async function getEngagementMetrics(): Promise<EngagementMetrics> {
  // Pull paginated plays (all-time — matches totalPlays denominators)
  type PlayRow = { user_id: string | null; duration_seconds: number | null; completed: boolean | null; device_type: string | null };
  const playRows: PlayRow[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("user_plays")
      .select("user_id, duration_seconds, completed, device_type")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    playRows.push(...(data as unknown as PlayRow[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const uniqueUsers = new Set<string>();
  let completedCount = 0;
  let totalDuration = 0;
  const devices: Record<string, number> = {};
  for (const r of playRows) {
    if (r.user_id) uniqueUsers.add(r.user_id);
    if (r.completed) completedCount++;
    totalDuration += r.duration_seconds || 0;
    const d = (r.device_type || "unknown").toLowerCase();
    devices[d] = (devices[d] || 0) + 1;
  }

  const totalPlays = playRows.length;
  const completionRate = totalPlays > 0 ? Math.round((completedCount / totalPlays) * 100) : 0;
  const avgDurationSeconds = totalPlays > 0 ? Math.round(totalDuration / totalPlays) : 0;

  // Favorites count (exact, no rows needed)
  const { count: favCount, error: favErr } = await supabase
    .from("user_favorites")
    .select("*", { count: "exact", head: true });
  if (favErr) throw favErr;

  return {
    uniqueListeners: uniqueUsers.size,
    completionRate,
    avgDurationSeconds,
    deviceBreakdown: devices,
    totalFavorites: favCount || 0,
  };
}

// ── Trending This Week ─────────────────────────────────────

export interface TrendingTrack {
  trackId: string;
  title: string;
  playCount: number;
}

/** Top N tracks by play count in the last `days` days.
 *  Uses the SECURITY DEFINER RPC `get_trending_tracks` so it bypasses RLS.
 *  Play counts are supplemented from user_plays. */
export async function getTrendingThisWeek(days = 7, limit = 5): Promise<TrendingTrack[]> {
  // 1. Get the ranked track list via the RPC (bypasses RLS).
  const { data: rpcData, error: rpcErr } = await supabase.rpc("get_trending_tracks", {
    days_window: days,
    max_results: limit,
  });
  if (rpcErr) throw rpcErr;

  type TrackRow = { id: string; title: string };
  const tracks = (rpcData || []) as unknown as TrackRow[];
  if (tracks.length === 0) return [];

  // 2. Supplement with play counts from user_plays.
  const counts = new Map<string, number>();
  try {
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    const ids = tracks.map((t) => t.id);

    const events: { track_id: string }[] = [];
    const PAGE_SIZE = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("user_plays")
        .select("track_id")
        .in("track_id", ids)
        .gte("played_at", start.toISOString())
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      events.push(...(data as unknown as { track_id: string }[]));
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    for (const e of events) {
      if (!e.track_id) continue;
      counts.set(e.track_id, (counts.get(e.track_id) || 0) + 1);
    }
  } catch {
    // Ignore — keep counts empty, RPC order preserves the ranking.
  }

  return tracks.map((t) => ({
    trackId: t.id,
    title: t.title,
    playCount: counts.get(t.id) || 0,
  }));
}

// ── Top Favorited Tracks ───────────────────────────────────

export interface FavoritedTrack {
  trackId: string;
  title: string;
  favCount: number;
}

export async function getTopFavorited(limit = 5): Promise<FavoritedTrack[]> {
  // Pull all user_favorites rows (paginated)
  const favRows: { track_id: string }[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("user_favorites")
      .select("track_id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    favRows.push(...(data as unknown as { track_id: string }[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const counts = new Map<string, number>();
  for (const f of favRows) {
    if (!f.track_id) continue;
    counts.set(f.track_id, (counts.get(f.track_id) || 0) + 1);
  }

  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (top.length === 0) return [];

  const ids = top.map((t) => t[0]);
  const { data: tracks, error: tErr } = await supabase
    .from("madha")
    .select("id, title")
    .in("id", ids);
  if (tErr) throw tErr;

  type TitleRow = { id: string; title: string };
  const titleMap = new Map(((tracks || []) as unknown as TitleRow[]).map((t) => [t.id, t.title]));
  return top.map(([trackId, favCount]) => ({
    trackId,
    title: titleMap.get(trackId) || "—",
    favCount,
  }));
}

// ── User Activity ──────────────────────────────────────────

export interface UserActivity {
  activeThisWeek: number;
  activeThisMonth: number;
  newThisMonth: number;
  totalUsers: number;
}

export async function getUserActivity(): Promise<UserActivity> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    { count: activeThisWeek },
    { count: activeThisMonth },
    { count: newThisMonth },
    { count: totalUsers },
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_active_at", sevenDaysAgo.toISOString()),
    supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_active_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
    activeThisWeek: activeThisWeek || 0,
    activeThisMonth: activeThisMonth || 0,
    newThisMonth: newThisMonth || 0,
    totalUsers: totalUsers || 0,
  };
}

export async function getContentHealth() {
  const { data: madhaat, error } = await supabase
    .from("madha")
    .select("lyrics, madih_id, rawi_id, image_url, audio_url") as any;

  if (error) throw error;

  const total = madhaat.length;
  if (total === 0) return { lyricsPct: 0, madihPct: 0, rawiPct: 0, imagePct: 0, audioPct: 0 };

  const stats = madhaat.reduce(
    (acc, m) => {
      if (m.lyrics) acc.lyrics++;
      if (m.madih_id) acc.madih++;
      if (m.rawi_id) acc.rawi++;
      if (m.image_url) acc.image++;
      if (m.audio_url) acc.audio++;
      return acc;
    },
    { lyrics: 0, madih: 0, rawi: 0, image: 0, audio: 0 }
  );

  return {
    lyricsPct: Math.round((stats.lyrics / total) * 100),
    madihPct: Math.round((stats.madih / total) * 100),
    rawiPct: Math.round((stats.rawi / total) * 100),
    imagePct: Math.round((stats.image / total) * 100),
    audioPct: Math.round((stats.audio / total) * 100),
    totalCount: total,
  };
}

// ── Download Analytics ─────────────────────────────────────

export interface DownloadAnalytics {
  totalDownloads: number;
  uniqueTracksDownloaded: number;
  downloadsLast7Days: number;
  downloadsLast30Days: number;
  topDownloadedTracks: { trackId: string; title: string; downloadCount: number }[];
  downloadsByDevice: { device: string; count: number }[];
  dailyTrend: { date: string; count: number }[];
}

export async function getDownloadAnalytics(trendDays = 14): Promise<DownloadAnalytics> {
  // Paginated fetch of all download events
  type DownloadRow = { track_id: string; device_type: string | null; downloaded_at: string };
  const rows: DownloadRow[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("download_events")
      .select("track_id, device_type, downloaded_at")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as DownloadRow[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Trend start
  const trendStart = new Date(now);
  trendStart.setDate(now.getDate() - (trendDays - 1));
  trendStart.setHours(0, 0, 0, 0);

  let last7 = 0;
  let last30 = 0;
  const trackCounts = new Map<string, number>();
  const devices: Record<string, number> = {};
  const dailyCounts = new Map<string, number>();
  const uniqueTracks = new Set<string>();

  for (const r of rows) {
    const t = new Date(r.downloaded_at).getTime();
    if (t >= sevenDaysAgo.getTime()) last7++;
    if (t >= thirtyDaysAgo.getTime()) last30++;

    uniqueTracks.add(r.track_id);
    trackCounts.set(r.track_id, (trackCounts.get(r.track_id) || 0) + 1);

    const d = (r.device_type || "unknown").toLowerCase();
    devices[d] = (devices[d] || 0) + 1;

    if (t >= trendStart.getTime()) {
      const day = toLocalDay(r.downloaded_at);
      dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
    }
  }

  // Zero-fill daily trend
  const dailyTrend: { date: string; count: number }[] = [];
  for (let i = 0; i < trendDays; i++) {
    const d = new Date(trendStart);
    d.setDate(trendStart.getDate() + i);
    const key = d.toLocaleDateString("en-CA");
    dailyTrend.push({ date: key, count: dailyCounts.get(key) || 0 });
  }

  // Top 10 downloaded tracks
  const topTrackIds = Array.from(trackCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let topDownloadedTracks: { trackId: string; title: string; downloadCount: number }[] = [];
  if (topTrackIds.length > 0) {
    const ids = topTrackIds.map(([id]) => id);
    const { data: tracks } = await supabase
      .from("madha")
      .select("id, title")
      .in("id", ids);
    type TitleRow = { id: string; title: string };
    const titleMap = new Map(((tracks || []) as unknown as TitleRow[]).map((t) => [t.id, t.title]));
    topDownloadedTracks = topTrackIds.map(([trackId, downloadCount]) => ({
      trackId,
      title: titleMap.get(trackId) || "—",
      downloadCount,
    }));
  }

  // Device breakdown
  const downloadsByDevice = Object.entries(devices)
    .sort((a, b) => b[1] - a[1])
    .map(([device, count]) => ({ device, count }));

  return {
    totalDownloads: rows.length,
    uniqueTracksDownloaded: uniqueTracks.size,
    downloadsLast7Days: last7,
    downloadsLast30Days: last30,
    topDownloadedTracks,
    downloadsByDevice,
    dailyTrend,
  };
}
