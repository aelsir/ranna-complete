import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptic";
import { AccessTier, ACCESS_TIER_META } from "./tiers";
import bannerUrl from "@/assets/images/gate-sheet-banner.jpg";

/**
 * Full-screen access gate shown when a user below a feature's required tier
 * taps it. Web mirror of the Flutter `AccessGateSheet`
 * (`app/lib/access/widgets/access_gate_sheet.dart`).
 *
 * Layout (top → bottom):
 *  1. Banner image — fades into the dark background with a gradient overlay.
 *  2. Title + subtitle.
 *  3. Benefit rows with icons.
 *  4. Pinned primary CTA button.
 *  5. A circular ✕ close button in the top-right corner.
 *
 * The SAME component serves the future premium paywall — it renders whatever the
 * target {@link AccessTier} declares (title / subtitle / benefits / CTA label).
 * Today the only target tier is `Member`, whose CTA routes to `/account` (the
 * sign-in surface). When premium ships, branch the CTA to the paywall there.
 *
 * Rendered once at the app root by {@link AccessGateProvider}; `tier === null`
 * means hidden.
 */
export function AccessGateScreen({
  tier,
  onClose,
}: {
  tier: AccessTier | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const meta = tier ? ACCESS_TIER_META[tier] : null;

  const handleCta = () => {
    haptic.selection();
    onClose();
    // Member gate → sign-in surface. When premium ships, branch here to the
    // paywall route instead (the tier already carries premium copy).
    navigate("/account");
  };

  const handleClose = () => {
    haptic.selection();
    onClose();
  };

  return (
    <AnimatePresence>
      {tier && meta && (
        <motion.div
          dir="rtl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex flex-col bg-primary text-primary-foreground"
        >
          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto">
            {/* Banner image with gradient fade into the background */}
            <div className="relative h-72 w-full">
              <img
                src={bannerUrl}
                alt=""
                aria-hidden
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-primary/70 to-primary" />
            </div>

            <div className="px-6 -mt-8">
              <h2 className="text-center font-fustat text-2xl font-bold">
                {meta.gateTitle}
              </h2>
              {meta.gateSubtitle && (
                <p className="mt-2 text-center font-fustat text-sm font-light leading-relaxed text-primary-foreground/60">
                  {meta.gateSubtitle}
                </p>
              )}

              {/* Benefits */}
              <div className="mt-8 space-y-1">
                {meta.benefits.map((benefit, i) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={i} className="flex items-center gap-3.5 py-2.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                        <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
                      </div>
                      <p className="font-fustat text-sm font-light leading-relaxed text-primary-foreground/90">
                        {benefit.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Spacer so content clears the pinned CTA. */}
              <div className="h-24" />
            </div>
          </div>

          {/* ── Pinned CTA ── */}
          <div className="shrink-0 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
            <Button
              onClick={handleCta}
              className="h-14 w-full rounded-full bg-accent font-fustat text-base font-bold text-accent-foreground hover:bg-accent/90"
            >
              {meta.gateCtaLabel}
            </Button>
          </div>

          {/* ── Close button (top-right) ── */}
          <button
            onClick={handleClose}
            aria-label="إغلاق"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground backdrop-blur-sm transition-colors hover:bg-primary-foreground/25"
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
