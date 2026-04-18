/**
 * React Query hooks wrapping the Supabase query functions.
 * These replace all mock data imports throughout the app.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApprovedMadhaat,
  getApprovedMadhaatCount,
  getAllMadhaatMinimal,
  getAllMadhaatForReplace,
  getAdminMadhaat,
  getMadhaById,
  getMadhaatByIds,
  getMadhaatByMadih,
  getMadhaatByRawi,
  getMadhaatByTariqa,
  getMadhaatByFan,
  searchMadhaat,
  searchAll,
  getFeaturedMadhaat,
  getPopularMadhaat,
  getTrendingTracks,
  logPlayEvent,
  getApprovedMadiheen,
  getMadiheenWithMadhaat,
  getMadihById,
  getApprovedRuwat,
  getRuwatWithMadhaat,
  getRawiById,
  getTuruq,
  getTariqaById,
  getFunun,
  getFanById,
  getActiveCollections,
  getCollectionById,
  getCollectionItems,
  getUserFavoriteIds,
  getUserFavorites,
  toggleFavorite,
  getListeningHistory,
  addToListeningHistory,
  getHomePageData,
  createMadha,
  updateMadha,
  deleteMadhaat,
  bulkUpdateMadhaat,
  batchUpdateMadhaat,
  createCollection,
  updateCollection,
  createMadih,
  updateMadih,
  deleteMadiheen,
  createRawi,
  updateRawi,
  deleteRuwat,
  getAnalyticsSummary,
  getPlaysTrend,
  getContentHealth,
  getEngagementMetrics,
  getTrendingThisWeek,
  getTopFavorited,
  getUserActivity,
  getAdminCollections,
  getContentTypeCounts,
  getDownloadAnalytics,
} from "./queries";

import type { MadhaInsert, MadihInsert, RawiInsert, CollectionInsert } from "@/types/database";

// ============================================
// Query keys
// ============================================

export const queryKeys = {
  madhaat: ["madhaat"] as const,
  madha: (id: string) => ["madha", id] as const,
  madhaatByMadih: (id: string) => ["madhaat", "madih", id] as const,
  madhaatByRawi: (id: string) => ["madhaat", "rawi", id] as const,
  madhaatByTariqa: (id: string) => ["madhaat", "tariqa", id] as const,
  madhaatByFan: (id: string) => ["madhaat", "fan", id] as const,
  search: (query: string) => ["search", query] as const,
  featured: ["madhaat", "featured"] as const,
  popular: ["madhaat", "popular"] as const,
  trending: ["madhaat", "trending"] as const,
  madiheen: ["madiheen"] as const,
  madih: (id: string) => ["madih", id] as const,
  ruwat: ["ruwat"] as const,
  rawi: (id: string) => ["rawi", id] as const,
  turuq: ["turuq"] as const,
  tariqa: (id: string) => ["tariqa", id] as const,
  funun: ["funun"] as const,
  fan: (id: string) => ["fan", id] as const,
  collections: ["collections"] as const,
  collection: (id: string) => ["collection", id] as const,
  collectionItems: (id: string) => ["collection", id, "items"] as const,
  favoriteIds: (userId: string) => ["favorites", userId] as const,
  favorites: (userId: string) => ["favorites", userId, "full"] as const,
  listeningHistory: (userId: string) => ["history", userId] as const,
  homePageData: ["homePageData"] as const,
  analyticsSummary: ["analytics", "summary"] as const,
  playsTrend: (days: number) => ["analytics", "trends", days] as const,
  contentHealth: ["analytics", "health"] as const,
  engagementMetrics: ["analytics", "engagement"] as const,
  trendingThisWeek: (days: number, limit: number) => ["analytics", "trending", days, limit] as const,
  contentTypeDistribution: ["analytics", "contentType"] as const,
  topFavorited: (limit: number) => ["analytics", "topFavorited", limit] as const,
  userActivity: ["analytics", "userActivity"] as const,
  downloadAnalytics: ["analytics", "downloads"] as const,
};

// ============================================
// Madhaat hooks
// ============================================

export function useMadhaat(options?: {
  limit?: number;
  offset?: number;
  orderBy?: "created_at" | "title" | "play_count";
  ascending?: boolean;
}) {
  return useQuery({
    queryKey: [...queryKeys.madhaat, options],
    queryFn: () => getApprovedMadhaat(options),
  });
}

export function useMadhaatCount() {
  return useQuery({
    queryKey: [...queryKeys.madhaat, "count"],
    queryFn: getApprovedMadhaatCount,
  });
}

/** All approved tracks (minimal fields) for playlist track picker in dashboard. */
export function useAllMadhaatMinimal() {
  return useQuery({
    queryKey: [...queryKeys.madhaat, "allMinimal"],
    queryFn: getAllMadhaatMinimal,
    staleTime: 5 * 60 * 1000, // cache 5 min — rarely changes mid-session
  });
}

export function useAllMadhaatForReplace(enabled = false) {
  return useQuery({
    queryKey: [...queryKeys.madhaat, "allForReplace"],
    queryFn: getAllMadhaatForReplace,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useAdminMadhaat(options?: {
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
}) {
  return useQuery({
    queryKey: [...queryKeys.madhaat, "admin", options],
    queryFn: () => getAdminMadhaat(options),
  });
}

/** Fetch record count for each content_type — used for sidebar badges. */
export function useContentTypeCounts() {
  return useQuery({
    queryKey: [...queryKeys.madhaat, "contentTypeCounts"],
    queryFn: getContentTypeCounts,
    staleTime: 30 * 1000, // 30 s
  });
}

export function useMadha(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.madha(id!),
    queryFn: () => getMadhaById(id!),
    enabled: !!id,
  });
}

export function useMadhaatByIds(ids: string[]) {
  return useQuery({
    queryKey: ["madhaatByIds", ids],
    queryFn: () => getMadhaatByIds(ids),
    enabled: ids.length > 0,
  });
}

export function useMadhaatByMadih(madihId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.madhaatByMadih(madihId!),
    queryFn: () => getMadhaatByMadih(madihId!),
    enabled: !!madihId,
  });
}

export function useMadhaatByRawi(rawiId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.madhaatByRawi(rawiId!),
    queryFn: () => getMadhaatByRawi(rawiId!),
    enabled: !!rawiId,
  });
}

export function useMadhaatByTariqa(tariqaId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.madhaatByTariqa(tariqaId!),
    queryFn: () => getMadhaatByTariqa(tariqaId!),
    enabled: !!tariqaId,
  });
}

export function useMadhaatByFan(fanId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.madhaatByFan(fanId!),
    queryFn: () => getMadhaatByFan(fanId!),
    enabled: !!fanId,
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => searchMadhaat(query),
    enabled: query.trim().length > 0,
  });
}

export function useSearchAll(query: string) {
  return useQuery({
    queryKey: [...queryKeys.search(query), "all"],
    queryFn: () => searchAll(query),
    enabled: query.trim().length > 0,
  });
}

export function useFeaturedMadhaat() {
  return useQuery({
    queryKey: queryKeys.featured,
    queryFn: getFeaturedMadhaat,
  });
}

export function usePopularMadhaat(limit = 20) {
  return useQuery({
    queryKey: [...queryKeys.popular, limit],
    queryFn: () => getPopularMadhaat(limit),
  });
}

export function useTrendingTracks(daysWindow = 7, limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.trending, daysWindow, limit],
    queryFn: () => getTrendingTracks(daysWindow, limit),
  });
}

/** Fire-and-forget: log a play event for trending analytics. */
export function useLogPlayEvent() {
  return useMutation({
    mutationFn: (madhaId: string) => logPlayEvent(madhaId),
  });
}

// ============================================
// Madiheen hooks
// ============================================

export function useMadiheen() {
  return useQuery({
    queryKey: queryKeys.madiheen,
    queryFn: getApprovedMadiheen,
  });
}

export function useMadiheenWithMadhaat(limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.madiheen, "withMadhaat", limit],
    queryFn: () => getMadiheenWithMadhaat(limit),
  });
}

export function useMadih(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.madih(id!),
    queryFn: () => getMadihById(id!),
    enabled: !!id,
  });
}

// ============================================
// Ruwat hooks
// ============================================

export function useRuwat() {
  return useQuery({
    queryKey: queryKeys.ruwat,
    queryFn: getApprovedRuwat,
  });
}

export function useRuwatWithMadhaat(limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.ruwat, "withMadhaat", limit],
    queryFn: () => getRuwatWithMadhaat(limit),
  });
}

export function useRawi(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.rawi(id!),
    queryFn: () => getRawiById(id!),
    enabled: !!id,
  });
}

// ============================================
// Turuq hooks
// ============================================

export function useTuruq() {
  return useQuery({
    queryKey: queryKeys.turuq,
    queryFn: getTuruq,
  });
}

export function useTariqa(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tariqa(id!),
    queryFn: () => getTariqaById(id!),
    enabled: !!id,
  });
}

// ============================================
// Funun hooks
// ============================================

export function useFunun() {
  return useQuery({
    queryKey: queryKeys.funun,
    queryFn: getFunun,
  });
}

export function useFan(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.fan(id!),
    queryFn: () => getFanById(id!),
    enabled: !!id,
  });
}

// ============================================
// Collections hooks
// ============================================

export function useCollections() {
  return useQuery({
    queryKey: queryKeys.collections,
    queryFn: getActiveCollections,
  });
}

export function useAdminCollections() {
  return useQuery({
    queryKey: [...queryKeys.collections, "admin"],
    queryFn: getAdminCollections,
  });
}

export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.collection(id!),
    queryFn: () => getCollectionById(id!),
    enabled: !!id,
  });
}

export function useCollectionItems(collectionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.collectionItems(collectionId!),
    queryFn: () => getCollectionItems(collectionId!),
    enabled: !!collectionId,
  });
}

// ============================================
// Favorites hooks
// ============================================

export function useFavoriteIds(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.favoriteIds(userId!),
    queryFn: () => getUserFavoriteIds(userId!),
    enabled: !!userId,
  });
}

export function useFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.favorites(userId!),
    queryFn: () => getUserFavorites(userId!),
    enabled: !!userId,
  });
}

export function useToggleFavorite(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (madhaId: string) => toggleFavorite(userId!, madhaId),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.favoriteIds(userId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.favorites(userId),
        });
      }
    },
  });
}

// ============================================
// Listening History hooks
// ============================================

export function useListeningHistory(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.listeningHistory(userId!),
    queryFn: () => getListeningHistory(userId!),
    enabled: !!userId,
  });
}

export function useAddToListeningHistory(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (madhaId: string) => addToListeningHistory(userId!, madhaId),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.listeningHistory(userId),
        });
      }
    },
  });
}

// ============================================
// Home page hook
// ============================================

export function useHomePageData() {
  return useQuery({
    queryKey: queryKeys.homePageData,
    queryFn: getHomePageData,
  });
}

// ============================================
// Dashboard Admin Mutation Hooks
// ============================================

export function useCreateMadha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MadhaInsert> & { madih_name?: string }) => createMadha(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.madhaat });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

export function useUpdateMadha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MadhaInsert> }) =>
      updateMadha(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.madhaat });
      // Invalidate specific madha and home page data just in case
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

export function useDeleteMadhaat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteMadhaat(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.madhaat });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

export function useBulkUpdateMadhaat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, field, value }: { ids: string[]; field: keyof MadhaInsert; value: any }) =>
      bulkUpdateMadhaat(ids, field, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.madhaat });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

export function useBatchUpdateMadhaat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { id: string; changes: Partial<MadhaInsert> }[]) =>
      batchUpdateMadhaat(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.madhaat });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      collection,
      trackIds,
    }: {
      collection: Partial<CollectionInsert>;
      trackIds: string[];
    }) => createCollection(collection, trackIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates, trackIds }: { id: string; updates: Partial<CollectionInsert>; trackIds?: string[] }) =>
      updateCollection(id, updates, trackIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

// ============================================
// Madiheen Admin Mutation Hooks
// ============================================

export function useCreateMadih() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MadihInsert>) => createMadih(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.madiheen });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

export function useUpdateMadih() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MadihInsert> }) =>
      updateMadih(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.madiheen });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

export function useDeleteMadiheen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteMadiheen(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.madiheen });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

// ============================================
// Ruwat Admin Mutation Hooks
// ============================================

export function useCreateRawi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RawiInsert>) => createRawi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ruwat });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

export function useUpdateRawi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<RawiInsert> }) =>
      updateRawi(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ruwat });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

export function useDeleteRuwat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteRuwat(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ruwat });
      queryClient.invalidateQueries({ queryKey: queryKeys.homePageData });
    },
  });
}

// ============================================
// Analytics Hooks
// ============================================

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: queryKeys.analyticsSummary,
    queryFn: getAnalyticsSummary,
    staleTime: 5 * 60 * 1000, // fresh for 5 min — no refetch on remount
    gcTime: 30 * 60 * 1000, // keep in cache 30 min — survives tab switches
    refetchOnWindowFocus: false, // don't refetch just because user switched tabs
    refetchOnMount: false, // don't refetch if data is still fresh
  });
}

export function usePlaysTrend(days = 14) {
  return useQuery({
    queryKey: queryKeys.playsTrend(days),
    queryFn: () => getPlaysTrend(days),
    staleTime: 5 * 60 * 1000, // fresh for 5 min — no refetch on remount
    gcTime: 30 * 60 * 1000, // keep in cache 30 min — survives tab switches
    refetchOnWindowFocus: false, // don't refetch just because user switched tabs
    refetchOnMount: false, // don't refetch if data is still fresh
  });
}

export function useContentHealth() {
  return useQuery({
    queryKey: queryKeys.contentHealth,
    queryFn: getContentHealth,
    staleTime: 5 * 60 * 1000, // fresh for 5 min — no refetch on remount
    gcTime: 30 * 60 * 1000, // keep in cache 30 min — survives tab switches
    refetchOnWindowFocus: false, // don't refetch just because user switched tabs
    refetchOnMount: false, // don't refetch if data is still fresh
  });
}

export function useEngagementMetrics() {
  return useQuery({
    queryKey: queryKeys.engagementMetrics,
    queryFn: getEngagementMetrics,
    staleTime: 5 * 60 * 1000, // fresh for 5 min — no refetch on remount
    gcTime: 30 * 60 * 1000, // keep in cache 30 min — survives tab switches
    refetchOnWindowFocus: false, // don't refetch just because user switched tabs
    refetchOnMount: false, // don't refetch if data is still fresh
  });
}

export function useTrendingThisWeek(days = 7, limit = 5) {
  return useQuery({
    queryKey: queryKeys.trendingThisWeek(days, limit),
    queryFn: () => getTrendingThisWeek(days, limit),
    staleTime: 5 * 60 * 1000, // fresh for 5 min — no refetch on remount
    gcTime: 30 * 60 * 1000, // keep in cache 30 min — survives tab switches
    refetchOnWindowFocus: false, // don't refetch just because user switched tabs
    refetchOnMount: false, // don't refetch if data is still fresh
  });
}

export function useContentTypeDistribution() {
  return useQuery({
    queryKey: queryKeys.contentTypeDistribution,
    queryFn: getContentTypeCounts,
    staleTime: 5 * 60 * 1000, // fresh for 5 min — no refetch on remount
    gcTime: 30 * 60 * 1000, // keep in cache 30 min — survives tab switches
    refetchOnWindowFocus: false, // don't refetch just because user switched tabs
    refetchOnMount: false, // don't refetch if data is still fresh
  });
}

export function useTopFavorited(limit = 5) {
  return useQuery({
    queryKey: queryKeys.topFavorited(limit),
    queryFn: () => getTopFavorited(limit),
    staleTime: 5 * 60 * 1000, // fresh for 5 min — no refetch on remount
    gcTime: 30 * 60 * 1000, // keep in cache 30 min — survives tab switches
    refetchOnWindowFocus: false, // don't refetch just because user switched tabs
    refetchOnMount: false, // don't refetch if data is still fresh
  });
}

export function useUserActivity() {
  return useQuery({
    queryKey: queryKeys.userActivity,
    queryFn: getUserActivity,
    staleTime: 5 * 60 * 1000, // fresh for 5 min — no refetch on remount
    gcTime: 30 * 60 * 1000, // keep in cache 30 min — survives tab switches
    refetchOnWindowFocus: false, // don't refetch just because user switched tabs
    refetchOnMount: false, // don't refetch if data is still fresh
  });
}

export function useDownloadAnalytics() {
  return useQuery({
    queryKey: queryKeys.downloadAnalytics,
    queryFn: () => getDownloadAnalytics(14),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
