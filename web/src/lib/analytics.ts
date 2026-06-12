/**
 * Analytics wrapper — all event tracking goes through here.
 * Currently backed by PostHog + Mixpanel. Change this one file to swap providers.
 */

import posthog from "posthog-js";
import mixpanel from "mixpanel-browser";

let posthogInitialized = false;
let mixpanelInitialized = false;

/**
 * Initialize analytics providers. Call once at app startup.
 * Safe to call multiple times — only initializes once.
 */
export function initAnalytics() {
  // ── PostHog ───────────────────────────────────────────────────────────
  if (!posthogInitialized) {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    const host = import.meta.env.VITE_POSTHOG_HOST;

    if (key) {
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
      posthogInitialized = true;
    } else {
      console.warn("[analytics] VITE_POSTHOG_KEY not set — PostHog disabled");
    }
  }

  // ── Mixpanel ──────────────────────────────────────────────────────────
  if (!mixpanelInitialized) {
    const token = import.meta.env.VITE_MIXPANEL_TOKEN;
    const apiHost = import.meta.env.VITE_MIXPANEL_API_HOST;

    if (token) {
      mixpanel.init(token, {
        autocapture: true,
        record_sessions_percent: 100,
        api_host: apiHost || "https://api-eu.mixpanel.com",
        persistence: "localStorage",
      });
      mixpanelInitialized = true;
    } else {
      console.warn("[analytics] VITE_MIXPANEL_TOKEN not set — Mixpanel disabled");
    }
  }
}

/**
 * Track a custom event. Fire-and-forget — never blocks UI.
 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  try {
    if (posthogInitialized) {
      posthog.capture(event, properties);
    }
  } catch (_) {
    // Non-critical — never interrupt the app
  }
  try {
    if (mixpanelInitialized) {
      mixpanel.track(event, properties);
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
    if (posthogInitialized) {
      posthog.capture("$pageview", { $current_url: window.location.href, path });
    }
  } catch (_) {}
  // Mixpanel autocapture handles page views automatically
}

/**
 * Identify a logged-in user. Call on auth state change.
 */
export function identifyUser(userId: string, properties?: Record<string, any>) {
  try {
    if (posthogInitialized) {
      posthog.identify(userId, properties);
    }
  } catch (_) {}
  try {
    if (mixpanelInitialized) {
      mixpanel.identify(userId);
      if (properties) {
        mixpanel.people.set(properties);
      }
    }
  } catch (_) {}
}

/**
 * Reset user identity (on logout).
 */
export function resetUser() {
  try {
    if (posthogInitialized) {
      posthog.reset();
    }
  } catch (_) {}
  try {
    if (mixpanelInitialized) {
      mixpanel.reset();
    }
  } catch (_) {}
}
