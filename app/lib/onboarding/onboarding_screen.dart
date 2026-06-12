/// First-run onboarding — three swipeable pages shown once on a fresh
/// install (route `/onboarding`, redirected to from `/` by the router):
///
///   1. Welcome — brand moment + animated library counter ("أكثر من ٢٥٠٠").
///   2. Taste picker — content types (tracks.content_type values) and طرق.
///      Selections persist locally so the home feed can personalize later.
///   3. Account benefits — the member tier's benefit list in the access gate
///      sheet's visual language, with a sign-in CTA and a guest skip.
///
/// Every page is skippable; finishing (any way) sets `onboarding_completed`.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ranna/access/access_tier.dart';
import 'package:ranna/onboarding/onboarding_prefs.dart';
import 'package:ranna/providers/auth_notifier.dart';
import 'package:ranna/providers/categories_provider.dart';
import 'package:ranna/services/mixpanel_service.dart';
import 'package:ranna/theme/app_theme.dart';
import 'package:ranna/utils/haptics.dart';

/// The selectable listening types on the taste page. Values match
/// `tracks.content_type` in the database (see web CONTENT_TYPES) so the
/// saved picks can drive real feed filtering.
const _contentTypeOptions = <(String, String)>[
  ('quran', 'القرآن الكريم'),
  ('madha', 'مدائح'),
  ('inshad', 'الإنشاد'),
  ('dhikr', 'الأذكار'),
  ('lecture', 'الدروس'),
];

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pageController = PageController();
  int _page = 0;

  final Set<String> _contentTypes = {};
  final Set<String> _turuq = {};

  @override
  void initState() {
    super.initState();
    // Instantiate the (lazy) auth provider NOW so the anonymous session
    // bootstraps while the user reads these pages — otherwise no session
    // exists until the main shell builds, and the taste-pick sync at the
    // end of the flow would have no user to write to.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(authNotifierProvider);
    });
    _track('onboarding_started');
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _track(String event, [Map<String, dynamic>? props]) {
    if (MixpanelService.isInitialized) {
      MixpanelService.instance.track(event, properties: props);
    }
  }

  void _goNext() {
    Haptics.selection();
    _pageController.nextPage(
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
    );
  }

  /// [method] ∈ signin | guest | skip — how the user left the flow.
  void _finish(String method) {
    Haptics.selection();
    saveTastePicks(ref, contentTypes: _contentTypes, turuqIds: _turuq);
    completeOnboarding(ref);
    _track('onboarding_completed', {
      'method': method,
      'last_step': _page + 1,
      'content_types': _contentTypes.toList(),
      'turuq_count': _turuq.length,
    });

    // Capture the router before `go` disposes this route's position.
    final router = GoRouter.of(context);
    router.go('/');
    if (method == 'signin') router.push('/auth');
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _page == 2;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: RannaTheme.background,
        body: SafeArea(
          child: Column(
            children: [
              // ── Top bar: skip (hidden on the last page — it has its own) ──
              SizedBox(
                height: 52,
                child: Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: isLast
                      ? null
                      : Padding(
                          padding: const EdgeInsetsDirectional.only(end: 16),
                          child: _PillButton(
                            label: 'تخطّي',
                            onTap: () => _finish('skip'),
                          ),
                        ),
                ),
              ),

              // ── Pages ──
              Expanded(
                child: PageView(
                  controller: _pageController,
                  onPageChanged: (page) {
                    setState(() => _page = page);
                    _track('onboarding_step_viewed', {'step': page + 1});
                  },
                  children: [
                    const _WelcomePage(),
                    _TastePage(
                      selectedContentTypes: _contentTypes,
                      selectedTuruq: _turuq,
                      onToggleContentType: (v) => setState(() {
                        _contentTypes.contains(v)
                            ? _contentTypes.remove(v)
                            : _contentTypes.add(v);
                      }),
                      onToggleTariqa: (v) => setState(() {
                        // "ليس لدي" is exclusive — it contradicts any actual
                        // طريقة pick (and أخرى), in both directions.
                        if (v == 'none') {
                          if (_turuq.contains('none')) {
                            _turuq.remove('none');
                          } else {
                            _turuq
                              ..clear()
                              ..add('none');
                          }
                        } else {
                          _turuq.remove('none');
                          _turuq.contains(v)
                              ? _turuq.remove(v)
                              : _turuq.add(v);
                        }
                      }),
                    ),
                    const _BenefitsPage(),
                  ],
                ),
              ),

              // ── Dots + CTA ──
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
                child: Column(
                  children: [
                    _PageDots(page: _page, count: 3),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 54,
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: RannaTheme.tertiary,
                          foregroundColor: RannaTheme.tertiaryForeground,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(
                              RannaTheme.radiusFull,
                            ),
                          ),
                          elevation: 0,
                        ),
                        onPressed: isLast ? () => _finish('signin') : _goNext,
                        child: Text(
                          switch (_page) {
                            0 => 'ابدأ الاستماع',
                            1 => 'متابعة',
                            _ => 'سجِّل الآن',
                          },
                          style: const TextStyle(
                            fontFamily: RannaTheme.fontKufam,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    // Reserve the row's height on every page so the CTA
                    // doesn't jump when the guest option appears on page 3.
                    SizedBox(
                      height: 56,
                      child: isLast
                          ? Center(
                              child: _PillButton(
                                label: 'لاحقاً — تصفّح كزائر',
                                onTap: () => _finish('guest'),
                              ),
                            )
                          : null,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Page 1 — Welcome + library counter
// =============================================================================

class _WelcomePage extends ConsumerWidget {
  const _WelcomePage();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Render the hardcoded floor instantly; when the HEAD count query
    // resolves, the tween retargets and the counter climbs to the real
    // number — the climb itself sells "this library is big and alive".
    final target =
        ref.watch(libraryTrackCountProvider).valueOrNull ??
        kFallbackTrackCount;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/images/ranna_logo_white.png',
              width: 96,
              height: 96,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const Icon(
                Icons.music_note_rounded,
                size: 72,
                color: RannaTheme.primary,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'للمدائح النبوية',
              style: TextStyle(
                fontFamily: RannaTheme.fontKufam,
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              'أكثر من',
              style: TextStyle(
                fontFamily: RannaTheme.fontKufam,
                fontSize: 14,
                fontWeight: FontWeight.w300,
                color: RannaTheme.mutedForeground,
              ),
            ),
            const SizedBox(height: 4),
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: target.toDouble()),
              duration: const Duration(milliseconds: 1800),
              curve: Curves.easeOutCubic,
              builder: (context, value, _) => Text(
                '${value.round()}',
                style: const TextStyle(
                  fontFamily: RannaTheme.fontKufam,
                  fontSize: 52,
                  fontWeight: FontWeight.bold,
                  color: RannaTheme.accent,
                  height: 1.2,
                ),
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'مقطع',
              style: TextStyle(
                fontFamily: RannaTheme.fontKufam,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'من أكبر مكتبات المدائح النبوية في العالم —\nمدّاحون، رواة، طرق وفنون في مكان واحد',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: RannaTheme.fontKufam,
                fontSize: 13,
                fontWeight: FontWeight.w300,
                height: 1.9,
                color: RannaTheme.mutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Page 2 — Taste picker
// =============================================================================

class _TastePage extends ConsumerWidget {
  final Set<String> selectedContentTypes;
  final Set<String> selectedTuruq;
  final ValueChanged<String> onToggleContentType;
  final ValueChanged<String> onToggleTariqa;

  const _TastePage({
    required this.selectedContentTypes,
    required this.selectedTuruq,
    required this.onToggleContentType,
    required this.onToggleTariqa,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final turuq = ref.watch(allTuruqProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'خصّص تجربتك',
            style: TextStyle(
              fontFamily: RannaTheme.fontKufam,
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: RannaTheme.foreground,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'اختر ما يناسبك — يمكنك تغييره في أي وقت',
            style: TextStyle(
              fontFamily: RannaTheme.fontKufam,
              fontSize: 13,
              fontWeight: FontWeight.w300,
              color: RannaTheme.mutedForeground,
            ),
          ),
          const SizedBox(height: 28),

          const _SectionLabel('ما الذي تحب أن تستمع له؟'),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 10,
            children: [
              for (final (value, label) in _contentTypeOptions)
                _TasteChip(
                  label: label,
                  selected: selectedContentTypes.contains(value),
                  onTap: () => onToggleContentType(value),
                ),
            ],
          ),

          const SizedBox(height: 28),
          const _SectionLabel('ما هي طريقتك؟'),
          const SizedBox(height: 12),
          turuq.when(
            data: (list) => Wrap(
              spacing: 8,
              runSpacing: 10,
              children: [
                for (final t in list)
                  _TasteChip(
                    label: t.name,
                    selected: selectedTuruq.contains(t.id),
                    onTap: () => onToggleTariqa(t.id),
                  ),
                _TasteChip(
                  label: 'ليس لدي',
                  selected: selectedTuruq.contains('none'),
                  onTap: () => onToggleTariqa('none'),
                ),
                _TasteChip(
                  label: 'أخرى +',
                  selected: selectedTuruq.contains('other'),
                  onTap: () => onToggleTariqa('other'),
                ),
              ],
            ),
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
            // Offline / error: the section just doesn't render — the picker
            // still works with content types alone.
            error: (_, _) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontFamily: RannaTheme.fontKufam,
        fontSize: 14,
        fontWeight: FontWeight.bold,
        color: RannaTheme.accent,
      ),
    );
  }
}

class _TasteChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _TasteChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Haptics.selection();
        onTap();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? RannaTheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
          border: Border.all(
            color: selected ? RannaTheme.primary : RannaTheme.border,
            width: 1.2,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: RannaTheme.fontKufam,
            fontSize: 13,
            fontWeight: selected ? FontWeight.bold : FontWeight.w300,
            color: selected
                ? RannaTheme.background
                : RannaTheme.foreground.withValues(alpha: 0.85),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Page 3 — Account benefits (gate-sheet visual language)
// =============================================================================

class _BenefitsPage extends StatelessWidget {
  const _BenefitsPage();

  @override
  Widget build(BuildContext context) {
    const tier = AccessTier.member;
    final accent = tier.badgeColor ?? RannaTheme.accent;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'أنشئ حسابك المجاني',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: RannaTheme.fontKufam,
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: RannaTheme.foreground,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'بدون كلمة مرور — بريدك أو حسابك في قوقل أو أبل يكفي',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: RannaTheme.fontKufam,
                fontSize: 14,
                fontWeight: FontWeight.w300,
                color: RannaTheme.mutedForeground,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 28),
            for (final b in tier.benefits)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(
                          RannaTheme.radiusMd,
                        ),
                      ),
                      child: Icon(b.icon, size: 20, color: accent),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        b.label,
                        style: const TextStyle(
                          fontFamily: RannaTheme.fontKufam,
                          fontSize: 14,
                          fontWeight: FontWeight.w300,
                          height: 1.5,
                          color: RannaTheme.foreground,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Pill button — secondary actions (تخطّي / لاحقاً) on an elevated background,
// matching the circular back buttons used across the app.
// =============================================================================

class _PillButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _PillButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Haptics.selection();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: RannaTheme.muted.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontFamily: RannaTheme.fontKufam,
            fontSize: 13,
            fontWeight: FontWeight.w300,
            color: RannaTheme.foreground,
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Page indicator dots
// =============================================================================

class _PageDots extends StatelessWidget {
  final int page;
  final int count;
  const _PageDots({required this.page, required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < count; i++)
          AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOut,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: i == page ? 20 : 6,
            height: 6,
            decoration: BoxDecoration(
              color: i == page ? RannaTheme.tertiary : RannaTheme.border,
              borderRadius: BorderRadius.circular(RannaTheme.radiusFull),
            ),
          ),
      ],
    );
  }
}
