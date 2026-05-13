/**
 * Public barrel for every Supabase-backed query function in the dashboard.
 *
 * This file used to be a 1,473-line monolith. It's now a re-export barrel
 * so existing call sites (`import { getApprovedMadhaat } from "@/lib/api/queries"`)
 * keep working without import edits.
 *
 * New code should import the domain files directly for clearer dependency
 * graphs and tree-shaking:
 *   * `tracks.ts`       — track read / CRUD / featured / popular / trending
 *   * `people.ts`       — artists (madiheen) + narrators (ruwat)
 *   * `categories.ts`   — turuq + funun
 *   * `collections.ts`  — playlists (read + CRUD)
 *   * `library.ts`      — per-user favorites, listening history, recordPlay
 *   * `search.ts`       — `searchAll` multi-bucket search RPC
 *   * `home.ts`         — `getHomePageData` aggregate
 *   * `analytics.ts`    — admin analytics (summary, trends, engagement, etc.)
 *   * `_shared.ts`      — supabase client + `paginate<T>` + `toLocalDay`
 */

export * from "./tracks";
export * from "./people";
export * from "./categories";
export * from "./collections";
export * from "./hero_images";
export * from "./library";
export * from "./search";
export * from "./home";
export * from "./analytics";
