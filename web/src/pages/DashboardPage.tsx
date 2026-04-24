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

type Track = {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  narratorId: string;
  narratorName: string;
  duration: string;
};

type Playlist = {
  id: string;
  title: string;
  desc: string;
  image: string;
  trackIds: string[];
};
import { Link } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";

type SidebarItem = "madhat" | "quran" | "lectures" | "dhikr" | "inshad" | "playlists" | "madiheen" | "ruwat" | "analytics";

/** Map sidebar tabs to their content_type filter */
const SECTION_CONTENT_TYPE: Partial<Record<SidebarItem, string>> = {
  madhat: "madha",
  quran: "quran",
  lectures: "lecture",
  dhikr: "dhikr",
  inshad: "inshad",
};

/** Labels for each content section */
const SECTION_LABELS: Partial<Record<SidebarItem, { singular: string; plural: string; uploadSingle: string; uploadBulk: string; artistLabel: string; narratorLabel: string }>> = {
  madhat: { singular: "مدحة", plural: "المدائح", uploadSingle: "إضافة مدحة", uploadBulk: "رفع مدائح", artistLabel: "المادح", narratorLabel: "الراوي" },
  quran: { singular: "مقطع قرآن", plural: "القرآن", uploadSingle: "إضافة مقطع", uploadBulk: "رفع مقاطع", artistLabel: "القارئ", narratorLabel: "الرواية" },
  lectures: { singular: "درس", plural: "الدروس", uploadSingle: "إضافة درس", uploadBulk: "رفع دروس", artistLabel: "المحاضر", narratorLabel: "الكاتب" },
  dhikr: { singular: "ذكر", plural: "الأذكار", uploadSingle: "إضافة ذكر", uploadBulk: "رفع أذكار", artistLabel: "المنشد", narratorLabel: "الكاتب" },
  inshad: { singular: "إنشاد", plural: "الإنشاد", uploadSingle: "إضافة إنشاد", uploadBulk: "رفع إنشادات", artistLabel: "المنشد", narratorLabel: "الكاتب" },
};

interface ExtendedTrack extends Track {
  lyrics?: string;
  tariqa?: string;
  fan?: string;
  notes?: string;
  location?: string;
  updatedAt?: string;
  createdAt?: string;
  thumbnail?: string;
  playCount?: number;
  audioUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  contentType?: string;
}

interface ExtendedPlaylist extends Playlist {
  isActive: boolean;
  order: number;
}

const ITEMS_PER_PAGE = 25;

// Completion status helper
function getCompletionStatus(track: ExtendedTrack): "complete" | "partial" | "basic" {
  const hasLyrics = !!track.lyrics;
  const hasTariqa = !!track.tariqa;
  const hasFan = !!track.fan;
  if (hasLyrics && hasTariqa && hasFan) return "complete";
  if (hasLyrics || hasTariqa || hasFan) return "partial";
  return "basic";
}

function CompletionRing({ status }: { status: "complete" | "partial" | "basic" }) {
  const colors = {
    complete: "border-green-500 bg-green-500/20",
    partial: "border-yellow-500 bg-yellow-500/20",
    basic: "border-muted-foreground/30 bg-muted/30",
  };
  const dotColors = {
    complete: "bg-green-500",
    partial: "bg-yellow-500",
    basic: "bg-muted-foreground/40",
  };
  return (
    <div className={`h-3 w-3 rounded-full border-2 flex items-center justify-center ${colors[status]}`}>
      <div className={`h-1.5 w-1.5 rounded-full ${dotColors[status]}`} />
    </div>
  );
}

function DashboardLogin() {
  const { loginWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error, userNotFound } = await loginWithMagicLink(email);
    setLoading(false);
    if (userNotFound) {
      setError("لا يوجد حساب بهذا البريد");
    } else if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div dir="rtl" className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-sm mx-auto p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center">
            <Music className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-fustat font-bold text-xl text-foreground">لوحة التحكم</h1>
            <p className="text-xs text-muted-foreground">
              {sent ? "تحقّق من بريدك الإلكتروني" : "سجّل دخولك للمتابعة"}
            </p>
          </div>
        </div>
        {sent ? (
          <div className="text-center space-y-3">
            <p className="text-sm font-fustat text-muted-foreground">
              أرسلنا رابط تسجيل الدخول إلى
            </p>
            <p className="text-sm font-fustat font-bold text-foreground" dir="ltr">
              {email}
            </p>
            <p className="text-xs font-fustat text-muted-foreground pt-4">
              افتح الرابط من نفس المتصفح لإكمال الدخول.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                البريد الإلكتروني
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ranna.app"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-destructive font-fustat">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "جاري الإرسال..." : "أرسل الرابط"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function DashboardUnauthorized({ signOut }: { signOut: () => Promise<void> }) {
  return (
    <div dir="rtl" className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-sm mx-auto p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <LogOut className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="font-fustat font-bold text-xl text-foreground">غير مصرح</h1>
        <p className="text-sm font-fustat text-muted-foreground">
          هذا الحساب ليس لديه صلاحية الوصول إلى لوحة التحكم.
        </p>
        <Button variant="outline" className="w-full" onClick={() => signOut()}>
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}

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
    trackIds: (p.collection_items || []).map((ci: any) => ci.track_id) as string[],
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

  // Client-side filtered track list for playlist picker
  const playlistPickerTracks = useMemo(() => {
    const all = (allMinimalTracks || []).map((t) => ({
      id: t.id,
      title: t.title,
      artistName: (t.madih_id && artistNameMap[t.madih_id]) || t.madih || "",
      narratorName: (t.rawi_id && narratorNameMap[t.rawi_id]) || "",
      madihId: t.madih_id || "",
    }));
    let filtered = all;
    if (playlistArtistFilter) {
      filtered = filtered.filter((t) => t.madihId === playlistArtistFilter);
    }
    if (playlistTrackSearch.trim()) {
      const q = playlistTrackSearch.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artistName.toLowerCase().includes(q) ||
          t.narratorName.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [allMinimalTracks, playlistTrackSearch, playlistArtistFilter, artistNameMap, narratorNameMap]);

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
          </div>
        </header>

        {/* Search + Filters */}
        {activeSection !== "analytics" && (
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
                {isEditMode ? (
                  <InlineEditTable
                    tracks={paginatedMadhat}
                    selectedTrackIds={selectedTracks}
                    artists={artists.map(a => ({ id: a.id, name: a.name }))}
                    narrators={narrators.map(n => ({ id: n.id, name: n.name }))}
                    pendingEdits={pendingEdits}
                    onEditChange={handleEditChange}
                    onToggleSelect={toggleSelect}
                    onSelectAll={selectAll}
                    nowPlayingId={nowPlayingId}
                    onPlayTrack={(id) => playTrack(id, paginatedMadhat.map(t => t.id))}
                  />
                ) : (
                  <>
                    {/* Table Header */}
                    <div className="grid grid-cols-[40px_40px_1.5fr_1fr_1fr_80px_80px_90px] gap-3 px-4 py-2.5 text-[11px] font-fustat font-bold text-muted-foreground uppercase tracking-wide">
                      <button onClick={selectAll} className="flex items-center justify-center">
                        {selectedTracks.size === paginatedMadhat.length && paginatedMadhat.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      <span></span>
                      <span>العنوان</span>
                      <span>المادح</span>
                      <span>الراوي</span>
                      <button
                        className="flex items-center justify-center gap-1 w-full hover:text-foreground transition-colors"
                        onClick={() => {
                          if (sortBy === "play_count") {
                            setSortAscending((a) => !a);
                          } else {
                            setSortBy("play_count");
                            setSortAscending(false);
                          }
                          setCurrentPage(1);
                        }}
                      >
                        <span>التشغيل</span>
                        {sortBy === "play_count"
                          ? sortAscending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                      <button
                        className="flex items-center justify-center gap-1 w-full hover:text-foreground transition-colors"
                        onClick={() => {
                          if (sortBy === "created_at") {
                            setSortAscending((a) => !a);
                          } else {
                            setSortBy("created_at");
                            setSortAscending(false);
                          }
                          setCurrentPage(1);
                        }}
                      >
                        <span>تاريخ الإضافة</span>
                        {sortBy === "created_at"
                          ? sortAscending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                      <span className="text-center">إجراءات</span>
                    </div>
                    <Separator className="mb-1" />

                    {/* Rows */}
                    <div className="space-y-1">
                      {paginatedMadhat.map((track) => {
                        const status = getCompletionStatus(track);
                        const isPlaying = nowPlayingId === track.id;
                        const relativeDate = track.createdAt
                          ? (() => {
                              const diff = Date.now() - new Date(track.createdAt).getTime();
                              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                              if (days === 0) return "اليوم";
                              if (days === 1) return "أمس";
                              if (days < 7) return `${days} أيام`;
                              if (days < 30) return `${Math.floor(days / 7)} أسابيع`;
                              return `${Math.floor(days / 30)} شهر`;
                            })()
                          : "—";
                        return (
                          <motion.div
                            key={track.id}
                            layout
                            className={`grid grid-cols-[40px_40px_1.5fr_1fr_1fr_80px_80px_90px] gap-3 items-center px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                              selectedTracks.has(track.id)
                                ? "bg-primary/5 border border-primary/20"
                                : "hover:bg-muted/50 border border-transparent"
                            }`}
                            onClick={() => toggleSelect(track.id)}
                            onDoubleClick={(e) => { e.stopPropagation(); setEditingTrack(track); }}
                            onContextMenu={(e) => handleRightClickDetect(e, track.id, () => setEditingTrack(track))}
                          >
                            <div className="flex items-center justify-center">
                              {selectedTracks.has(track.id) ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="relative">
                              <img
                                src={getImageUrl(track.thumbnail)}
                                alt={track.title}
                                className="h-9 w-9 rounded-lg object-cover"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playTrack(track.id, paginatedMadhat.map(t => t.id));
                                }}
                                className={`absolute inset-0 flex items-center justify-center rounded-lg transition-all ${
                                  isPlaying ? "bg-primary/80" : "bg-black/0 hover:bg-black/40"
                                }`}
                              >
                                {isPlaying ? (
                                  <Pause className="h-3.5 w-3.5 text-white fill-white" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 text-white fill-white opacity-0 group-hover:opacity-100 hover:!opacity-100" style={{ opacity: undefined }} />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <CompletionRing status={status} />
                              <div className="min-w-0">
                                <p className="font-fustat font-semibold text-foreground truncate">{track.title}</p>
                                <span className={`text-[10px] ${
                                  status === "complete" ? "text-green-600" : status === "partial" ? "text-yellow-600" : "text-muted-foreground/60"
                                }`}>
                                  {status === "complete" ? "مكتملة" : status === "partial" ? "ناقصة جزئياً" : "بيانات أساسية"}
                                </span>
                              </div>
                            </div>
                            <span className="text-muted-foreground truncate">{track.artistName}</span>
                            <span className="text-muted-foreground truncate">{track.narratorName}</span>
                            <span className="text-muted-foreground text-center text-xs flex items-center justify-center gap-1">
                              <Headphones className="h-3 w-3 opacity-50" />
                              {(track.playCount || 0).toLocaleString("ar-SA")}
                            </span>
                            <span className="text-muted-foreground/60 text-center text-[10px]">{relativeDate}</span>
                            <div className="flex items-center justify-center">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 gap-1.5 font-fustat text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTrack(track);
                                }}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                تعديل
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}

                {paginatedMadhat.length === 0 && (
                  <div className="text-center py-20 text-muted-foreground">
                    <Music className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-fustat">لا توجد نتائج</p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 px-4">
                    <span className="text-xs text-muted-foreground font-fustat">
                      {totalTracksCount} {sectionLabels?.singular || "محتوى"} — صفحة {currentPage} من {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className="text-xs"
                      >
                        السابق
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="text-xs"
                      >
                        التالي
                      </Button>
                    </div>
                  </div>
                )}
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
                {/* Table Header */}
                <div className="grid grid-cols-[40px_40px_1.5fr_1fr_80px_80px] gap-3 px-4 py-2.5 text-[11px] font-fustat font-bold text-muted-foreground uppercase tracking-wide">
                  <button onClick={() => {
                    if (selectedMadiheen.size === artists.length && artists.length > 0) setSelectedMadiheen(new Set());
                    else setSelectedMadiheen(new Set(artists.map(a => a.id)));
                  }} className="flex items-center justify-center">
                    {selectedMadiheen.size === artists.length && artists.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <span></span>
                  <span>الاسم</span>
                  <span>الطريقة</span>
                  <span>المدائح</span>
                  <span className="text-center">إجراءات</span>
                </div>

                {/* Rows */}
                {artists.filter(a => !searchQuery || a.name.includes(searchQuery)).map((artist) => {
                  const madhCount = artist.trackCount;
                  const isSelected = selectedMadiheen.has(artist.id);
                  const madihData = (fetchedArtists || []).find(m => m.id === artist.id);
                  const tariqaName = madihData?.tariqa_id ? tariqas.find(t => t.id === madihData.tariqa_id)?.name : "";
                  return (
                    <div
                      key={artist.id}
                      onClick={() => {
                        setSelectedMadiheen(prev => {
                          const next = new Set(prev);
                          next.has(artist.id) ? next.delete(artist.id) : next.add(artist.id);
                          return next;
                        });
                      }}
                      className={`grid grid-cols-[40px_40px_1.5fr_1fr_80px_80px] gap-3 px-4 py-2.5 items-center rounded-xl text-sm cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingMadih(madihData || null); }}
                      onContextMenu={(e) => handleRightClickDetect(e, artist.id, () => setEditingMadih(madihData || null))}
                    >
                      <div className="flex items-center justify-center">
                        {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground/40" />}
                      </div>
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted">
                        {artist.image ? (
                          <img src={getImageUrl(artist.image)} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Music className="h-4 w-4" /></div>
                        )}
                      </div>
                      <span className="font-fustat font-semibold text-foreground truncate">{artist.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{tariqaName || "—"}</span>
                      <Badge variant="outline" className="w-fit text-[10px]">{madhCount} مدحة</Badge>
                      <div className="flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 gap-1.5 font-fustat text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMadih(madihData || null);
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          تعديل
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {artists.filter(a => !searchQuery || a.name.includes(searchQuery)).length === 0 && (
                  <div className="text-center py-20 text-muted-foreground font-fustat">
                    <Music className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">لا يوجد مادحين</p>
                  </div>
                )}
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
                {/* Table Header */}
                <div className="grid grid-cols-[40px_40px_1.5fr_80px_80px] gap-3 px-4 py-2.5 text-[11px] font-fustat font-bold text-muted-foreground uppercase tracking-wide">
                  <button onClick={() => {
                    if (selectedRuwat.size === narrators.length && narrators.length > 0) setSelectedRuwat(new Set());
                    else setSelectedRuwat(new Set(narrators.map(n => n.id)));
                  }} className="flex items-center justify-center">
                    {selectedRuwat.size === narrators.length && narrators.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <span></span>
                  <span>الاسم</span>
                  <span>المدائح</span>
                  <span className="text-center">إجراءات</span>
                </div>

                {/* Rows */}
                {narrators.filter(n => !searchQuery || n.name.includes(searchQuery)).map((narrator) => {
                  const madhCount = narrator.trackCount;
                  const isSelected = selectedRuwat.has(narrator.id);
                  const rawiData = (fetchedNarrators || []).find(r => r.id === narrator.id);
                  return (
                    <div
                      key={narrator.id}
                      onClick={() => {
                        setSelectedRuwat(prev => {
                          const next = new Set(prev);
                          next.has(narrator.id) ? next.delete(narrator.id) : next.add(narrator.id);
                          return next;
                        });
                      }}
                      className={`grid grid-cols-[40px_40px_1.5fr_80px_80px] gap-3 px-4 py-2.5 items-center rounded-xl text-sm cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingRawi(rawiData || null); }}
                      onContextMenu={(e) => handleRightClickDetect(e, narrator.id, () => setEditingRawi(rawiData || null))}
                    >
                      <div className="flex items-center justify-center">
                        {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground/40" />}
                      </div>
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted">
                        {narrator.image ? (
                          <img src={getImageUrl(narrator.image)} alt={narrator.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Music className="h-4 w-4" /></div>
                        )}
                      </div>
                      <span className="font-fustat font-semibold text-foreground truncate">{narrator.name}</span>
                      <Badge variant="outline" className="w-fit text-[10px]">{madhCount} مدحة</Badge>
                      <div className="flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 gap-1.5 font-fustat text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRawi(rawiData || null);
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          تعديل
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {narrators.filter(n => !searchQuery || n.name.includes(searchQuery)).length === 0 && (
                  <div className="text-center py-20 text-muted-foreground font-fustat">
                    <Music className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">لا يوجد رواة</p>
                  </div>
                )}
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
                {sortedPlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    draggable
                    onDragStart={() => handleDragStart(pl.id)}
                    onDragOver={(e) => handleDragOver(e, pl.id)}
                    onDrop={() => handleDrop(pl.id)}
                    onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                    className={`flex items-center gap-4 bg-card rounded-2xl border p-4 transition-all ${
                      dragOverId === pl.id ? "border-primary shadow-md" : "border-border"
                    } ${!pl.isActive ? "opacity-50" : ""} ${
                      draggedId === pl.id ? "opacity-30" : ""
                    }`}
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingPlaylist(pl); }}
                    onContextMenu={(e) => handleRightClickDetect(e, pl.id, () => setEditingPlaylist(pl))}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground/40 cursor-grab shrink-0" />
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 font-mono">
                      {pl.order + 1}
                    </Badge>
                    <img
                      src={getImageUrl(pl.image)}
                      alt={pl.title}
                      className="h-14 w-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-fustat font-bold text-sm text-foreground truncate">{pl.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{pl.desc}</p>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {pl.trackIds.slice(0, 4).map((tid) => {
                          const t = madhat.find((m) => m.id === tid);
                          return t ? (
                            <Badge key={tid} variant="outline" className="text-[9px] px-1.5 py-0">
                              {t.title}
                            </Badge>
                          ) : null;
                        })}
                        {pl.trackIds.length > 4 && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            +{pl.trackIds.length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-fustat ${pl.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                          {pl.isActive ? "نشطة" : "معطّلة"}
                        </span>
                        <Switch
                          checked={pl.isActive}
                          onCheckedChange={() => togglePlaylistActive(pl.id)}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1.5 font-fustat text-xs"
                        onClick={() => setEditingPlaylist(pl)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        تعديل
                      </Button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Edit Track Dialog */}
      <Dialog open={!!editingTrack} onOpenChange={(open) => !open && setEditingTrack(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-fustat">تعديل المدحة</DialogTitle>
          </DialogHeader>
          {editingTrack && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">العنوان</label>
                <Input
                  value={editingTrack.title}
                  onChange={(e) => setEditingTrack({ ...editingTrack, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">المادح</label>
                  <SearchableSelect
                    value={editingTrack.artistId}
                    onValueChange={(v) => {
                      const a = artists.find((a) => a.id === v);
                      setEditingTrack({ ...editingTrack, artistId: v, artistName: a?.name || "" });
                    }}
                    options={artists.map((a) => ({ value: a.id, label: a.name }))}
                    placeholder="اختر المادح"
                    searchPlaceholder="ابحث عن مادح..."
                  />
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">الراوي</label>
                  <SearchableSelect
                    value={editingTrack.narratorId}
                    onValueChange={(v) => {
                      const n = narrators.find((n) => n.id === v);
                      setEditingTrack({ ...editingTrack, narratorId: v, narratorName: n?.name || "" });
                    }}
                    options={narrators.map((n) => ({ value: n.id, label: n.name }))}
                    placeholder="اختر الراوي"
                    searchPlaceholder="ابحث عن راوي..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-fustat text-muted-foreground mb-1 block">الطريقة</label>
                  <SearchableSelect
                    value={editingTrack.tariqa || "none"}
                    onValueChange={(v) => setEditingTrack({ ...editingTrack, tariqa: v === "none" ? "" : v })}
                    options={[{ value: "none", label: "بدون" }, ...tariqas.map((tq) => ({ value: tq.name, label: tq.name }))]}
                    placeholder="اختر الطريقة"
                    searchPlaceholder="ابحث عن طريقة..."
                  />
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">الفن</label>
                  <SearchableSelect
                    value={editingTrack.fan || "none"}
                    onValueChange={(v) => setEditingTrack({ ...editingTrack, fan: v === "none" ? "" : v })}
                    options={[{ value: "none", label: "بدون" }, ...funoon.map((fn) => ({ value: fn.name, label: fn.name }))]}
                    placeholder="اختر الفن"
                    searchPlaceholder="ابحث عن فن..."
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">المدة</label>
                <Input
                  value={editingTrack.duration}
                  onChange={(e) => setEditingTrack({ ...editingTrack, duration: e.target.value })}
                  className="w-32"
                />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">المقطع الصوتي</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editingTrack.audioUrl || ""}
                      onChange={(e) => setEditingTrack({ ...editingTrack, audioUrl: e.target.value })}
                      placeholder="مثال: audio/madha/filename.mp3"
                      dir="ltr"
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => openAudioPicker("editTrack")}
                      disabled={audioUploading && audioUploadTarget === "editTrack"}
                    >
                      {audioUploading && audioUploadTarget === "editTrack" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      {audioUploading && audioUploadTarget === "editTrack" ? "جاري الرفع..." : "رفع مقطع صوتي"}
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">ارفع ملف صوتي أو أدخل مسار الملف في R2</p>
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">صورة الغلاف</label>
                <div className="flex items-center gap-3">
                  {editingTrack.imageUrl && (
                    <img
                      src={getImageUrl(editingTrack.imageUrl)}
                      alt="غلاف"
                      className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editingTrack.imageUrl || ""}
                      onChange={(e) => setEditingTrack({ ...editingTrack, imageUrl: e.target.value })}
                      placeholder="مثال: images/madha/cover.jpg"
                      dir="ltr"
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => openImagePicker("editTrack")}
                    >
                      <ImagePlus className="h-3 w-3" />
                      رفع صورة
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">الكلمات</label>
                <Textarea
                  value={editingTrack.lyrics || ""}
                  onChange={(e) => setEditingTrack({ ...editingTrack, lyrics: e.target.value })}
                  placeholder="أدخل كلمات المدحة هنا..."
                  className="min-h-[120px] text-sm leading-relaxed"
                />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">ملاحظات</label>
                <Textarea
                  value={editingTrack.notes || ""}
                  onChange={(e) => setEditingTrack({ ...editingTrack, notes: e.target.value })}
                  placeholder="ملاحظات إضافية..."
                  className="min-h-[60px] text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingTrack(null)} disabled={updateMadhaMutation.isPending} className="font-fustat">إلغاء</Button>
            <Button onClick={handleSaveTrack} disabled={updateMadhaMutation.isPending} className="gap-1.5 font-fustat">
              <Save className="h-3.5 w-3.5" />
              {updateMadhaMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Track Dialog — inspired by uploaded design */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        if (!open) {
          if (Object.keys(newTrack).length > 0) {
            const confirmed = window.confirm("هل تريد حذف المسودة وإغلاق النافذة؟");
            if (!confirmed) return;
            setNewTrack({});
            clearDraft();
          }
          setIsAddDialogOpen(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-fustat text-xl text-center">رفع محتوى جديد</DialogTitle>
            <p className="text-xs text-muted-foreground text-center">اختر نوع المحتوى وأدخل التفاصيل</p>
          </DialogHeader>

          <div className="space-y-6 mt-2">
            {/* Section: الوسائط */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 rounded-full bg-secondary" />
                <h3 className="font-fustat font-bold text-base text-foreground">الوسائط</h3>
              </div>
              <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-2 block">المقطع الصوتي</label>
                  {!newTrack.audioUrl ? (
                    <button
                      type="button"
                      onClick={() => openAudioPicker("addTrack")}
                      disabled={audioUploading && audioUploadTarget === "addTrack"}
                      className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                    >
                      {audioUploading && audioUploadTarget === "addTrack" ? (
                        <>
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <span className="text-xs font-fustat text-muted-foreground">جاري رفع المقطع الصوتي...</span>
                        </>
                      ) : (
                        <>
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Upload className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-fustat font-semibold text-foreground">ارفع المقطع الصوتي</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">MP3, WAV, OGG, M4A</p>
                          </div>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-background rounded-xl border border-border p-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Music className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-fustat text-foreground truncate" dir="ltr">{newTrack.audioUrl}</p>
                        <p className="text-[10px] text-muted-foreground">تم رفع المقطع بنجاح</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openAudioPicker("addTrack")}
                          disabled={audioUploading}
                        >
                          <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setNewTrack({ ...newTrack, audioUrl: "" })}
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <Input
                    value={newTrack.audioUrl || ""}
                    onChange={(e) => setNewTrack({ ...newTrack, audioUrl: e.target.value })}
                    placeholder="أو أدخل الرابط يدوياً..."
                    dir="ltr"
                    className="text-sm mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-2 block">صورة الغلاف</label>
                  <div className="flex items-center gap-3">
                    {newTrack.imageUrl && (
                      <img
                        src={getImageUrl(newTrack.imageUrl)}
                        alt="غلاف"
                        className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <Input
                        value={newTrack.imageUrl || ""}
                        onChange={(e) => setNewTrack({ ...newTrack, imageUrl: e.target.value })}
                        placeholder="مثال: images/madha/cover.jpg"
                        dir="ltr"
                        className="text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => openImagePicker("addTrack")}
                      >
                        <ImagePlus className="h-3 w-3" />
                        رفع صورة
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: المعلومات الأساسية */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 rounded-full bg-secondary" />
                <h3 className="font-fustat font-bold text-base text-foreground">المعلومات الأساسية</h3>
              </div>
              <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
                {/* Content Type Selector */}
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-2 block">نوع المحتوى *</label>
                  <div className="flex gap-2 flex-wrap">
                    {CONTENT_TYPES.map((ct) => (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => setNewTrack({ ...newTrack, contentType: ct.value })}
                        className={`px-3 py-1.5 rounded-full text-xs font-fustat font-bold transition-all border ${
                          (newTrack.contentType || "madha") === ct.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {ct.icon} {ct.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                    {(newTrack.contentType || "madha") === "madha" ? "اسم المدحة *"
                      : (newTrack.contentType) === "quran" ? "اسم السورة / المقطع *"
                      : (newTrack.contentType) === "lecture" ? "عنوان الدرس *"
                      : (newTrack.contentType) === "dhikr" ? "اسم الذكر *"
                      : "العنوان *"}
                  </label>
                  <Input
                    value={newTrack.title || ""}
                    onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
                    placeholder={
                      (newTrack.contentType || "madha") === "madha" ? "أدخل اسم المدحة..."
                        : (newTrack.contentType) === "quran" ? "أدخل اسم السورة أو المقطع..."
                        : (newTrack.contentType) === "lecture" ? "أدخل عنوان الدرس..."
                        : (newTrack.contentType) === "dhikr" ? "أدخل اسم الذكر..."
                        : "أدخل العنوان..."
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                    {(newTrack.contentType || "madha") === "madha" ? "المادح *"
                      : (newTrack.contentType) === "quran" ? "القارئ *"
                      : (newTrack.contentType) === "lecture" ? "المحاضر *"
                      : (newTrack.contentType) === "dhikr" ? "المنشد *"
                      : "الفنان *"}
                  </label>
                  <SearchableSelect
                    value={newTrack.artistId}
                    onValueChange={(v) => setNewTrack({ ...newTrack, artistId: v })}
                    options={artists.map((a) => ({ value: a.id, label: a.name }))}
                    placeholder={
                      (newTrack.contentType || "madha") === "madha" ? "اختر المادح"
                        : (newTrack.contentType) === "quran" ? "اختر القارئ"
                        : (newTrack.contentType) === "lecture" ? "اختر المحاضر"
                        : "اختر المنشد"
                    }
                    searchPlaceholder="ابحث..."
                  />
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                    {(newTrack.contentType || "madha") === "madha" ? "الراوي (اختياري)"
                      : (newTrack.contentType) === "quran" ? "الرواية (اختياري)"
                      : "الكاتب (اختياري)"}
                  </label>
                  <SearchableSelect
                    value={newTrack.narratorId}
                    onValueChange={(v) => setNewTrack({ ...newTrack, narratorId: v })}
                    options={narrators.map((n) => ({ value: n.id, label: n.name }))}
                    placeholder="اختر الراوي"
                    searchPlaceholder="ابحث عن راوي..."
                  />
                </div>
              </div>
            </div>

            {/* Section: التفاصيل */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 rounded-full bg-accent" />
                <h3 className="font-fustat font-bold text-base text-foreground">التفاصيل</h3>
                <span className="text-[10px] text-muted-foreground">(اختياري)</span>
              </div>
              <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                    {(newTrack.contentType || "madha") === "madha" ? "كلمات المدحة"
                      : (newTrack.contentType) === "quran" ? "نص الآيات"
                      : (newTrack.contentType) === "lecture" ? "ملخص الدرس"
                      : "كلمات الذكر"}
                  </label>
                  <Textarea
                    value={newTrack.lyrics || ""}
                    onChange={(e) => setNewTrack({ ...newTrack, lyrics: e.target.value })}
                    placeholder="أدخل كلمات المدحة هنا..."
                    className="min-h-[120px] text-sm leading-relaxed"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">سيتم مراجعة الكلمات من قبل المشرفين قبل الموافقة</p>
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">مكان التسجيل</label>
                  <Input
                    value={newTrack.location || ""}
                    onChange={(e) => setNewTrack({ ...newTrack, location: e.target.value })}
                    placeholder="مثال: أمدرمان، حجر العسل، الخرطوم..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-fustat text-muted-foreground mb-1 block">الطريقة</label>
                    <SearchableSelect
                      value={newTrack.tariqa}
                      onValueChange={(v) => setNewTrack({ ...newTrack, tariqa: v })}
                      options={tariqas.map((tq) => ({ value: tq.name, label: tq.name }))}
                      placeholder="اختر الطريقة..."
                      searchPlaceholder="ابحث عن طريقة..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-fustat text-muted-foreground mb-1 block">الفن</label>
                    <SearchableSelect
                      value={newTrack.fan}
                      onValueChange={(v) => setNewTrack({ ...newTrack, fan: v })}
                      options={funoon.map((fn) => ({ value: fn.name, label: fn.name }))}
                      placeholder="اختر الفن..."
                      searchPlaceholder="ابحث عن فن..."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">المدة</label>
                  <Input
                    value={newTrack.duration || ""}
                    onChange={(e) => setNewTrack({ ...newTrack, duration: e.target.value })}
                    placeholder="مثال: ٥:٣٠"
                    className="w-32"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {
              if (Object.keys(newTrack).length > 0) {
                const confirmed = window.confirm("هل تريد حذف المسودة وإغلاق النافذة؟");
                if (!confirmed) return;
              }
              setNewTrack({});
              clearDraft();
              setIsAddDialogOpen(false);
            }} disabled={createMadhaMutation.isPending} className="font-fustat">إلغاء</Button>
            <Button onClick={handleAddTrack} disabled={createMadhaMutation.isPending} className="gap-1.5 w-full sm:w-auto font-fustat">
              <Upload className="h-3.5 w-3.5" />
              {createMadhaMutation.isPending ? "جاري الإضافة..." : "رفع المدحة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Playlist Dialog */}
      <Dialog open={isPlaylistDialogOpen} onOpenChange={setIsPlaylistDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-fustat">إنشاء قائمة مميزة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">اسم القائمة *</label>
              <Input
                value={newPlaylist.title || ""}
                onChange={(e) => setNewPlaylist({ ...newPlaylist, title: e.target.value })}
                placeholder="مثال: مدائح رمضان"
              />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">الوصف</label>
              <Input
                value={newPlaylist.desc || ""}
                onChange={(e) => setNewPlaylist({ ...newPlaylist, desc: e.target.value })}
                placeholder="وصف مختصر للقائمة"
              />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">صورة القائمة</label>
              <div className="flex items-center gap-3">
                {newPlaylist.image && (
                  <img
                    src={getImageUrl(newPlaylist.image)}
                    alt="غلاف القائمة"
                    className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    value={newPlaylist.image || ""}
                    onChange={(e) => setNewPlaylist({ ...newPlaylist, image: e.target.value })}
                    placeholder="مثال: images/collections/cover.jpg"
                    dir="ltr"
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => openImagePicker("playlist")}
                  >
                    <ImagePlus className="h-3 w-3" />
                    رفع صورة
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <label className="text-xs font-fustat text-muted-foreground">اختر المقاطع</label>
                <div className="flex items-center gap-2">
                  <select
                    value={playlistArtistFilter}
                    onChange={(e) => setPlaylistArtistFilter(e.target.value)}
                    className="h-8 text-xs border border-border rounded-lg px-2 bg-background"
                  >
                    <option value="">كل المداحين</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <div className="relative w-56">
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={playlistTrackSearch}
                      onChange={(e) => setPlaylistTrackSearch(e.target.value)}
                      placeholder="ابحث عن مقطع أو مادح..."
                      className="h-8 pr-7 text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 px-2"
                  onClick={() => {
                    const visibleIds = playlistPickerTracks.map((t) => t.id);
                    const current = new Set(newPlaylist.selectedTrackIds || []);
                    for (const id of visibleIds) current.add(id);
                    setNewPlaylist({ ...newPlaylist, selectedTrackIds: Array.from(current) });
                  }}
                >
                  تحديد الكل ({playlistPickerTracks.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 px-2"
                  onClick={() => {
                    if (playlistTrackSearch || playlistArtistFilter) {
                      const visibleIds = new Set(playlistPickerTracks.map((t) => t.id));
                      const current = (newPlaylist.selectedTrackIds || []).filter((id) => !visibleIds.has(id));
                      setNewPlaylist({ ...newPlaylist, selectedTrackIds: current });
                    } else {
                      setNewPlaylist({ ...newPlaylist, selectedTrackIds: [] });
                    }
                  }}
                >
                  إلغاء التحديد
                </Button>
                {(newPlaylist.selectedTrackIds?.length || 0) > 0 && (
                  <span className="text-[11px] text-primary font-medium mr-auto">
                    {newPlaylist.selectedTrackIds!.length} مقطع محدد
                  </span>
                )}
              </div>
              <div className="border border-border rounded-xl max-h-80 overflow-auto p-2 space-y-1">
                {playlistPickerTracks.map((t) => {
                  const isSelected = newPlaylist.selectedTrackIds?.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        const current = newPlaylist.selectedTrackIds || [];
                        const next = isSelected
                          ? current.filter((id) => id !== t.id)
                          : [...current, t.id];
                        setNewPlaylist({ ...newPlaylist, selectedTrackIds: next });
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-start transition-colors ${
                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{t.title}</span>
                      <span className="text-[10px] text-muted-foreground mr-auto">{t.artistName}</span>
                    </button>
                  );
                })}
                {playlistPickerTracks.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">لا توجد نتائج</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPlaylistDialogOpen(false)} disabled={createCollectionMutation.isPending} className="font-fustat">إلغاء</Button>
            <Button onClick={handleAddPlaylist} disabled={createCollectionMutation.isPending} className="gap-1.5 font-fustat">
              <Plus className="h-3.5 w-3.5" />
              {createCollectionMutation.isPending ? "جاري الإنشاء..." : "إنشاء القائمة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Playlist Dialog */}
      <Dialog open={!!editingPlaylist} onOpenChange={(open) => !open && setEditingPlaylist(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-fustat">تعديل القائمة</DialogTitle>
          </DialogHeader>
          {editingPlaylist && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">اسم القائمة</label>
                <Input
                  value={editingPlaylist.title}
                  onChange={(e) => setEditingPlaylist({ ...editingPlaylist, title: e.target.value })}
                  placeholder="مثال: مدائح رمضان"
                />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">الوصف</label>
                <Input
                  value={editingPlaylist.desc}
                  onChange={(e) => setEditingPlaylist({ ...editingPlaylist, desc: e.target.value })}
                  placeholder="وصف مختصر للقائمة"
                />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">صورة القائمة</label>
                <div className="flex items-center gap-3">
                  {editingPlaylist.image && (
                    <img
                      src={getImageUrl(editingPlaylist.image)}
                      alt="غلاف القائمة"
                      className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editingPlaylist.image}
                      onChange={(e) => setEditingPlaylist({ ...editingPlaylist, image: e.target.value })}
                      placeholder="مثال: images/collections/cover.jpg"
                      dir="ltr"
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => openImagePicker("editPlaylist")}
                    >
                      <ImagePlus className="h-3 w-3" />
                      رفع صورة
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <label className="text-xs font-fustat text-muted-foreground">اختر المقاطع</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={playlistArtistFilter}
                      onChange={(e) => setPlaylistArtistFilter(e.target.value)}
                      className="h-8 text-xs border border-border rounded-lg px-2 bg-background"
                    >
                      <option value="">كل المداحين</option>
                      {artists.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <div className="relative w-56">
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={playlistTrackSearch}
                        onChange={(e) => setPlaylistTrackSearch(e.target.value)}
                        placeholder="ابحث عن مقطع أو مادح..."
                        className="h-8 pr-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7 px-2"
                    onClick={() => {
                      const visibleIds = playlistPickerTracks.map((t) => t.id);
                      const current = new Set(editingPlaylist.trackIds || []);
                      for (const id of visibleIds) current.add(id);
                      setEditingPlaylist({ ...editingPlaylist, trackIds: Array.from(current) });
                    }}
                  >
                    تحديد الكل ({playlistPickerTracks.length})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7 px-2"
                    onClick={() => {
                      if (playlistTrackSearch || playlistArtistFilter) {
                        const visibleIds = new Set(playlistPickerTracks.map((t) => t.id));
                        const current = (editingPlaylist.trackIds || []).filter((id) => !visibleIds.has(id));
                        setEditingPlaylist({ ...editingPlaylist, trackIds: current });
                      } else {
                        setEditingPlaylist({ ...editingPlaylist, trackIds: [] });
                      }
                    }}
                  >
                    إلغاء التحديد
                  </Button>
                  {(editingPlaylist.trackIds?.length || 0) > 0 && (
                    <span className="text-[11px] text-primary font-medium mr-auto">
                      {editingPlaylist.trackIds!.length} مقطع محدد
                    </span>
                  )}
                </div>
                <div className="border border-border rounded-xl max-h-80 overflow-auto p-2 space-y-1">
                  {playlistPickerTracks.map((t) => {
                    const isSelected = editingPlaylist.trackIds?.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          const current = editingPlaylist.trackIds || [];
                          const next = isSelected
                            ? current.filter((id) => id !== t.id)
                            : [...current, t.id];
                          setEditingPlaylist({ ...editingPlaylist, trackIds: next });
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-start transition-colors ${
                          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{t.title}</span>
                        <span className="text-[10px] text-muted-foreground mr-auto">{t.artistName}</span>
                      </button>
                    );
                  })}
                  {playlistPickerTracks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">لا توجد نتائج</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingPlaylist(null)} disabled={updateCollectionMutation.isPending} className="font-fustat">إلغاء</Button>
            <Button onClick={handleSavePlaylist} disabled={updateCollectionMutation.isPending} className="gap-1.5 font-fustat">
              <Save className="h-3.5 w-3.5" />
              {updateCollectionMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Madih Dialog */}
      <Dialog open={!!editingMadih} onOpenChange={(open) => !open && setEditingMadih(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-fustat">تعديل المادح</DialogTitle>
          </DialogHeader>
          {editingMadih && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">الاسم</label>
                <Input value={editingMadih.name} onChange={(e) => setEditingMadih({ ...editingMadih, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">النبذة</label>
                <Textarea value={editingMadih.bio || ""} onChange={(e) => setEditingMadih({ ...editingMadih, bio: e.target.value })} rows={3} />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">الصورة</label>
                <div className="flex items-center gap-3">
                  {editingMadih.image_url && (
                    <img src={getImageUrl(editingMadih.image_url)} alt="صورة" className="w-14 h-14 rounded-lg object-cover" />
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setCropTarget("editMadih"); fileInputRef.current?.click(); }}>
                    <Upload className="h-3.5 w-3.5 ml-1" /> رفع صورة
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الميلاد</label>
                  <Input type="number" value={editingMadih.birth_year || ""} onChange={(e) => setEditingMadih({ ...editingMadih, birth_year: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الوفاة</label>
                  <Input type="number" value={editingMadih.death_year || ""} onChange={(e) => setEditingMadih({ ...editingMadih, death_year: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">الطريقة</label>
                <SearchableSelect
                  value={editingMadih.tariqa_id || ""}
                  onValueChange={(v) => setEditingMadih({ ...editingMadih, tariqa_id: v || null })}
                  options={tariqas.map(t => ({ value: t.id, label: t.name }))}
                  placeholder="اختر الطريقة"
                  searchPlaceholder="ابحث عن طريقة..."
                />
              </div>
              {/* Associated madhaat */}
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-2 block">المدائح المرتبطة</label>
                <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                  {(fetchedTracks || []).filter(m => m.madih_id === editingMadih.id).map(m => (
                    <div key={m.id} className="flex items-center gap-2 py-1 px-2 rounded text-xs text-muted-foreground">
                      <Music className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.title}</span>
                    </div>
                  ))}
                  {(fetchedTracks || []).filter(m => m.madih_id === editingMadih.id).length === 0 && (
                    <p className="text-xs text-muted-foreground/50 text-center py-2">لا توجد مدائح مرتبطة</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingMadih(null)} disabled={updateMadihMutation.isPending} className="font-fustat">إلغاء</Button>
            <Button disabled={updateMadihMutation.isPending} className="gap-1.5 font-fustat" onClick={() => {
              if (!editingMadih) return;
              updateMadihMutation.mutate({ id: editingMadih.id, updates: {
                name: editingMadih.name,
                bio: editingMadih.bio,
                image_url: editingMadih.image_url,
                birth_year: editingMadih.birth_year,
                death_year: editingMadih.death_year,
                tariqa_id: editingMadih.tariqa_id,
                is_verified: editingMadih.is_verified,
              }}, {
                onSuccess: () => { setEditingMadih(null); toast({ title: "تم الحفظ", description: "تم تحديث بيانات المادح" }); },
                onError: (err) => { toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" }); },
              });
            }}>
              <Save className="h-3.5 w-3.5" />
              {updateMadihMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Madih Dialog */}
      <Dialog open={isAddMadihDialogOpen} onOpenChange={setIsAddMadihDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-fustat">إضافة مادح جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">الاسم *</label>
              <Input value={newMadih.name || ""} onChange={(e) => setNewMadih(prev => ({ ...prev, name: e.target.value }))} placeholder="اسم المادح" />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">النبذة</label>
              <Textarea value={newMadih.bio || ""} onChange={(e) => setNewMadih(prev => ({ ...prev, bio: e.target.value }))} rows={3} placeholder="نبذة مختصرة..." />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">الصورة</label>
              <div className="flex items-center gap-3">
                {newMadih.image_url && (
                  <img src={getImageUrl(newMadih.image_url)} alt="صورة" className="w-14 h-14 rounded-lg object-cover" />
                )}
                <Button variant="outline" size="sm" onClick={() => { setCropTarget("addMadih"); fileInputRef.current?.click(); }}>
                  <Upload className="h-3.5 w-3.5 ml-1" /> رفع صورة
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الميلاد</label>
                <Input type="number" value={newMadih.birth_year || ""} onChange={(e) => setNewMadih(prev => ({ ...prev, birth_year: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الوفاة</label>
                <Input type="number" value={newMadih.death_year || ""} onChange={(e) => setNewMadih(prev => ({ ...prev, death_year: e.target.value ? Number(e.target.value) : null }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">الطريقة</label>
              <SearchableSelect
                value={newMadih.tariqa_id || ""}
                onValueChange={(v) => setNewMadih(prev => ({ ...prev, tariqa_id: v || null }))}
                options={tariqas.map(t => ({ value: t.id, label: t.name }))}
                placeholder="اختر الطريقة"
                searchPlaceholder="ابحث عن طريقة..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsAddMadihDialogOpen(false); setNewMadih({}); }} className="font-fustat">إلغاء</Button>
            <Button disabled={!newMadih.name || createMadihMutation.isPending} className="gap-1.5 font-fustat" onClick={() => {
              createMadihMutation.mutate(newMadih, {
                onSuccess: () => { setIsAddMadihDialogOpen(false); setNewMadih({}); toast({ title: "تمت الإضافة", description: "تم إضافة المادح بنجاح" }); },
                onError: (err) => { toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" }); },
              });
            }}>
              <Save className="h-3.5 w-3.5" />
              {createMadihMutation.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rawi Dialog */}
      <Dialog open={!!editingRawi} onOpenChange={(open) => !open && setEditingRawi(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-fustat">تعديل الراوي</DialogTitle>
          </DialogHeader>
          {editingRawi && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">الاسم</label>
                <Input value={editingRawi.name} onChange={(e) => setEditingRawi({ ...editingRawi, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">النبذة</label>
                <Textarea value={editingRawi.bio || ""} onChange={(e) => setEditingRawi({ ...editingRawi, bio: e.target.value })} rows={3} />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">الصورة</label>
                <div className="flex items-center gap-3">
                  {editingRawi.image_url && (
                    <img src={getImageUrl(editingRawi.image_url)} alt="صورة" className="w-14 h-14 rounded-lg object-cover" />
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setCropTarget("editRawi"); fileInputRef.current?.click(); }}>
                    <Upload className="h-3.5 w-3.5 ml-1" /> رفع صورة
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الميلاد</label>
                  <Input type="number" value={editingRawi.birth_year || ""} onChange={(e) => setEditingRawi({ ...editingRawi, birth_year: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الوفاة</label>
                  <Input type="number" value={editingRawi.death_year || ""} onChange={(e) => setEditingRawi({ ...editingRawi, death_year: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              {/* Associated madhaat */}
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-2 block">المدائح المرتبطة</label>
                <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                  {(fetchedTracks || []).filter(m => m.rawi_id === editingRawi.id).map(m => (
                    <div key={m.id} className="flex items-center gap-2 py-1 px-2 rounded text-xs text-muted-foreground">
                      <Music className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.title}</span>
                    </div>
                  ))}
                  {(fetchedTracks || []).filter(m => m.rawi_id === editingRawi.id).length === 0 && (
                    <p className="text-xs text-muted-foreground/50 text-center py-2">لا توجد مدائح مرتبطة</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingRawi(null)} disabled={updateRawiMutation.isPending} className="font-fustat">إلغاء</Button>
            <Button disabled={updateRawiMutation.isPending} className="gap-1.5 font-fustat" onClick={() => {
              if (!editingRawi) return;
              updateRawiMutation.mutate({ id: editingRawi.id, updates: {
                name: editingRawi.name,
                bio: editingRawi.bio,
                image_url: editingRawi.image_url,
                birth_year: editingRawi.birth_year,
                death_year: editingRawi.death_year,
              }}, {
                onSuccess: () => { setEditingRawi(null); toast({ title: "تم الحفظ", description: "تم تحديث بيانات الراوي" }); },
                onError: (err) => { toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" }); },
              });
            }}>
              <Save className="h-3.5 w-3.5" />
              {updateRawiMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rawi Dialog */}
      <Dialog open={isAddRawiDialogOpen} onOpenChange={setIsAddRawiDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-fustat">إضافة راوي جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">الاسم *</label>
              <Input value={newRawi.name || ""} onChange={(e) => setNewRawi(prev => ({ ...prev, name: e.target.value }))} placeholder="اسم الراوي" />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">النبذة</label>
              <Textarea value={newRawi.bio || ""} onChange={(e) => setNewRawi(prev => ({ ...prev, bio: e.target.value }))} rows={3} placeholder="نبذة مختصرة..." />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">الصورة</label>
              <div className="flex items-center gap-3">
                {newRawi.image_url && (
                  <img src={getImageUrl(newRawi.image_url)} alt="صورة" className="w-14 h-14 rounded-lg object-cover" />
                )}
                <Button variant="outline" size="sm" onClick={() => { setCropTarget("addRawi"); fileInputRef.current?.click(); }}>
                  <Upload className="h-3.5 w-3.5 ml-1" /> رفع صورة
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الميلاد</label>
                <Input type="number" value={newRawi.birth_year || ""} onChange={(e) => setNewRawi(prev => ({ ...prev, birth_year: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الوفاة</label>
                <Input type="number" value={newRawi.death_year || ""} onChange={(e) => setNewRawi(prev => ({ ...prev, death_year: e.target.value ? Number(e.target.value) : null }))} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsAddRawiDialogOpen(false); setNewRawi({}); }} className="font-fustat">إلغاء</Button>
            <Button disabled={!newRawi.name || createRawiMutation.isPending} className="gap-1.5 font-fustat" onClick={() => {
              createRawiMutation.mutate(newRawi, {
                onSuccess: () => { setIsAddRawiDialogOpen(false); setNewRawi({}); toast({ title: "تمت الإضافة", description: "تم إضافة الراوي بنجاح" }); },
                onError: (err) => { toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" }); },
              });
            }}>
              <Save className="h-3.5 w-3.5" />
              {createRawiMutation.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={!!bulkEditField} onOpenChange={(open) => !open && setBulkEditField(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-fustat">
              تعديل جماعي —{" "}
              {bulkEditField === "artistId" ? "المادح"
                : bulkEditField === "narratorId" ? "الراوي"
                : bulkEditField === "tariqa" ? "الطريقة"
                : bulkEditField === "fan" ? "الفن"
                : bulkEditField === "contentType" ? "نوع المحتوى"
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div>
            {bulkEditField === "artistId" ? (
              <SearchableSelect
                onValueChange={(v) => handleBulkUpdate("artistId", v)}
                options={artists.map((a) => ({ value: a.id, label: a.name }))}
                placeholder="اختر المادح"
                searchPlaceholder="ابحث عن مادح..."
              />
            ) : bulkEditField === "narratorId" ? (
              <SearchableSelect
                onValueChange={(v) => handleBulkUpdate("narratorId", v)}
                options={narrators.map((n) => ({ value: n.id, label: n.name }))}
                placeholder="اختر الراوي"
                searchPlaceholder="ابحث عن راوي..."
              />
            ) : bulkEditField === "contentType" ? (
              <SearchableSelect
                onValueChange={(v) => handleBulkUpdate("contentType", v)}
                options={CONTENT_TYPES.map((ct) => ({ value: ct.value, label: `${ct.icon} ${ct.label}` }))}
                placeholder="اختر نوع المحتوى"
                searchPlaceholder="ابحث..."
              />
            ) : (
              <SearchableSelect
                onValueChange={(v) => handleBulkUpdate(bulkEditField!, v)}
                options={(bulkEditField === "tariqa" ? tariqas : funoon).map((item) => ({ value: item.name, label: item.name }))}
                placeholder="اختر"
                searchPlaceholder="ابحث..."
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Shared file input for image picker */}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent dir="rtl" className="font-fustat">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-fustat text-base">
              {getDeleteDescription().title}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-fustat text-sm leading-relaxed">
              {getDeleteDescription().desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel className="font-fustat text-xs" disabled={
              deleteMadhaatMutation.isPending || deleteMadiheenMutation.isPending || deleteRuwatMutation.isPending
            }>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-fustat text-xs"
              disabled={deleteMadhaatMutation.isPending || deleteMadiheenMutation.isPending || deleteRuwatMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {(deleteMadhaatMutation.isPending || deleteMadiheenMutation.isPending || deleteRuwatMutation.isPending)
                ? "جاري الحذف..."
                : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
