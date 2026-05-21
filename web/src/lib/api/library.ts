/**
 * Per-user library: favorited tracks, listening history, and the
 * `recordPlay` write that drives both. Anything that's "what THIS user has
 * done with the catalog" lives here.
 *
 * All functions require an authenticated `userId` (passed in by callers
 * since we don't want this file to know about React contexts).
 */

import type { MadhaWithRelations } from "@/types/database";

import { supabase } from "./_shared";

// ============================================================================
// Favorites
// ============================================================================

export async function getUserFavoriteIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("track_id")
    .eq("user_id", userId);

  if (error) throw error;
  return data?.map((f) => f.track_id) || [];
}

/**
 * Hydrates favorite track IDs into full `v_tracks` rows. Two-step (id
 * fetch → join fetch) so the result preserves the favorites' insertion
 * order — `IN()` filters don't promise an ordering.
 */
export async function getUserFavorites(
  userId: string
): Promise<MadhaWithRelations[]> {
  const ids = await getUserFavoriteIds(userId);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("v_tracks")
    .select("*")
    .in("id", ids);

  if (error) throw error;

  const byId = new Map(
    (data || []).map((d: { id: string }) => [d.id, d])
  );
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean) as unknown as MadhaWithRelations[];
}

/**
 * Toggle a single favorite. Returns the new state — `true` if the user
 * just favorited, `false` if they just unfavorited.
 */
export async function toggleFavorite(
  userId: string,
  madhaId: string
): Promise<boolean> {
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
    return false;
  } else {
    const { error } = await supabase
      .from("user_favorites")
      .insert({ user_id: userId, track_id: madhaId });
    if (error) throw error;
    return true;
  }
}

// ============================================================================
// Listening history (deduped per track)
// ============================================================================

const MAX_HISTORY_ITEMS = 10;

/**
 * Last 10 distinct tracks the user listened to. Reads from
 * `v_recent_listens` which dedupes per track (replaying the same track
 * three times shows once with the most-recent timestamp).
 */
export async function getListeningHistory(
  userId: string
): Promise<MadhaWithRelations[]> {
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

  const byId = new Map(
    (data || []).map((d: { id: string }) => [d.id, d])
  );
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean) as unknown as MadhaWithRelations[];
}

// ============================================================================
// Play recording (writes to user_plays + bumps tracks.play_count)
// ============================================================================

/**
 * Record a single play event. tracks.play_count is auto-incremented by
 * the user_plays_increment_play_count trigger (migration 047) which also
 * excludes internal users.
 */
export async function recordPlay(params: {
  /** Optional client-generated UUID for the user_plays row. Pass it so
   *  related event tables (lyrics_views.play_id) can link to this play
   *  before the row is even written. */
  id?: string;
  userId?: string;
  madhaId: string;
  durationSeconds?: number;
  completed?: boolean;
  deviceType?: string;
  /** ISO 8601. Defaults to NOW() on insert. Pass the play-session start
   *  so the row reflects when the user actually pressed play, not when
   *  the record write finally completed. */
  playedAt?: string;
}): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: params.userId || null,
    track_id: params.madhaId,
    duration_seconds: params.durationSeconds,
    completed: params.completed || false,
    device_type: params.deviceType,
  };
  if (params.id) row.id = params.id;
  if (params.playedAt) row.played_at = params.playedAt;

  const { error } = await supabase.from("user_plays").insert(row);
  if (error) throw error;
}
