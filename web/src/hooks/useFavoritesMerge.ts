import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const LOCAL_KEY = "ranna_favorites";

/**
 * One-shot favorites migration hook.
 *
 * Runs once per `user.id` whenever the user becomes known. On first-ever
 * anon bootstrap this uploads any favorites that were already in localStorage
 * (from before auth landed) to the server. On anon→real-email upgrade,
 * Supabase preserves the UUID so this re-run is effectively a no-op (server
 * already has everything), but the write-back to localStorage is still
 * useful to keep the local cache in sync.
 *
 * Algorithm:
 * 1. Read `localStorage.ranna_favorites`.
 * 2. Fetch server favorites for the current user.
 * 3. Union local + server; upsert any local-only rows.
 * 4. Write the union back to localStorage so `PlayerContext` sees it on
 *    its next mount.
 *
 * Idempotent — safe to re-run (`upsert` with ON CONFLICT DO NOTHING).
 */
export const useFavoritesMerge = () => {
  const { user, loading } = useAuth();
  const didRunForUserRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (didRunForUserRef.current.has(user.id)) return;
    didRunForUserRef.current.add(user.id);

    const run = async () => {
      // 1. Read local favorites.
      let local: string[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        local = raw ? (JSON.parse(raw) as string[]) : [];
      } catch {
        local = [];
      }

      // 2. Fetch server favorites.
      const { data: serverRows, error: fetchErr } = await supabase
        .from("user_favorites")
        .select("track_id")
        .eq("user_id", user.id);
      if (fetchErr) {
        console.warn("[favorites-merge] server fetch failed", fetchErr);
        return;
      }
      const server = (serverRows ?? []).map((r) => r.track_id as string);

      // 3. Upsert local-only rows.
      const serverSet = new Set(server);
      const localOnly = local.filter((id) => !serverSet.has(id));
      if (localOnly.length > 0) {
        const rows = localOnly.map((track_id) => ({ user_id: user.id, track_id }));
        const { error: upsertErr } = await supabase
          .from("user_favorites")
          .upsert(rows, { onConflict: "user_id,track_id", ignoreDuplicates: true });
        if (upsertErr) {
          console.warn("[favorites-merge] upsert failed", upsertErr);
          return;
        }
      }

      // 4. Write the union back to localStorage.
      const union = Array.from(new Set([...local, ...server]));
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(union));
      } catch {
        // localStorage quota errors are non-fatal.
      }
    };

    void run();
  }, [user, loading]);
};

/**
 * Small mountable component wrapper — lets us invoke the hook from
 * `App.tsx` without converting App into a more complex structure.
 */
const FavoritesMerge = () => {
  useFavoritesMerge();
  return null;
};

export default FavoritesMerge;
