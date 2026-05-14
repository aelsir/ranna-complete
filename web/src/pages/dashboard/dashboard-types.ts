/**
 * Shared types, constants, and utilities for the admin dashboard.
 *
 * Extracted from the monolithic DashboardPage.tsx during the decomposition
 * refactor. Every dashboard sub-component imports from here rather than
 * re-declaring its own copies.
 */

import type { MadhaInsert } from "@/types/database";

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
  | "analytics";

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
}

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
