import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';

import '../db/local_db.dart';

/// Cache-first data fetching strategy.
///
/// 1. Check local SQLite cache — if fresh, return immediately
/// 2. If online, fetch from Supabase, update cache, return fresh data
/// 3. If offline with stale cache, return stale data (better than nothing)
/// 4. If offline with no cache, throw [OfflineCacheException]
class CacheService {
  static final CacheService _instance = CacheService._();
  factory CacheService() => _instance;
  CacheService._();

  /// Fetch data with cache-first strategy.
  ///
  /// [key] — unique cache key (e.g. 'home_data', 'artist_profile:abc123')
  /// [fetcher] — async function that fetches fresh data from Supabase
  /// [maxAge] — how long the cached data is considered "fresh"
  /// [serialize] — convert the data to a JSON string
  /// [deserialize] — convert a JSON string back to the data type
  Future<T> fetch<T>({
    required String key,
    required Future<T> Function() fetcher,
    required Duration maxAge,
    required String Function(T data) serialize,
    required T Function(String json) deserialize,
  }) async {
    // 1. Check cache
    final cached = await _getCached(key);
    final isFresh = cached != null &&
        DateTime.now().difference(DateTime.parse(cached.cachedAt)) < maxAge;

    if (isFresh) {
      try {
        return deserialize(cached.responseJson);
      } catch (e) {
        debugPrint('⚠️ Cache deserialize error for $key: $e');
        // Fall through to fetch fresh
      }
    }

    // 2. Try to fetch fresh data
    try {
      final fresh = await fetcher();
      // Store in cache
      final json = serialize(fresh);
      await _setCache(key, json);
      return fresh;
    } catch (e) {
      debugPrint('⚠️ Fetch error for $key: $e');

      // 3. If fetch fails and we have stale cache, use it
      if (cached != null) {
        debugPrint('📦 Using stale cache for $key (age: ${DateTime.now().difference(DateTime.parse(cached.cachedAt)).inMinutes} min)');
        try {
          return deserialize(cached.responseJson);
        } catch (_) {
          // Cache is corrupted
        }
      }

      // 4. No cache at all
      rethrow;
    }
  }

  /// Invalidate a specific cache key.
  Future<void> invalidate(String key) async {
    final db = await LocalDb.db;
    await db.delete('cached_api_responses', where: 'cache_key = ?', whereArgs: [key]);
  }

  /// Clear all cached responses.
  Future<void> clearAll() async {
    final db = await LocalDb.db;
    await db.delete('cached_api_responses');
  }

  // ── Private helpers ──────────────────────────────

  Future<_CachedRow?> _getCached(String key) async {
    final db = await LocalDb.db;
    final rows = await db.query(
      'cached_api_responses',
      where: 'cache_key = ?',
      whereArgs: [key],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return _CachedRow(
      key: rows.first['cache_key'] as String,
      responseJson: rows.first['response_json'] as String,
      cachedAt: rows.first['cached_at'] as String,
    );
  }

  Future<void> _setCache(String key, String json) async {
    final db = await LocalDb.db;
    await db.insert(
      'cached_api_responses',
      {
        'cache_key': key,
        'response_json': json,
        'cached_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }
}

class _CachedRow {
  final String key;
  final String responseJson;
  final String cachedAt;
  const _CachedRow({required this.key, required this.responseJson, required this.cachedAt});
}

/// Thrown when offline with no cached data available.
class OfflineCacheException implements Exception {
  final String message;
  const OfflineCacheException(this.message);
  @override
  String toString() => 'OfflineCacheException: $message';
}
