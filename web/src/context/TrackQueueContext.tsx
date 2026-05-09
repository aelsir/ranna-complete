import { createContext, useContext, useMemo, ReactNode } from "react";

/**
 * Provides the current "list of tracks the user is browsing" to every
 * `<TrackRow>` in its subtree, so each row plays *as part of that list*
 * and auto-advances to the next track when the current one finishes.
 *
 * Usage — wrap each list section once:
 *
 * ```tsx
 * <TrackQueueProvider trackIds={tracks.map(t => t.id)}>
 *   {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} />)}
 * </TrackQueueProvider>
 * ```
 *
 * `<TrackRow>` reads from this context automatically when its
 * `contextQueue` prop is not provided. Lists no longer have to pass
 * `contextQueue={queue}` to every row — **wrapping is the API**.
 *
 * The "streamline" of the original design: instead of every list parent
 * remembering `contextQueue` per item (an opt-in pattern that rotted —
 * `RecentlyAdded`, `TrendingTracks`, `ContinueListening`, `ProfilePage`'s
 * row list all forgot), the queue is established once at the list level
 * and inherited by every child row.
 */

interface TrackQueueContextValue {
  /** Ordered track IDs. Auto-advance plays them in this order. */
  trackIds: string[];
}

const TrackQueueContext = createContext<TrackQueueContextValue | null>(null);

interface TrackQueueProviderProps {
  trackIds: string[];
  children: ReactNode;
}

export function TrackQueueProvider({
  trackIds,
  children,
}: TrackQueueProviderProps) {
  // Memoize so children don't re-render when the parent re-renders with
  // an equivalent (but newly-allocated) array. Identity check on the
  // array contents — joins to a string for cheap comparison; track IDs
  // are short UUIDs so this is fine at typical list sizes.
  const value = useMemo<TrackQueueContextValue>(
    () => ({ trackIds }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackIds.join(",")]
  );

  return (
    <TrackQueueContext.Provider value={value}>
      {children}
    </TrackQueueContext.Provider>
  );
}

/**
 * Returns the surrounding queue's track IDs, or `null` if there's no
 * provider above. Returning `null` (not throwing) is deliberate — a
 * `<TrackRow>` outside any provider still works, it just plays as a
 * single-track queue.
 */
export function useTrackQueue(): string[] | null {
  const ctx = useContext(TrackQueueContext);
  return ctx?.trackIds ?? null;
}
