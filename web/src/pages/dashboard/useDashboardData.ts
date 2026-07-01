import {
  useMadiheen,
  useRuwat,
  useTuruq,
  useFunun,
  useCreateMadha,
  useUpdateMadha,
  useUpsertTrackCuration,
  useBulkUpsertTrackCuration,
  useDeleteMadhaat,
  useBulkUpdateMadhaat,
  useBatchUpdateMadhaat,
  useAllMadhaatForReplace,
  useCreateCollection,
  useUpdateCollection,
  useCreateMadih,
  useUpdateMadih,
  useDeleteMadiheen,
  useCreateRawi,
  useUpdateRawi,
  useDeleteRuwat,
  useAdminMadhaat,
  useAdminCollections,
  useAllMadhaatMinimal,
  useContentTypeCounts,
} from "@/lib/api/hooks";
import {
  ITEMS_PER_PAGE,
  ExtendedTrack,
  ExtendedPlaylist,
  mapTrackRowToExtended,
} from "./dashboard-types";

interface Params {
  currentPage: number;
  searchQuery: string;
  filterArtist: string;
  filterNarrator: string;
  filterLyricsStatus: string;
  filterAudioQuality: string;
  activeContentType: string;
  sortBy: "created_at" | "play_count";
  sortAscending: boolean;
  isFindReplaceOpen: boolean;
}

export function useDashboardData({
  currentPage,
  searchQuery,
  filterArtist,
  filterNarrator,
  filterLyricsStatus,
  filterAudioQuality,
  activeContentType,
  sortBy,
  sortAscending,
  isFindReplaceOpen,
}: Params) {
  const { data: adminData } = useAdminMadhaat({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    searchQuery,
    artistId: filterArtist,
    narratorId: filterNarrator,
    lyricsStatus: filterLyricsStatus,
    audioQuality: filterAudioQuality,
    contentType: activeContentType,
    sortBy,
    sortAscending,
  });

  const fetchedTracks = adminData?.data || [];
  const totalTracksCount = adminData?.count || 0;

  const { data: fetchedArtists } = useMadiheen();
  const { data: fetchedNarrators } = useRuwat();
  const { data: fetchedPlaylists } = useAdminCollections();
  const { data: fetchedTariqas } = useTuruq();
  const { data: fetchedFunun } = useFunun();
  const { data: contentTypeCounts } = useContentTypeCounts();
  const { data: allMinimalTracks } = useAllMadhaatMinimal();
  const { data: allTracksForReplace, isLoading: isLoadingAllTracks } =
    useAllMadhaatForReplace(isFindReplaceOpen);

  const createMadhaMutation = useCreateMadha();
  const updateMadhaMutation = useUpdateMadha();
  const upsertCurationMutation = useUpsertTrackCuration();
  const bulkUpsertCurationMutation = useBulkUpsertTrackCuration();
  const deleteMadhaatMutation = useDeleteMadhaat();
  const bulkUpdateMadhaatMutation = useBulkUpdateMadhaat();
  const batchUpdateMutation = useBatchUpdateMadhaat();
  const createCollectionMutation = useCreateCollection();
  const updateCollectionMutation = useUpdateCollection();
  const createMadihMutation = useCreateMadih();
  const updateMadihMutation = useUpdateMadih();
  const deleteMadiheenMutation = useDeleteMadiheen();
  const createRawiMutation = useCreateRawi();
  const updateRawiMutation = useUpdateRawi();
  const deleteRuwatMutation = useDeleteRuwat();

  const artists = (fetchedArtists || []).map((a) => ({
    id: a.id,
    name: a.name,
    role: "مادح",
    image: a.image_url || "",
    trackCount: (a as any).track_count || 0,
  }));

  const narrators = (fetchedNarrators || []).map((n) => ({
    id: n.id,
    name: n.name,
    role: "راوي",
    image: n.image_url || "",
    trackCount: (n as any).track_count || 0,
  }));

  const tariqas = (fetchedTariqas || []).map((t) => ({
    id: t.id,
    name: t.name,
    image: "",
    description: t.description || "",
  }));

  const funoon = (fetchedFunun || []).map((f) => ({
    id: f.id,
    name: f.name,
    image: "",
    description: f.description || "",
  }));

  const madhat: ExtendedTrack[] = fetchedTracks.map((t) => {
    const mapped = mapTrackRowToExtended(t);
    const artist = artists.find((a) => a.id === t.artist_id);
    return {
      ...mapped,
      thumbnail: t.image_url || artist?.image || "/placeholder.svg",
    };
  });

  const playlistsList: ExtendedPlaylist[] = (fetchedPlaylists || []).map((p: any, i: number) => ({
    id: p.id,
    title: p.name,
    desc: p.description || "",
    image: p.image_url || "",
    // Sort by position before mapping — Supabase's foreign-table .order()
    // is best-effort, so we belt-and-braces it client-side too.
    trackIds: ([...(p.collection_items || [])] as { track_id: string; position?: number }[])
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((ci) => ci.track_id),
    isActive: p.is_active ?? true,
    order: p.display_order ?? i,
  }));

  return {
    fetchedTracks,
    totalTracksCount,
    fetchedArtists,
    fetchedNarrators,
    fetchedPlaylists,
    artists,
    narrators,
    tariqas,
    funoon,
    madhat,
    playlistsList,
    contentTypeCounts,
    allMinimalTracks,
    allTracksForReplace,
    isLoadingAllTracks,
    mutations: {
      createMadhaMutation,
      updateMadhaMutation,
      upsertCurationMutation,
      bulkUpsertCurationMutation,
      deleteMadhaatMutation,
      bulkUpdateMadhaatMutation,
      batchUpdateMutation,
      createCollectionMutation,
      updateCollectionMutation,
      createMadihMutation,
      updateMadihMutation,
      deleteMadiheenMutation,
      createRawiMutation,
      updateRawiMutation,
      deleteRuwatMutation,
    },
  };
}
