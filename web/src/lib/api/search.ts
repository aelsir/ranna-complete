/**
 * Unified Arabic-aware search across tracks (by title), lyrics, artists,
 * and narrators. The heavy lifting (Arabic normalization, ranking) happens
 * server-side in the `search_all` RPC; this module just types the shape
 * and exposes a thin convenience wrapper.
 */

import type { Madha, MadhaWithRelations, Madih, Rawi } from "@/types/database";

import { supabase } from "./_shared";

/** All four buckets the search RPC returns. */
export interface SearchAllResult {
  tracks: MadhaWithRelations[];
  lyrics: MadhaWithRelations[];
  artists: (Madih & { track_count: number })[];
  narrators: (Rawi & { track_count: number })[];
}

/** Empty-string queries short-circuit to an empty bucket set without a
 *  network call — the search box fires this on every keystroke. */
export async function searchAll(query: string): Promise<SearchAllResult> {
  const empty: SearchAllResult = {
    tracks: [],
    lyrics: [],
    artists: [],
    narrators: [],
  };
  if (!query.trim()) return empty;

  const { data, error } = await supabase.rpc("search_all", {
    p_query: query,
    p_limit: 30,
  });

  if (error) throw error;
  if (!data) return empty;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as any;
  return {
    tracks: (result.tracks || []) as MadhaWithRelations[],
    lyrics: (result.lyrics || []) as MadhaWithRelations[],
    artists: (result.artists || []) as (Madih & { track_count: number })[],
    narrators: (result.narrators || []) as (Rawi & { track_count: number })[],
  };
}

/**
 * Legacy wrapper — returns all matching tracks (title + lyrics combined).
 * Pre-dates the four-bucket structure; kept for back-compat with older
 * callers. New code should use `searchAll` directly.
 */
export async function searchMadhaat(query: string): Promise<Madha[]> {
  const result = await searchAll(query);
  return [...result.tracks, ...result.lyrics];
}
