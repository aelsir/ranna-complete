/**
 * Remember which sign-in method the user most recently used (Google, Apple,
 * or email magic-link), so the login UI can:
 *   - lift the matching button to the top of the OAuth row, and
 *   - decorate it with an "آخر مرة دخلت بهذا" badge.
 *
 * Persisted via localStorage so it survives reloads and reinstalls of the
 * PWA. Cleared on `signOut` is NOT done on purpose — the whole point is
 * that the hint outlives the session.
 */
export type LastAuthMethod = "google" | "apple" | "email";

const STORAGE_KEY = "ranna:lastAuthMethod";

export function getLastAuthMethod(): LastAuthMethod | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "google" || raw === "apple" || raw === "email") return raw;
    return null;
  } catch {
    return null;
  }
}

export function setLastAuthMethod(method: LastAuthMethod): void {
  try {
    localStorage.setItem(STORAGE_KEY, method);
  } catch {
    // Storage disabled (private mode, quota) — silently ignore.
  }
}
