import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { identifyUser, resetUser } from "@/lib/analytics";

interface AuthContextType {
  /** The current Supabase user (may be an anonymous user). `null` only during initial bootstrap. */
  user: User | null;
  /** The current session. `null` only during initial bootstrap. */
  session: Session | null;
  /** True while the initial session + anon bootstrap is resolving. */
  loading: boolean;
  /** True when the user exists but is an anonymous Supabase user (no email). */
  isAnonymous: boolean;
  /** True when the user has the `admin` or `superuser` role in `user_roles`. */
  isAdmin: boolean;
  /**
   * True when this user is on the internal team (founder, designers,
   * testers). Read from `user_profiles.is_internal`. Used to skip play
   * recording at source AND filter analytics — see migration 036 for the
   * full design. Anonymous users are never internal.
   */
  isInternal: boolean;
  /**
   * Request a login magic link for an EXISTING account. Uses
   * `signInWithOtp({ shouldCreateUser: false })` so Supabase:
   *   - fires the `magic_link` template, and
   *   - returns `USER_NOT_FOUND` for unregistered emails — callers should
   *     guide the user to the signup form instead of silently creating a
   *     ghost account.
   */
  loginWithMagicLink: (
    email: string,
  ) => Promise<{ error: Error | null; userNotFound?: boolean }>;
  /**
   * Register a NEW account via magic link. Uses
   * `signInWithOtp({ shouldCreateUser: true, data })` so Supabase fires
   * the `confirmation` (Confirm signup) template for new emails and falls
   * back to `magic_link` if the email already exists (returning user who
   * tried to sign up — they just land in their existing account).
   *
   * Profile fields (displayName, country, phoneNumber) are stored on
   * `auth.users.raw_user_meta_data` and copied into `user_profiles` on
   * the callback page.
   *
   * NOTE: This does NOT preserve the anonymous UUID — the anon session is
   * discarded and replaced on magic-link click. Any anon data (favorites,
   * listening history) must be migrated client-side via `FavoritesMerge`.
   */
  signUpWithMagicLink: (
    email: string,
    profile: {
      displayName: string;
      country?: string;
      phoneNumber?: string;
    },
  ) => Promise<{ error: Error | null }>;
  /**
   * Sign out and immediately bootstrap a fresh anonymous session so the user
   * is never in a null-session state (favorites/history keep working anon).
   */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInternal, setIsInternal] = useState(false);

  // Ensures `signInAnonymously` is called at most once per component lifetime.
  // Never bootstrap from the `onAuthStateChange` callback — that fires on
  // every tab visibility change + token rotation, which would cause repeated
  // anon sign-ups.
  const didBootstrapRef = useRef(false);

  // Bootstrap: read initial session; if none exists, sign in anonymously.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        didBootstrapRef.current = true;
        setLoading(false);
        return;
      }

      // No existing session — create an anonymous one.
      if (!didBootstrapRef.current) {
        didBootstrapRef.current = true;
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("[auth] anon bootstrap failed", error);
          setLoading(false);
          return;
        }
        // onAuthStateChange will populate state when the anon session lands.
      }
      setLoading(false);
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // PostHog guardrail: only identify REAL (non-anonymous) users so we
      // don't explode MAU with every first-app-open anon session.
      if (newSession?.user && !newSession.user.is_anonymous) {
        identifyUser(newSession.user.id, { email: newSession.user.email });
      } else {
        resetUser();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Refresh `isAdmin` + `isInternal` whenever the user identity changes.
  // These two flags are user-row-derived and live on the same lifecycle —
  // hydrate them in a single effect so we don't fan out into N parallel
  // network calls every auth state transition.
  useEffect(() => {
    let cancelled = false;

    const refreshFlags = async () => {
      if (!user || user.is_anonymous) {
        if (!cancelled) {
          setIsAdmin(false);
          setIsInternal(false);
        }
        return;
      }

      const [adminResp, profileResp] = await Promise.all([
        supabase.rpc("is_admin_or_superuser"),
        supabase
          .from("user_profiles")
          .select("is_internal")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      if (adminResp.error) {
        console.error("[auth] is_admin_or_superuser failed", adminResp.error);
        setIsAdmin(false);
      } else {
        setIsAdmin(adminResp.data === true);
      }

      if (profileResp.error) {
        console.error("[auth] is_internal lookup failed", profileResp.error);
        setIsInternal(false);
      } else {
        setIsInternal(profileResp.data?.is_internal === true);
      }
    };

    refreshFlags();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.is_anonymous]);

  const buildMetadata = (profile: {
    displayName?: string;
    country?: string;
    phoneNumber?: string;
  }): Record<string, string> => {
    const out: Record<string, string> = {};
    const name = profile.displayName?.trim();
    if (name) out.display_name = name;
    const country = profile.country?.trim();
    if (country) out.country = country;
    const phone = profile.phoneNumber?.trim();
    if (phone) out.phone_number = phone;
    return out;
  };

  // Supabase returns a localized-ish error message when `shouldCreateUser`
  // is false and the email isn't registered. Both strings have been stable
  // across recent versions, but guard with code check too.
  const isUserNotFoundError = (error: { message?: string; code?: string; status?: number }): boolean => {
    const msg = (error.message || "").toLowerCase();
    return (
      error.code === "otp_disabled" ||
      error.code === "user_not_found" ||
      msg.includes("signups not allowed") ||
      msg.includes("user not found") ||
      msg.includes("not registered")
    );
  };

  const loginWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });
    if (error && isUserNotFoundError(error)) {
      return { error: error as Error, userNotFound: true };
    }
    return { error: error as Error | null };
  };

  const signUpWithMagicLink = async (
    email: string,
    profile: {
      displayName: string;
      country?: string;
      phoneNumber?: string;
    },
  ) => {
    const data = buildMetadata(profile);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
        data,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Immediately bootstrap a fresh anon session so downstream code that
    // relies on a non-null user.id keeps working (e.g. play recording).
    didBootstrapRef.current = true; // prevent double-bootstrap race
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("[auth] post-signout anon bootstrap failed", error);
    }
  };

  const isAnonymous = user?.is_anonymous === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAnonymous,
        isAdmin,
        isInternal,
        loginWithMagicLink,
        signUpWithMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
