/// Artists (مادحون) and narrators (رواة) — the two "people" entity types
/// in Ranna's content model. The two halves are nearly mirror-image: same
/// list / paginated / detail / tracks-by-X providers, just different tables
/// and RPCs underneath.
///
/// Audit context (see plan file): the underlying `v_artists` / `v_narrators`
/// views are aliases over the renamed `artists` / `authors` tables. This
/// file uses the views directly today; when the alias is removed we'll
/// switch the SELECTs here.
library;

import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/madha.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/models/rawi.dart';

import 'supabase_internals.dart';

// ============================================================================
// Artists (Madiheen) — uses v_artists view + get_artist_profile RPC
// ============================================================================

/// Every approved artist, alphabetised by name.
final allArtistsProvider = FutureProvider<List<Madih>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results =
        await supabase.from('v_artists').select().order('name');
    return asList(results).map((e) => Madih.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allArtistsProvider error: $e');
    return [];
  }
});

const _artistsPageSize = 30;

/// Page-by-page artists, used by the all-artists screen's infinite scroll.
final paginatedArtistsProvider =
    FutureProvider.family<List<Madih>, int>((ref, page) async {
  ref.keepAlive();
  final supabase = ref.read(supabaseProvider);
  try {
    final from = page * _artistsPageSize;
    final to = from + _artistsPageSize - 1;
    final dynamic results = await supabase
        .from('v_artists')
        .select()
        .order('name')
        .range(from, to);
    return asList(results).map((e) => Madih.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ paginatedArtistsProvider error: $e');
    return [];
  }
});

/// Tracks for a specific artist, ordered as the RPC returns them. Cached
/// for 24h on disk — artist track lists change rarely and the cover-page
/// experience benefits from instant loads.
final artistTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, artistId) async {
  final supabase = ref.read(supabaseProvider);
  return cacheService.fetch<List<MadhaWithRelations>>(
    key: 'artist_tracks:$artistId',
    maxAge: const Duration(hours: 24),
    fetcher: () async {
      final dynamic result = await supabase.rpc(
        'get_artist_profile',
        params: {'p_artist_id': artistId},
      );
      final data = asMap(result);
      if (data == null) return <MadhaWithRelations>[];
      return asList(data['tracks'])
          .map((e) => MadhaWithRelations.fromJson(e))
          .toList();
    },
    serialize: (tracks) =>
        jsonEncode(tracks.map((t) => t.toJsonCache()).toList()),
    deserialize: (json) => (jsonDecode(json) as List)
        .map((e) => MadhaWithRelations.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
});

/// Single-artist details (name, image, bio fields) for the profile page
/// header.
final artistDetailProvider =
    FutureProvider.family<Madih?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final result =
        await supabase.from('v_artists').select().eq('id', id).maybeSingle();
    if (result == null) return null;
    return Madih.fromJson(result);
  } catch (e) {
    debugPrint('⛔ artistDetailProvider error: $e');
    return null;
  }
});

// ============================================================================
// Narrators (Ruwat) — uses v_narrators view + get_narrator_profile RPC
// ============================================================================

/// Every approved narrator, alphabetised by name.
final allNarratorsProvider = FutureProvider<List<Rawi>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results =
        await supabase.from('v_narrators').select().order('name');
    return asList(results).map((e) => Rawi.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ allNarratorsProvider error: $e');
    return [];
  }
});

const _narratorsPageSize = 30;

/// Page-by-page narrators for the all-narrators screen.
final paginatedNarratorsProvider =
    FutureProvider.family<List<Rawi>, int>((ref, page) async {
  ref.keepAlive();
  final supabase = ref.read(supabaseProvider);
  try {
    final from = page * _narratorsPageSize;
    final to = from + _narratorsPageSize - 1;
    final dynamic results = await supabase
        .from('v_narrators')
        .select()
        .order('name')
        .range(from, to);
    return asList(results).map((e) => Rawi.fromJson(e)).toList();
  } catch (e) {
    debugPrint('⛔ paginatedNarratorsProvider error: $e');
    return [];
  }
});

/// Tracks for a specific narrator, with the same 24h disk-cache strategy
/// as `artistTracksProvider`.
final narratorTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, rawiId) async {
  final supabase = ref.read(supabaseProvider);
  return cacheService.fetch<List<MadhaWithRelations>>(
    key: 'narrator_tracks:$rawiId',
    maxAge: const Duration(hours: 24),
    fetcher: () async {
      final dynamic result = await supabase.rpc(
        'get_narrator_profile',
        params: {'p_narrator_id': rawiId},
      );
      final data = asMap(result);
      if (data == null) return <MadhaWithRelations>[];
      return asList(data['tracks'])
          .map((e) => MadhaWithRelations.fromJson(e))
          .toList();
    },
    serialize: (tracks) =>
        jsonEncode(tracks.map((t) => t.toJsonCache()).toList()),
    deserialize: (json) => (jsonDecode(json) as List)
        .map((e) => MadhaWithRelations.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
});

/// Single-narrator details for the profile page header.
final narratorDetailProvider =
    FutureProvider.family<Rawi?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final result = await supabase
        .from('v_narrators')
        .select()
        .eq('id', id)
        .maybeSingle();
    if (result == null) return null;
    return Rawi.fromJson(result);
  } catch (e) {
    debugPrint('⛔ narratorDetailProvider error: $e');
    return null;
  }
});
