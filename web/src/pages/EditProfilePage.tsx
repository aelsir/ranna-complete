import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, User, Phone, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  COUNTRIES_PRIORITY,
  COUNTRIES_REST,
  DEFAULT_COUNTRY_CODE,
  ALL_COUNTRIES,
} from "@/constants/countries";

const PHONE_RE = /^\+?[0-9\s\-()]{6,20}$/;

/** Map legacy free-text country values to an ISO code. */
function resolveCountry(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_COUNTRY_CODE;
  const byCode = ALL_COUNTRIES.find((c) => c.code === raw);
  if (byCode) return byCode.code;
  const byLabel = ALL_COUNTRIES.find((c) => c.label === raw);
  if (byLabel) return byLabel.code;
  return DEFAULT_COUNTRY_CODE;
}

/**
 * Edit profile page — route `/account/edit`. Reachable only when signed in
 * (MyAccountPage hides the "بيانات الحساب" entry for anon users).
 *
 * Pre-fills `display_name` + `country` from `user_profiles` and
 * `phone_number` from `user.user_metadata.phone_number` (phone is
 * metadata-only — no DB column).
 *
 * On save:
 *   1. UPDATE `user_profiles` (name + country)
 *   2. `auth.updateUser({ data: { display_name, country, phone_number } })`
 */
const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAnonymous, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
  }>({});

  // Redirect anon users back — the menu entry hides it, but someone could
  // deep-link here.
  useEffect(() => {
    if (authLoading) return;
    if (!user || isAnonymous) {
      navigate("/account", { replace: true });
    }
  }, [user, isAnonymous, authLoading, navigate]);

  // Load profile row on mount.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user || user.is_anonymous) return;
      // Phone from session metadata — instant, no network.
      const meta = user.user_metadata ?? {};
      setPhoneNumber(typeof meta.phone_number === "string" ? meta.phone_number : "");

      const { data, error: err } = await supabase
        .from("user_profiles")
        .select("display_name, country")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (err) {
        console.error("[edit_profile] load failed", err);
        setError("تعذّر تحميل بياناتك. حاول لاحقاً.");
        setLoading(false);
        return;
      }
      setDisplayName((data?.display_name as string | null) ?? "");
      setCountry(resolveCountry(data?.country as string | null));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};
    const name = displayName.trim();
    const phone = phoneNumber.trim();
    if (!name || name.length < 2) errs.name = "الاسم مطلوب";
    if (phone && !PHONE_RE.test(phone)) errs.phone = "رقم غير صحيح";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    if (!user) return;
    setSaving(true);
    const name = displayName.trim();
    const phone = phoneNumber.trim();

    // 1) user_profiles columns
    const { error: updateErr } = await supabase
      .from("user_profiles")
      .update({ display_name: name, country })
      .eq("id", user.id);
    if (updateErr) {
      console.error("[edit_profile] update user_profiles failed", updateErr);
      setError("تعذّر حفظ التغييرات. حاول لاحقاً.");
      setSaving(false);
      return;
    }

    // 2) Mirror to auth metadata so the session reflects changes instantly
    //    and phone persists (metadata-only).
    const { error: metaErr } = await supabase.auth.updateUser({
      data: {
        display_name: name,
        country,
        phone_number: phone,
      },
    });
    if (metaErr) {
      console.error("[edit_profile] update metadata failed", metaErr);
      setError("تم حفظ اسمك ودولتك، لكن تعذّر تحديث رقم الجوال.");
      setSaving(false);
      return;
    }

    setSaving(false);
    toast({ description: "تم حفظ التغييرات" });
  };

  if (authLoading || loading) {
    return (
      <div dir="rtl" className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="px-4 pb-8 md:px-12 max-w-xl mx-auto pt-4 font-fustat">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-6"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/account")}
          className="h-9 w-9 rounded-full"
          aria-label="العودة"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-extrabold text-foreground">بيانات الحساب</h1>
      </motion.div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Email read-only */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground block">البريد الإلكتروني</label>
          <div className="relative">
            <Mail className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              type="email"
              value={user?.email ?? ""}
              readOnly
              disabled
              className="pr-9 opacity-80"
              dir="ltr"
            />
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground block">الاسم</label>
          <div className="relative">
            <User className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اسمك"
              className="pr-9 text-right"
              dir="rtl"
            />
          </div>
          {fieldErrors.name && (
            <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
          )}
        </div>

        {/* Country */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground block">الدولة</label>
          <div className="relative">
            <Globe2 className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <Select value={country} onValueChange={setCountry} dir="rtl">
              <SelectTrigger className="pr-9 text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-fustat">
                {COUNTRIES_PRIORITY.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
                <SelectSeparator />
                {COUNTRIES_REST.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground block">
            رقم الجوال (اختياري)
          </label>
          <div className="relative">
            <Phone className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+249..."
              className="pr-9"
              dir="ltr"
            />
          </div>
          {fieldErrors.phone && (
            <p className="text-[11px] text-destructive">{fieldErrors.phone}</p>
          )}
        </div>

        {error && (
          <p className="text-xs text-destructive leading-relaxed">{error}</p>
        )}

        <Button type="submit" className="w-full gap-2 mt-2" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </form>
    </div>
  );
};

export default EditProfilePage;
