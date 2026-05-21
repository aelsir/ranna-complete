/// Tiny RFC 4122 v4 UUID generator using `dart:math`'s CSPRNG.
///
/// Used by the player to stamp a `play_id` on each play session client-side
/// so other event tables (e.g. lyrics_views.play_id) can reference the
/// in-progress play before the user_plays row is even written.
///
/// Same shape as JS `crypto.randomUUID()` so a play_id generated on the
/// Flutter side is indistinguishable from one generated on the web side.
library;

import 'dart:math';

final Random _rng = Random.secure();

String generateUuidV4() {
  final bytes = List<int>.generate(16, (_) => _rng.nextInt(256));
  // Set the version (4) and variant (10xxxxxx) bits per RFC 4122 §4.4.
  bytes[6] = (bytes[6] & 0x0F) | 0x40;
  bytes[8] = (bytes[8] & 0x3F) | 0x80;

  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-'
      '${hex.substring(8, 12)}-'
      '${hex.substring(12, 16)}-'
      '${hex.substring(16, 20)}-'
      '${hex.substring(20, 32)}';
}
