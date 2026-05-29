import { History, Loader2 } from "lucide-react";
import { useMemo } from "react";
import googleLogo from "@/assets/icons/google-logo.svg";
import appleLogo from "@/assets/icons/apple-logo.svg";
import { cn } from "@/lib/utils";
import type { LastAuthMethod } from "@/lib/lastAuthMethod";

interface OAuthButtonsProps {
  onGoogleClick?: () => void;
  onAppleClick?: () => void;
  googleLoading?: boolean;
  appleLoading?: boolean;
  /** Use signup-flavored Arabic copy ("التسجيل") instead of login ("الدخول"). */
  isSignUp?: boolean;
  /** Which provider the user most recently signed in with. When set to
   *  google/apple, that button floats to the top and shows a "آخر مرة دخلت
   *  بهذا" hint. `email` and null fall back to platform-based ordering. */
  lastMethod?: LastAuthMethod | null;
  className?: string;
}

/**
 * Shared Google + Apple OAuth buttons. Ordering rules:
 *   1. If `lastMethod` is google/apple, that button renders first + gets the
 *      "last used" hint.
 *   2. Otherwise: macOS/iOS → Apple first, everything else → Google first.
 */
export const OAuthButtons = ({
  onGoogleClick,
  onAppleClick,
  googleLoading = false,
  appleLoading = false,
  isSignUp = false,
  lastMethod = null,
  className,
}: OAuthButtonsProps) => {
  const appleFirstByPlatform = useMemo(
    () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    [],
  );

  const googleLabel = isSignUp ? "التسجيل بحساب قوقل" : "الدخول بحساب قوقل";
  const appleLabel = isSignUp ? "التسجيل بحساب أبل" : "الدخول بحساب أبل";

  const googleButton = (
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
    />
  );

  const appleButton = (
    <OAuthButton
      key="apple"
      icon={
        // The bundled Apple SVG has a hard-coded black fill — recolor via CSS
        // mask so it tracks the theme's foreground in both light + dark mode.
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
    />
  );

  let ordered: { node: React.ReactNode; key: string; lastUsed: boolean }[];
  if (lastMethod === "google") {
    ordered = [
      { node: googleButton, key: "google", lastUsed: true },
      { node: appleButton, key: "apple", lastUsed: false },
    ];
  } else if (lastMethod === "apple") {
    ordered = [
      { node: appleButton, key: "apple", lastUsed: true },
      { node: googleButton, key: "google", lastUsed: false },
    ];
  } else if (appleFirstByPlatform) {
    ordered = [
      { node: appleButton, key: "apple", lastUsed: false },
      { node: googleButton, key: "google", lastUsed: false },
    ];
  } else {
    ordered = [
      { node: googleButton, key: "google", lastUsed: false },
      { node: appleButton, key: "apple", lastUsed: false },
    ];
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {ordered.map(({ node, key, lastUsed }) =>
        lastUsed ? (
          <div key={key} className="flex flex-col gap-1.5">
            <LastUsedHint />
            {node}
          </div>
        ) : (
          <div key={key}>{node}</div>
        ),
      )}
    </div>
  );
};

const LastUsedHint = () => (
  <div className="flex items-center gap-1 px-1 font-fustat text-[11px] font-bold text-primary">
    <History className="h-3 w-3" />
    <span>آخر مرة دخلت بهذا</span>
  </div>
);

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
