/// Arabic text normalization utilities for search and matching.
///
/// Handles diacritics removal, character variant normalization, and
/// Arabic-aware string comparison for the Ranna music streaming app.
library;

/// Unicode range for Arabic diacritics (tashkeel): Fathah, Dammah, Kasrah,
/// Shadda, Sukun, Fathatan, Dammatan, Kasratan, and superscript Alef.
final RegExp _tashkeel = RegExp(
  '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]',
);

/// Arabic tatweel (kashida) character used for justification stretching.
const String _tatweel = '\u0640';

/// Normalizes Arabic text for reliable search and comparison.
///
/// Performs the following transformations:
/// 1. Strips all Arabic diacritics (tashkeel/harakat).
/// 2. Removes tatweel (kashida) characters.
/// 3. Maps Alef variants (أ إ آ ٱ) to plain Alef (ا).
/// 4. Maps Taa Marbuta (ة) to Haa (ه).
/// 5. Maps Alef Maksura (ى) to Yaa (ي).
/// 6. Maps Waw with Hamza (ؤ) to Waw (و).
/// 7. Maps Yaa with Hamza (ئ) to Yaa (ي).
/// 8. Returns a lowercase, trimmed result.
String normalizeArabic(String text) {
  var result = text;

  // Strip diacritics (tashkeel).
  result = result.replaceAll(_tashkeel, '');

  // Remove tatweel (kashida).
  result = result.replaceAll(_tatweel, '');

  // Alef variants -> plain Alef.
  result = result
      .replaceAll('\u0623', '\u0627') // أ (Alef with Hamza above) -> ا
      .replaceAll('\u0625', '\u0627') // إ (Alef with Hamza below) -> ا
      .replaceAll('\u0622', '\u0627') // آ (Alef with Madda)       -> ا
      .replaceAll('\u0671', '\u0627'); // ٱ (Alef Wasla)            -> ا

  // Taa Marbuta -> Haa.
  result = result.replaceAll('\u0629', '\u0647'); // ة -> ه

  // Alef Maksura -> Yaa.
  result = result.replaceAll('\u0649', '\u064A'); // ى -> ي

  // Waw with Hamza -> Waw.
  result = result.replaceAll('\u0624', '\u0648'); // ؤ -> و

  // Yaa with Hamza -> Yaa.
  result = result.replaceAll('\u0626', '\u064A'); // ئ -> ي

  return result.toLowerCase().trim();
}

/// Returns `true` if [haystack] contains [needle] after applying Arabic
/// normalization to both strings.
///
/// This enables fuzzy matching that ignores diacritics, character variants,
/// and case differences, which is essential for Arabic music search.
///
/// Example:
/// ```dart
/// arabicIncludes('الحَمْدُ لِلَّهِ', 'الحمد'); // true
/// arabicIncludes('مُؤْمِن', 'مومن');              // true
/// ```
bool arabicIncludes(String haystack, String needle) {
  return normalizeArabic(haystack).contains(normalizeArabic(needle));
}
