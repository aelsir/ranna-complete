/// Formatting utilities for URLs, durations, and Arabic numeral conversion.
///
/// Provides helpers for constructing R2 asset URLs and displaying
/// time/number values in Arabic numerals for the Ranna music app.
library;

/// Base URL for the Cloudflare R2 public bucket, injected at compile time.
const String r2PublicUrl = String.fromEnvironment(
  'R2_PUBLIC_URL',
  defaultValue: 'https://pub-5231206b23e34ae59ce4f085c70f77be.r2.dev',
);

/// Eastern Arabic digit characters indexed 0-9.
const List<String> _arabicDigits = [
  '\u0660', // ٠
  '\u0661', // ١
  '\u0662', // ٢
  '\u0663', // ٣
  '\u0664', // ٤
  '\u0665', // ٥
  '\u0666', // ٦
  '\u0667', // ٧
  '\u0668', // ٨
  '\u0669', // ٩
];

/// Converts an [n] integer to its Eastern Arabic numeral representation.
///
/// Example:
/// ```dart
/// toArabicNum(732); // '٧٣٢'
/// toArabicNum(0);   // '٠'
/// ```
String toArabicNum(int n) {
  return n.toString().split('').map((digit) {
    final index = int.tryParse(digit);
    return index != null ? _arabicDigits[index] : digit;
  }).join();
}

/// Formats a duration given in [seconds] to an Arabic numeral string
/// in the form "M:SS" (e.g. "٧:٣٢" for 452 seconds).
///
/// Returns `'٠:٠٠'` if [seconds] is `null` or negative.
///
/// Example:
/// ```dart
/// formatDuration(452); // '٧:٣٢'
/// formatDuration(65);  // '١:٠٥'
/// formatDuration(null); // '٠:٠٠'
/// ```
String formatDuration(int? seconds) {
  if (seconds == null || seconds < 0) return '${toArabicNum(0)}:${toArabicNum(0)}${toArabicNum(0)}';

  final minutes = seconds ~/ 60;
  final remainingSeconds = seconds % 60;

  final arabicMinutes = toArabicNum(minutes);
  final arabicSeconds = remainingSeconds < 10
      ? '${toArabicNum(0)}${toArabicNum(remainingSeconds)}'
      : toArabicNum(remainingSeconds);

  return '$arabicMinutes:$arabicSeconds';
}

/// Returns a fully-qualified image URL.
///
/// - If [url] is `null`, returns [fallback].
/// - If [url] starts with `http`, it is returned unchanged (already absolute).
/// - Otherwise, [url] is treated as a relative R2 key and prefixed with
///   [r2PublicUrl].
///
/// Example:
/// ```dart
/// getImageUrl('covers/album.jpg');
/// // => 'https://r2.example.com/covers/album.jpg'
///
/// getImageUrl('https://cdn.example.com/img.png');
/// // => 'https://cdn.example.com/img.png'
///
/// getImageUrl(null, fallback: 'assets/placeholder.png');
/// // => 'assets/placeholder.png'
/// ```
String getImageUrl(String? url, {String fallback = ''}) {
  if (url == null || url.isEmpty) return fallback;
  if (url.startsWith('http')) return url;
  final cleanPath = url.startsWith('/') ? url.substring(1) : url;
  return '$r2PublicUrl/$cleanPath';
}

/// Returns a fully-qualified audio URL.
///
/// - If [url] is `null`, returns an empty string.
/// - If [url] starts with `http`, it is returned unchanged.
/// - Otherwise, [url] is prefixed with [r2PublicUrl].
String getAudioUrl(String? url) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('http')) return url;
  final cleanPath = url.startsWith('/') ? url.substring(1) : url;
  return '$r2PublicUrl/$cleanPath';
}
