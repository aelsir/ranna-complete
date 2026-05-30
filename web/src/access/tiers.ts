import { Download, BookOpenText, Heart, type LucideIcon } from "lucide-react";

/**
 * A single "you'll get this" line in the access gate screen (icon + label).
 * Web mirror of the Flutter `AccessBenefit` (see `app/lib/access/access_tier.dart`).
 */
export interface AccessBenefit {
  icon: LucideIcon;
  label: string;
}

/**
 * The access tiers a user can occupy, in ascending order of privilege.
 *
 * Every user always has a session in this app (anonymous bootstrap on first
 * launch — see `AuthContext.tsx`), so gating is never "logged in vs not". It
 * is "which tier are you in":
 *
 *   • Guest   — anonymous session (fresh load, signed out → re-anon)
 *   • Member  — a real account (email magic-link / Google / Apple)
 *   • Premium — a paid subscription (NOT shipped yet; defined so features and
 *               the gate UI already speak the vocabulary)
 *
 * Adding a higher tier later = append below `Premium` with a larger `rank`.
 * Never reorder — `rank` is what comparisons use.
 */
export enum AccessTier {
  Guest = "guest",
  Member = "member",
  Premium = "premium",
}

export interface AccessTierMeta {
  /** Ordering weight. Higher = more privileged. Compared via {@link tierMeets}. */
  rank: number;
  /** Copy for the access gate screen shown when a user below this tier taps a
   * feature requiring it. */
  gateTitle?: string;
  gateSubtitle?: string;
  gateCtaLabel?: string;
  /** The "what you get" list rendered in the gate screen. */
  benefits: AccessBenefit[];
}

export const ACCESS_TIER_META: Record<AccessTier, AccessTierMeta> = {
  [AccessTier.Guest]: { rank: 0, benefits: [] },

  [AccessTier.Member]: {
    rank: 1,
    gateTitle: "سجِّل في رنّة",
    gateSubtitle: "أنشئ حسابك المجاني واستمتع بمزايا إضافية",
    gateCtaLabel: "سجِّل الآن",
    benefits: [
      { icon: Download, label: "حمِّل المدائح واستمع دون اتصال" },
      { icon: BookOpenText, label: "اقرأ كلمات المدائح أثناء الاستماع" },
      { icon: Heart, label: "احفظ مختاراتك وزامنها عبر أجهزتك" },
    ],
  },

  // NOT live yet. No subscription table / paywall exists. The tier is declared
  // so a feature can require it the day subscriptions arrive — at which point
  // `useAccessTier` learns to return `Premium` and the gate screen learns to
  // show a real paywall. See the seam in `useAccess.ts`.
  [AccessTier.Premium]: {
    rank: 2,
    gateTitle: "اشترك في رنّة",
    gateSubtitle: "افتح كل المزايا باشتراك واحد",
    gateCtaLabel: "اشترك الآن",
    benefits: [],
  },
};

/**
 * True when a user in `current` tier is allowed into something needing
 * `required`. e.g. `tierMeets(Member, Member) === true`,
 * `tierMeets(Guest, Member) === false`, `tierMeets(Premium, Member) === true`.
 */
export function tierMeets(current: AccessTier, required: AccessTier): boolean {
  return ACCESS_TIER_META[current].rank >= ACCESS_TIER_META[required].rank;
}
