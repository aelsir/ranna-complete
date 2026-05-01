/**
 * Sufi orders (طرق / turuq) and music styles (فنون / funun) — categorical
 * reference data attached to tracks. Read-only from the dashboard; admins
 * manage the lists via direct DB inserts (no UI surface today).
 */

import type { Fan, Tariqa } from "@/types/database";

import { supabase } from "./_shared";

// ============================================================================
// Turuq (Sufi orders)
// ============================================================================

export async function getTuruq(): Promise<Tariqa[]> {
  const { data, error } = await supabase
    .from("turuq")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getTariqaById(id: string): Promise<Tariqa | null> {
  const { data, error } = await supabase
    .from("turuq")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Funun (taar tones / music styles)
// ============================================================================

export async function getFunun(): Promise<Fan[]> {
  const { data, error } = await supabase
    .from("funun")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getFanById(id: string): Promise<Fan | null> {
  const { data, error } = await supabase
    .from("funun")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}
