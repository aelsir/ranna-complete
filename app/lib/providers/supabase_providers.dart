/// Public barrel for every Supabase-backed provider in the app.
///
/// This file used to be a 700-line monolith covering home / search / library
/// / people / categories / collections. It's now a re-export barrel so
/// existing call sites (`import 'package:ranna/providers/supabase_providers.dart'`)
/// keep working without per-screen import edits.
///
/// New code can import the domain files directly for clearer dependency
/// graphs:
///   * `home_data_provider.dart`     — home page bundle
///   * `search_provider.dart`        — search query/filter/results
///   * `library_provider.dart`       — favorites, history, analytics
///   * `people_provider.dart`        — artists + narrators
///   * `categories_provider.dart`    — turuq + funun + tracks-by-category
///   * `collections_provider.dart`   — curated playlists
///   * `supabase_internals.dart`     — shared client + helpers (asList/asMap)
library;

export 'supabase_internals.dart';
export 'home_data_provider.dart';
export 'search_provider.dart';
export 'library_provider.dart';
export 'people_provider.dart';
export 'categories_provider.dart';
export 'collections_provider.dart';
export 'hero_images_provider.dart';
