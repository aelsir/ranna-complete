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
   * Send a magic-link email. If the user is currently anonymous, this calls
   * `updateUser({ email, data })` which ADDS an email identity to the
   * existing anon user — preserving their UUID and any server-side data.
   * Optional `profile` fields (displayName, country, phoneNumber) are
   * stored on `auth.users.raw_user_meta_data` and copied into
   * `user_profiles` in the callback page.
   *
   * If the email is already bound to another account, falls back to a plain
   * magic link (metadata discarded — the existing account's profile wins).
   */
  signInWithMagicLink: (
    email: string,
    profile?: {
      displayName?: string;
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

  // Refresh the `isAdmin` flag whenever the user identity changes.
  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      if (!user || user.is_anonymous) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase.rpc("is_admin_or_superuser");
      if (cancelled) return;
      if (error) {
        console.error("[auth] is_admin_or_superuser failed", error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(data === true);
    };

    checkAdmin();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.is_anonymous]);

  const sendPlainMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    return { error: error as Error | null };
  };

  const buildMetadata = (profile?: {
    displayName?: string;
    country?: string;
    phoneNumber?: string;
  }): Record<string, string> | undefined => {
    if (!profile) return undefined;
    const out: Record<string, string> = {};
    const name = profile.displayName?.trim();
    if (name) out.display_name = name;
    const country = profile.country?.trim();
    if (country) out.country = country;
    const phone = profile.phoneNumber?.trim();
    if (phone) out.phone_number = phone;
    return Object.keys(out).length > 0 ? out : undefined;
  };

  const signInWithMagicLink = async (
    email: string,
    profile?: {
      displayName?: string;
      country?: string;
      phoneNumber?: string;
    },
  ) => {
    // If the user is currently anonymous, try upgrading via updateUser so
    // Supabase preserves the UUID and carries anon data forward.
    if (user?.is_anonymous) {
      const data = buildMetadata(profile);
      const { error } = await supabase.auth.updateUser({
        email,
        ...(data ? { data } : {}),
      });
      if (!error) return { error: null };

      // Fallback: the email is already bound to a different auth.users row
      // (common for admins/superusers who signed up before this flow
      // existed). Send a plain magic link so they can sign into their
      // existing account instead of surfacing a hard error. Their typed
      // metadata is dropped — they shouldn't overwrite another account's
      // profile by typing at a login prompt.
      const msg = (error.message || "").toLowerCase();
      const emailAlreadyInUse =
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("email address is already") ||
        msg.includes("user already registered");
      if (emailAlreadyInUse) {
        return sendPlainMagicLink(email);
      }
      return { error: error as Error | null };
    }
    return sendPlainMagicLink(email);
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
        signInWithMagicLink,
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
