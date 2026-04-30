import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;

import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/theme/app_theme.dart';

final _loginEmailRe = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
const _loginCooldownSeconds = 60;

class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key});

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends ConsumerState<AccountScreen> {
  // Mirrors `user_profiles.email_notifications` AND `push_notifications` —
  // we keep them as a single toggle for now (one combined opt-in for the
  // weekly digest + per-track push). Hydrated on first build for signed-in
  // users; defaults to `true` for anon users until they sign up.
  bool _notificationsEnabled = true;
  bool _notificationsHydrated = false;
  bool _notificationsSaving = false;
  String? _hydratedForUserId;

  bool _signingOut = false;

  // Inline login (email only) — for returning users who just want a magic
  // link without re-entering profile data. New users tap "إنشاء حساب جديد"
  // which pushes the full /auth registration form.
  final _loginEmailController = TextEditingController();
  bool _loginLoading = false;
  bool _loginSent = false;
  String? _loginError;
  bool _loginUserNotFound = false;
  int _loginCooldown = 0;
  Timer? _loginCooldownTimer;

  @override
  void dispose() {
    _loginEmailController.dispose();
    _loginCooldownTimer?.cancel();
    super.dispose();
  }

  void _startLoginCooldown() {
    _loginCooldownTimer?.cancel();
    setState(() => _loginCooldown = _loginCooldownSeconds);
    _loginCooldownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        _loginCooldown--;
        if (_loginCooldown <= 0) t.cancel();
      });
    });
  }

  Future<void> _handleInlineLogin() async {
    final email = _loginEmailController.text.trim();
    setState(() {
      _loginError = null;
      _loginUserNotFound = false;
    });
    if (!_loginEmailRe.hasMatch(email)) {
      setState(() => _loginError = 'بريد إلكتروني غير صحيح');
      return;
    }
    setState(() => _loginLoading = true);
    final result = await ref
        .read(authNotifierProvider.notifier)
        .loginWithMagicLink(email);
    if (!mounted) return;
    setState(() => _loginLoading = false);
    if (result.userNotFound) {
      // Not registered yet — show an error with a clickable signup link
      // instead of auto-navigating to the signup form.
      setState(() => _loginUserNotFound = true);
      return;
    }
    if (result.error != null) {
      setState(() => _loginError = result.error.toString());
      return;
    }
    setState(() => _loginSent = true);
    _startLoginCooldown();
  }

  /// Loads `email_notifications` + `push_notifications` from `user_profiles`
  /// once per signed-in user. Skipped for anonymous users (their toggle
  /// remains on the local default and is meaningless without a real account
  /// to deliver notifications to). Re-runs on user-id change so anon→email
  /// upgrade picks up the row created by the `handle_new_user` trigger.
  Future<void> _hydrateNotificationsIfNeeded() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    if (_hydratedForUserId == user.id) return;
    _hydratedForUserId = user.id;
    try {
      final row = await Supabase.instance.client
          .from('user_profiles')
          .select('email_notifications, push_notifications')
          .eq('id', user.id)
          .maybeSingle();
      if (!mounted) return;
      // Treat the toggle as "any notification channel enabled". When either
      // is true we show ON; flipping the toggle writes the same value to both.
      final email = (row?['email_notifications'] as bool?) ?? true;
      final push = (row?['push_notifications'] as bool?) ?? true;
      setState(() {
        _notificationsEnabled = email || push;
        _notificationsHydrated = true;
      });
    } catch (e) {
      debugPrint('⛔ hydrate notifications failed: $e');
      if (mounted) setState(() => _notificationsHydrated = true);
    }
  }

  Future<void> _toggleNotifications(bool value) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return; // anon — local-only flip is meaningless

    final previous = _notificationsEnabled;
    setState(() {
      _notificationsEnabled = value;
      _notificationsSaving = true;
    });

    try {
      await Supabase.instance.client
          .from('user_profiles')
          .update({
            'email_notifications': value,
            'push_notifications': value,
          })
          .eq('id', user.id);
      if (!mounted) return;
      setState(() => _notificationsSaving = false);
    } catch (e) {
      debugPrint('⛔ toggleNotifications failed: $e');
      if (!mounted) return;
      // Revert.
      setState(() {
        _notificationsEnabled = previous;
        _notificationsSaving = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'تعذّر تحديث الإشعارات. حاول لاحقاً.',
            style: TextStyle(fontFamily: RannaTheme.fontFustat),
          ),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authNotifierProvider);
    final isRealUser = auth.user != null && !auth.isAnonymous;

    // Hydrate notification prefs lazily on first build for signed-in users.
    if (isRealUser && !_notificationsHydrated) {
      // Fire-and-forget — must not block the build.
      // ignore: discarded_futures
      _hydrateNotificationsIfNeeded();
    }
    // Reset when user changes (sign-out → re-anon, or anon → real).
    if (!isRealUser && _hydratedForUserId != null) {
      _hydratedForUserId = null;
      _notificationsHydrated = false;
    }

    return Directionality(
      textDirection: TextDirection.rtl,
      child: ListView(
        padding: const EdgeInsetsDirectional.fromSTEB(20, 20, 20, 40),
        children: [
            // Title
            Text(
              'زاويتي',
              style: TextStyle(fontFamily: RannaTheme.fontFustat,
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
            ),
            const SizedBox(height: 20),

            // Anon users get a drastically simplified screen: avatar + inline
            // login + "create account" link. No menu, no logout.
            if (!isRealUser) ...[
              const SizedBox(height: 12),
              _buildAnonAuthView(context),
            ] else ...[
              // Profile card
              _buildProfileCard(context),
              const SizedBox(height: 28),
              ..._buildAuthedMenus(context),
            ],
          ],
        ),
    );
  }

  Widget _buildAnonAuthView(BuildContext context) {
    return Column(
      children: [
        // Avatar (guest)
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: RannaTheme.primary.withValues(alpha: 0.1),
            border: Border.all(
              color: RannaTheme.primary.withValues(alpha: 0.2),
              width: 2,
            ),
          ),
          child: Center(
            child: Text(
              'ز',
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 30,
                fontWeight: FontWeight.bold,
                color: RannaTheme.primary,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'زائر',
          style: TextStyle(
            fontFamily: RannaTheme.fontFustat,
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: RannaTheme.foreground,
          ),
        ),
        const SizedBox(height: 32),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: _buildInlineLogin(context),
        ),
      ],
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideY(begin: 0.04, end: 0, duration: 300.ms, curve: Curves.easeOut);
  }

  List<Widget> _buildAuthedMenus(BuildContext context) {
    return [
            // Activity section
            _buildSectionTitle('نشاطي', 0),
            const SizedBox(height: 8),
            _buildMenuContainer([
              _MenuItemData(
                icon: Icons.favorite_rounded,
                label: 'مُختاراتي',
                description: 'المدائح المفضلة',
                delay: 1,
                onTap: () => context.go('/favorites'),
              ),
              _MenuItemData(
                icon: Icons.people_rounded,
                label: 'متابعاتي',
                description: 'المادحين والرواة والطرق',
                delay: 2,
                onTap: () => context.push('/account/my-follows'),
              ),
              _MenuItemData(
                icon: Icons.history_rounded,
                label: 'سجل الاستماع',
                description: 'آخر ما استمعت إليه',
                delay: 3,
                onTap: () => context.push('/account/listening-history'),
              ),
              _MenuItemData(
                icon: Icons.bar_chart_rounded,
                label: 'إحصائيات الاستماع',
                description: 'تتبع نشاطك',
                delay: 4,
                onTap: () => context.push('/account/listening-stats'),
              ),
            ]),
            const SizedBox(height: 28),

            // Settings section
            _buildSectionTitle('الإعدادات', 5),
            const SizedBox(height: 8),
            _buildMenuContainer([
              _MenuItemData(
                icon: Icons.person_rounded,
                label: 'بيانات الحساب',
                description: 'الاسم والدولة ورقم الجوال',
                delay: 6,
                onTap: () => context.push('/account/edit'),
              ),
              _MenuItemData(
                icon: Icons.notifications_rounded,
                label: 'الإشعارات',
                description: 'إدارة التنبيهات',
                delay: 8,
                isToggle: true,
              ),
            ]),
            const SizedBox(height: 28),

            // Privacy policy
            _buildPrivacyPolicyButton(),
            const SizedBox(height: 12),

            // Logout button
            _buildLogoutButton(context),
            const SizedBox(height: 20),

            // Version text
            Center(
              child: Text(
                'رنّة الإصدار ٠.١.٠',
                style: TextStyle(fontFamily: RannaTheme.fontFustat,
                  fontSize: 12,
                  color: RannaTheme.mutedForeground,
                ),
              ),
            ),
    ];
  }

  Widget _buildProfileCard(BuildContext context) {
    final auth = ref.watch(authNotifierProvider);
    final isRealUser = auth.user != null && !auth.isAnonymous;
    final email = auth.user?.email ?? '';
    final displayName = isRealUser
        ? (auth.user?.userMetadata?['display_name'] as String?) ??
            (email.contains('@') ? email.split('@').first : 'حسابي')
        : 'زائر';
    final avatarLabel = isRealUser && displayName.isNotEmpty
        ? displayName.characters.first.toUpperCase()
        : 'ز';
    final subtitle = isRealUser ? email : 'لم يتم تسجيل الدخول';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: RannaTheme.card,
        borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
        border: Border.all(color: RannaTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              // Avatar
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: RannaTheme.primary.withValues(alpha: 0.2),
                    width: 2,
                  ),
                ),
                child: Center(
                  child: Text(
                    avatarLabel,
                    style: TextStyle(fontFamily: RannaTheme.fontFustat,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: RannaTheme.primary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),

              // Name and subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontFamily: RannaTheme.fontFustat,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: RannaTheme.foreground,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      overflow: TextOverflow.ellipsis,
                      textDirection: isRealUser
                          ? TextDirection.ltr
                          : TextDirection.rtl,
                      style: TextStyle(fontFamily: RannaTheme.fontNotoNaskh,
                        fontSize: 13,
                        color: RannaTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

        ],
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideY(begin: 0.05, end: 0, duration: 300.ms, curve: Curves.easeOut);
  }

  Widget _buildInlineLogin(BuildContext context) {
    if (_loginSent) {
      final email = _loginEmailController.text.trim();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(RannaTheme.radiusXl),
            ),
            child: const Icon(
              Icons.mark_email_read_rounded,
              size: 20,
              color: Colors.green,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'تحقّق من بريدك الإلكتروني',
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: RannaTheme.foreground,
            ),
          ),
          const SizedBox(height: 4),
          Text.rich(
            TextSpan(
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 11,
                color: RannaTheme.mutedForeground,
              ),
              children: [
                const TextSpan(text: 'أرسلنا رابط الدخول إلى '),
                TextSpan(
                  text: email,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          TextButton(
            onPressed: _loginCooldown > 0
                ? null
                : () {
                    setState(() {
                      _loginSent = false;
                      _loginError = null;
                    });
                  },
            child: Text(
              _loginCooldown > 0
                  ? 'إعادة الإرسال بعد $_loginCooldown ث'
                  : 'إرسال إلى بريد آخر',
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'دخول ببريدك الإلكتروني',
          style: TextStyle(
            fontFamily: RannaTheme.fontFustat,
            fontSize: 12,
            color: RannaTheme.mutedForeground,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _loginEmailController,
          keyboardType: TextInputType.emailAddress,
          textDirection: TextDirection.ltr,
          textAlign: TextAlign.left,
          enabled: !_loginLoading,
          onSubmitted: (_) => _handleInlineLogin(),
          onChanged: (_) {
            if (_loginUserNotFound) {
              setState(() => _loginUserNotFound = false);
            }
          },
          cursorColor: RannaTheme.primary,
          style: TextStyle(
            fontFamily: RannaTheme.fontFustat,
            fontSize: 14,
            color: RannaTheme.foreground,
          ),
          decoration: InputDecoration(
            hintText: 'example@ranna.app',
            hintStyle: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 13,
              color: RannaTheme.mutedForeground,
            ),
            prefixIcon: const Padding(
              padding: EdgeInsetsDirectional.only(start: 16, end: 8),
              child: Icon(Icons.email_rounded, size: 18, color: RannaTheme.mutedForeground),
            ),
            prefixIconConstraints: const BoxConstraints(minWidth: 42, minHeight: 42),
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 20,
              vertical: 14,
            ),
            filled: true,
            fillColor: RannaTheme.muted,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
              borderSide: const BorderSide(
                color: RannaTheme.primary,
                width: 1.5,
              ),
            ),
          ),
        ),
        if (_loginUserNotFound) ...[
          const SizedBox(height: 6),
          Text.rich(
            TextSpan(
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 11,
                height: 1.6,
                color: RannaTheme.destructive,
              ),
              children: [
                const TextSpan(text: 'لا يوجد حساب بهذا البريد. اضغط على '),
                TextSpan(
                  text: 'رابط إنشاء حساب جديد',
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: RannaTheme.primary,
                  ),
                  recognizer: TapGestureRecognizer()
                    ..onTap = () => context.push(
                          '/auth',
                          extra: {
                            'initialEmail':
                                _loginEmailController.text.trim(),
                          },
                        ),
                ),
                const TextSpan(text: ' لفتح حساب في رنّة.'),
              ],
            ),
          ),
        ] else if (_loginError != null) ...[
          const SizedBox(height: 6),
          Text(
            _loginError!,
            style: TextStyle(
              fontFamily: RannaTheme.fontFustat,
              fontSize: 11,
              color: RannaTheme.destructive,
            ),
          ),
        ],
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: Material(
            color: RannaTheme.primary,
            borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
            child: InkWell(
              borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
              onTap: _loginLoading ? null : _handleInlineLogin,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Center(
                  child: _loginLoading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          'دخول',
                          style: TextStyle(
                            fontFamily: RannaTheme.fontFustat,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: RannaTheme.primaryForeground,
                          ),
                        ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Center(
          child: Text.rich(
            TextSpan(
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 12,
                color: RannaTheme.mutedForeground,
              ),
              children: [
                const TextSpan(text: 'أول مرة هنا؟ '),
                TextSpan(
                  text: 'إنشاء حساب جديد',
                  style: TextStyle(
                    fontFamily: RannaTheme.fontFustat,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: RannaTheme.primary,
                  ),
                  recognizer: TapGestureRecognizer()
                    ..onTap = () => context.push('/auth'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title, int animIndex) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(start: 4),
      child: Text(
        title,
        style: TextStyle(fontFamily: RannaTheme.fontFustat,
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: RannaTheme.mutedForeground,
        ),
      ),
    )
        .animate()
        .fadeIn(
          duration: 300.ms,
          delay: Duration(milliseconds: 40 * animIndex),
        )
        .slideY(
          begin: 0.05,
          end: 0,
          duration: 300.ms,
          delay: Duration(milliseconds: 40 * animIndex),
          curve: Curves.easeOut,
        );
  }

  Widget _buildMenuContainer(List<_MenuItemData> items) {
    return Container(
      decoration: BoxDecoration(
        color: RannaTheme.card,
        borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
        border: Border.all(color: RannaTheme.border),
      ),
      child: Column(
        children: [
          for (int i = 0; i < items.length; i++) ...[
            _buildMenuItem(items[i])
                .animate()
                .fadeIn(
                  duration: 300.ms,
                  delay: Duration(milliseconds: 40 * items[i].delay),
                )
                .slideY(
                  begin: 0.05,
                  end: 0,
                  duration: 300.ms,
                  delay: Duration(milliseconds: 40 * items[i].delay),
                  curve: Curves.easeOut,
                ),
            if (i < items.length - 1)
              Divider(
                height: 1,
                indent: 64,
                color: RannaTheme.border.withValues(alpha: 0.5),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildMenuItem(_MenuItemData item) {
    return SizedBox(
      height: 48,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
          onTap: item.isToggle ? null : item.onTap,
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(12, 0, 12, 0),
            child: Row(
              children: [
                // Icon box
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: RannaTheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(RannaTheme.radiusXl),
                  ),
                  child: Icon(
                    item.icon,
                    size: 20,
                    color: RannaTheme.primary,
                  ),
                ),
                const SizedBox(width: 12),

                // Label + description
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.label,
                        style: TextStyle(fontFamily: RannaTheme.fontFustat,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: RannaTheme.foreground,
                        ),
                      ),
                    ],
                  ),
                ),

                // Trailing: toggle switch or chevron
                if (item.isToggle)
                  SizedBox(
                    height: 24,
                    child: Switch.adaptive(
                      value: _notificationsEnabled,
                      onChanged: _notificationsSaving ? null : _toggleNotifications,
                      activeTrackColor: RannaTheme.primary,
                    ),
                  )
                else
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: RannaTheme.mutedForeground,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPrivacyPolicyButton() {
    return GestureDetector(
      onTap: () => launchUrl(
        Uri.parse('https://docs.google.com/document/d/1qAiSQvGqky5UJSeUyxqhoZsma2rj9qzqvU7JSRjhs2o'),
        mode: LaunchMode.externalApplication,
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: RannaTheme.card,
          borderRadius: BorderRadius.circular(RannaTheme.radiusLg),
          border: Border.all(color: RannaTheme.border.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Icon(Icons.policy_rounded, size: 18, color: RannaTheme.mutedForeground),
            const SizedBox(width: 10),
            Text(
              'سياسة الخصوصية',
              style: TextStyle(
                fontFamily: RannaTheme.fontFustat,
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: RannaTheme.foreground,
              ),
            ),
            const Spacer(),
            Icon(Icons.chevron_right_rounded, size: 20, color: RannaTheme.mutedForeground),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    final auth = ref.watch(authNotifierProvider);
    final isRealUser = auth.user != null && !auth.isAnonymous;
    // Dim the button for anonymous users — logout is meaningless (would just
    // re-bootstrap a new anon session anyway).
    final enabled = isRealUser && !_signingOut;
    final color = enabled
        ? RannaTheme.destructive
        : RannaTheme.destructive.withValues(alpha: 0.5);
    final borderColor = enabled
        ? RannaTheme.destructive.withValues(alpha: 0.3)
        : RannaTheme.destructive.withValues(alpha: 0.15);

    return SizedBox(
      width: double.infinity,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
        child: InkWell(
          borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
          onTap: enabled ? _handleSignOut : null,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(RannaTheme.radius2xl),
              border: Border.all(color: borderColor),
            ),
            child: Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_signingOut)
                    SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: color,
                      ),
                    )
                  else
                    Icon(
                      Icons.logout_rounded,
                      size: 20,
                      color: color,
                    ),
                  const SizedBox(width: 8),
                  Text(
                    _signingOut ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج',
                    style: TextStyle(fontFamily: RannaTheme.fontFustat,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleSignOut() async {
    setState(() => _signingOut = true);
    try {
      await ref.read(authNotifierProvider.notifier).signOut();
    } finally {
      if (mounted) setState(() => _signingOut = false);
    }
  }
}

class _MenuItemData {
  final IconData icon;
  final String label;
  final String description;
  final int delay;
  final bool isToggle;
  final VoidCallback? onTap;

  const _MenuItemData({
    required this.icon,
    required this.label,
    required this.description,
    required this.delay,
    this.isToggle = false,
    this.onTap,
  });
}
