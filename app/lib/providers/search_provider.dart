/// Unified search across tracks (title), lyrics, artists, and narrators.
/// One RPC call returns all four categories — the UI partitions and counts
/// them client-side via `searchFilterProvider`.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/madha.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/models/rawi.dart';
import 'package:ranna/utils/lyrics.dart';

import 'supabase_internals.dart';

/// User's chosen filter chip — affects only display, not the network call.
enum SearchFilter { all, madha, kalimat, madih, rawi }

/// Discriminator on every search result row.
enum SearchResultType { madha, kalimat, madih, rawi }

/// Current search input. The screen owns the TextField; this provider is
/// just where the value lives so the result provider can react to changes.
final searchQueryProvider = StateProvider<String>((ref) => '');

/// Currently-selected filter chip in the search UI.
final searchFilterProvider = StateProvider<SearchFilter>(
  (ref) => SearchFilter.all,
);

/// A unified search result row that can be a track (by title or by lyrics
/// match), an artist, or a narrator. The optional `track` and
/// `lyricsSnippet` fields are populated only for the track-shaped types.
class SearchResult {
  final SearchResultType type;
  final String id;
  final String name;
  final String? subtitle;
  final String? imageUrl;
  final MadhaWithRelations? track;
  final String? lyricsSnippet;

  const SearchResult({
    required this.type,
    required this.id,
    required this.name,
    this.subtitle,
    this.imageUrl,
    this.track,
    this.lyricsSnippet,
  });
}

/// Always returns ALL categories so the UI can compute counts per type.
/// Filtering by [SearchFilter] happens in the UI layer, not here.
final searchResultsProvider = FutureProvider<List<SearchResult>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  // searchFilterProvider is intentionally NOT watched — filtering is a
  // pure UI concern; we always fetch all categories so chip counts work.
  if (query.trim().isEmpty) return [];

  final supabase = ref.read(supabaseProvider);
  final List<SearchResult> results = [];

  try {
    final dynamic rpcResult = await supabase.rpc(
      'search_all',
      params: {'p_query': query, 'p_limit': 30},
    );

    final data = asMap(rpcResult);
    if (data == null) return [];

    // ── Track results (title / madih / writer match) ──
    final tracks = asList(data['tracks']);
    for (final t in tracks) {
      final track = MadhaWithRelations.fromJson(t);
      results.add(
        SearchResult(
          type: SearchResultType.madha,
          id: track.id,
          name: track.title,
          subtitle: track.madihDetails?.name ?? track.madih,
          imageUrl: track.resolvedImageUrl,
          track: track,
        ),
      );
    }

    // ── Lyrics-only results ──
    final lyrics = asList(data['lyrics']);
    for (final t in lyrics) {
      final track = MadhaWithRelations.fromJson(t);
      final snippet = extractLyricsSnippet(track.lyrics, query);
      results.add(
        SearchResult(
          type: SearchResultType.kalimat,
          id: track.id,
          name: track.title,
          subtitle: track.madihDetails?.name ?? track.madih,
          imageUrl: track.resolvedImageUrl,
          track: track,
          lyricsSnippet: snippet,
        ),
      );
    }

    // ── Artist results ──
    final artists = asList(data['artists']);
    for (final a in artists) {
      final artist = Madih.fromJson(a);
      results.add(
        SearchResult(
          type: SearchResultType.madih,
          id: artist.id,
          name: artist.name,
          subtitle: 'مادح · ${artist.trackCount} مقطع',
          imageUrl: artist.imageUrl,
        ),
      );
    }

    // ── Narrator results ──
    final narrators = asList(data['narrators']);
    for (final n in narrators) {
      final narrator = Rawi.fromJson(n);
      results.add(
        SearchResult(
          type: SearchResultType.rawi,
          id: narrator.id,
          name: narrator.name,
          subtitle: 'راوي · ${narrator.trackCount} مقطع',
          imageUrl: narrator.imageUrl,
        ),
      );
    }

    debugPrint('🔍 search: ${results.length} results for "$query"');
    return results;
  } catch (e, st) {
    debugPrint('⛔ searchResultsProvider error: $e');
    debugPrint('$st');
    return [];
  }
});
