import 'package:ranna/utils/arabic.dart';

/// Extract a short snippet around the first match of [query] in [lyrics].
/// Returns ~40 chars of context around the match, or null if no match.
String? extractLyricsSnippet(String? lyrics, String query) {
  if (lyrics == null || lyrics.isEmpty || query.trim().isEmpty) return null;

  final normalizedLyrics = normalizeArabic(lyrics);
  final normalizedQuery = normalizeArabic(query.trim());
  final idx = normalizedLyrics.indexOf(normalizedQuery);
  if (idx == -1) return null;

  const contextChars = 40;
  final start = idx - contextChars > 0 ? idx - contextChars : 0;
  final end = idx + query.length + contextChars < lyrics.length
      ? idx + query.length + contextChars
      : lyrics.length;

  var snippet = lyrics.substring(start, end).replaceAll('\n', ' ').trim();
  if (start > 0) snippet = '...$snippet';
  if (end < lyrics.length) snippet = '$snippet...';

  return snippet;
}
