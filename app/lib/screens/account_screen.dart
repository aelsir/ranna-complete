import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/theme/app_theme.dart';

class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key});

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends ConsumerState<AccountScreen> {
  bool _notificationsEnabled = true;
  bool _signingOut = false;

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: ListView(
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

            // Profile card
            _buildProfileCard(context),
            const SizedBox(height: 28),

            // Activity section
            _buildSectionTitle('نشاطي', 0),
            const SizedBox(height: 8),
            _buildMenuContainer([
              _MenuItemData(
                icon: Icons.favorite_rounded,
                label: 'مُختاراتي',
                description: 'المدائح المفضلة',
                delay: 1,
              ),
              _MenuItemData(
                icon: Icons.history_rounded,
                label: 'سجل الاستماع',
                description: 'آخر ما استمعت إليه',
                delay: 2,
              ),
              _MenuItemData(
                icon: Icons.bar_chart_rounded,
                label: 'إحصائيات الاستماع',
                description: 'تتبع نشاطك',
                delay: 3,
              ),
            ]),
            const SizedBox(height: 28),

            // Settings section
            _buildSectionTitle('الإعدادات', 4),
            const SizedBox(height: 8),
            _buildMenuContainer([
              _MenuItemData(
                icon: Icons.person_rounded,
                label: 'بيانات الحساب',
                description: 'الاسم والبريد الإلكتروني',
                delay: 5,
              ),
              _MenuItemData(
                icon: Icons.lock_rounded,
                label: 'كلمة المرور',
                description: 'تغيير كلمة المرور',
                delay: 6,
              ),
              _MenuItemData(
                icon: Icons.notifications_rounded,
                label: 'الإشعارات',
                description: 'إدارة التنبيهات',
                delay: 7,
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
          ],
        ),
      ),
    );
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
      child: Row(
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

          // Login button (only for anonymous / no-session users)
          if (!isRealUser)
            Material(
              color: RannaTheme.primary,
              borderRadius: BorderRadius.circular(RannaTheme.radiusXl),
              child: InkWell(
                borderRadius: BorderRadius.circular(RannaTheme.radiusXl),
                onTap: () => context.push('/auth'),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.login_rounded,
                        size: 18,
                        color: RannaTheme.primaryForeground,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'دخول',
                        style: TextStyle(fontFamily: RannaTheme.fontFustat,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: RannaTheme.primaryForeground,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideY(begin: 0.05, end: 0, duration: 300.ms, curve: Curves.easeOut);
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
          onTap: item.isToggle ? null : () {},
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
                      onChanged: (val) {
                        setState(() => _notificationsEnabled = val);
                      },
                      activeTrackColor: RannaTheme.primary,
                    ),
                  )
                else
                  Icon(
                    Icons.chevron_left_rounded,
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
            Icon(Icons.chevron_left_rounded, size: 20, color: RannaTheme.mutedForeground),
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

  const _MenuItemData({
    required this.icon,
    required this.label,
    required this.description,
    required this.delay,
    this.isToggle = false,
  });
}
