/// Home page data — single RPC call returning everything the landing
/// page needs. Disk-cached for an hour so cold-start opens are instant.
library;

import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ranna/models/collection.dart';
import 'package:ranna/models/madha.dart';
import 'package:ranna/models/madih.dart';
import 'package:ranna/models/rawi.dart';

import 'supabase_internals.dart';

/// Bundle of everything the home screen renders: trending, featured,
/// recent uploads, top artists, top narrators, and curated collections.
/// Single round-trip via the `get_home_data` RPC.
class HomeData {
  final int totalTracks;
  final List<MadhaWithRelations> featuredTracks;
  final List<MadhaWithRelations> popularTracks;
  final List<MadhaWithRelations> recentTracks;
  final List<Madih> artists;
  final List<MusicCollection> collections;
  final List<Rawi> narrators;

  const HomeData({
    this.totalTracks = 0,
    required this.featuredTracks,
    required this.popularTracks,
    required this.recentTracks,
    required this.artists,
    required this.collections,
    required this.narrators,
  });
}

HomeData _parseHomeData(Map<String, dynamic> data) {
  return HomeData(
    totalTracks: data['total_tracks'] as int? ?? 0,
    popularTracks: asList(data['trending'])
        .map((e) => MadhaWithRelations.fromJson(e))
        .toList(),
    featuredTracks: asList(data['featured'])
        .map((e) => MadhaWithRelations.fromJson(e))
        .toList(),
    recentTracks: asList(data['recent'])
        .map((e) => MadhaWithRelations.fromJson(e))
        .toList(),
    artists:
        asList(data['artists']).map((e) => Madih.fromJson(e)).toList(),
    collections: asList(data['collections'])
        .map((e) => MusicCollection.fromJson(e))
        .toList(),
    narrators:
        asList(data['narrators']).map((e) => Rawi.fromJson(e)).toList(),
  );
}

final homeDataProvider = FutureProvider<HomeData>((ref) async {
  ref.keepAlive();
  final supabase = ref.read(supabaseProvider);

  return cacheService.fetch<HomeData>(
    key: 'home_data',
    maxAge: const Duration(hours: 1),
    fetcher: () async {
      final dynamic result =
          await supabase.rpc('get_home_data', params: {'p_limit': 10});
      final data = asMap(result);
      if (data == null) throw Exception('get_home_data returned null');
      debugPrint('✅ homeDataProvider: fetched fresh from RPC');
      return _parseHomeData(data);
    },
    serialize: (homeData) => jsonEncode({
      'total_tracks': homeData.totalTracks,
      'trending':
          homeData.popularTracks.map((t) => t.toJsonCache()).toList(),
      'featured':
          homeData.featuredTracks.map((t) => t.toJsonCache()).toList(),
      'recent':
          homeData.recentTracks.map((t) => t.toJsonCache()).toList(),
      'artists': homeData.artists.map((a) => a.toJsonCache()).toList(),
      'collections':
          homeData.collections.map((c) => c.toJsonCache()).toList(),
      'narrators': homeData.narrators.map((n) => n.toJsonCache()).toList(),
    }),
    deserialize: (json) {
      final data = jsonDecode(json) as Map<String, dynamic>;
      debugPrint('📦 homeDataProvider: loaded from cache');
      return _parseHomeData(data);
    },
  );
});
