import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/**
 * Handler route for magic-link redirects (`/auth/callback`).
 *
 * Supabase JS automatically parses the URL fragment after a magic-link
 * click and fires `onAuthStateChange` → AuthContext picks up the new
 * session. We just poll `session.user.is_anonymous` until it's false (=
 * email identity attached), then redirect to the account page.
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // Touch `supabase` to keep tree-shaker happy — the import side-effect
  // wires up the auto session recovery.
  useEffect(() => {
    void supabase;
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user && !user.is_anonymous) {
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
