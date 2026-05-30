import badgeUrl from "@/assets/icons/signing-badge.svg";

/**
 * The small "sign-in to unlock" glyph drawn over a gated control's icon.
 *
 * Web mirror of the Flutter `FeatureBadge` (`app/lib/access/widgets/feature_badge.dart`).
 * Like mobile, it is intentionally ALWAYS shown — even once the user has access —
 * so gated controls keep their "premium" affordance after sign-in rather than
 * silently losing it.
 *
 * Drop it (absolutely positioned) next to any gated icon:
 *
 * ```tsx
 * <span className="relative">
 *   <BookOpenText />
 *   <FeatureBadge className="absolute -bottom-1 -left-1.5" />
 * </span>
 * ```
 */
export function FeatureBadge({
  size = 14,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={badgeUrl}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={className}
      draggable={false}
    />
  );
}
