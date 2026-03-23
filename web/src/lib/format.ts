/**
 * Display formatting utilities for Arabic UI
 */

const R2_PUBLIC_URL = import.meta.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

/** Format seconds into Arabic numeral duration string like "٧:٣٢" */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;
  return formatted.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

/** Format a count number to Arabic numerals */
export function toArabicNum(n: number): string {
  return n.toString().replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

/** Get full R2 image URL, with fallback */
export function getImageUrl(
  url: string | null | undefined,
  fallback = "/placeholder.svg"
): string {
  if (!url) return fallback;
  // Already a full URL
  if (url.startsWith("http")) return url;
  // Relative R2 path
  return `${R2_PUBLIC_URL}/${url}`;
}

/**
 * Get the best display image for a track with full fallback chain:
 * track image → madih image → rawi image → Ranna logo
 */
export function getTrackDisplayImage(track: {
  image_url?: string | null;
  madiheen?: { image_url?: string | null } | null;
  ruwat?: { image_url?: string | null } | null;
} | null | undefined): string {
  if (!track) return "/ranna-white-background.png";
  const trackImg = track.image_url ? getImageUrl(track.image_url) : "";
  const madihImg = track.madiheen?.image_url ? getImageUrl(track.madiheen.image_url) : "";
  const rawiImg = track.ruwat?.image_url ? getImageUrl(track.ruwat.image_url) : "";
  return trackImg || madihImg || rawiImg || "/ranna-white-background.png";
}

/** Get full R2 audio URL */
export function getAudioUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${R2_PUBLIC_URL}/${url}`;
}
