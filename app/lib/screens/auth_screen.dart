import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/constants/countries.dart';
import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/theme/app_theme.dart';

/// Magic-link sign-in screen. Arabic RTL layout; single email input.
///
/// On submit:
///  - Anonymous user → `AuthNotifier.signInWithMagicLink()` calls
///    `supabase.auth.updateUser({email})` which attaches an email identity
///    to the existing anon user (preserving their UUID).
///  - Otherwise → plain magic-link OTP.
///
/// Success state: "check your inbox" with 60 s cooldown on re-send.
class AuthScreen extends ConsumerStatefulWidget {
  /// Optional prefilled email (passed from inline-login when the entered
  /// address wasn't registered and we redirect the user to signup).
  final String? initialEmail;
  const AuthScreen({super.key, this.initialEmail});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  static const _cooldownSeconds = 60;

  final _emailController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  String _country = defaultCountryCode;
  bool _sent = false;
  bool _loading = false;
  String? _error;
  int _cooldown = 0;
  Timer? _cooldownTimer;

  @override
  void initState() {
    super.initState();
    if (widget.initialEmail != null && widget.initialEmail!.isNotEmpty) {
      _emailController.text = widget.initialEmail!;
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    setState(() => _cooldown = _cooldownSeconds);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        _cooldown--;
        if (_cooldown <= 0) t.cancel();
      });
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final email = _emailController.text.trim();
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final result = await ref
        .read(authNotifierProvider.notifier)
        .signUpWithMagicLink(
          email,
          displayName: name,
          country: _country,
          phoneNumber: phone.isEmpty ? null : phone,
        );
    if (!mounted) return;
    setState(() => _loading = false);
    if (result.error != null) {
      setState(() => _error = result.error.toString());
      return;
    }
    setState(() => _sent = true);
    _startCooldown();
  }

  InputDecoration _fieldDecoration({
    required String label,
    String? hint,
    IconData? icon,
  }) {
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(fontFamily: RannaTheme.fontFustat, fontSize: 13),
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
        borderSide: const BorderSide(color: RannaTheme.primary, width: 1.5),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: RannaTheme.background,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_forward_rounded, color: RannaTheme.foreground),
            onPressed: () => context.canPop() ? context.pop() : context.go('/account'),
          ),
          title: Text(
            'تسجيل حساب جديد',
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: RannaTheme.foreground,
            ),
          ),
        ),
        body: SafeArea(
          child: _sent
              ? Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                  child: _buildSentState(),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                  child: _buildFormState(),
                ),
        ),
      ),
    );
  }

  Widget _buildFormState() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          Text(
            'احفظ تفضيلاتك ومفضّلاتك',
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: RannaTheme.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'سنرسل لك رابط دخول — لا حاجة لكلمة مرور.',
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 13,
              color: RannaTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 24),
          // Display name
          TextFormField(
            controller: _nameController,
            textDirection: TextDirection.rtl,
            textAlign: TextAlign.right,
            cursorColor: RannaTheme.primary,
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 15,
              color: RannaTheme.foreground,
            ),
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
              // Visual divider between priority and rest
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
          // Phone (optional)
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            textDirection: TextDirection.ltr,
            textAlign: TextAlign.left,
            cursorColor: RannaTheme.primary,
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 15,
              color: RannaTheme.foreground,
            ),
            decoration: _fieldDecoration(
              label: 'رقم الجوال (اختياري)',
              hint: '+249...',
              icon: Icons.phone_rounded,
            ),
            validator: (value) {
              final v = (value ?? '').trim();
              if (v.isEmpty) return null; // optional
              if (!RegExp(r'^\+?[0-9\s\-()]{6,20}$').hasMatch(v)) {
                return 'رقم غير صحيح';
              }
              return null;
            },
          ),
          const SizedBox(height: 14),
          // Email
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            textDirection: TextDirection.ltr,
            textAlign: TextAlign.left,
            cursorColor: RannaTheme.primary,
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 15,
              color: RannaTheme.foreground,
            ),
            decoration: _fieldDecoration(
              label: 'البريد الإلكتروني',
              hint: 'example@ranna.app',
              icon: Icons.email_rounded,
            ),
            validator: (value) {
              final v = (value ?? '').trim();
              if (v.isEmpty) return 'البريد الإلكتروني مطلوب';
              if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v)) {
                return 'يرجى إدخال بريد إلكتروني صحيح';
              }
              return null;
            },
            onFieldSubmitted: (_) => _submit(),
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
          const SizedBox(height: 20),
          Text(
            'سنحفظ تفضيلاتك ومفضّلاتك لتعود إليها من أي جهاز.',
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 12,
              color: RannaTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: RannaTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
                ),
              ),
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      'أرسل الرابط',
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
    );
  }

  Widget _buildSentState() {
    final email = _emailController.text.trim();
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: RannaTheme.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.mark_email_read_rounded,
              size: 36,
              color: RannaTheme.primary,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'تحقّق من بريدك الإلكتروني',
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: RannaTheme.foreground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'أرسلنا رابط تسجيل الدخول إلى',
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 13,
              color: RannaTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            email,
            textDirection: TextDirection.ltr,
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: RannaTheme.foreground,
            ),
          ),
          const SizedBox(height: 32),
          Text(
            'افتح الرابط من نفس الجهاز لإكمال الدخول.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 12,
              color: RannaTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 32),
          TextButton(
            onPressed: _cooldown > 0
                ? null
                : () {
                    setState(() {
                      _sent = false;
                      _error = null;
                    });
                  },
            child: Text(
              _cooldown > 0
                  ? 'إعادة الإرسال بعد $_cooldown ث'
                  : 'إرسال إلى بريد آخر',
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
