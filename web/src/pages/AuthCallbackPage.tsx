import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { setLastAuthMethod, type LastAuthMethod } from "@/lib/lastAuthMethod";
import type { User } from "@supabase/supabase-js";

/**
 * Handler route for magic-link redirects (`/auth/callback`).
 *
 * Supabase JS automatically parses the URL fragment after a magic-link
 * click and fires `onAuthStateChange` → AuthContext picks up the new
 * session. We just poll `session.user.is_anonymous` until it's false (=
 * email identity attached), then redirect to the account page.
 */
/**
 * Copy profile fields from `raw_user_meta_data` into `user_profiles` right
 * after the session upgrades. Non-blocking: user is already authenticated.
 *
 * Reads:
 *   - `display_name` — set by magic-link signup form.
 *   - `full_name` / `name` — set by Google + Apple OAuth.
 *   - `avatar_url` / `picture` — set by Google OAuth (Apple omits it).
 *   - `country` — set by magic-link signup form.
 *
 * `display_name` falls back to `full_name` / `name` for OAuth signups so the
 * account screen always has something to render. Phone stays in metadata
 * only.
 */
function pickString(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c === "string") {
      const trimmed = c.trim();
      if (trimmed) return trimmed;
    }
  }
  return "";
}

/** Infer the sign-up method from the user's identities. First identity =
 *  the one that originally created the auth.users row. */
function resolveLastAuthMethod(user: User): LastAuthMethod {
  for (const identity of user.identities ?? []) {
    const provider = identity.provider?.toLowerCase();
    if (provider === "google") return "google";
    if (provider === "apple") return "apple";
  }
  return "email";
}

async function syncProfileFromMetadata(user: User): Promise<void> {
  try {
    const meta = user.user_metadata ?? {};
    const update: Record<string, string> = { id: user.id };

    const name = pickString(meta.display_name, meta.full_name, meta.name);
    if (name) update.display_name = name;

    const avatar = pickString(meta.avatar_url, meta.picture);
    if (avatar) update.avatar_url = avatar;

    const country = pickString(meta.country);
    if (country) update.country = country;

    // Only upsert when there's something beyond the id.
    if (Object.keys(update).length <= 1) return;
    const { error } = await supabase
      .from("user_profiles")
      .upsert(update, { onConflict: "id" });
    if (error) {
      console.error("[auth_callback] profile sync failed", error);
    }
  } catch (e) {
    console.error("[auth_callback] profile sync threw", e);
  }
}

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const syncedRef = useRef(false);

  // Touch `supabase` to keep tree-shaker happy — the import side-effect
  // wires up the auto session recovery.
  useEffect(() => {
    void supabase;
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user && !user.is_anonymous) {
      // Fire-and-forget: navigation doesn't wait for the upsert so a
      // slow/failed DB write never blocks the user.
      if (!syncedRef.current) {
        syncedRef.current = true;
        void syncProfileFromMetadata(user);
        setLastAuthMethod(resolveLastAuthMethod(user));
      }
      // Email identity successfully attached — head home.
      navigate("/account", { replace: true });
    }
  }, [user, loading, navigate]);

  // Fallback: if after 5s we still don't have a non-anon session, let the
  // user retry instead of hanging a spinner indefinitely.
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, []);

  if (timedOut && (!user || user.is_anonymous)) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-sm w-full p-8 text-center space-y-4 font-fustat">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h1 className="font-bold text-lg">لم نتمكن من إكمال الدخول</h1>
            <p className="text-xs text-muted-foreground">
              ربما انتهت صلاحية الرابط أو فُتح في متصفح مختلف.
            </p>
          </div>
          <Button className="w-full" onClick={() => navigate("/account", { replace: true })}>
            العودة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-sm w-full p-8 text-center space-y-4 font-fustat">
        <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">جاري تسجيل الدخول…</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
