/**
 * Curated collections (admin-built playlists). Reads + CRUD.
 * Tracks come back via the `get_collection_tracks` RPC for ordered joins.
 */

import type {
  Collection,
  CollectionInsert,
  MadhaWithRelations,
} from "@/types/database";

import { supabase } from "./_shared";

// ============================================================================
// Reads
// ============================================================================

/**
 * Active collections only — for the user-facing home rail. Joins
 * `collection_items` to expose track_ids so the UI can render preview
 * thumbnails without a second round trip.
 */
export async function getActiveCollections(): Promise<
  (Collection & {
    item_count: number;
    collection_items: { track_id: string }[];
  })[]
> {
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_items(track_id)")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return (
    (data as unknown as (Collection & {
      item_count: number;
      collection_items: { track_id: string }[];
    })[]) || []
  );
}

/** Admin variant — returns all collections including inactive ones. */
export async function getAdminCollections(): Promise<
  (Collection & { collection_items: { track_id: string }[] })[]
> {
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_items(track_id)")
    .order("display_order");

  if (error) throw error;
  return (
    (data as unknown as (Collection & {
      collection_items: { track_id: string }[];
    })[]) || []
  );
}

export async function getCollectionById(
  id: string
): Promise<Collection | null> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Tracks for a collection in their curated order (the join order is
 * controlled by `collection_items.position`).
 */
export async function getCollectionItems(
  collectionId: string
): Promise<MadhaWithRelations[]> {
  const { data, error } = await supabase.rpc("get_collection_tracks", {
    p_collection_id: collectionId,
  });

  if (error) throw error;
  return (data as unknown as MadhaWithRelations[]) || [];
}

// ============================================================================
// CRUD
// ============================================================================

export async function createCollection(
  collection: Partial<CollectionInsert>,
  trackIds: string[]
): Promise<void> {
  // 1) Insert the collection row.
  const { data: newCollection, error: collectionError } = await supabase
    .from("collections")
    .insert([
      {
        name: collection.name!,
        description: collection.description || null,
        image_url: collection.image_url || null,
        is_active: collection.is_active ?? true,
        display_order: collection.display_order || 0,
      },
    ])
    .select()
    .single();

  if (collectionError) throw collectionError;

  // 2) Insert the items, preserving order.
  if (trackIds.length > 0) {
    const items = trackIds.map((madhaId, index) => ({
      collection_id: newCollection!.id,
      track_id: madhaId,
      position: index,
    }));

    const { error: itemsError } = await supabase
      .from("collection_items")
      .insert(items);

    if (itemsError) throw itemsError;
  }
}

/**
 * Update a collection's metadata and (optionally) replace its track list.
 * If `trackIds` is undefined, items are left untouched. If it's an empty
 * array, all items are removed. The replacement strategy is delete-all-
 * then-insert so position numbering stays a clean 0..N-1.
 */
export async function updateCollection(
  id: string,
  updates: Partial<CollectionInsert>,
  trackIds?: string[]
): Promise<void> {
  const { error } = await supabase
    .from("collections")
    .update(updates)
    .eq("id", id);
  if (error) throw error;

  if (trackIds !== undefined) {
    const { error: deleteError } = await supabase
      .from("collection_items")
      .delete()
      .eq("collection_id", id);

    if (deleteError) throw deleteError;

    if (trackIds.length > 0) {
      const items = trackIds.map((madhaId, index) => ({
        collection_id: id,
        track_id: madhaId,
        position: index,
      }));

      const { error: insertError } = await supabase
        .from("collection_items")
        .insert(items);

      if (insertError) throw insertError;
    }
  }
}
