import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import googleLogo from "@/assets/icons/google-logo.svg";
import appleLogo from "@/assets/icons/apple-logo.svg";
import { cn } from "@/lib/utils";

interface OAuthButtonsProps {
  onGoogleClick?: () => void;
  onAppleClick?: () => void;
  googleLoading?: boolean;
  appleLoading?: boolean;
  /** Use signup-flavored Arabic copy ("التسجيل") instead of login ("الدخول"). */
  isSignUp?: boolean;
  className?: string;
}

/**
 * Shared Google + Apple OAuth buttons. Platform-aware ordering:
 *   - macOS / iOS: Apple first.
 *   - Everything else: Google first.
 *
 * Visual style mirrors the Flutter `OAuthButtons` widget so the two
 * platforms feel like the same product.
 */
export const OAuthButtons = ({
  onGoogleClick,
  onAppleClick,
  googleLoading = false,
  appleLoading = false,
  isSignUp = false,
  className,
}: OAuthButtonsProps) => {
  const appleFirst = useMemo(
    () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    [],
  );

  const googleLabel = isSignUp ? "التسجيل بحساب قوقل" : "الدخول بحساب قوقل";
  const appleLabel = isSignUp ? "التسجيل بحساب أبل" : "الدخول بحساب أبل";

  const buttons = [
    <OAuthButton
      key="google"
      icon={
        <img
          src={googleLogo}
          alt=""
          aria-hidden
          className="h-[18px] w-[18px] shrink-0"
        />
      }
      label={googleLabel}
      loading={googleLoading}
      disabled={googleLoading || appleLoading}
      onClick={onGoogleClick}
    />,
    <OAuthButton
      key="apple"
      icon={
        // The bundled Apple SVG has a hard-coded black fill — recolor it via
        // CSS mask so it tracks the theme's foreground color in both light
        // and dark mode.
        <span
          aria-hidden
          className="h-[18px] w-[18px] shrink-0 bg-foreground"
          style={{
            mask: `url(${appleLogo}) center / contain no-repeat`,
            WebkitMask: `url(${appleLogo}) center / contain no-repeat`,
          }}
        />
      }
      label={appleLabel}
      loading={appleLoading}
      disabled={googleLoading || appleLoading}
      onClick={onAppleClick}
    />,
  ];
  if (appleFirst) buttons.reverse();

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {buttons}
    </div>
  );
};

interface OAuthDividerProps {
  isSignUp?: boolean;
  className?: string;
}

/** The "أو ادخل ببريدك الإلكتروني" / "أو سجّل ببريدك الإلكتروني" divider. */
export const OAuthDivider = ({ isSignUp = false, className }: OAuthDividerProps) => (
  <div className={cn("flex items-center gap-3.5", className)}>
    <div className="flex-1 h-px bg-border/60" />
    <span className="font-fustat text-[11px] text-muted-foreground whitespace-nowrap">
      {isSignUp ? "أو سجّل ببريدك الإلكتروني" : "أو ادخل ببريدك الإلكتروني"}
    </span>
    <div className="flex-1 h-px bg-border/60" />
  </div>
);

// ============================================================================
// Internal: single OAuth button
// ============================================================================

interface OAuthButtonProps {
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const OAuthButton = ({ icon, label, loading, disabled, onClick }: OAuthButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full h-12 rounded-xl bg-card border border-border/60",
      "flex items-center justify-center gap-2.5",
      "font-fustat text-sm font-bold text-foreground",
      "transition-colors hover:bg-muted/40",
      "disabled:opacity-60 disabled:cursor-not-allowed",
    )}
  >
    {loading ? (
      <Loader2 className="h-[18px] w-[18px] animate-spin text-muted-foreground" />
    ) : (
      icon
    )}
    <span>{label}</span>
  </button>
);
