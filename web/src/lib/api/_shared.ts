/**
 * Shared infrastructure for every domain-specific query file in this folder.
 * Consumers should import from `queries.ts` (the public barrel) — not this
 * file directly. The leading underscore is a convention for "internal".
 */

import { supabase } from "@/lib/supabase";
import { deleteFromStorage } from "../upload";

// Re-export so domain files can grab the client + storage helper from one
// place without restating the path each time.
export { supabase, deleteFromStorage };

/**
 * Local YYYY-MM-DD bucketing for time-series queries — respects the user's
 * timezone, used by play-trend / download-trend aggregations.
 */
export function toLocalDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

/**
 * Generic full-table paginated read. Supabase's PostgREST defaults cap a
 * single SELECT at 1000 rows; this loops `range()` until the table is
 * exhausted (or `maxPages` is hit, as a safety belt for ever-growing tables
 * we forgot to optimize).
 *
 * Used by:
 *  - `getAllMadhaatMinimal` / `getAllMadhaatForReplace` in tracks.ts
 *  - `fetchPlaysSince` in analytics.ts
 *  - `getAnalyticsSummary` in analytics.ts
 *
 * @param query   A function returning a fresh PostgREST query builder for a
 *                given page (`range(from, to)` will be appended). Make this
 *                a closure rather than a single builder so the call doesn't
 *                accumulate filters across pages.
 * @param pageSize  Rows per request (default 1000 — PostgREST max).
 * @param maxPages  Safety belt; defaults to 100 (= 100k rows). Increase
 *                  cautiously — at this point the right move is usually a
 *                  SQL aggregate function, not bigger client-side scans.
 */
export async function paginate<T>(
  query: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  options?: { pageSize?: number; maxPages?: number }
): Promise<T[]> {
  const pageSize = options?.pageSize ?? 1000;
  const maxPages = options?.maxPages ?? 100;
  const rows: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await query(from, to);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}
