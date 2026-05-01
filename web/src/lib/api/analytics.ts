/**
 * Platform analytics — admin-only reads that aggregate `user_plays`,
 * `user_favorites`, `download_events`, and `user_profiles` for the
 * dashboard analytics section.
 *
 * Audit context: many of these still client-side-aggregate paginated
 * full-table scans (the "10k row safety belt" pattern). At the dashboard's
 * current data volume that's fine; once `user_plays` crosses ~1M rows the
 * right move is a SQL aggregate RPC (e.g. `play_stats(since, until)`).
 */

import { paginate, supabase, toLocalDay } from "./_shared";

// ============================================================================
// Plays-derived: paginated `user_plays` since a timestamp
// ============================================================================

/**
 * Paginated fetch of `user_plays` rows since a given ISO timestamp.
 * Internal helper used by `getPlaysTrend` — uses the generic `paginate`
 * helper underneath. Kept as a tiny wrapper so callers don't have to
 * reach for the helper themselves.
 */
async function fetchPlaysSince<T>(
  sinceIso: string,
  columns: string
): Promise<T[]> {
  return paginate<T>((from, to) =>
    supabase
      .from("v_user_plays_external")
      .select(columns)
      .gte("played_at", sinceIso)
      .range(from, to)
  );
}

// ============================================================================
// Top-level summary card (counts + trend %)
// ============================================================================

export async function getAnalyticsSummary() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const [
    { count: madhaCount },
    { count: madihCount },
    { count: rawiCount },
    allPlays,
  ] = await Promise.all([
    supabase.from("madha").select("*", { count: "exact", head: true }),
    supabase.from("madiheen").select("*", { count: "exact", head: true }),
    supabase.from("ruwat").select("*", { count: "exact", head: true }),
    paginate<{ played_at: string; duration_seconds: number | null }>(
      (from, to) =>
        supabase
          .from("v_user_plays_external")
          .select("played_at, duration_seconds")
          .range(from, to)
    ),
  ]);

  // Trend: plays last 7d vs prev 7d.
  let thisWeek = 0;
  let prevWeek = 0;
  let thisWeekDuration = 0;
  let prevWeekDuration = 0;
  const sevenMs = sevenDaysAgo.getTime();
  const fourteenMs = fourteenDaysAgo.getTime();
  for (const p of allPlays) {
    const t = new Date(p.played_at).getTime();
    if (t >= sevenMs) {
      thisWeek++;
      thisWeekDuration += p.duration_seconds || 0;
    } else if (t >= fourteenMs) {
      prevWeek++;
      prevWeekDuration += p.duration_seconds || 0;
    }
  }

  const pctChange = (curr: number, prev: number): string => {
    if (prev === 0) return curr > 0 ? "+100%" : "0%";
    const pct = Math.round(((curr - prev) / prev) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}%`;
  };

  return {
    madhaCount: madhaCount || 0,
    madihCount: madihCount || 0,
    rawiCount: rawiCount || 0,
    totalPlays: allPlays.length,
    totalDuration: allPlays.reduce(
      (acc, p) => acc + (p.duration_seconds || 0),
      0
    ),
    playsTrendPct: pctChange(thisWeek, prevWeek),
    durationTrendPct: pctChange(thisWeekDuration, prevWeekDuration),
  };
}

// ============================================================================
// Plays trend (daily buckets, last N days)
// ============================================================================

/**
 * Per-day play count + total minutes for the last `days` days, zero-filled.
 * The chart card on the dashboard reads `count` for the plays trend and
 * `minutes` for the listening-time chart (with a unit toggle).
 */
export async function getPlaysTrend(days = 14) {
  // Snap window start to start-of-day, days-1 back so the range spans
  // exactly `days` days inclusive.
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const rows = await fetchPlaysSince<{
    played_at: string;
    duration_seconds: number | null;
  }>(start.toISOString(), "played_at, duration_seconds");

  // Bucket by local date — track both play count and listened seconds.
  const counts = new Map<string, number>();
  const seconds = new Map<string, number>();
  for (const r of rows) {
    const day = toLocalDay(r.played_at);
    counts.set(day, (counts.get(day) ?? 0) + 1);
    // Plays from early installs may have NULL duration; treat as 0
    // minutes contributed rather than poisoning the sum.
    seconds.set(day, (seconds.get(day) ?? 0) + (r.duration_seconds ?? 0));
  }

  // Zero-fill the full window so the chart always renders `days` evenly-
  // spaced points.
  const result: { date: string; count: number; minutes: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toLocaleDateString("en-CA");
    result.push({
      date: key,
      count: counts.get(key) ?? 0,
      minutes: Math.round((seconds.get(key) ?? 0) / 60),
    });
  }
  return result;
}

// ============================================================================
// Engagement metrics
// ============================================================================

export interface EngagementMetrics {
  uniqueListeners: number;
  completionRate: number; // 0–100
  avgDurationSeconds: number;
  deviceBreakdown: Record<string, number>;
  totalFavorites: number;
}

export async function getEngagementMetrics(): Promise<EngagementMetrics> {
  type PlayRow = {
    user_id: string | null;
    duration_seconds: number | null;
    completed: boolean | null;
    device_type: string | null;
  };

  const playRows = await paginate<PlayRow>((from, to) =>
    supabase
      .from("v_user_plays_external")
      .select("user_id, duration_seconds, completed, device_type")
      .range(from, to)
  );

  const uniqueUsers = new Set<string>();
  let completedCount = 0;
  let totalDuration = 0;
  const devices: Record<string, number> = {};
  for (const r of playRows) {
    if (r.user_id) uniqueUsers.add(r.user_id);
    if (r.completed) completedCount++;
    totalDuration += r.duration_seconds || 0;
    const d = (r.device_type || "unknown").toLowerCase();
    devices[d] = (devices[d] || 0) + 1;
  }

  const totalPlays = playRows.length;
  const completionRate =
    totalPlays > 0 ? Math.round((completedCount / totalPlays) * 100) : 0;
  const avgDurationSeconds =
    totalPlays > 0 ? Math.round(totalDuration / totalPlays) : 0;

  const { count: favCount, error: favErr } = await supabase
    .from("v_user_favorites_external")
    .select("*", { count: "exact", head: true });
  if (favErr) throw favErr;

  return {
    uniqueListeners: uniqueUsers.size,
    completionRate,
    avgDurationSeconds,
    deviceBreakdown: devices,
    totalFavorites: favCount || 0,
  };
}

// ============================================================================
// Trending tracks this week
// ============================================================================

export interface TrendingTrack {
  trackId: string;
  title: string;
  playCount: number;
}

/**
 * Top N tracks by play count in the last `days` days. Uses the
 * SECURITY DEFINER RPC `get_trending_tracks` so it bypasses RLS, then
 * supplements ranks with raw play counts from `user_plays`.
 */
export async function getTrendingThisWeek(
  days = 7,
  limit = 5
): Promise<TrendingTrack[]> {
  // 1) Get the ranked track list via the RPC (bypasses RLS).
  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    "get_trending_tracks",
    { days_window: days, max_results: limit }
  );
  if (rpcErr) throw rpcErr;

  type TrackRow = { id: string; title: string };
  const tracks = (rpcData || []) as unknown as TrackRow[];
  if (tracks.length === 0) return [];

  // 2) Supplement with play counts from user_plays.
  const counts = new Map<string, number>();
  try {
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    const ids = tracks.map((t) => t.id);

    const events = await paginate<{ track_id: string }>((from, to) =>
      supabase
        .from("v_user_plays_external")
        .select("track_id")
        .in("track_id", ids)
        .gte("played_at", start.toISOString())
        .range(from, to)
    );

    for (const e of events) {
      if (!e.track_id) continue;
      counts.set(e.track_id, (counts.get(e.track_id) || 0) + 1);
    }
  } catch {
    // Ignore — keep counts empty, RPC order preserves the ranking.
  }

  return tracks.map((t) => ({
    trackId: t.id,
    title: t.title,
    playCount: counts.get(t.id) || 0,
  }));
}

// ============================================================================
// Top favorited tracks
// ============================================================================

export interface FavoritedTrack {
  trackId: string;
  title: string;
  favCount: number;
}

export async function getTopFavorited(
  limit = 5
): Promise<FavoritedTrack[]> {
  const favRows = await paginate<{ track_id: string }>((from, to) =>
    supabase.from("v_user_favorites_external").select("track_id").range(from, to)
  );

  const counts = new Map<string, number>();
  for (const f of favRows) {
    if (!f.track_id) continue;
    counts.set(f.track_id, (counts.get(f.track_id) || 0) + 1);
  }

  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (top.length === 0) return [];

  const ids = top.map((t) => t[0]);
  const { data: tracks, error: tErr } = await supabase
    .from("madha")
    .select("id, title")
    .in("id", ids);
  if (tErr) throw tErr;

  type TitleRow = { id: string; title: string };
  const titleMap = new Map(
    ((tracks || []) as unknown as TitleRow[]).map((t) => [t.id, t.title])
  );
  return top.map(([trackId, favCount]) => ({
    trackId,
    title: titleMap.get(trackId) || "—",
    favCount,
  }));
}

// ============================================================================
// User activity (DAU / MAU / new this month / total)
// ============================================================================

export interface UserActivity {
  activeThisWeek: number;
  activeThisMonth: number;
  newThisMonth: number;
  totalUsers: number;
}

export async function getUserActivity(): Promise<UserActivity> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // All four queries exclude internal team accounts. We use `.eq("is_internal", false)`
  // (not `.neq("is_internal", true)`) because the column is NOT NULL with
  // default FALSE, so this is a clean equality lookup that hits the
  // partial index on is_internal.
  const [
    { count: activeThisWeek },
    { count: activeThisMonth },
    { count: newThisMonth },
    { count: totalUsers },
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_internal", false)
      .gte("last_active_at", sevenDaysAgo.toISOString()),
    supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_internal", false)
      .gte("last_active_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_internal", false)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_internal", false),
  ]);

  return {
    activeThisWeek: activeThisWeek || 0,
    activeThisMonth: activeThisMonth || 0,
    newThisMonth: newThisMonth || 0,
    totalUsers: totalUsers || 0,
  };
}

// ============================================================================
// Content health (data-completeness percentages per field)
// ============================================================================

export async function getContentHealth() {
  const { data: madhaat, error } = (await supabase
    .from("madha")
    .select("lyrics, madih_id, rawi_id, image_url, audio_url")) as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[];
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);

  const total = madhaat.length;
  if (total === 0) {
    return {
      lyricsPct: 0,
      madihPct: 0,
      rawiPct: 0,
      imagePct: 0,
      audioPct: 0,
      totalCount: 0,
    };
  }

  const stats = madhaat.reduce(
    (acc, m) => {
      if (m.lyrics) acc.lyrics++;
      if (m.madih_id) acc.madih++;
      if (m.rawi_id) acc.rawi++;
      if (m.image_url) acc.image++;
      if (m.audio_url) acc.audio++;
      return acc;
    },
    { lyrics: 0, madih: 0, rawi: 0, image: 0, audio: 0 }
  );

  return {
    lyricsPct: Math.round((stats.lyrics / total) * 100),
    madihPct: Math.round((stats.madih / total) * 100),
    rawiPct: Math.round((stats.rawi / total) * 100),
    imagePct: Math.round((stats.image / total) * 100),
    audioPct: Math.round((stats.audio / total) * 100),
    totalCount: total,
  };
}

// ============================================================================
// Download analytics
// ============================================================================

export interface DownloadAnalytics {
  totalDownloads: number;
  uniqueTracksDownloaded: number;
  downloadsLast7Days: number;
  downloadsLast30Days: number;
  topDownloadedTracks: {
    trackId: string;
    title: string;
    downloadCount: number;
  }[];
  downloadsByDevice: { device: string; count: number }[];
  dailyTrend: { date: string; count: number }[];
}

export async function getDownloadAnalytics(
  trendDays = 14
): Promise<DownloadAnalytics> {
  type DownloadRow = {
    track_id: string;
    device_type: string | null;
    downloaded_at: string;
  };

  const rows = await paginate<DownloadRow>((from, to) =>
    supabase
      .from("v_download_events_external")
      .select("track_id, device_type, downloaded_at")
      .range(from, to)
  );

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const trendStart = new Date(now);
  trendStart.setDate(now.getDate() - (trendDays - 1));
  trendStart.setHours(0, 0, 0, 0);

  let last7 = 0;
  let last30 = 0;
  const trackCounts = new Map<string, number>();
  const devices: Record<string, number> = {};
  const dailyCounts = new Map<string, number>();
  const uniqueTracks = new Set<string>();

  for (const r of rows) {
    const t = new Date(r.downloaded_at).getTime();
    if (t >= sevenDaysAgo.getTime()) last7++;
    if (t >= thirtyDaysAgo.getTime()) last30++;

    uniqueTracks.add(r.track_id);
    trackCounts.set(r.track_id, (trackCounts.get(r.track_id) || 0) + 1);

    const d = (r.device_type || "unknown").toLowerCase();
    devices[d] = (devices[d] || 0) + 1;

    if (t >= trendStart.getTime()) {
      const day = toLocalDay(r.downloaded_at);
      dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
    }
  }

  // Zero-fill daily trend.
  const dailyTrend: { date: string; count: number }[] = [];
  for (let i = 0; i < trendDays; i++) {
    const d = new Date(trendStart);
    d.setDate(trendStart.getDate() + i);
    const key = d.toLocaleDateString("en-CA");
    dailyTrend.push({ date: key, count: dailyCounts.get(key) || 0 });
  }

  // Top 10 downloaded tracks.
  const topTrackIds = Array.from(trackCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let topDownloadedTracks: {
    trackId: string;
    title: string;
    downloadCount: number;
  }[] = [];
  if (topTrackIds.length > 0) {
    const ids = topTrackIds.map(([id]) => id);
    const { data: tracks } = await supabase
      .from("madha")
      .select("id, title")
      .in("id", ids);
    type TitleRow = { id: string; title: string };
    const titleMap = new Map(
      ((tracks || []) as unknown as TitleRow[]).map((t) => [t.id, t.title])
    );
    topDownloadedTracks = topTrackIds.map(([trackId, downloadCount]) => ({
      trackId,
      title: titleMap.get(trackId) || "—",
      downloadCount,
    }));
  }

  const downloadsByDevice = Object.entries(devices)
    .sort((a, b) => b[1] - a[1])
    .map(([device, count]) => ({ device, count }));

  return {
    totalDownloads: rows.length,
    uniqueTracksDownloaded: uniqueTracks.size,
    downloadsLast7Days: last7,
    downloadsLast30Days: last30,
    topDownloadedTracks,
    downloadsByDevice,
    dailyTrend,
  };
}
