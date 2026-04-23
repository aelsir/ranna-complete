/**
 * Country list for user profile forms.
 *
 * Priority block (top of dropdown, pre-selected default is Sudan) targets
 * the audience demographics for رنّة. Rest block follows, with `OTHER`
 * as a catch-all at the end.
 *
 * Store the ISO-3166 alpha-2 code in `user_profiles.country`; render the
 * Arabic label in UI via `countryLabel`.
 */

export type Country = {
  code: string;
  label: string;
};

export const DEFAULT_COUNTRY_CODE = "SD";

export const COUNTRIES_PRIORITY: Country[] = [
  { code: "SD", label: "السودان" },
  { code: "SA", label: "السعودية" },
  { code: "QA", label: "قطر" },
  { code: "KW", label: "الكويت" },
  { code: "BH", label: "البحرين" },
  { code: "OM", label: "عُمان" },
  { code: "EG", label: "مصر" },
];

export const COUNTRIES_REST: Country[] = [
  { code: "AE", label: "الإمارات" },
  { code: "JO", label: "الأردن" },
  { code: "GB", label: "المملكة المتحدة" },
  { code: "US", label: "الولايات المتحدة" },
  { code: "OTHER", label: "أخرى" },
];

/** Full ordered list: priority block first, then rest. */
export const ALL_COUNTRIES: Country[] = [
  ...COUNTRIES_PRIORITY,
  ...COUNTRIES_REST,
];

/**
 * Resolve a country code to its Arabic label. Returns the code itself
 * (uppercased) if no match is found — safe fallback for legacy data.
 */
export function countryLabel(code: string | null | undefined): string {
  if (!code) return "";
  const match = ALL_COUNTRIES.find((c) => c.code === code);
  return match ? match.label : code.toUpperCase();
}
