/**
 * Display formatting utilities for Arabic UI
 */

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

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

/** Get full R2 audio URL */
export function getAudioUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${R2_PUBLIC_URL}/${url}`;
}
