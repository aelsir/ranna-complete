/**
 * Arabic text normalization for loose/fuzzy search.
 *
 * Normalises common Arabic character variants so that
 * أ إ آ ٱ  → ا
 * ة        → ه
 * ى        → ي
 * ؤ        → و
 * ئ        → ي
 * And strips all tashkeel / diacritics (ً ٌ ٍ َ ُ ِ ّ ْ ـ).
 */

const TASHKEEL_REGEX =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g;
const TATWEEL_REGEX = /\u0640/g; // ـ kashida / tatweel

const CHAR_MAP: Record<string, string> = {
  "\u0623": "\u0627", // أ → ا
  "\u0625": "\u0627", // إ → ا
  "\u0622": "\u0627", // آ → ا
  "\u0671": "\u0627", // ٱ → ا
  "\u0629": "\u0647", // ة → ه
  "\u0649": "\u064A", // ى → ي
  "\u0624": "\u0648", // ؤ → و
  "\u0626": "\u064A", // ئ → ي
};

/**
 * Normalise an Arabic string for loose comparison.
 * Returns a lowercase, diacritic-free, variant-collapsed string.
 */
export function normalizeArabic(text: string): string {
  let result = text;

  // Strip tashkeel (diacritics) and tatweel
  result = result.replace(TASHKEEL_REGEX, "");
  result = result.replace(TATWEEL_REGEX, "");

  // Map character variants
  let out = "";
  for (const ch of result) {
    out += CHAR_MAP[ch] ?? ch;
  }

  return out.toLowerCase().trim();
}

/**
 * Check whether `haystack` contains `needle` after Arabic normalisation.
 */
export function arabicIncludes(haystack: string, needle: string): boolean {
  return normalizeArabic(haystack).includes(normalizeArabic(needle));
}
