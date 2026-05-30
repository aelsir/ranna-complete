import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// A single "you'll get this" line in the access gate sheet (icon + label).
@immutable
class AccessBenefit {
  final IconData icon;
  final String label;
  const AccessBenefit(this.icon, this.label);
}

/// The access tiers a user can occupy, in ascending order of privilege.
///
/// Every user always has a session in this app (anonymous bootstrap on first
/// launch — see `auth_notifier.dart`), so gating is never "logged in vs not".
/// It is "which tier are you in":
///
///   • [guest]   — anonymous session (fresh install, signed out → re-anon)
///   • [member]  — a real account (email magic-link / Google / Apple)
///   • [premium] — a paid subscription (NOT shipped yet; defined so features
///                 and the gate UI already speak the vocabulary)
///
/// Adding a higher tier later = append below `premium` with a larger [rank].
/// Never reorder — `rank` is what comparisons use, and the gate UI keys badge
/// colors off the tier.
enum AccessTier {
  guest(rank: 0),

  member(
    rank: 1,
    // Gold lock — the "sign in to unlock" affordance.
    badgeColor: RannaTheme.accent,
    badgeIcon: Icons.lock_rounded,
    gateTitle: 'سجِّل في رنّة',
    gateSubtitle: 'أنشئ حسابك المجاني واستمتع بمزايا إضافية',
    gateCtaLabel: 'سجِّل الآن',
    benefits: [
      AccessBenefit(Icons.download_rounded, 'حمِّل المدائح واستمع دون اتصال'),
      AccessBenefit(
        Icons.menu_book_rounded,
        'اقرأ كلمات المدائح أثناء الاستماع',
      ),
      AccessBenefit(Icons.favorite_rounded, 'احفظ مختاراتك وزامنها عبر أجهزتك'),
    ],
  ),

  /// NOT live yet. No subscription table / RPC / paywall exists. The tier is
  /// declared so a feature can require it and the badge renders a distinct
  /// color the day subscriptions arrive — at which point `accessTierProvider`
  /// learns to return `premium` and `showAccessGateSheet` learns to show a
  /// real paywall. See the seam in `access_provider.dart`.
  premium(
    rank: 2,
    // Emerald premium badge — visually distinct from the member lock.
    badgeColor: RannaTheme.primary,
    badgeIcon: Icons.workspace_premium_rounded,
    gateTitle: 'اشترك في رنّة',
    gateSubtitle: 'افتح كل المزايا باشتراك واحد',
    gateCtaLabel: 'اشترك الآن',
    benefits: [],
  );

  const AccessTier({
    required this.rank,
    this.badgeColor,
    this.badgeIcon,
    this.gateTitle,
    this.gateSubtitle,
    this.gateCtaLabel,
    this.benefits = const [],
  });

  /// Ordering weight. Higher = more privileged. Compared via [meets].
  final int rank;

  /// Badge tint shown next to a gated control for features requiring this
  /// tier. Null for [guest] (guest is never a *requirement*).
  final Color? badgeColor;

  /// Glyph shown inside the badge (lock for member, premium star later).
  final IconData? badgeIcon;

  /// Copy for the access gate sheet shown when a user below this tier taps a
  /// feature requiring it.
  final String? gateTitle;
  final String? gateSubtitle;
  final String? gateCtaLabel;

  /// The "what you get" list rendered in the gate sheet.
  final List<AccessBenefit> benefits;

  /// True when a user in `this` tier is allowed into something needing
  /// [required]. e.g. `member.meets(member) == true`, `guest.meets(member) ==
  /// false`, `premium.meets(member) == true`.
  bool meets(AccessTier required) => rank >= required.rank;
}
