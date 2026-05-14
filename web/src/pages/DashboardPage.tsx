import { useState, useMemo, useRef, useEffect, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music,
  ListMusic,
  Plus,
  Search,
  Edit3,
  Trash2,
  Save,
  LogOut,
  Loader2,
  X,
  Home,
  CheckSquare,
  Square,
  Upload,
  ImagePlus,
  Clipboard,
  GalleryHorizontal,
  GripVertical,
  Play,
  Pause,
  Clock,
  Filter,
  Headphones,
  CalendarIcon,
  RotateCcw,
  BarChart3,
  LibraryBig,
  Book,
  Shell,
  Podcast,
  AudioLines,
  PenTool,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { BulkUploadDialog } from "@/components/BulkUploadDialog";
import { FloatingActionBar } from "@/components/FloatingActionBar";
import { InlineEditTable } from "@/components/InlineEditTable";
import { FindReplaceDialog } from "@/components/FindReplaceDialog";
import { CollectionTrackPicker } from "@/components/CollectionTrackPicker";
import { HeroImagesPanel } from "@/components/HeroImagesPanel";
import { useToast } from "@/hooks/use-toast";
import type { PendingEdits } from "@/types/bulk-edit";
import {
  useMadhaat,
  useMadiheen,
  useRuwat,
  useCollections,
  useTuruq,
  useFunun,
  useCreateMadha,
  useUpdateMadha,
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
import { CONTENT_TYPES } from "@/types/database";
import type { MadhaWithRelations, Collection, MadhaInsert, Madih, MadihInsert, Rawi, RawiInsert } from "@/types/database";
import { uploadToR2 } from "@/lib/upload";
import { getImageUrl } from "@/lib/format";
import ImageCropDialog from "@/components/ImageCropDialog";
import AnalyticsSection from "@/components/AnalyticsSection";
import { DashboardLogin } from "./dashboard/DashboardLogin";
import { DashboardUnauthorized } from "./dashboard/DashboardUnauthorized";
import { DashboardSidebar } from "./dashboard/DashboardSidebar";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { DashboardTrackList } from "./dashboard/DashboardTrackList";
import { DashboardMadiheen } from "./dashboard/DashboardMadiheen";
import { DashboardRuwat } from "./dashboard/DashboardRuwat";
import { DashboardPlaylists } from "./dashboard/DashboardPlaylists";

import { TrackFormDialog } from "./dashboard/TrackFormDialog";
import { MadihFormDialog } from "./dashboard/MadihFormDialog";
import { RawiFormDialog } from "./dashboard/RawiFormDialog";
import { PlaylistFormDialog } from "./dashboard/PlaylistFormDialog";
import { BulkEditDialog } from "./dashboard/BulkEditDialog";
import { DeleteConfirmDialog } from "./dashboard/DeleteConfirmDialog";

import { Link } from "react-router-dom";
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
  Playlist
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
  const ITEMS_PER_PAGE = 25;

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

  const { data: adminData } = useAdminMadhaat({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    searchQuery: searchQuery,
    artistId: filterArtist,
    narratorId: filterNarrator,
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

  const createMadhaMutation = useCreateMadha();
  const updateMadhaMutation = useUpdateMadha();
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

  const initialTracks = fetchedTracks.map(t => ({
    id: t.id,
    title: t.title,
    artistId: t.madih_id || "",
    artistName: t.madiheen?.name || t.madih || "",
    narratorId: t.rawi_id || "",
    narratorName: t.ruwat?.name || t.writer || "",
    duration: "",
  }));

  const artists = (fetchedArtists || []).map(a => ({
    id: a.id,
    name: a.name,
    role: "مادح",
    image: a.image_url || "",
    trackCount: (a as any).track_count || 0,
  }));

  const narrators = (fetchedNarrators || []).map(n => ({
    id: n.id,
    name: n.name,
    role: "راوي",
    image: n.image_url || "",
    trackCount: (n as any).track_count || 0,
  }));

  const initialPlaylists = (fetchedPlaylists || []).map((p: any) => ({
    id: p.id,
    title: p.name,
    desc: p.description || "",
    image: p.image_url || "",
    // Sort by position before mapping — Supabase's foreign-table .order()
    // is best-effort, so we belt-and-braces it client-side too.
    trackIds: (
      [...(p.collection_items || [])] as { track_id: string; position?: number }[]
    )
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((ci) => ci.track_id),
  }));

  const tariqas = (fetchedTariqas || []).map(t => ({
    id: t.id,
    name: t.name,
    image: "",
    description: t.description || "",
  }));

  const funoon = (fetchedFunun || []).map(f => ({
    id: f.id,
    name: f.name,
    image: "",
    description: f.description || "",
  }));

  const { toast } = useToast();
  const { nowPlayingId, playTrack } = usePlayer();
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [editingTrack, setEditingTrack] = useState<ExtendedTrack | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<ExtendedPlaylist | null>(null);
  const [bulkEditField, setBulkEditField] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<PendingEdits>(new Map());
  const { data: allTracksForReplace, isLoading: isLoadingAllTracks } = useAllMadhaatForReplace(isFindReplaceOpen);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "tracks" | "madiheen" | "ruwat" } | null>(null);

  const madhat: ExtendedTrack[] = initialTracks.map((t) => {
    const original = fetchedTracks?.find((ft) => ft.id === t.id);
    const artist = artists.find((a) => a.id === t.artistId);
    return {
      ...t,
      lyrics: original?.lyrics || "",
      tariqa: original?.turuq?.name || "",
      fan: original?.funun?.name || "",
      notes: "",
      location: original?.recording_place || "",
      updatedAt: original?.updated_at || "",
      createdAt: original?.created_at || "",
      thumbnail: original?.image_url || artist?.image || "/placeholder.svg",
      playCount: original?.play_count || 0,
      audioUrl: original?.audio_url || "",
      imageUrl: original?.image_url || "",
      duration: original?.duration_seconds 
        ? `${Math.floor(original.duration_seconds / 60)}:${(original.duration_seconds % 60).toString().padStart(2, '0')}` 
        : "٠:٠٠",
    };
  });

  const playlistsList: ExtendedPlaylist[] = initialPlaylists.map((p, i) => ({
    ...p,
    isActive: fetchedPlaylists?.find(fp => fp.id === p.id)?.is_active ?? true,
    order: fetchedPlaylists?.find(fp => fp.id === p.id)?.display_order ?? i,
  }));

  // ── Draft persistence for Add Track form ──
  const DRAFT_KEY = "ranna_draft_track";
  const DRAFT_DIALOG_KEY = "ranna_draft_dialog_open";

  const [newTrack, setNewTrackRaw] = useState<Partial<ExtendedTrack>>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch { /* ignore */ }
    return {};
  });

  const setNewTrack = useCallback((value: Partial<ExtendedTrack> | ((prev: Partial<ExtendedTrack>) => Partial<ExtendedTrack>)) => {
    setNewTrackRaw((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      // Persist to localStorage
      try {
        if (Object.keys(next).length > 0) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_DIALOG_KEY);
    } catch { /* ignore */ }
  }, []);

  const [newPlaylist, setNewPlaylist] = useState<Partial<Playlist & { selectedTrackIds: string[] }>>({});
  const [playlistTrackSearch, setPlaylistTrackSearch] = useState("");
  const [playlistArtistFilter, setPlaylistArtistFilter] = useState("");

  // All tracks (lightweight) for playlist picker — no limit
  const { data: allMinimalTracks } = useAllMadhaatMinimal();

  // Build lookup maps for artist/narrator names from existing fetched data
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

  // Client-side filtered track list for playlist picker
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
  type CropTarget = "editTrack" | "addTrack" | "playlist" | "editPlaylist" | "pasteTrack" | "editMadih" | "addMadih" | "pasteMadih" | "editRawi" | "addRawi" | "pasteRawi";
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio upload state
  type AudioUploadTarget = "addTrack" | "editTrack";
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

  // Warn before browser close/refresh when Add Track form has data
  useEffect(() => {
    const hasData = isAddDialogOpen && Object.keys(newTrack).length > 0;
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isAddDialogOpen, newTrack]);

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

  const parseDuration = (dur: string | undefined): number | null => {
    if (!dur || dur === "٠:٠٠") return null;
    const parts = dur.split(':');
    if (parts.length !== 2) return null;
    const min = parseInt(parts[0].replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)] || d));
    const sec = parseInt(parts[1].replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)] || d));
    return (!isNaN(min) && !isNaN(sec)) ? min * 60 + sec : null;
  };

  const handleSaveTrack = () => {
    if (!editingTrack) return;
    const tariqaId = tariqas.find(t => t.name === (editingTrack.tariqa === "none" ? "" : editingTrack.tariqa))?.id || null;
    const fanId = funoon.find(f => f.name === (editingTrack.fan === "none" ? "" : editingTrack.fan))?.id || null;

    updateMadhaMutation.mutate(
      {
        id: editingTrack.id,
        updates: {
          title: editingTrack.title,
          madih_id: editingTrack.artistId || null,
          rawi_id: editingTrack.narratorId || null,
          tariqa_id: tariqaId,
          fan_id: fanId,
          lyrics: editingTrack.lyrics || null,
          recording_place: editingTrack.location || null,
          duration_seconds: parseDuration(editingTrack.duration),
          audio_url: editingTrack.audioUrl || null,
          image_url: editingTrack.imageUrl || null,
        },
      },
      {
        onSuccess: () => {
          setEditingTrack(null);
          toast({ title: "تم الحفظ", description: "تم تحديث المدحة بنجاح" });
        },
        onError: (err) => {
          toast({ title: "خطأ في الحفظ", description: (err as Error).message, variant: "destructive" });
        },
      }
    );
  };

  const handleAddTrack = () => {
    if (!newTrack.title) {
      toast({ title: "خطأ", description: "يجب إدخال اسم المدحة", variant: "destructive" });
      return;
    }
    const tariqaId = tariqas.find(t => t.name === newTrack.tariqa)?.id || null;
    const fanId = funoon.find(f => f.name === newTrack.fan)?.id || null;

    const artistName = artists.find(a => a.id === newTrack.artistId)?.name || "";
    createMadhaMutation.mutate(
      {
        title: newTrack.title,
        madih_name: artistName,
        madih_id: newTrack.artistId || null,
        rawi_id: newTrack.narratorId || null,
        tariqa_id: tariqaId,
        fan_id: fanId,
        lyrics: newTrack.lyrics || null,
        recording_place: newTrack.location || null,
        duration_seconds: parseDuration(newTrack.duration),
        audio_url: newTrack.audioUrl || null,
        image_url: newTrack.imageUrl || null,
        content_type: (newTrack as any).contentType || "madha",
        thumbnail_url: (newTrack as any).thumbnailUrl || null,
      },
      {
        onSuccess: (madhaId) => {
          const title = newTrack.title;
          setNewTrack({});
          clearDraft();
          setIsAddDialogOpen(false);
          toast({ title: "تمت الإضافة", description: `تمت إضافة "${title}" بنجاح — ID: ${madhaId.slice(0, 8)}` });
        },
        onError: (err) => {
          toast({ title: "خطأ في الإضافة", description: (err as Error).message, variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteSelected = () => setDeleteConfirm({ type: "tracks" });

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === "tracks") {
      const count = selectedTracks.size;
      deleteMadhaatMutation.mutate(Array.from(selectedTracks), {
        onSuccess: () => {
          setSelectedTracks(new Set());
          setDeleteConfirm(null);
          toast({ title: "تم الحذف", description: `تم حذف ${count} ${sectionLabels?.singular || "محتوى"} بنجاح` });
        },
        onError: (err) => {
          toast({ title: "خطأ في الحذف", description: (err as Error).message, variant: "destructive" });
        },
      });
    } else if (deleteConfirm.type === "madiheen") {
      const count = selectedMadiheen.size;
      deleteMadiheenMutation.mutate(Array.from(selectedMadiheen), {
        onSuccess: () => {
          setSelectedMadiheen(new Set());
          setDeleteConfirm(null);
          toast({ title: "تم الحذف", description: `تم حذف ${count} مادح بنجاح` });
        },
        onError: (err) => {
          toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" });
        },
      });
    } else if (deleteConfirm.type === "ruwat") {
      const count = selectedRuwat.size;
      deleteRuwatMutation.mutate(Array.from(selectedRuwat), {
        onSuccess: () => {
          setSelectedRuwat(new Set());
          setDeleteConfirm(null);
          toast({ title: "تم الحذف", description: `تم حذف ${count} راوي بنجاح` });
        },
        onError: (err) => {
          toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" });
        },
      });
    }
  };

  const getDeleteDescription = () => {
    if (!deleteConfirm) return { title: "", desc: "" };

    if (deleteConfirm.type === "tracks") {
      const count = selectedTracks.size;
      return {
        title: `حذف ${count} ${sectionLabels?.singular || "محتوى"}`,
        desc: `سيتم حذف ${count} ${sectionLabels?.singular || "محتوى"} نهائيًا. سيتم أيضًا إزالتها من المفضلة وقوائم التشغيل وسجل الاستماع.`,
      };
    }

    if (deleteConfirm.type === "madiheen") {
      const count = selectedMadiheen.size;
      const affectedTracks = (fetchedTracks || []).filter(
        (t) => t.madih_id && selectedMadiheen.has(t.madih_id)
      ).length;
      const names = artists
        .filter((a) => selectedMadiheen.has(a.id))
        .map((a) => a.name)
        .slice(0, 3);
      const nameStr = names.join("، ") + (count > 3 ? ` و${count - 3} آخرين` : "");
      return {
        title: `حذف ${count} مادح`,
        desc: `سيتم حذف: ${nameStr}.${
          affectedTracks > 0
            ? ` سيفقد ${affectedTracks} مدحة ارتباطها بالمادح (لن تُحذف المدحات).`
            : ""
        }`,
      };
    }

    if (deleteConfirm.type === "ruwat") {
      const count = selectedRuwat.size;
      const affectedTracks = (fetchedTracks || []).filter(
        (t) => t.rawi_id && selectedRuwat.has(t.rawi_id)
      ).length;
      const names = narrators
        .filter((n) => selectedRuwat.has(n.id))
        .map((n) => n.name)
        .slice(0, 3);
      const nameStr = names.join("، ") + (count > 3 ? ` و${count - 3} آخرين` : "");
      return {
        title: `حذف ${count} راوي`,
        desc: `سيتم حذف: ${nameStr}.${
          affectedTracks > 0
            ? ` سيفقد ${affectedTracks} مدحة ارتباطها بالراوي (لن تُحذف المدحات).`
            : ""
        }`,
      };
    }

    return { title: "", desc: "" };
  };

  // ── Inline Edit & Find-Replace handlers ──

  const handleEditChange = useCallback((trackId: string, field: keyof MadhaInsert, value: string | null) => {
    setPendingEdits((prev) => {
      const next = new Map(prev);
      if (value === null) {
        // Reverted to original — remove field from edits
        const existing = next.get(trackId);
        if (existing) {
          const { [field]: _, ...rest } = existing;
          if (Object.keys(rest).length === 0) {
            next.delete(trackId);
          } else {
            next.set(trackId, rest);
          }
        }
      } else {
        const existing = next.get(trackId) || {};
        next.set(trackId, { ...existing, [field]: value });
      }
      return next;
    });
  }, []);

  const handleBatchSave = useCallback((updates: { id: string; changes: Partial<MadhaInsert> }[]) => {
    const count = updates.length;
    batchUpdateMutation.mutate(updates, {
      onSuccess: () => {
        setIsEditMode(false);
        setPendingEdits(new Map());
        setSelectedTracks(new Set());
        toast({ title: "تم الحفظ", description: `تم تحديث ${count} مدحة بنجاح` });
      },
      onError: (err) => {
        toast({ title: "خطأ في الحفظ", description: (err as Error).message, variant: "destructive" });
      },
    });
  }, [batchUpdateMutation, toast]);

  const handleInlineEditSave = useCallback(() => {
    const updates = Array.from(pendingEdits.entries()).map(([id, changes]) => ({ id, changes }));
    if (updates.length === 0) return;
    handleBatchSave(updates);
  }, [pendingEdits, handleBatchSave]);

  const handleCancelEditMode = useCallback(() => {
    if (pendingEdits.size > 0) {
      if (!window.confirm("لديك تعديلات غير محفوظة. هل تريد الإلغاء؟")) return;
    }
    setIsEditMode(false);
    setPendingEdits(new Map());
  }, [pendingEdits]);

  // Listen for Escape key in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    const handler = () => handleCancelEditMode();
    window.addEventListener("inline-edit-escape", handler);
    return () => window.removeEventListener("inline-edit-escape", handler);
  }, [isEditMode, handleCancelEditMode]);

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
        onError: (err) => {
          toast({ title: "خطأ في الإنشاء", description: (err as Error).message, variant: "destructive" });
        },
      }
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
        onError: (err) => {
          toast({ title: "خطأ في الحفظ", description: (err as Error).message, variant: "destructive" });
        },
      }
    );
  };

  const handleBulkUpdate = (field: string, value: string) => {
    let dbField: keyof MadhaInsert | null = null;
    let dbValue: any = value;

    if (field === "artistId") dbField = "madih_id";
    else if (field === "narratorId") dbField = "rawi_id";
    else if (field === "tariqa") {
      dbField = "tariqa_id";
      dbValue = tariqas.find(t => t.name === value)?.id || null;
    }
    else if (field === "fan") {
      dbField = "fan_id";
      dbValue = funoon.find(f => f.name === value)?.id || null;
    }
    else if (field === "contentType") {
      dbField = "content_type";
      dbValue = value;
    }

    if (!dbField) return;

    const count = selectedTracks.size;
    bulkUpdateMadhaatMutation.mutate(
      {
        ids: Array.from(selectedTracks),
        field: dbField,
        value: dbValue,
      },
      {
        onSuccess: () => {
          setBulkEditField(null);
          setSelectedTracks(new Set());
          toast({ title: "تم التحديث", description: `تم تحديث ${count} مدحة بنجاح` });
        },
        onError: (err) => {
          toast({ title: "خطأ في التحديث", description: (err as Error).message, variant: "destructive" });
        },
      }
    );
  };

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

  const togglePlaylistActive = (id: string) => {
    const pl = playlistsList.find(p => p.id === id);
    if (!pl) return;
    updateCollectionMutation.mutate({
      id,
      updates: { is_active: !pl.isActive },
    });
  };

  // Drag & drop for playlists
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
        updateCollectionMutation.mutate({
          id: p.id,
          updates: { display_order: i },
        });
      }
    });

    setDraggedId(null);
    setDragOverId(null);
  };

  const sortedPlaylists = [...playlistsList].sort((a, b) => a.order - b.order);

  const { data: contentTypeCounts } = useContentTypeCounts();

  const sidebarItems: ({ divider: true } | { id: SidebarItem; label: string; icon: React.ElementType; count?: number; divider?: false })[] = [
    { id: "madhat",   label: "المدائح",    icon: Music,      count: contentTypeCounts?.["madha"] },
    { id: "quran",    label: "القرآن",     icon: Book,       count: contentTypeCounts?.["quran"] },
    { id: "lectures", label: "الدروس",     icon: LibraryBig, count: contentTypeCounts?.["lecture"] },
    { id: "dhikr",    label: "الأذكار",    icon: Shell,      count: contentTypeCounts?.["dhikr"] },
    { id: "inshad",   label: "الإنشاد",   icon: Podcast,    count: contentTypeCounts?.["inshad"] },
    { divider: true },
    { id: "madiheen", label: "المادحين",   icon: AudioLines, count: artists.length },
    { id: "ruwat",    label: "الرواة",     icon: PenTool,    count: narrators.length },
    { id: "playlists",label: "قوائم مميزة",icon: ListMusic,  count: playlistsList.length },
    { id: "hero_images", label: "صور الواجهة", icon: GalleryHorizontal },
    { divider: true },
    { id: "analytics",label: "الإحصائيات",icon: BarChart3 },
  ] as const as ({ divider: true } | { id: SidebarItem; label: string; icon: React.ElementType; count?: number })[];

  return (
    <div dir="rtl" className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-l border-border bg-card flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Music className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-fustat font-bold text-base text-foreground leading-tight">لوحة التحكم</h1>
              <p className="text-[10px] text-muted-foreground">إدارة محتوى رنّة</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map((item, idx) => {
            if ('divider' in item && item.divider) {
              return <div key={`divider-${idx}`} className="my-1.5 border-t border-border" />;
            }
            const navItem = item as { id: SidebarItem; label: string; icon: React.ElementType; count?: number };
            return (
              <button
                key={navItem.id}
                onClick={() => { setActiveSection(navItem.id); setCurrentPage(1); setSearchQuery(""); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-fustat transition-all duration-200 ${
                  activeSection === navItem.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <navItem.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-start">{navItem.label}</span>
                {navItem.count != null && (
                  <Badge
                    variant={activeSection === navItem.id ? "secondary" : "outline"}
                    className="text-[10px] h-5 px-1.5 rounded-md"
                  >
                    {navItem.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Link to="/">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground text-xs">
              <Home className="h-3.5 w-3.5" />
              العودة للتطبيق
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground text-xs">
            <LogOut className="h-3.5 w-3.5" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-fustat font-bold text-lg text-foreground">
              {activeSection === "analytics" ? "إحصائيات المنصة"
                : isContentSection ? `إدارة ${sectionLabels?.plural || "المحتوى"}`
                : activeSection === "madiheen" ? "إدارة المادحين"
                : activeSection === "ruwat" ? "إدارة الرواة"
                : activeSection === "hero_images" ? "صور الواجهة"
                : "إدارة القوائم المميزة"}
            </h2>
            {selectedTracks.size > 0 && isContentSection && (
              <Badge variant="secondary" className="text-xs">{selectedTracks.size} محدد</Badge>
            )}
            {selectedMadiheen.size > 0 && activeSection === "madiheen" && (
              <Badge variant="secondary" className="text-xs">{selectedMadiheen.size} محدد</Badge>
            )}
            {selectedRuwat.size > 0 && activeSection === "ruwat" && (
              <Badge variant="secondary" className="text-xs">{selectedRuwat.size} محدد</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 relative z-10">
            {isContentSection && !isEditMode && (
              <Button
                variant="outline"
                size="sm"
                className="!gap-1.5 text-xs font-fustat"
                onClick={() => setIsFindReplaceOpen(true)}
              >
                <Search className="h-3.5 w-3.5" />
                بحث واستبدال
              </Button>
            )}
            {selectedMadiheen.size > 0 && activeSection === "madiheen" && (
              <Button variant="destructive" size="sm" className="gap-1.5 text-xs"
                onClick={() => setDeleteConfirm({ type: "madiheen" })}
              >
                <Trash2 className="h-3.5 w-3.5" />
                حذف
              </Button>
            )}
            {selectedRuwat.size > 0 && activeSection === "ruwat" && (
              <Button variant="destructive" size="sm" className="gap-1.5 text-xs"
                onClick={() => setDeleteConfirm({ type: "ruwat" })}
              >
                <Trash2 className="h-3.5 w-3.5" />
                حذف
              </Button>
            )}
            {isContentSection && (
              <Button variant="outline" size="sm" className="!gap-1.5 text-xs font-fustat" onClick={() => setIsBulkUploadOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                {sectionLabels?.uploadBulk || "رفع مجمّع"}
              </Button>
            )}
            {activeSection !== "hero_images" && activeSection !== "analytics" && (
              <Button
                size="sm"
                className="!gap-1.5 bg-primary hover:bg-primary/90 text-xs font-fustat"
                onClick={() => {
                  if (isContentSection) {
                    setNewTrack({ ...newTrack, contentType: activeContentType || "madha" });
                    setIsAddDialogOpen(true);
                  }
                  else if (activeSection === "playlists") setIsPlaylistDialogOpen(true);
                  else if (activeSection === "madiheen") setIsAddMadihDialogOpen(true);
                  else if (activeSection === "ruwat") setIsAddRawiDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {isContentSection ? (sectionLabels?.uploadSingle || "إضافة محتوى")
                  : activeSection === "madiheen" ? "إضافة مادح"
                  : activeSection === "ruwat" ? "إضافة راوي"
                  : "إنشاء قائمة"}
              </Button>
            )}
          </div>
        </header>

        {/* Search + Filters */}
        {activeSection !== "analytics" && activeSection !== "hero_images" && (
          <div className="px-6 py-3 border-b border-border bg-card/50 space-y-3">
          <div className="flex items-center gap-2 relative z-10">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مدحة، مادح، أو راوي..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pr-9 h-9 text-sm bg-background"
              />
            </div>
            {isContentSection && (
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs shrink-0"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-3.5 w-3.5" />
                فلاتر
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] rounded-full ms-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && isContentSection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="w-44">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">المادح</label>
                <SearchableSelect
                  value={filterArtist}
                  onValueChange={(v) => { setFilterArtist(v); setCurrentPage(1); }}
                  options={[{ value: "", label: "الكل" }, ...artists.map((a) => ({ value: a.id, label: a.name }))]}
                  placeholder="الكل"
                  searchPlaceholder="ابحث عن مادح..."
                  triggerClassName="h-8 text-xs font-fustat"
                />
              </div>
              <div className="w-44">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">الراوي</label>
                <SearchableSelect
                  value={filterNarrator}
                  onValueChange={(v) => { setFilterNarrator(v); setCurrentPage(1); }}
                  options={[{ value: "", label: "الكل" }, ...narrators.map((n) => ({ value: n.id, label: n.name }))]}
                  placeholder="الكل"
                  searchPlaceholder="ابحث عن راوي..."
                  triggerClassName="h-8 text-xs font-fustat"
                />
              </div>
              <div className="w-40">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">الطريقة</label>
                <SearchableSelect
                  value={filterTariqa}
                  onValueChange={(v) => { setFilterTariqa(v); setCurrentPage(1); }}
                  options={[{ value: "", label: "الكل" }, ...tariqas.map((tq) => ({ value: tq.name, label: tq.name }))]}
                  placeholder="الكل"
                  searchPlaceholder="ابحث عن طريقة..."
                  triggerClassName="h-8 text-xs font-fustat"
                />
              </div>
              <div className="w-36">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">
                  <CalendarIcon className="h-3 w-3 inline-block me-1 opacity-60" />
                  زمن التحديث
                </label>
                <Select value={filterDateRange} onValueChange={(v) => { setFilterDateRange(v === "all" ? "" : v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="today">اليوم</SelectItem>
                    <SelectItem value="week">آخر أسبوع</SelectItem>
                    <SelectItem value="month">آخر شهر</SelectItem>
                    <SelectItem value="older">أقدم من شهر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">
                  <Headphones className="h-3 w-3 inline-block me-1 opacity-60" />
                  مرات التشغيل
                </label>
                <Select value={filterPlayCount} onValueChange={(v) => { setFilterPlayCount(v === "all" ? "" : v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="0">لم تُشغّل</SelectItem>
                    <SelectItem value="low">أقل من ١٠٠</SelectItem>
                    <SelectItem value="mid">١٠٠ - ١٠٠٠</SelectItem>
                    <SelectItem value="high">أكثر من ١٠٠٠</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-muted-foreground h-8"
                  onClick={() => {
                    setFilterArtist("");
                    setFilterNarrator("");
                    setFilterTariqa("");
                    setFilterDateRange("");
                    setFilterPlayCount("");
                    setCurrentPage(1);
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                  مسح الفلاتر
                </Button>
              )}
            </motion.div>
          )}
        </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            {activeSection === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <AnalyticsSection />
              </motion.div>
            )}

            {isContentSection && (
              <motion.div
                key="madhat"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardTrackList
                  tracks={paginatedMadhat}
                  selectedTracks={selectedTracks}
                  onToggleSelect={toggleSelect}
                  onSelectAll={selectAll}
                  onEditTrack={setEditingTrack}
                  onRightClickDetect={handleRightClickDetect}
                  sortBy={sortBy}
                  sortAscending={sortAscending}
                  onSortChange={(field) => {
                    if (sortBy === field) setSortAscending(!sortAscending);
                    else { setSortBy(field); setSortAscending(false); }
                    setCurrentPage(1);
                  }}
                  totalCount={totalTracksCount}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  sectionLabel={sectionLabels?.singular}
                  nowPlayingId={nowPlayingId}
                  onPlayTrack={(id) => playTrack(id, paginatedMadhat.map(t => t.id))}
                  isEditMode={isEditMode}
                  pendingEdits={pendingEdits}
                  onEditChange={handleEditChange}
                  artists={artists}
                  narrators={narrators}
                />
              </motion.div>
            )}

            {activeSection === "hero_images" && (
              <motion.div
                key="hero_images"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <HeroImagesPanel />
              </motion.div>
            )}

            {activeSection === "madiheen" && (
              <motion.div
                key="madiheen"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardMadiheen
                  artists={artists}
                  fetchedArtists={fetchedArtists || []}
                  tariqas={tariqas}
                  selectedMadiheen={selectedMadiheen}
                  onToggleSelect={(id) => {
                    setSelectedMadiheen((prev) => {
                      const next = new Set(prev);
                      next.has(id) ? next.delete(id) : next.add(id);
                      return next;
                    });
                  }}
                  onSelectAll={() => {
                    if (selectedMadiheen.size === artists.length && artists.length > 0) setSelectedMadiheen(new Set());
                    else setSelectedMadiheen(new Set(artists.map(a => a.id)));
                  }}
                  onEditMadih={setEditingMadih}
                  onRightClickDetect={handleRightClickDetect}
                  searchQuery={searchQuery}
                />
              </motion.div>
            )}

            {activeSection === "ruwat" && (
              <motion.div
                key="ruwat"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardRuwat
                  narrators={narrators}
                  fetchedNarrators={fetchedNarrators || []}
                  selectedRuwat={selectedRuwat}
                  onToggleSelect={(id) => {
                    setSelectedRuwat((prev) => {
                      const next = new Set(prev);
                      next.has(id) ? next.delete(id) : next.add(id);
                      return next;
                    });
                  }}
                  onSelectAll={() => {
                    if (selectedRuwat.size === narrators.length && narrators.length > 0) setSelectedRuwat(new Set());
                    else setSelectedRuwat(new Set(narrators.map(n => n.id)));
                  }}
                  onEditRawi={setEditingRawi}
                  onRightClickDetect={handleRightClickDetect}
                  searchQuery={searchQuery}
                />
              </motion.div>
            )}

            {activeSection === "playlists" && (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <DashboardPlaylists
                  playlists={sortedPlaylists}
                  tracks={madhat}
                  dragOverId={dragOverId}
                  draggedId={draggedId}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                  onToggleActive={togglePlaylistActive}
                  onEdit={setEditingPlaylist}
                  onRightClickDetect={handleRightClickDetect}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <TrackFormDialog
        isOpen={!!editingTrack || isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (editingTrack) setEditingTrack(null);
            else {
              if (Object.keys(newTrack).length > 0) {
                const confirmed = window.confirm("هل تريد حذف المسودة وإغلاق النافذة؟");
                if (!confirmed) return;
                setNewTrack({});
                clearDraft();
              }
              setIsAddDialogOpen(false);
            }
          }
        }}
        isEdit={!!editingTrack}
        track={editingTrack || newTrack}
        onChange={(t) => editingTrack ? setEditingTrack(t as ExtendedTrack) : setNewTrack(t as Partial<ExtendedTrack>)}
        artists={artists}
        narrators={narrators}
        tariqas={tariqas}
        funoon={funoon}
        isSaving={updateMadhaMutation.isPending || createMadhaMutation.isPending}
        onSave={editingTrack ? handleSaveTrack : handleAddTrack}
        audioUploading={audioUploading}
        audioUploadTarget={audioUploadTarget}
        openAudioPicker={openAudioPicker}
        openImagePicker={openImagePicker}
      />

      <PlaylistFormDialog
        isOpen={!!editingPlaylist || isPlaylistDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPlaylist(null);
            setIsPlaylistDialogOpen(false);
          }
        }}
        isEdit={!!editingPlaylist}
        playlist={editingPlaylist || newPlaylist}
        onChange={(p) => editingPlaylist ? setEditingPlaylist(p as ExtendedPlaylist) : setNewPlaylist(p as Partial<ExtendedPlaylist>)}
        allTracks={playlistAllTracks}
        pickerTracks={playlistPickerTracks}
        artists={artists}
        artistFilter={playlistArtistFilter}
        setArtistFilter={setPlaylistArtistFilter}
        search={playlistTrackSearch}
        setSearch={setPlaylistTrackSearch}
        isSaving={updateCollectionMutation.isPending || createCollectionMutation.isPending}
        onSave={editingPlaylist ? handleSavePlaylist : handleAddPlaylist}
        openImagePicker={openImagePicker}
      />

      <MadihFormDialog
        isOpen={!!editingMadih || isAddMadihDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMadih(null);
            setIsAddMadihDialogOpen(false);
            setNewMadih({});
          }
        }}
        isEdit={!!editingMadih}
        madih={editingMadih || newMadih}
        onChange={(m) => editingMadih ? setEditingMadih(m as Madih) : setNewMadih(m as Partial<MadihInsert>)}
        tariqas={tariqas}
        fetchedTracks={fetchedTracks || []}
        isSaving={updateMadihMutation.isPending || createMadihMutation.isPending}
        onSave={() => {
          if (editingMadih) {
            updateMadihMutation.mutate({ id: editingMadih.id, updates: editingMadih }, {
              onSuccess: () => { setEditingMadih(null); toast({ title: "تم الحفظ", description: "تم تحديث بيانات المادح" }); },
              onError: (err) => { toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" }); },
            });
          } else {
            createMadihMutation.mutate(newMadih as MadihInsert, {
              onSuccess: () => { setIsAddMadihDialogOpen(false); setNewMadih({}); toast({ title: "تمت الإضافة", description: "تم إضافة المادح بنجاح" }); },
              onError: (err) => { toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" }); },
            });
          }
        }}
        openImagePicker={() => {
          setCropTarget(editingMadih ? "editMadih" : "addMadih");
          fileInputRef.current?.click();
        }}
      />

      <RawiFormDialog
        isOpen={!!editingRawi || isAddRawiDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRawi(null);
            setIsAddRawiDialogOpen(false);
            setNewRawi({});
          }
        }}
        isEdit={!!editingRawi}
        rawi={editingRawi || newRawi}
        onChange={(r) => editingRawi ? setEditingRawi(r as Rawi) : setNewRawi(r as Partial<RawiInsert>)}
        fetchedTracks={fetchedTracks || []}
        isSaving={updateRawiMutation.isPending || createRawiMutation.isPending}
        onSave={() => {
          if (editingRawi) {
            updateRawiMutation.mutate({ id: editingRawi.id, updates: editingRawi }, {
              onSuccess: () => { setEditingRawi(null); toast({ title: "تم الحفظ", description: "تم تحديث بيانات الراوي" }); },
              onError: (err) => { toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" }); },
            });
          } else {
            createRawiMutation.mutate(newRawi as RawiInsert, {
              onSuccess: () => { setIsAddRawiDialogOpen(false); setNewRawi({}); toast({ title: "تمت الإضافة", description: "تم إضافة الراوي بنجاح" }); },
              onError: (err) => { toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" }); },
            });
          }
        }}
        openImagePicker={() => {
          setCropTarget(editingRawi ? "editRawi" : "addRawi");
          fileInputRef.current?.click();
        }}
      />

      <BulkEditDialog
        isOpen={!!bulkEditField}
        onOpenChange={(open) => !open && setBulkEditField(null)}
        bulkEditField={bulkEditField}
        artists={artists}
        narrators={narrators}
        tariqas={tariqas}
        funoon={funoon}
        onBulkUpdate={handleBulkUpdate}
      />

      <DeleteConfirmDialog
        confirm={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        isPending={deleteMadhaatMutation.isPending || deleteMadiheenMutation.isPending || deleteRuwatMutation.isPending}
        title={getDeleteDescription().title}
        description={getDeleteDescription().desc}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Shared file input for audio picker */}
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioFileSelected}
      />

      {/* Image crop dialog */}
      {cropImageSrc && (
        <ImageCropDialog
          open={!!cropImageSrc}
          imageSrc={cropImageSrc}
          uploading={imageUploading}
          onClose={() => {
            setCropImageSrc(null);
            setCropTarget(null);
          }}
          onCropComplete={handleCroppedUpload}
        />
      )}

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        artists={artists.map(a => ({ id: a.id, name: a.name }))}
        narrators={narrators.map(n => ({ id: n.id, name: n.name }))}
        tariqas={tariqas.map(t => ({ id: t.id, name: t.name }))}
        funoon={funoon.map(f => ({ id: f.id, name: f.name }))}
        contentType={activeContentType || "madha"}
      />

      {/* Floating Action Bar (for track selection + edit mode) */}
      {isContentSection && (
        <FloatingActionBar
          selectedCount={selectedTracks.size}
          isEditMode={isEditMode}
          changeCount={pendingEdits.size}
          isSaving={batchUpdateMutation.isPending}
          isDeleting={deleteMadhaatMutation.isPending}
          onInlineEdit={() => setIsEditMode(true)}
          onFindReplace={() => setIsFindReplaceOpen(true)}
          onDelete={handleDeleteSelected}
          onClearSelection={() => setSelectedTracks(new Set())}
          onSave={handleInlineEditSave}
          onCancel={handleCancelEditMode}
          onBulkFieldEdit={(field) => setBulkEditField(field)}
          onPasteImage={() => openImagePicker("pasteTrack")}
        />
      )}


      {/* Find & Replace Dialog */}
      <FindReplaceDialog
        open={isFindReplaceOpen}
        onOpenChange={setIsFindReplaceOpen}
        tracks={allTracksForReplace || []}
        isLoadingTracks={isLoadingAllTracks}
        artists={artists.map(a => ({ id: a.id, name: a.name }))}
        narrators={narrators.map(n => ({ id: n.id, name: n.name }))}
        tariqas={tariqas.map(t => ({ id: t.id, name: t.name }))}
        funoon={funoon.map(f => ({ id: f.id, name: f.name }))}
        onApply={handleBatchSave}
        isApplying={batchUpdateMutation.isPending}
      />
    </div>
  );
};

export default DashboardPage;
