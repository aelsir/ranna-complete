/**
 * Client-side recorder for lyrics-view events.
 *
 * Fires-and-forgets a Supabase RPC when the user opens the lyrics
 * surface on a track. Errors are swallowed — a tracking failure must
 * never break the player or the lyrics UI.
 *
 * See migration 046 for the `record_lyrics_view` RPC + `lyrics_views`
 * table.
 */

import { supabase } from "./_shared";

const DEVICE_TYPE = "web";

/** Light client-side dedupe — if the same (track, play) pair fires
 *  within the same 5-second window we treat it as one event. Useful
 *  for React rebuilds that toggle lyrics on remount. */
const recentKeys = new Map<string, number>();
const DEDUPE_WINDOW_MS = 5_000;

export async function recordLyricsView(opts: {
  trackId: string;
  playId?: string | null;
}): Promise<void> {
  if (!opts.trackId) return;

  const key = `${opts.trackId}:${opts.playId ?? "null"}`;
  const now = Date.now();
  const lastSeen = recentKeys.get(key);
  if (lastSeen !== undefined && now - lastSeen < DEDUPE_WINDOW_MS) return;
  recentKeys.set(key, now);
  // Cheap GC — keep the map from growing forever on long sessions.
  if (recentKeys.size > 256) {
    for (const [k, t] of recentKeys) {
      if (now - t > DEDUPE_WINDOW_MS) recentKeys.delete(k);
    }
  }

  try {
    await supabase.rpc("record_lyrics_view", {
      p_track_id: opts.trackId,
      p_play_id: opts.playId ?? null,
      p_device_type: DEVICE_TYPE,
    });
  } catch (err) {
    // Tracking is best-effort. Log to console for debugging but don't
    // surface to the user.
    if (typeof console !== "undefined") {
      console.warn("[lyrics_views] record failed", err);
    }
  }
}
