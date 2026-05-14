import { useMemo, useState } from "react";
import type { Playlist, ExtendedPlaylist, MappedArtist, MappedNarrator } from "./dashboard-types";

type ToastFn = (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

interface MinimalTrack {
  id: string;
  title: string;
  madih_id?: string | null;
  madih?: string | null;
  rawi_id?: string | null;
}

interface Params {
  playlistsList: ExtendedPlaylist[];
  artists: MappedArtist[];
  narrators: MappedNarrator[];
  allMinimalTracks: MinimalTrack[] | undefined;
  editingPlaylist: ExtendedPlaylist | null;
  setEditingPlaylist: React.Dispatch<React.SetStateAction<ExtendedPlaylist | null>>;
  setIsPlaylistDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  createCollectionMutation: any;
  updateCollectionMutation: any;
  toast: ToastFn;
}

/**
 * Bundles playlist editor state: the "new playlist" form, picker filtering,
 * drag-to-reorder, active toggle, and save/create mutations.
 */
export function usePlaylistEditor({
  playlistsList,
  artists,
  narrators,
  allMinimalTracks,
  editingPlaylist,
  setEditingPlaylist,
  setIsPlaylistDialogOpen,
  createCollectionMutation,
  updateCollectionMutation,
  toast,
}: Params) {
  const [newPlaylist, setNewPlaylist] = useState<Partial<Playlist & { selectedTrackIds: string[] }>>({});
  const [playlistTrackSearch, setPlaylistTrackSearch] = useState("");
  const [playlistArtistFilter, setPlaylistArtistFilter] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const artistNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of artists) map[a.id] = a.name;
    return map;
  }, [artists]);

  const narratorNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const n of narrators) map[n.id] = n.name;
    return map;
  }, [narrators]);

  // Full mapped track list (unfiltered) — used by the sortable picker to
  // render rows from currently-selected ids even when filters hide them.
  const playlistAllTracks = useMemo(
    () =>
      (allMinimalTracks || []).map((t) => ({
        id: t.id,
        title: t.title,
        artistName: (t.madih_id && artistNameMap[t.madih_id]) || t.madih || "",
        narratorName: (t.rawi_id && narratorNameMap[t.rawi_id]) || "",
        madihId: t.madih_id || "",
      })),
    [allMinimalTracks, artistNameMap, narratorNameMap],
  );

  const playlistPickerTracks = useMemo(() => {
    let filtered = playlistAllTracks;
    if (playlistArtistFilter) {
      filtered = filtered.filter((t) => t.madihId === playlistArtistFilter);
    }
    if (playlistTrackSearch.trim()) {
      const q = playlistTrackSearch.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artistName.toLowerCase().includes(q) ||
          t.narratorName.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [playlistAllTracks, playlistTrackSearch, playlistArtistFilter]);

  const sortedPlaylists = [...playlistsList].sort((a, b) => a.order - b.order);

  const handleAddPlaylist = () => {
    if (!newPlaylist.title) {
      toast({ title: "خطأ", description: "يجب إدخال اسم القائمة", variant: "destructive" });
      return;
    }
    const playlistName = newPlaylist.title;
    createCollectionMutation.mutate(
      {
        collection: {
          name: playlistName,
          description: newPlaylist.desc || null,
          image_url: newPlaylist.image || null,
          is_active: true,
          display_order: playlistsList.length,
        },
        trackIds: newPlaylist.selectedTrackIds || [],
      },
      {
        onSuccess: () => {
          setNewPlaylist({});
          setIsPlaylistDialogOpen(false);
          toast({ title: "تم الإنشاء", description: `تم إنشاء قائمة "${playlistName}" بنجاح` });
        },
        onError: (err: Error) => {
          toast({ title: "خطأ في الإنشاء", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  const handleSavePlaylist = () => {
    if (!editingPlaylist) return;
    updateCollectionMutation.mutate(
      {
        id: editingPlaylist.id,
        trackIds: editingPlaylist.trackIds,
        updates: {
          name: editingPlaylist.title,
          description: editingPlaylist.desc || null,
          image_url: editingPlaylist.image || null,
        },
      },
      {
        onSuccess: () => {
          setEditingPlaylist(null);
          toast({ title: "تم الحفظ", description: "تم تحديث القائمة بنجاح" });
        },
        onError: (err: Error) => {
          toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  const togglePlaylistActive = (id: string) => {
    const pl = playlistsList.find((p) => p.id === id);
    if (!pl) return;
    updateCollectionMutation.mutate({ id, updates: { is_active: !pl.isActive } });
  };

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const sorted = [...playlistsList].sort((a, b) => a.order - b.order);
    const dragIndex = sorted.findIndex((p) => p.id === draggedId);
    const targetIndex = sorted.findIndex((p) => p.id === targetId);
    const [moved] = sorted.splice(dragIndex, 1);
    sorted.splice(targetIndex, 0, moved);

    sorted.forEach((p, i) => {
      if (p.order !== i) {
        updateCollectionMutation.mutate({ id: p.id, updates: { display_order: i } });
      }
    });

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return {
    newPlaylist,
    setNewPlaylist,
    playlistTrackSearch,
    setPlaylistTrackSearch,
    playlistArtistFilter,
    setPlaylistArtistFilter,
    playlistAllTracks,
    playlistPickerTracks,
    sortedPlaylists,
    dragOverId,
    draggedId,
    handleAddPlaylist,
    handleSavePlaylist,
    togglePlaylistActive,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
