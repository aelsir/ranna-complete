// Country list for user profile forms.
//
// Priority block (top of dropdown, pre-selected default is Sudan) targets
// the audience demographics for رنّة. Rest block is alphabetical by
// Arabic label, with `OTHER` as a catch-all at the end.
//
// Store the ISO-3166 alpha-2 code in `user_profiles.country`; render the
// Arabic label in UI via [countryLabel].

class Country {
  final String code;
  final String label;
  const Country({required this.code, required this.label});
}

const String defaultCountryCode = 'SD';

const List<Country> countriesPriority = [
  Country(code: 'SD', label: 'السودان'),
  Country(code: 'SA', label: 'السعودية'),
  Country(code: 'QA', label: 'قطر'),
  Country(code: 'KW', label: 'الكويت'),
  Country(code: 'BH', label: 'البحرين'),
  Country(code: 'OM', label: 'عُمان'),
  Country(code: 'EG', label: 'مصر'),
];

const List<Country> countriesRest = [
  Country(code: 'AE', label: 'الإمارات'),
  Country(code: 'JO', label: 'الأردن'),
  Country(code: 'GB', label: 'المملكة المتحدة'),
  Country(code: 'US', label: 'الولايات المتحدة'),
  Country(code: 'OTHER', label: 'أخرى'),
];

/// Full ordered list: priority block first, then rest.
List<Country> get allCountries => [...countriesPriority, ...countriesRest];

/// Resolve a country code to its Arabic label. Returns the code itself
/// (uppercased) if no match is found — safe fallback for legacy data.
String countryLabel(String? code) {
  if (code == null || code.isEmpty) return '';
  final match = allCountries.where((c) => c.code == code);
  if (match.isEmpty) return code.toUpperCase();
  return match.first.label;
}
