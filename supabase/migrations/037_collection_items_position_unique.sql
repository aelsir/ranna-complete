-- Make collection track ordering bulletproof:
-- 1. Renumber existing rows so each collection's positions are a dense
--    0..N-1 sequence (some legacy rows may all sit at the default 0).
-- 2. Add a UNIQUE constraint so two tracks in the same collection can
--    never end up at the same position.
--
-- The constraint is DEFERRABLE INITIALLY IMMEDIATE so the existing
-- delete-then-reinsert update strategy keeps working, AND any future
-- swap-style update can defer the check to the end of the transaction.

BEGIN;

-- 1) Normalise positions per collection. Preserve the current visible
--    order (existing position first, then added_at as a tie-breaker).
WITH ranked AS (
    SELECT
        collection_id,
        track_id,
        ROW_NUMBER() OVER (
            PARTITION BY collection_id
            ORDER BY position ASC NULLS LAST, added_at ASC
        ) - 1 AS new_pos
    FROM collection_items
)
UPDATE collection_items ci
SET position = ranked.new_pos
FROM ranked
WHERE ci.collection_id = ranked.collection_id
  AND ci.track_id = ranked.track_id
  AND ci.position IS DISTINCT FROM ranked.new_pos;

-- 2) Enforce uniqueness of (collection_id, position).
ALTER TABLE collection_items
    ADD CONSTRAINT collection_items_collection_position_unique
    UNIQUE (collection_id, position)
    DEFERRABLE INITIALLY IMMEDIATE;

COMMIT;
