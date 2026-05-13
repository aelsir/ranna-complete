/**
 * Hero images for the landing-page banner.
 *
 * - Public clients (web + Flutter) read active rows ordered by display_order.
 * - Admins read/write the full table (incl. inactive) — RLS guarantees.
 * - The image_url is a *relative* R2 path; clients resolve it via
 *   `getImageUrl()` at render time.
 */

import type { HeroImage, HeroImageInsert } from "@/types/database";

import { supabase } from "./_shared";

// ============================================================================
// Reads
// ============================================================================

/** Public read: only active heroes, ordered by display_order ascending. */
export async function getActiveHeroImages(): Promise<HeroImage[]> {
  const { data, error } = await supabase
    .from("hero_images")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data as HeroImage[]) || [];
}

/** Admin read: every row, ordered by display_order. */
export async function getAllHeroImages(): Promise<HeroImage[]> {
  const { data, error } = await supabase
    .from("hero_images")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data as HeroImage[]) || [];
}

// ============================================================================
// CRUD
// ============================================================================

export async function createHeroImage(
  input: HeroImageInsert,
): Promise<HeroImage> {
  // Append to the end by default — admins re-order afterwards.
  let nextOrder = input.display_order;
  if (nextOrder === undefined) {
    const { data: maxRow } = await supabase
      .from("hero_images")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextOrder = (maxRow?.display_order ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("hero_images")
    .insert([{ ...input, display_order: nextOrder }])
    .select()
    .single();

  if (error) throw error;
  return data as HeroImage;
}

export async function updateHeroImage(
  id: string,
  updates: Partial<HeroImageInsert>,
): Promise<void> {
  const { error } = await supabase
    .from("hero_images")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteHeroImage(id: string): Promise<void> {
  const { error } = await supabase
    .from("hero_images")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Swap two heroes' display_order. Used by the Up/Down arrows in the
 *  dashboard. Two writes; no transaction needed since admins are
 *  the only writers and conflicts are vanishingly rare. */
export async function swapHeroImageOrder(
  a: { id: string; display_order: number },
  b: { id: string; display_order: number },
): Promise<void> {
  // Two-step swap via a temporary out-of-band value to avoid any future
  // UNIQUE(display_order) constraint surprises.
  const TEMP = -1_000_000 - a.display_order;
  let { error } = await supabase
    .from("hero_images")
    .update({ display_order: TEMP })
    .eq("id", a.id);
  if (error) throw error;

  ({ error } = await supabase
    .from("hero_images")
    .update({ display_order: a.display_order })
    .eq("id", b.id));
  if (error) throw error;

  ({ error } = await supabase
    .from("hero_images")
    .update({ display_order: b.display_order })
    .eq("id", a.id));
  if (error) throw error;
}
