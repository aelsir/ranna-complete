/// Shared infrastructure used by every domain-specific provider file in
/// `lib/providers/`. Keeps the per-domain files focused on actual business
/// logic instead of restating the same client/cache plumbing each time.
///
/// Consumers should import the domain files (or the `supabase_providers.dart`
/// barrel) — not this one directly. It's exposed as a top-level library only
/// because Dart doesn't have a true "package-private" mechanism.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// supabase_flutter exports `AuthState` which collides with our own. Hide it
// so callers that import this file alongside `auth_notifier.dart` don't
// have to disambiguate.
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

import 'package:ranna/services/cache_service.dart';

/// Re-export so domain files can `import 'supabase_internals.dart'` and get
/// `SupabaseClient` + `CountOption` etc. without a separate import line.
export 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

/// One shared `SupabaseClient` for the whole app. Every provider grabs the
/// client through this so swapping the client (e.g. for tests, or future
/// dependency injection) is a single override.
final supabaseProvider = Provider<SupabaseClient>(
  (ref) => Supabase.instance.client,
);

/// Single `CacheService` instance shared across providers that opt into
/// disk-cached fetches (home data, artist/narrator profiles, collections).
final cacheService = CacheService();

/// Safely converts any Supabase query result to a typed list of maps.
/// Handles the `null` returned by some web-platform edge cases, an
/// unexpected non-list type (which has bitten us in the past), and skips
/// non-map elements quietly.
List<Map<String, dynamic>> asList(dynamic result) {
  if (result == null) {
    debugPrint('⚠️  asList: received null');
    return [];
  }
  if (result is! List) {
    debugPrint('⚠️  asList: expected List, got ${result.runtimeType}: $result');
    return [];
  }
  return result.whereType<Map<String, dynamic>>().toList();
}

/// Safely parse a JSON map from an RPC response. Accepts both the typed
/// `Map<String, dynamic>` we expect and the more general `Map` that some
/// network paths produce.
Map<String, dynamic>? asMap(dynamic result) {
  if (result == null) return null;
  if (result is Map<String, dynamic>) return result;
  if (result is Map) return Map<String, dynamic>.from(result);
  return null;
}
