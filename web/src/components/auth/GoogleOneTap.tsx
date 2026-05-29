import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { setLastAuthMethod } from "@/lib/lastAuthMethod";

/**
 * Google One Tap — the floating "Sign in as <name>" prompt at the top
 * right of the page. Auto-detects Google sessions in the browser and lets
 * the user authenticate with a single click using their photo.
 *
 * How it works:
 *   1. Generate a `rawNonce` and its sha256 hash.
 *   2. Load `https://accounts.google.com/gsi/client` (singleton).
 *   3. Initialize One Tap with `client_id` + `nonce=hashedNonce`.
 *   4. On callback, get the `credential` (Google-signed JWT) and exchange
 *      via `supabase.auth.signInWithIdToken({ token, nonce: rawNonce })`.
 *      Supabase verifies that the JWT echoes the same nonce hash, so the
 *      flow is hijack-proof.
 *
 * Render this only when the user is anonymous — once they have a real
 * session, the prompt is a no-op anyway (Google suppresses it).
 *
 * Env var: NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID (web OAuth client ID — the
 * same one configured in Supabase Dashboard → Auth → Google).
 */
interface GoogleOneTapProps {
  /** Suppress One Tap (e.g., user already on a non-anon session). */
  disabled?: boolean;
  /** Fires after a successful Supabase sign-in via One Tap. */
  onSuccess?: () => void;
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const DISMISS_KEY = "ranna:oneTapDismissedAt";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            nonce?: string;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
            itp_support?: boolean;
          }) => void;
          prompt: (
            notification?: (n: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              isDismissedMoment: () => boolean;
              getDismissedReason: () => string;
            }) => void,
          ) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

let scriptLoadingPromise: Promise<void> | null = null;
function loadGisScript(): Promise<void> {
  if (scriptLoadingPromise) return scriptLoadingPromise;
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error("Failed to load Google Identity Services script."));
    };
    document.head.appendChild(script);
  });
  return scriptLoadingPromise;
}

function isRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    // Storage disabled — fine, the prompt will just keep showing.
  }
}

/** Cryptographically-random nonce. */
function generateRawNonce(length = 32): string {
  const charset =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const GoogleOneTap = ({ disabled = false, onSuccess }: GoogleOneTapProps) => {
  const ranRef = useRef(false);

  useEffect(() => {
    if (disabled) return;
    if (ranRef.current) return;
    ranRef.current = true;

    const clientId = import.meta.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID as
      | string
      | undefined;
    if (!clientId) {
      // Quietly no-op so the rest of the auth screen still works.
      console.warn(
        "[GoogleOneTap] NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set; skipping.",
      );
      return;
    }
    if (isRecentlyDismissed()) return;

    let cancelled = false;

    (async () => {
      try {
        await loadGisScript();
        if (cancelled || !window.google?.accounts?.id) return;

        const rawNonce = generateRawNonce();
        const hashedNonce = await sha256Hex(rawNonce);

        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          auto_select: false,
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: true,
          itp_support: true,
          callback: async (response) => {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce: rawNonce,
            });
            if (error) {
              console.error("[GoogleOneTap] signInWithIdToken failed", error);
              return;
            }
            setLastAuthMethod("google");
            onSuccess?.();
          },
        });

        window.google.accounts.id.prompt((notification) => {
          // User explicitly dismissed → suppress for 24h.
          if (notification.isDismissedMoment()) {
            const reason = notification.getDismissedReason();
            if (reason === "user_cancel" || reason === "tap_outside") {
              markDismissed();
            }
          }
        });
      } catch (e) {
        console.error("[GoogleOneTap] init failed", e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id.cancel();
      } catch {
        // Library not loaded — no-op.
      }
    };
  }, [disabled, onSuccess]);

  // This component renders nothing — GIS injects its own iframe into the
  // top-right corner of the viewport.
  return null;
};
