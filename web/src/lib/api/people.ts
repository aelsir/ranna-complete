/**
 * Artists (مادحون / madiheen) and narrators (رواة / ruwat) — the two
 * "people" entity types in Ranna's content model. Reads come from the
 * `v_artists` / `v_narrators` views which include `track_count`. Writes go
 * to the legacy alias-named tables (`madiheen`, `ruwat`) which front the
 * renamed `artists` / `authors` tables via INSTEAD OF triggers.
 */

import type { Madih, MadihInsert, Rawi, RawiInsert } from "@/types/database";

import { deleteFromStorage, supabase } from "./_shared";

// ============================================================================
// Artists (Madiheen)
// ============================================================================

/** All approved artists, alphabetised by name. */
export async function getApprovedMadiheen(): Promise<
  (Madih & { track_count: number })[]
> {
  const { data, error } = await supabase
    .from("v_artists")
    .select("*")
    .order("name");

  if (error) throw error;
  return (data as unknown as (Madih & { track_count: number })[]) || [];
}

/** Top-N artists by `track_count`, used by the home rail. */
export async function getMadiheenWithMadhaat(limit = 10): Promise<Madih[]> {
  const { data, error } = await supabase
    .from("v_artists")
    .select("*")
    .gt("track_count", 0)
    .order("track_count", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as Madih[]) || [];
}

export async function getMadihById(
  id: string
): Promise<(Madih & { track_count: number }) | null> {
  const { data, error } = await supabase
    .from("v_artists")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Madih & { track_count: number };
}

export async function createMadih(
  data: Partial<MadihInsert>
): Promise<string> {
  const { data: newMadih, error } = await supabase
    .from("madiheen")
    .insert([
      {
        name: data.name!,
        bio: data.bio || null,
        image_url: data.image_url || null,
        birth_year: data.birth_year || null,
        death_year: data.death_year || null,
        is_verified: data.is_verified || false,
        tariqa_id: data.tariqa_id || null,
        status: "approved",
      },
    ])
    .select("id")
    .single();

  if (error) throw error;
  return newMadih!.id;
}

export async function updateMadih(
  id: string,
  updates: Partial<MadihInsert>
): Promise<void> {
  // Strip view-only / non-writable fields. Editing flows often pass the full
  // row from `v_artists` (which includes `track_count`), but writes target
  // the underlying `madiheen` table and PostgREST rejects unknown columns.
  const writable: (keyof MadihInsert)[] = [
    "name",
    "status",
    "bio",
    "image_url",
    "birth_year",
    "death_year",
    "is_verified",
    "tariqa_id",
    "created_by",
  ];
  const payload = Object.fromEntries(
    Object.entries(updates).filter(([k]) =>
      writable.includes(k as keyof MadihInsert)
    )
  );

  const { error } = await supabase
    .from("madiheen")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMadiheen(ids: string[]): Promise<void> {
  const { data: records } = await supabase
    .from("madiheen")
    .select("image_url")
    .in("id", ids);
  const urlsToDelete = records
    ?.map((r) => r.image_url)
    .filter(Boolean) as string[];
  if (urlsToDelete && urlsToDelete.length > 0) {
    await deleteFromStorage(urlsToDelete).catch(console.error);
  }

  const { error } = await supabase.from("madiheen").delete().in("id", ids);
  if (error) throw error;
}

// ============================================================================
// Narrators (Ruwat)
// ============================================================================

/** All approved narrators, alphabetised by name. */
export async function getApprovedRuwat(): Promise<
  (Rawi & { track_count: number })[]
> {
  const { data, error } = await supabase
    .from("v_narrators")
    .select("*")
    .order("name");

  if (error) throw error;
  return (data as unknown as (Rawi & { track_count: number })[]) || [];
}

/** Top-N narrators by `track_count`, used by the home rail. */
export async function getRuwatWithMadhaat(limit = 10): Promise<Rawi[]> {
  const { data, error } = await supabase
    .from("v_narrators")
    .select("*")
    .gt("track_count", 0)
    .order("track_count", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as Rawi[]) || [];
}

export async function getRawiById(
  id: string
): Promise<(Rawi & { track_count: number }) | null> {
  const { data, error } = await supabase
    .from("v_narrators")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Rawi & { track_count: number };
}

export async function createRawi(data: Partial<RawiInsert>): Promise<string> {
  const { data: newRawi, error } = await supabase
    .from("ruwat")
    .insert([
      {
        name: data.name!,
        bio: data.bio || null,
        image_url: data.image_url || null,
        birth_year: data.birth_year || null,
        death_year: data.death_year || null,
        status: "approved",
      },
    ])
    .select("id")
    .single();

  if (error) throw error;
  return newRawi!.id;
}

export async function updateRawi(
  id: string,
  updates: Partial<RawiInsert>
): Promise<void> {
  // Strip view-only / non-writable fields (see `updateMadih` for context).
  const writable: (keyof RawiInsert)[] = [
    "name",
    "status",
    "bio",
    "image_url",
    "birth_year",
    "death_year",
    "created_by",
  ];
  const payload = Object.fromEntries(
    Object.entries(updates).filter(([k]) =>
      writable.includes(k as keyof RawiInsert)
    )
  );

  const { error } = await supabase.from("ruwat").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteRuwat(ids: string[]): Promise<void> {
  const { data: records } = await supabase
    .from("ruwat")
    .select("image_url")
    .in("id", ids);
  const urlsToDelete = records
    ?.map((r) => r.image_url)
    .filter(Boolean) as string[];
  if (urlsToDelete && urlsToDelete.length > 0) {
    await deleteFromStorage(urlsToDelete).catch(console.error);
  }

  const { error } = await supabase.from("ruwat").delete().in("id", ids);
  if (error) throw error;
}
