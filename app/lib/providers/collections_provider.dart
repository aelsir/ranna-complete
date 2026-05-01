/// Curated collections (admin-built playlists). Reads from `v_collections`
/// for list / detail and `get_collection_tracks` for the ordered track
/// payload, which gets a 12h disk cache.
library;

import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/collection.dart';
import 'package:ranna/models/madha.dart';

import 'supabase_internals.dart';

/// Every active collection ordered by `display_order` (admin-controlled
/// rank). Used by the home rail and the dedicated collections page.
final allCollectionsProvider =
    FutureProvider<List<MusicCollection>>((ref) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final dynamic results = await supabase
        .from('v_collections')
        .select()
        .order('display_order');
    return asList(results)
        .map((e) => MusicCollection.fromJson(e))
        .toList();
  } catch (e) {
    debugPrint('⛔ allCollectionsProvider error: $e');
    return [];
  }
});

/// Collection tracks via RPC — returns ordered tracks with full joins
/// (artist, narrator, tariqa, fan). Cached 12h on disk.
final collectionTracksProvider =
    FutureProvider.family<List<MadhaWithRelations>, String>((ref, collectionId) async {
  final supabase = ref.read(supabaseProvider);
  return cacheService.fetch<List<MadhaWithRelations>>(
    key: 'collection_tracks:$collectionId',
    maxAge: const Duration(hours: 12),
    fetcher: () async {
      final dynamic result = await supabase.rpc(
        'get_collection_tracks',
        params: {'p_collection_id': collectionId},
      );
      return asList(result)
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

/// Single-collection details for the playlist page header.
final collectionDetailProvider =
    FutureProvider.family<MusicCollection?, String>((ref, id) async {
  final supabase = ref.read(supabaseProvider);
  try {
    final result = await supabase
        .from('v_collections')
        .select()
        .eq('id', id)
        .maybeSingle();
    if (result == null) return null;
    return MusicCollection.fromJson(result);
  } catch (e) {
    debugPrint('⛔ collectionDetailProvider error: $e');
    return null;
  }
});
