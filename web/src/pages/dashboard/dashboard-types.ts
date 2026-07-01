/**
 * Shared types, constants, and utilities for the admin dashboard.
 *
 * Extracted from the monolithic DashboardPage.tsx during the decomposition
 * refactor. Every dashboard sub-component imports from here rather than
 * re-declaring its own copies.
 */

import type { AudioQuality, LyricsStatus, MadhaInsert, MadhaWithRelations } from "@/types/database";

// ============================================
// Sidebar
// ============================================

export type SidebarItem =
  | "madhat"
  | "quran"
  | "lectures"
  | "dhikr"
  | "inshad"
  | "playlists"
  | "hero_images"
  | "madiheen"
  | "ruwat"
  | "analytics"
  | "completion"
  | "lyrics"
  | "lyrics_review";

/** Map sidebar tabs to their content_type filter */
export const SECTION_CONTENT_TYPE: Partial<Record<SidebarItem, string>> = {
  madhat: "madha",
  quran: "quran",
  lectures: "lecture",
  dhikr: "dhikr",
  inshad: "inshad",
};

/** Labels for each content section */
export const SECTION_LABELS: Partial<
  Record<
    SidebarItem,
    {
      singular: string;
      plural: string;
      uploadSingle: string;
      uploadBulk: string;
      artistLabel: string;
      narratorLabel: string;
    }
  >
> = {
  madhat: {
    singular: "مدحة",
    plural: "المدائح",
    uploadSingle: "إضافة مدحة",
    uploadBulk: "رفع مدائح",
    artistLabel: "المادح",
    narratorLabel: "الراوي",
  },
  quran: {
    singular: "مقطع قرآن",
    plural: "القرآن",
    uploadSingle: "إضافة مقطع",
    uploadBulk: "رفع مقاطع",
    artistLabel: "القارئ",
    narratorLabel: "الرواية",
  },
  lectures: {
    singular: "درس",
    plural: "الدروس",
    uploadSingle: "إضافة درس",
    uploadBulk: "رفع دروس",
    artistLabel: "المحاضر",
    narratorLabel: "الكاتب",
  },
  dhikr: {
    singular: "ذكر",
    plural: "الأذكار",
    uploadSingle: "إضافة ذكر",
    uploadBulk: "رفع أذكار",
    artistLabel: "المنشد",
    narratorLabel: "الكاتب",
  },
  inshad: {
    singular: "إنشاد",
    plural: "الإنشاد",
    uploadSingle: "إضافة إنشاد",
    uploadBulk: "رفع إنشادات",
    artistLabel: "المنشد",
    narratorLabel: "الكاتب",
  },
};

export const ITEMS_PER_PAGE = 25;

// ============================================
// Track-level types used across dashboard
// ============================================

export type Track = {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  narratorId: string;
  narratorName: string;
  duration: string;
};

export interface ExtendedTrack extends Track {
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
  content_type?: string;
  lyricsStatus?: LyricsStatus;
  audioQuality?: AudioQuality | null;
}

// ============================================
// Curation display metadata (form selectors + الكلمات tab indicators)
// ============================================

export const LYRICS_STATUS_META: Record<
  LyricsStatus,
  { label: string; color: string }
> = {
  reviewed: { label: "تمت المراجعة", color: "bg-emerald-500" },
  unreviewed: { label: "لم تُراجع", color: "bg-orange-400" },
  needs_work: { label: "تحتاج عمل", color: "bg-red-500" },
};

export const AUDIO_QUALITY_META: Record<
  AudioQuality,
  { label: string; color: string }
> = {
  excellent: { label: "ممتازة", color: "bg-emerald-500" },
  good: { label: "جيدة", color: "bg-orange-400" },
  poor: { label: "ضعيفة", color: "bg-red-500" },
};

export type Playlist = {
  id: string;
  title: string;
  desc: string;
  image: string;
  trackIds: string[];
};

export interface ExtendedPlaylist extends Playlist {
  isActive: boolean;
  order: number;
}

// ============================================
// Upload target discriminators
// ============================================

export type CropTarget =
  | "editTrack"
  | "addTrack"
  | "playlist"
  | "editPlaylist"
  | "pasteTrack"
  | "editMadih"
  | "addMadih"
  | "pasteMadih"
  | "editRawi"
  | "addRawi"
  | "pasteRawi";

export type AudioUploadTarget = "addTrack" | "editTrack";

// ============================================
// Mapped reference data (passed to sub-components)
// ============================================

export interface MappedArtist {
  id: string;
  name: string;
  role: string;
  image: string;
  trackCount: number;
}

export interface MappedNarrator {
  id: string;
  name: string;
  role: string;
  image: string;
  trackCount: number;
}

export interface MappedTariqa {
  id: string;
  name: string;
  image: string;
  description: string;
}

export interface MappedFan {
  id: string;
  name: string;
  image: string;
  description: string;
}

// ============================================
// Helpers
// ============================================

/** Map a v_tracks_admin row to the shape the dashboard UI works with. */
export function mapTrackRowToExtended(t: MadhaWithRelations): ExtendedTrack {
  return {
    id: t.id,
    title: t.title,
    artistId: t.artist_id || "",
    artistName: t.madiheen?.name || t.madih || "",
    narratorId: t.author_id || "",
    narratorName: t.ruwat?.name || t.writer || "",
    lyrics: t.lyrics || "",
    tariqa: t.turuq?.name || "",
    fan: t.funun?.name || "",
    notes: t.curation_notes || "",
    location: t.recording_place || "",
    updatedAt: t.updated_at || "",
    createdAt: t.created_at || "",
    thumbnail: t.image_url || "/placeholder.svg",
    playCount: t.play_count || 0,
    audioUrl: t.audio_url || "",
    imageUrl: t.image_url || "",
    contentType: t.content_type || "madha",
    lyricsStatus: t.lyrics_status || "unreviewed",
    audioQuality: t.audio_quality || null,
    duration: t.duration_seconds
      ? `${Math.floor(t.duration_seconds / 60)}:${(t.duration_seconds % 60).toString().padStart(2, "0")}`
      : "٠:٠٠",
  };
}

/** Completion status for a track's metadata fields */
export function getCompletionStatus(
  track: ExtendedTrack,
): "complete" | "partial" | "basic" {
  const hasLyrics = !!track.lyrics;
  const hasTariqa = !!track.tariqa;
  const hasFan = !!track.fan;
  if (hasLyrics && hasTariqa && hasFan) return "complete";
  if (hasLyrics || hasTariqa || hasFan) return "partial";
  return "basic";
}

/** Parse a display duration like "5:30" or "٥:٣٠" to seconds */
export function parseDuration(dur: string | undefined): number | null {
  if (!dur || dur === "٠:٠٠") return null;
  const parts = dur.split(":");
  if (parts.length !== 2) return null;
  const min = parseInt(
    parts[0].replace(/[٠-٩]/g, (d) =>
      "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d,
    ),
  );
  const sec = parseInt(
    parts[1].replace(/[٠-٩]/g, (d) =>
      "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d,
    ),
  );
  return !isNaN(min) && !isNaN(sec) ? min * 60 + sec : null;
}
