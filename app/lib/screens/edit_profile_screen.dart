import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

import 'package:ranna/components/common/circle_back_button.dart';
import 'package:ranna/constants/countries.dart';
import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/theme/app_theme.dart';

/// Edit profile screen — displayed at `/account/edit`.
///
/// Pre-fills `display_name` + `country` from `user_profiles` (source of
/// truth for those two columns) and `phone_number` from
/// `session.user.userMetadata['phone_number']` (phone is metadata-only).
/// Email is shown read-only.
///
/// On save:
///   1. UPDATE `user_profiles` (name + country) via RLS as `auth.uid()`
///   2. `auth.updateUser({ data: { display_name, country, phone_number } })`
///      so the session reflects changes instantly and phone persists.
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  String _country = defaultCountryCode;

  bool _loading = true;
  bool _saving = false;
  String? _error;
  bool _savedOnce = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final client = Supabase.instance.client;
    final user = client.auth.currentUser;
    if (user == null) {
      setState(() => _loading = false);
      return;
    }
    // Seed phone from session metadata immediately (no DB call needed).
    final meta = user.userMetadata ?? const {};
    final phone = (meta['phone_number'] as String?) ?? '';
    _phoneController.text = phone;

    try {
      final row = await client
          .from('user_profiles')
          .select('display_name, country')
          .eq('id', user.id)
          .maybeSingle();
      if (!mounted) return;
      final name = (row?['display_name'] as String?) ?? '';
      final country = (row?['country'] as String?) ?? defaultCountryCode;
      setState(() {
        _nameController.text = name;
        _country = _resolveCountry(country);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'تعذّر تحميل بياناتك. حاول لاحقاً.';
      });
    }
  }

  /// Guard against legacy free-text values (e.g. the old default
  /// `'السودان'` was stored verbatim) so the Dropdown doesn't assert.
  String _resolveCountry(String raw) {
    final match = allCountries.where((c) => c.code == raw);
    if (match.isNotEmpty) return match.first.code;
    // Free-text fallback: try matching label, else default.
    final byLabel = allCountries.where((c) => c.label == raw);
    if (byLabel.isNotEmpty) return byLabel.first.code;
    return defaultCountryCode;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final client = Supabase.instance.client;
    final user = client.auth.currentUser;
    if (user == null) {
      setState(() {
        _saving = false;
        _error = 'يجب تسجيل الدخول أولاً.';
      });
      return;
    }
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    try {
      // 1) Sync the columns in user_profiles.
      await client.from('user_profiles').update({
        'display_name': name,
        'country': _country,
      }).eq('id', user.id);

      // 2) Mirror all three fields into raw_user_meta_data so the session
      //    reflects changes instantly and phone persists (metadata-only).
      await client.auth.updateUser(
        UserAttributes(
          data: {
            'display_name': name,
            'country': _country,
            'phone_number': phone,
          },
        ),
      );
      if (!mounted) return;
      setState(() {
        _saving = false;
        _savedOnce = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'تم حفظ التغييرات',
            style: TextStyle(fontFamily: RannaTheme.fontFustat),
          ),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = 'تعذّر حفظ التغييرات. حاول لاحقاً.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authNotifierProvider);
    final email = auth.user?.email ?? '';

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: RannaTheme.background,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
          // ── Header (back button + title) — matches listening pages ──
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 20, 8),
            child: Row(
              children: [
                const CircleBackButton(),
                const SizedBox(width: 12),
                Text(
                  'بيانات الحساب',
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: RannaTheme.foreground,
                  ),
                ),
              ],
            ),
          ),

          // ── Body ──
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: RannaTheme.primary),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 120),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 8),
                          // Email (read-only)
                          _readOnlyField(
                          label: 'البريد الإلكتروني',
                          value: email,
                          icon: Icons.email_rounded,
                          ltr: true,
                        ),
                        const SizedBox(height: 18),
                        // Name
                        TextFormField(
                          controller: _nameController,
                          textDirection: TextDirection.rtl,
                          textAlign: TextAlign.right,
                          style: TextStyle(
                              fontFamily: RannaTheme.fontFustat, fontSize: 15),
                          decoration: _fieldDecoration(
                            label: 'الاسم',
                            icon: Icons.person_rounded,
                          ),
                          validator: (value) {
                            final v = (value ?? '').trim();
                            if (v.isEmpty) return 'الاسم مطلوب';
                            if (v.length < 2) return 'الاسم قصير جداً';
                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        // Country
                        DropdownButtonFormField<String>(
                          initialValue: _country,
                          isExpanded: true,
                          style: TextStyle(
                            fontFamily: RannaTheme.fontFustat,
                            fontSize: 15,
                            color: RannaTheme.foreground,
                          ),
                          decoration: _fieldDecoration(
                            label: 'الدولة',
                            icon: Icons.public_rounded,
                          ),
                          items: [
                            ...countriesPriority.map(
                              (c) => DropdownMenuItem(
                                value: c.code,
                                child: Text(c.label),
                              ),
                            ),
                            const DropdownMenuItem(
                              enabled: false,
                              child: Divider(height: 1),
                            ),
                            ...countriesRest.map(
                              (c) => DropdownMenuItem(
                                value: c.code,
                                child: Text(c.label),
                              ),
                            ),
                          ],
                          onChanged: (v) {
                            if (v == null) return;
                            setState(() => _country = v);
                          },
                        ),
                        const SizedBox(height: 14),
                        // Phone
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          textDirection: TextDirection.ltr,
                          textAlign: TextAlign.left,
                          style: TextStyle(
                              fontFamily: RannaTheme.fontFustat, fontSize: 15),
                          decoration: _fieldDecoration(
                            label: 'رقم الجوال (اختياري)',
                            hint: '+249...',
                            icon: Icons.phone_rounded,
                          ),
                          validator: (value) {
                            final v = (value ?? '').trim();
                            if (v.isEmpty) return null;
                            if (!RegExp(r'^\+?[0-9\s\-()]{6,20}$')
                                .hasMatch(v)) {
                              return 'رقم غير صحيح';
                            }
                            return null;
                          },
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            _error!,
                            style: TextStyle(
                              fontFamily: RannaTheme.fontFustat,
                              fontSize: 12,
                              color: RannaTheme.destructive,
                            ),
                          ),
                        ],
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: RannaTheme.primary,
                              padding:
                                  const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(
                                    RannaTheme.radiusLg),
                              ),
                            ),
                            onPressed: _saving ? null : _save,
                            child: _saving
                                ? const SizedBox(
                                    height: 18,
                                    width: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : Text(
                                    _savedOnce ? 'حفظ التغييرات' : 'حفظ',
                                    style: TextStyle(
                                      fontFamily: RannaTheme.fontFustat,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: RannaTheme.primaryForeground,
                                    ),
                                  ),
                          ),
                        ),
                          ],
                        ),
                      ),
                    ),
                  ),
          ],
        ),
      ),
    );
  }

  InputDecoration _fieldDecoration({
    required String label,
    String? hint,
    IconData? icon,
  }) {
    return InputDecoration(
      labelText: label,
      labelStyle:
          TextStyle(fontFamily: RannaTheme.fontFustat, fontSize: 13),
      hintText: hint,
      hintStyle: TextStyle(
        fontFamily: RannaTheme.fontFustat,
        fontSize: 13,
        color: RannaTheme.mutedForeground,
      ),
      prefixIcon: icon == null ? null : Icon(icon, size: 20),
      filled: true,
      fillColor: RannaTheme.card,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
        borderSide:
            BorderSide(color: RannaTheme.border.withValues(alpha: 0.4)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
        borderSide:
            BorderSide(color: RannaTheme.border.withValues(alpha: 0.3)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
        borderSide:
            const BorderSide(color: RannaTheme.primary, width: 1.5),
      ),
    );
  }

  Widget _readOnlyField({
    required String label,
    required String value,
    required IconData icon,
    bool ltr = false,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: BoxDecoration(
        color: RannaTheme.card,
        borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
        border: Border.all(color: RannaTheme.border.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: RannaTheme.mutedForeground),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 11,
                    color: RannaTheme.mutedForeground,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value.isEmpty ? '—' : value,
                  textDirection:
                      ltr ? TextDirection.ltr : TextDirection.rtl,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 14,
                    color: RannaTheme.foreground,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
