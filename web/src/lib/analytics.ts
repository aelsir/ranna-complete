/**
 * Analytics wrapper — all event tracking goes through here.
 * Currently backed by PostHog. Change this one file to swap providers.
 */

import posthog from "posthog-js";

let initialized = false;

/**
 * Initialize PostHog. Call once at app startup.
 * Safe to call multiple times — only initializes once.
 */
export function initAnalytics() {
  if (initialized) return;

  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;

  if (!key) {
    console.warn("[analytics] VITE_POSTHOG_KEY not set — analytics disabled");
    return;
  }

  posthog.init(key, {
    api_host: host || "https://us.i.posthog.com",
    // Don't auto-capture everything — we'll be explicit about what to track
    autocapture: false,
    // Capture pageviews manually via React Router
    capture_pageview: false,
    // Respect Do Not Track
    respect_dnt: true,
    // Session recording (free tier includes some)
    disable_session_recording: false,
    // Persist across sessions
    persistence: "localStorage+cookie",
  });

  initialized = true;
}

/**
 * Track a custom event. Fire-and-forget — never blocks UI.
 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  try {
    if (initialized) {
      posthog.capture(event, properties);
    }
  } catch (_) {
    // Non-critical — never interrupt the app
  }
}

/**
 * Track a page view. Call on route changes.
 */
export function trackPageView(path: string) {
  try {
    if (initialized) {
      posthog.capture("$pageview", { $current_url: window.location.href, path });
    }
  } catch (_) {}
}

/**
 * Identify a logged-in user. Call on auth state change.
 */
export function identifyUser(userId: string, properties?: Record<string, any>) {
  try {
    if (initialized) {
      posthog.identify(userId, properties);
    }
  } catch (_) {}
}

/**
 * Reset user identity (on logout).
 */
export function resetUser() {
  try {
    if (initialized) {
      posthog.reset();
    }
  } catch (_) {}
}
