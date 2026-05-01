/**
 * Home page aggregated data — single RPC + two small reference fetches
 * (turuq, funun aren't in the RPC payload).
 */

import type {
  Collection,
  Fan,
  MadhaWithRelations,
  Madih,
  Rawi,
  Tariqa,
} from "@/types/database";

import { getFunun, getTuruq } from "./categories";
import { supabase } from "./_shared";

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

/**
 * Bundle of everything the home page renders: trending, recent, top
 * artists, top narrators, sufi orders, music styles, and curated
 * collections. One server-side RPC call (`get_home_data`) for the bulk;
 * turuq + funun in parallel since they aren't part of the RPC payload.
 */
export async function getHomePageData(): Promise<HomePageData> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_home_data",
    { p_limit: 20 }
  );

  if (rpcError) throw rpcError;

  const [turuq, funun] = await Promise.all([getTuruq(), getFunun()]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const homeData = rpcData as any;

  return {
    totalTracks: homeData?.total_tracks || 0,
    recentMadhaat: (homeData?.recent || []) as MadhaWithRelations[],
    popularMadhaat: (homeData?.trending || []) as MadhaWithRelations[],
    madiheen: (homeData?.artists || []) as (Madih & {
      track_count: number;
    })[],
    ruwat: (homeData?.narrators || []) as (Rawi & {
      track_count: number;
    })[],
    turuq,
    funun,
    collections: (homeData?.collections || []) as Collection[],
  };
}
