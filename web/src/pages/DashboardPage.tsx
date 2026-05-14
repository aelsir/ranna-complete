import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PendingEdits } from "@/types/bulk-edit";
import type { Madih, MadihInsert, Rawi, RawiInsert } from "@/types/database";
import { useDashboardData } from "./dashboard/useDashboardData";
import { useTrackDraftPersistence } from "./dashboard/useTrackDraftPersistence";
import { useTrackMutations } from "./dashboard/useTrackMutations";
import { usePlaylistEditor } from "./dashboard/usePlaylistEditor";
import { DashboardContentArea } from "./dashboard/DashboardContentArea";
import { DashboardDialogs } from "./dashboard/DashboardDialogs";
import { uploadToR2 } from "@/lib/upload";
import { DashboardLogin } from "./dashboard/DashboardLogin";
import { DashboardUnauthorized } from "./dashboard/DashboardUnauthorized";
import { DashboardSidebar } from "./dashboard/DashboardSidebar";
import { DashboardHeader } from "./dashboard/DashboardHeader";

import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import {
  SidebarItem,
  SECTION_CONTENT_TYPE,
  SECTION_LABELS,
  ExtendedTrack,
  ExtendedPlaylist,
  ITEMS_PER_PAGE,
  CropTarget,
  AudioUploadTarget,
} from "./dashboard/dashboard-types";


const DashboardPage = () => {
  const { user, isAnonymous, isAdmin, loading: authLoading, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Anon or no session at all → show the login form.
  if (!user || isAnonymous) {
    return <DashboardLogin />;
  }

  // Signed-in but not an admin → show "not authorized" rather than leaking UI.
  if (!isAdmin) {
    return <DashboardUnauthorized signOut={signOut} />;
  }

  return <DashboardContent signOut={signOut} />;
};

const DashboardContent = ({ signOut }: { signOut: () => Promise<void> }) => {
  const [activeSection, setActiveSection] = useState<SidebarItem>("madhat");
  const isContentSection = activeSection in SECTION_CONTENT_TYPE;
  const sectionLabels = SECTION_LABELS[activeSection];
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Advanced filters
  const [filterArtist, setFilterArtist] = useState<string>("");
  const [filterNarrator, setFilterNarrator] = useState<string>("");
  const [filterTariqa, setFilterTariqa] = useState<string>("");
  const [filterDateRange, setFilterDateRange] = useState<string>("");
  const [filterPlayCount, setFilterPlayCount] = useState<string>("");
  const [sortBy, setSortBy] = useState<"created_at" | "play_count">("created_at");
  const [sortAscending, setSortAscending] = useState(false);

  // Determine content_type filter from active section
  const activeContentType = SECTION_CONTENT_TYPE[activeSection] || "";

  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);

  const {
    fetchedTracks,
    totalTracksCount,
    fetchedArtists,
    fetchedNarrators,
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
  } = useDashboardData({
    currentPage,
    searchQuery,
    filterArtist,
    filterNarrator,
    activeContentType,
    sortBy,
    sortAscending,
    isFindReplaceOpen,
  });

  const { toast } = useToast();
  const { nowPlayingId, playTrack } = usePlayer();
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [editingTrack, setEditingTrack] = useState<ExtendedTrack | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<ExtendedPlaylist | null>(null);
  const [bulkEditField, setBulkEditField] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<PendingEdits>(new Map());
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "tracks" | "madiheen" | "ruwat" } | null>(null);

  const { newTrack, setNewTrack, clearDraft } = useTrackDraftPersistence(isAddDialogOpen);

  // Madiheen & Ruwat state
  const [editingMadih, setEditingMadih] = useState<Madih | null>(null);
  const [isAddMadihDialogOpen, setIsAddMadihDialogOpen] = useState(false);
  const [newMadih, setNewMadih] = useState<Partial<MadihInsert>>({});
  const [selectedMadiheen, setSelectedMadiheen] = useState<Set<string>>(new Set());

  const [editingRawi, setEditingRawi] = useState<Rawi | null>(null);
  const [isAddRawiDialogOpen, setIsAddRawiDialogOpen] = useState(false);
  const [newRawi, setNewRawi] = useState<Partial<RawiInsert>>({});
  const [selectedRuwat, setSelectedRuwat] = useState<Set<string>>(new Set());

  // Image crop & upload state
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio upload state
  const [audioUploadTarget, setAudioUploadTarget] = useState<AudioUploadTarget | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Custom double-click detection for right button (since standard dblclick only filters left)
  const lastRightClickRef = useRef<{ id: string; time: number }>({ id: "", time: 0 });
  const handleRightClickDetect = (e: React.MouseEvent, id: string, callback: () => void) => {
    const now = Date.now();
    const isDouble = lastRightClickRef.current.id === id && now - lastRightClickRef.current.time < 300;
    lastRightClickRef.current = { id, time: now };
    if (isDouble) {
      e.preventDefault();
      e.stopPropagation();
      callback();
    }
  };

  // Clipboard paste handler for image thumbnails
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let hasImage = false;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        hasImage = true;
        break;
      }
    }
    
    // If it's not an image, let the browser handle it normally (e.g. text in an input)
    if (!hasImage) return;

    // Determine target based on currently open dialogs first
    let targetAction: CropTarget | null = null;
    let toastDesc = "";

    if (isAddDialogOpen) {
      targetAction = "addTrack";
      toastDesc = "كصورة للملف الجديد";
    } else if (editingTrack) {
      targetAction = "editTrack";
      toastDesc = "كصورة للملف الحالي";
    } else if (isAddMadihDialogOpen) {
      targetAction = "addMadih";
      toastDesc = "كصورة للمادح الجديد";
    } else if (editingMadih) {
      targetAction = "editMadih";
      toastDesc = "كصورة للمادح الحالي";
    } else if (isAddRawiDialogOpen) {
      targetAction = "addRawi";
      toastDesc = "كصورة للراوي الجديد";
    } else if (editingRawi) {
      targetAction = "editRawi";
      toastDesc = "كصورة للراوي الحالي";
    } else if (isPlaylistDialogOpen) {
      targetAction = "playlist";
      toastDesc = "كصورة للقائمة الجديدة";
    } else if (editingPlaylist) {
      targetAction = "editPlaylist";
      toastDesc = "كصورة للقائمة الحالية";
    } 
    // Fallback to bulk selection overrides
    else if (isContentSection && selectedTracks.size > 0) {
      targetAction = "pasteTrack";
      toastDesc = `سيتم تطبيقها على ${selectedTracks.size} ملف محدد`;
    } else if (activeSection === "madiheen" && selectedMadiheen.size > 0) {
      targetAction = "pasteMadih";
      toastDesc = `سيتم تطبيقها على ${selectedMadiheen.size} مادح محدد`;
    } else if (activeSection === "ruwat" && selectedRuwat.size > 0) {
      targetAction = "pasteRawi";
      toastDesc = `سيتم تطبيقها على ${selectedRuwat.size} راوي محدد`;
    }

    if (!targetAction) return;

    // Prevent default so the image doesn't get pasted into the input field text box directly
    e.preventDefault();

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setCropTarget(targetAction);
        toast({ title: "تم التقاط الصورة", description: toastDesc });
        setCropImageSrc(url);
        return;
      }
    }
  }, [
    isAddDialogOpen, editingTrack, 
    isAddMadihDialogOpen, editingMadih, 
    isAddRawiDialogOpen, editingRawi, 
    isPlaylistDialogOpen, editingPlaylist, 
    isContentSection, activeSection, 
    selectedTracks, selectedMadiheen, selectedRuwat, 
    toast
  ]);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const activeFilterCount = [filterArtist, filterNarrator, filterTariqa, filterDateRange, filterPlayCount].filter(Boolean).length;

  const filteredMadhatServerSide = madhat;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalTracksCount / ITEMS_PER_PAGE));
  const paginatedMadhat = filteredMadhatServerSide;

  const toggleSelect = (id: string) => {
    setSelectedTracks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedTracks.size === paginatedMadhat.length) {
      setSelectedTracks(new Set());
    } else {
      setSelectedTracks(new Set(paginatedMadhat.map((t) => t.id)));
    }
  };

  const {
    handleSaveTrack,
    handleAddTrack,
    handleDeleteSelected,
    confirmDelete,
    getDeleteDescription,
    handleEditChange,
    handleBatchSave,
    handleInlineEditSave,
    handleCancelEditMode,
    handleBulkUpdate,
  } = useTrackMutations({
    selectedTracks,
    setSelectedTracks,
    selectedMadiheen,
    setSelectedMadiheen,
    selectedRuwat,
    setSelectedRuwat,
    editingTrack,
    setEditingTrack,
    newTrack,
    setNewTrack,
    clearDraft,
    setIsAddDialogOpen,
    setBulkEditField,
    deleteConfirm,
    setDeleteConfirm,
    isEditMode,
    setIsEditMode,
    pendingEdits,
    setPendingEdits,
    activeSection,
    artists,
    narrators,
    tariqas,
    funoon,
    fetchedTracks,
    createMadhaMutation,
    updateMadhaMutation,
    deleteMadhaatMutation,
    bulkUpdateMadhaatMutation,
    batchUpdateMutation,
    deleteMadiheenMutation,
    deleteRuwatMutation,
    toast,
  });

  const {
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
  } = usePlaylistEditor({
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
  });

  const openImagePicker = (target: CropTarget) => {
    setCropTarget(target);
    fileInputRef.current?.click();
  };

  const openAudioPicker = (target: AudioUploadTarget) => {
    setAudioUploadTarget(target);
    audioFileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleAudioFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setAudioUploading(true);
    try {
      const customTitle = audioUploadTarget === "addTrack" ? newTrack.title : editingTrack?.title;
      // We pass the targetContentType artificially just for the file prefix logic inside upload.ts
      const targetContentType = audioUploadTarget === "addTrack" ? newTrack.contentType || "madha" : editingTrack?.content_type || "madha";
      const { path } = await uploadToR2(file, `audios`, customTitle, targetContentType);

      // Try to detect duration from audio file
      let detectedDuration: string | undefined;
      try {
        const audioUrl = URL.createObjectURL(file);
        const audio = new Audio(audioUrl);
        await new Promise<void>((resolve) => {
          audio.addEventListener("loadedmetadata", () => {
            if (audio.duration && isFinite(audio.duration)) {
              const mins = Math.floor(audio.duration / 60);
              const secs = Math.floor(audio.duration % 60);
              detectedDuration = `${mins}:${secs.toString().padStart(2, "0")}`;
            }
            URL.revokeObjectURL(audioUrl);
            resolve();
          });
          audio.addEventListener("error", () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          });
        });
      } catch {}

      if (audioUploadTarget === "addTrack") {
        setNewTrack((prev) => ({
          ...prev,
          audioUrl: path,
          ...(detectedDuration ? { duration: detectedDuration } : {}),
        }));
      } else if (audioUploadTarget === "editTrack" && editingTrack) {
        setEditingTrack({
          ...editingTrack,
          audioUrl: path,
          ...(detectedDuration ? { duration: detectedDuration } : {}),
        });
      }
      toast({ title: "تم الرفع", description: `تم رفع المقطع الصوتي بنجاح` });
    } catch (err) {
      toast({
        title: "خطأ في الرفع",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setAudioUploading(false);
      setAudioUploadTarget(null);
    }
  };

  const handleCroppedUpload = async (croppedFile: File) => {
    const targetContentType = cropTarget === "addTrack" ? newTrack.contentType || "madha" : editingTrack?.content_type || "madha";
    
    // Determine the prefix snippet
    let prefixType = targetContentType;
    if (cropTarget === "playlist") prefixType = "playlist";
    if (["addMadih", "editMadih", "pasteMadih"].includes(cropTarget!)) prefixType = "madih";
    if (["addRawi", "editRawi", "pasteRawi"].includes(cropTarget!)) prefixType = "rawi";

    const customTitle = 
      cropTarget === "addTrack" ? newTrack.title
      : cropTarget === "editTrack" ? editingTrack?.title
      : cropTarget === "addMadih" ? newMadih.name
      : cropTarget === "editMadih" ? editingMadih?.name
      : cropTarget === "addRawi" ? newRawi.name
      : cropTarget === "editRawi" ? editingRawi?.name
      : cropTarget === "playlist" ? newPlaylist.title
      : undefined;

    setImageUploading(true);
    try {
      const { path, thumbnailPath } = await uploadToR2(croppedFile, "images", customTitle, prefixType);
      if (cropTarget === "pasteTrack") {
        const count = selectedTracks.size;
        // Update image_url + thumbnail_url together
        if (thumbnailPath) {
          bulkUpdateMadhaatMutation.mutate(
            { ids: Array.from(selectedTracks), field: "thumbnail_url", value: thumbnailPath },
            {},
          );
        }
        bulkUpdateMadhaatMutation.mutate(
          { ids: Array.from(selectedTracks), field: "image_url", value: path },
          {
            onSuccess: () => {
              toast({ title: "تم التحديث", description: `تم تحديث صورة ${count} مدحة بنجاح` });
              setSelectedTracks(new Set());
            },
            onError: (err) => {
              toast({ title: "خطأ في التحديث", description: (err as Error).message, variant: "destructive" });
            },
          }
        );
      } else if (cropTarget === "pasteMadih") {
        const ids = Array.from(selectedMadiheen);
        const count = ids.length;
        // Update each madih individually
        Promise.all(ids.map(id => updateMadihMutation.mutateAsync({ id, updates: { image_url: path } })))
          .then(() => {
            toast({ title: "تم التحديث", description: `تم تحديث صورة ${count} مادح بنجاح` });
            setSelectedMadiheen(new Set());
          })
          .catch((err) => {
            toast({ title: "خطأ في التحديث", description: (err as Error).message, variant: "destructive" });
          });
      } else if (cropTarget === "pasteRawi") {
        const ids = Array.from(selectedRuwat);
        const count = ids.length;
        Promise.all(ids.map(id => updateRawiMutation.mutateAsync({ id, updates: { image_url: path } })))
          .then(() => {
            toast({ title: "تم التحديث", description: `تم تحديث صورة ${count} راوي بنجاح` });
            setSelectedRuwat(new Set());
          })
          .catch((err) => {
            toast({ title: "خطأ في التحديث", description: (err as Error).message, variant: "destructive" });
          });
      } else if (cropTarget === "editMadih" && editingMadih) {
        setEditingMadih({ ...editingMadih, image_url: path });
      } else if (cropTarget === "addMadih") {
        setNewMadih((prev) => ({ ...prev, image_url: path }));
      } else if (cropTarget === "editRawi" && editingRawi) {
        setEditingRawi({ ...editingRawi, image_url: path });
      } else if (cropTarget === "addRawi") {
        setNewRawi((prev) => ({ ...prev, image_url: path }));
      } else if (cropTarget === "editTrack" && editingTrack) {
        setEditingTrack({ ...editingTrack, imageUrl: path, thumbnailUrl: thumbnailPath });
      } else if (cropTarget === "addTrack") {
        setNewTrack((prev) => ({ ...prev, imageUrl: path, thumbnailUrl: thumbnailPath }));
      } else if (cropTarget === "playlist") {
        setNewPlaylist((prev) => ({ ...prev, image: path }));
      } else if (cropTarget === "editPlaylist" && editingPlaylist) {
        setEditingPlaylist({ ...editingPlaylist, image: path });
      }
      if (cropTarget !== "pasteTrack" && cropTarget !== "pasteMadih" && cropTarget !== "pasteRawi") {
        toast({ title: "تم الرفع", description: "تم رفع الصورة بنجاح" });
      }
      setCropImageSrc(null);
      setCropTarget(null);
    } catch (err) {
      toast({
        title: "خطأ في الرفع",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setImageUploading(false);
    }
  };

  return (
    <div dir="rtl" className="flex h-screen bg-background overflow-hidden">
      <DashboardSidebar
        activeSection={activeSection}
        onSectionChange={(s) => { setActiveSection(s); setCurrentPage(1); setSearchQuery(""); }}
        signOut={signOut}
        contentTypeCounts={contentTypeCounts}
        artistCount={artists.length}
        narratorCount={narrators.length}
        playlistCount={playlistsList.length}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          activeSection={activeSection}
          isContentSection={isContentSection}
          isEditMode={isEditMode}
          selectedTrackCount={selectedTracks.size}
          selectedMadiheenCount={selectedMadiheen.size}
          selectedRuwatCount={selectedRuwat.size}
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          filterArtist={filterArtist}
          onFilterArtistChange={(v) => { setFilterArtist(v); setCurrentPage(1); }}
          filterNarrator={filterNarrator}
          onFilterNarratorChange={(v) => { setFilterNarrator(v); setCurrentPage(1); }}
          filterTariqa={filterTariqa}
          onFilterTariqaChange={(v) => { setFilterTariqa(v); setCurrentPage(1); }}
          filterDateRange={filterDateRange}
          onFilterDateRangeChange={(v) => { setFilterDateRange(v); setCurrentPage(1); }}
          filterPlayCount={filterPlayCount}
          onFilterPlayCountChange={(v) => { setFilterPlayCount(v); setCurrentPage(1); }}
          activeFilterCount={activeFilterCount}
          onClearFilters={() => {
            setFilterArtist("");
            setFilterNarrator("");
            setFilterTariqa("");
            setFilterDateRange("");
            setFilterPlayCount("");
            setCurrentPage(1);
          }}
          sortBy={sortBy}
          sortAscending={sortAscending}
          onSortChange={(field) => {
            if (sortBy === field) setSortAscending(!sortAscending);
            else { setSortBy(field); setSortAscending(false); }
            setCurrentPage(1);
          }}
          artists={artists}
          narrators={narrators}
          tariqas={tariqas}
          onAdd={() => {
            if (isContentSection) {
              setNewTrack({ ...newTrack, contentType: activeContentType || "madha" });
              setIsAddDialogOpen(true);
            }
            else if (activeSection === "playlists") setIsPlaylistDialogOpen(true);
            else if (activeSection === "madiheen") setIsAddMadihDialogOpen(true);
            else if (activeSection === "ruwat") setIsAddRawiDialogOpen(true);
          }}
          onBulkUpload={() => setIsBulkUploadOpen(true)}
          onFindReplace={() => setIsFindReplaceOpen(true)}
          onDeleteMadiheen={() => setDeleteConfirm({ type: "madiheen" })}
          onDeleteRuwat={() => setDeleteConfirm({ type: "ruwat" })}
        />

        <DashboardContentArea
          activeSection={activeSection}
          isContentSection={isContentSection}
          paginatedMadhat={paginatedMadhat}
          selectedTracks={selectedTracks}
          onToggleTrackSelect={toggleSelect}
          onSelectAllTracks={selectAll}
          setEditingTrack={setEditingTrack}
          onRightClickDetect={handleRightClickDetect}
          sortBy={sortBy}
          sortAscending={sortAscending}
          onSortChange={(field) => {
            if (sortBy === field) setSortAscending(!sortAscending);
            else { setSortBy(field); setSortAscending(false); }
            setCurrentPage(1);
          }}
          totalTracksCount={totalTracksCount}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          sectionLabel={sectionLabels?.singular}
          nowPlayingId={nowPlayingId}
          playTrack={playTrack}
          isEditMode={isEditMode}
          pendingEdits={pendingEdits}
          onEditChange={handleEditChange}
          artists={artists}
          narrators={narrators}
          tariqas={tariqas}
          fetchedArtists={fetchedArtists || []}
          fetchedNarrators={fetchedNarrators || []}
          selectedMadiheen={selectedMadiheen}
          setSelectedMadiheen={setSelectedMadiheen}
          setEditingMadih={setEditingMadih}
          searchQuery={searchQuery}
          selectedRuwat={selectedRuwat}
          setSelectedRuwat={setSelectedRuwat}
          setEditingRawi={setEditingRawi}
          sortedPlaylists={sortedPlaylists}
          madhat={madhat}
          dragOverId={dragOverId}
          draggedId={draggedId}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onTogglePlaylistActive={togglePlaylistActive}
          setEditingPlaylist={setEditingPlaylist}
        />
      </main>

      <DashboardDialogs
        artists={artists}
        narrators={narrators}
        tariqas={tariqas}
        funoon={funoon}
        fetchedTracks={fetchedTracks || []}
        activeContentType={activeContentType}
        isContentSection={isContentSection}
        editingTrack={editingTrack}
        setEditingTrack={setEditingTrack}
        newTrack={newTrack}
        setNewTrack={setNewTrack}
        clearDraft={clearDraft}
        isAddDialogOpen={isAddDialogOpen}
        setIsAddDialogOpen={setIsAddDialogOpen}
        handleSaveTrack={handleSaveTrack}
        handleAddTrack={handleAddTrack}
        createMadhaMutation={createMadhaMutation}
        updateMadhaMutation={updateMadhaMutation}
        editingPlaylist={editingPlaylist}
        setEditingPlaylist={setEditingPlaylist}
        newPlaylist={newPlaylist}
        setNewPlaylist={setNewPlaylist}
        isPlaylistDialogOpen={isPlaylistDialogOpen}
        setIsPlaylistDialogOpen={setIsPlaylistDialogOpen}
        playlistAllTracks={playlistAllTracks}
        playlistPickerTracks={playlistPickerTracks}
        playlistArtistFilter={playlistArtistFilter}
        setPlaylistArtistFilter={setPlaylistArtistFilter}
        playlistTrackSearch={playlistTrackSearch}
        setPlaylistTrackSearch={setPlaylistTrackSearch}
        handleAddPlaylist={handleAddPlaylist}
        handleSavePlaylist={handleSavePlaylist}
        createCollectionMutation={createCollectionMutation}
        updateCollectionMutation={updateCollectionMutation}
        editingMadih={editingMadih}
        setEditingMadih={setEditingMadih}
        newMadih={newMadih}
        setNewMadih={setNewMadih}
        isAddMadihDialogOpen={isAddMadihDialogOpen}
        setIsAddMadihDialogOpen={setIsAddMadihDialogOpen}
        createMadihMutation={createMadihMutation}
        updateMadihMutation={updateMadihMutation}
        editingRawi={editingRawi}
        setEditingRawi={setEditingRawi}
        newRawi={newRawi}
        setNewRawi={setNewRawi}
        isAddRawiDialogOpen={isAddRawiDialogOpen}
        setIsAddRawiDialogOpen={setIsAddRawiDialogOpen}
        createRawiMutation={createRawiMutation}
        updateRawiMutation={updateRawiMutation}
        bulkEditField={bulkEditField}
        setBulkEditField={setBulkEditField}
        handleBulkUpdate={handleBulkUpdate}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        confirmDelete={confirmDelete}
        getDeleteDescription={getDeleteDescription}
        deleteMadhaatMutation={deleteMadhaatMutation}
        deleteMadiheenMutation={deleteMadiheenMutation}
        deleteRuwatMutation={deleteRuwatMutation}
        fileInputRef={fileInputRef}
        audioFileInputRef={audioFileInputRef}
        handleFileSelected={handleFileSelected}
        handleAudioFileSelected={handleAudioFileSelected}
        cropImageSrc={cropImageSrc}
        imageUploading={imageUploading}
        setCropImageSrc={setCropImageSrc}
        setCropTarget={setCropTarget}
        handleCroppedUpload={handleCroppedUpload}
        audioUploading={audioUploading}
        audioUploadTarget={audioUploadTarget}
        openImagePicker={openImagePicker}
        openAudioPicker={openAudioPicker}
        fileInputClick={() => fileInputRef.current?.click()}
        isBulkUploadOpen={isBulkUploadOpen}
        setIsBulkUploadOpen={setIsBulkUploadOpen}
        isFindReplaceOpen={isFindReplaceOpen}
        setIsFindReplaceOpen={setIsFindReplaceOpen}
        allTracksForReplace={allTracksForReplace}
        isLoadingAllTracks={isLoadingAllTracks}
        handleBatchSave={handleBatchSave}
        batchUpdateMutation={batchUpdateMutation}
        selectedTracks={selectedTracks}
        setSelectedTracks={setSelectedTracks}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        pendingEdits={pendingEdits}
        handleInlineEditSave={handleInlineEditSave}
        handleCancelEditMode={handleCancelEditMode}
        handleDeleteSelected={handleDeleteSelected}
        toast={toast}
      />
    </div>
  );
};

export default DashboardPage;
