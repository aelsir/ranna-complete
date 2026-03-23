const BASE_URL = import.meta.env.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");

export function getTrackShareUrl(id: string): string {
  return `${BASE_URL}/track/${id}`;
}

export function getProfileShareUrl(type: "artist" | "narrator", id: string): string {
  return `${BASE_URL}/profile/${type}/${id}`;
}

export function getPlaylistShareUrl(id: string): string {
  return `${BASE_URL}/playlist/${id}`;
}

export function getWhatsAppShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function getTelegramShareUrl(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function getTwitterShareUrl(text: string, url: string): string {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export async function shareNative(title: string, text: string, url: string): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch {
    // User cancelled or error
    return false;
  }
}

export function canShareNative(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}
