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
 * Wrap a remote image URL through the wsrv.nl image CDN so it's delivered as
 * a resized WebP instead of the full-resolution PNG/JPG original. Our R2 /
 * Backblaze buckets can't transform images themselves, so this proxy is the
 * cheapest way to cut the hero/cover payload (≈900 KB PNG → ≈80–120 KB WebP).
 *
 * Only remote http(s) assets are proxied — bundled app assets (paths starting
 * with "/", e.g. the hero fallback or placeholder) are returned untouched,
 * since wsrv can't reach the dev server and they're already small.
 *
 * @param width  Target width in px (height auto). Omit for original width.
 * @param quality WebP quality 1–100 (default 80 — visually lossless for photos).
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  opts: { width?: number; quality?: number; fallback?: string } = {}
): string {
  const { width, quality = 80, fallback } = opts;
  const resolved = getImageUrl(url, fallback ?? "/placeholder.svg");

  // Leave bundled/relative app assets and already-proxied URLs alone.
  if (!resolved.startsWith("http") || resolved.includes("wsrv.nl")) {
    return resolved;
  }

  // wsrv wants the source without a scheme; https sources use the "ssl:" prefix.
  const source = resolved.replace(/^https:\/\//, "ssl:").replace(/^http:\/\//, "");
  // `we` = without enlargement (never upscale past the original).
  let out = `https://wsrv.nl/?url=${encodeURIComponent(source)}&output=webp&q=${quality}&we`;
  if (width) out += `&w=${width}`;
  return out;
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
