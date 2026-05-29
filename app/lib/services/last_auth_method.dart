import 'package:shared_preferences/shared_preferences.dart';

/// Remember which sign-in method the user most recently used (Google, Apple,
/// or magic-link email), so the login UI can:
///   - lift the matching button to the top of the OAuth row, and
///   - decorate it with an "آخر مرة دخلت بهذا" badge.
///
/// Persisted via SharedPreferences so it survives app restarts. We
/// deliberately do NOT clear it on signOut — the whole point is that the
/// hint outlives the session.
enum LastAuthMethod { google, apple, email }

class LastAuthMethodStore {
  static const _key = 'ranna:lastAuthMethod';

  /// Returns null if there's no stored value or it doesn't match a known
  /// provider (forward compat: a future provider we don't know yet).
  static Future<LastAuthMethod?> get() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    return _parse(raw);
  }

  static Future<void> set(LastAuthMethod method) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, _serialize(method));
  }

  static LastAuthMethod? _parse(String? raw) {
    switch (raw) {
      case 'google':
        return LastAuthMethod.google;
      case 'apple':
        return LastAuthMethod.apple;
      case 'email':
        return LastAuthMethod.email;
      default:
        return null;
    }
  }

  static String _serialize(LastAuthMethod method) {
    switch (method) {
      case LastAuthMethod.google:
        return 'google';
      case LastAuthMethod.apple:
        return 'apple';
      case LastAuthMethod.email:
        return 'email';
    }
  }
}
