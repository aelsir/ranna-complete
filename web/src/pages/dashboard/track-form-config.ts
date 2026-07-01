/**
 * Per-content-type configuration for the track add/edit dialogs.
 *
 * The dialogs render the same frame (media, basics, details, curation) and
 * read everything type-specific from here: field labels, placeholders, and
 * which optional blocks apply. Customising a section's form = editing its
 * entry below; adding a content type = adding one entry.
 */

import type { ContentType } from "@/types/database";

export interface TrackFormConfig {
  /** Dialog noun, e.g. "مدحة" — used in titles and buttons. */
  singular: string;
  titleLabel: string;
  titlePlaceholder: string;
  artistLabel: string;
  artistPlaceholder: string;
  narratorLabel: string;
  lyricsLabel: string;
  lyricsPlaceholder: string;
  /** Optional blocks — hide what a content type doesn't use. Hiding a
   *  field never clears saved data; it just isn't editable there. */
  showTariqa: boolean;
  showFan: boolean;
  showRecordingPlace: boolean;
  showCuration: boolean;
}

export const TRACK_FORM_CONFIG: Record<ContentType, TrackFormConfig> = {
  madha: {
    singular: "مدحة",
    titleLabel: "اسم المدحة",
    titlePlaceholder: "أدخل اسم المدحة...",
    artistLabel: "المادح",
    artistPlaceholder: "اختر المادح",
    narratorLabel: "الراوي",
    lyricsLabel: "كلمات المدحة",
    lyricsPlaceholder: "أدخل كلمات المدحة هنا...",
    showTariqa: true,
    showFan: true,
    showRecordingPlace: true,
    showCuration: true,
  },
  quran: {
    singular: "مقطع قرآن",
    titleLabel: "اسم السورة / المقطع",
    titlePlaceholder: "أدخل اسم السورة أو المقطع...",
    artistLabel: "القارئ",
    artistPlaceholder: "اختر القارئ",
    narratorLabel: "الرواية",
    lyricsLabel: "نص الآيات",
    lyricsPlaceholder: "أدخل نص الآيات هنا...",
    showTariqa: false,
    showFan: false,
    showRecordingPlace: false,
    showCuration: true,
  },
  lecture: {
    singular: "درس",
    titleLabel: "عنوان الدرس",
    titlePlaceholder: "أدخل عنوان الدرس...",
    artistLabel: "المحاضر",
    artistPlaceholder: "اختر المحاضر",
    narratorLabel: "الكاتب",
    lyricsLabel: "ملخص الدرس",
    lyricsPlaceholder: "أدخل ملخص الدرس هنا...",
    showTariqa: true,
    showFan: false,
    showRecordingPlace: true,
    showCuration: true,
  },
  dhikr: {
    singular: "ذكر",
    titleLabel: "اسم الذكر",
    titlePlaceholder: "أدخل اسم الذكر...",
    artistLabel: "المنشد",
    artistPlaceholder: "اختر المنشد",
    narratorLabel: "الكاتب",
    lyricsLabel: "كلمات الذكر",
    lyricsPlaceholder: "أدخل كلمات الذكر هنا...",
    showTariqa: true,
    showFan: true,
    showRecordingPlace: true,
    showCuration: true,
  },
  inshad: {
    singular: "إنشاد",
    titleLabel: "عنوان الإنشاد",
    titlePlaceholder: "أدخل العنوان...",
    artistLabel: "المنشد",
    artistPlaceholder: "اختر المنشد",
    narratorLabel: "الكاتب",
    lyricsLabel: "كلمات الإنشاد",
    lyricsPlaceholder: "أدخل الكلمات هنا...",
    showTariqa: true,
    showFan: true,
    showRecordingPlace: true,
    showCuration: true,
  },
};

/** Config for a track's content type, falling back to مدحة. */
export function getTrackFormConfig(
  contentType?: string | null,
): TrackFormConfig {
  return (
    TRACK_FORM_CONFIG[(contentType as ContentType) || "madha"] ??
    TRACK_FORM_CONFIG.madha
  );
}
