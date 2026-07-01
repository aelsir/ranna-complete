/**
 * Onboarding effectiveness — admin-only reads powering /dashboard/onboarding.
 *
 * Everything here answers ONE question: do new users discover and use the
 * features the onboarding teaches? The cohort is "external users created in
 * the window"; each metric is computed against that cohort.
 *
 * Scope note: the onboarding FUNNEL itself (step views, skips, tour
 * completion) is instrumented as Mixpanel events in the Flutter app —
 * those numbers live in Mixpanel, not in this database. The page renders
 * that section as a Mixpanel-ready placeholder until the integration lands.
 */

import { paginate, supabase } from "./_shared";

export interface FeatureAdoption {
  /** Stable key: lyrics | download | favorite | follow */
  key: string;
  /** Cohort members who used the feature at least once in the window. */
  users: number;
  /** users / cohortSize, rounded percentage (0 when cohort is empty). */
  pct: number;
  /**
   * True when the read failed (most likely RLS — e.g. the user_follows
   * admin-read migration hasn't been pushed yet). The UI shows "—" instead
   * of a misleading 0.
   */
  unavailable?: boolean;
}

export interface OnboardingEffectiveness {
  windowDays: number;
  /** External (non-internal) users created inside the window. */
  cohortSize: number;
  /** Cohort members with ≥1 play after signing up. */
  activated: number;
  activationPct: number;
  /** Median minutes between signup and first play (null = no data). */
  medianMinutesToFirstPlay: number | null;
  adoption: FeatureAdoption[];
}

/** user_id → earliest event time, from rows that may have null user_ids. */
function earliestByUser(
  rows: Array<{ user_id: string | null; at: string }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.user_id) continue;
    const t = new Date(r.at).getTime();
    const prev = map.get(r.user_id);
    if (prev === undefined || t < prev) map.set(r.user_id, t);
  }
  return map;
}

async function fetchEventTimes(
  table:
    | "v_user_plays_external"
    | "lyrics_views"
    | "v_download_events_external"
    | "v_user_favorites_external"
    | "user_follows",
  timeColumn: string,
  sinceIso: string
): Promise<Map<string, number> | null> {
  try {
    const rows = await paginate<Record<string, string | null>>((from, to) =>
      supabase
        // The param mixes tables and views, which `.from()`'s overloads keep
        // separate; assert one branch — row typing comes from paginate<T>.
        .from(table as "lyrics_views" | "user_follows")
        .select(`user_id, ${timeColumn}`)
        .gte(timeColumn, sinceIso)
        .range(from, to)
    );
    return earliestByUser(
      rows.map((r) => ({
        user_id: r.user_id ?? null,
        at: r[timeColumn] as string,
      }))
    );
  } catch {
    // RLS denial or missing relation — surface as "unavailable", not zero.
    return null;
  }
}

export async function getOnboardingEffectiveness(
  windowDays = 30
): Promise<OnboardingEffectiveness> {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  // ── Cohort: new external users in the window ──
  const cohortRows = await paginate<{ id: string; created_at: string }>(
    (from, to) =>
      supabase
        .from("user_profiles")
        .select("id, created_at")
        .eq("is_internal", false)
        .gte("created_at", sinceIso)
        .range(from, to)
  );
  const cohort = new Map(
    cohortRows.map((u) => [u.id, new Date(u.created_at).getTime()])
  );

  // ── Feature events since the window start, in parallel ──
  const [plays, lyrics, downloads, favorites, follows] = await Promise.all([
    fetchEventTimes("v_user_plays_external", "played_at", sinceIso),
    fetchEventTimes("lyrics_views", "viewed_at", sinceIso),
    fetchEventTimes("v_download_events_external", "downloaded_at", sinceIso),
    fetchEventTimes("v_user_favorites_external", "created_at", sinceIso),
    fetchEventTimes("user_follows", "created_at", sinceIso),
  ]);

  // ── Activation: first play at-or-after signup ──
  const minutesToFirstPlay: number[] = [];
  let activated = 0;
  if (plays) {
    for (const [userId, createdAt] of cohort) {
      const firstPlay = plays.get(userId);
      if (firstPlay === undefined) continue;
      activated++;
      // Clock skew between client-stamped events can put the first play
      // a hair before created_at — clamp to zero rather than discard.
      minutesToFirstPlay.push(Math.max(0, (firstPlay - createdAt) / 60_000));
    }
  }
  minutesToFirstPlay.sort((a, b) => a - b);
  const median =
    minutesToFirstPlay.length === 0
      ? null
      : minutesToFirstPlay[Math.floor(minutesToFirstPlay.length / 2)];

  const pctOfCohort = (n: number) =>
    cohort.size === 0 ? 0 : Math.round((n / cohort.size) * 100);

  const adoptionOf = (
    key: string,
    events: Map<string, number> | null
  ): FeatureAdoption => {
    if (events === null) return { key, users: 0, pct: 0, unavailable: true };
    let users = 0;
    for (const userId of cohort.keys()) {
      if (events.has(userId)) users++;
    }
    return { key, users, pct: pctOfCohort(users) };
  };

  return {
    windowDays,
    cohortSize: cohort.size,
    activated,
    activationPct: pctOfCohort(activated),
    medianMinutesToFirstPlay: median,
    adoption: [
      adoptionOf("lyrics", lyrics),
      adoptionOf("download", downloads),
      adoptionOf("favorite", favorites),
      adoptionOf("follow", follows),
    ],
  };
}
