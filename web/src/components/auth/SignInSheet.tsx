import { useEffect, useState, FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, CheckCircle2, User, Phone, Globe2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  COUNTRIES_PRIORITY,
  COUNTRIES_REST,
  DEFAULT_COUNTRY_CODE,
} from "@/constants/countries";

interface SignInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Arabic-RTL registration modal. This sheet is specifically for NEW users
 * signing up for رنّة — returning users use the inline email login on
 * `MyAccountPage`. Collects display name, country, phone (optional) +
 * email and calls `signInWithMagicLink(email, profile)` from AuthContext.
 *
 * If the email turns out to be already registered, the context falls
 * back to a plain magic link (profile metadata discarded) so the user
 * still lands in their existing account.
 *
 * Re-send is rate-limited to 60 seconds to match Supabase's rate limiter.
 */
const COOLDOWN_SECONDS = 60;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+?[0-9\s\-()]{6,20}$/;

const SignInSheet = ({ open, onOpenChange }: SignInSheetProps) => {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});
  const [cooldown, setCooldown] = useState(0);

  // Reset state whenever the modal opens fresh.
  useEffect(() => {
    if (open) {
      setEmail("");
      setDisplayName("");
      setCountry(DEFAULT_COUNTRY_CODE);
      setPhoneNumber("");
      setSent(false);
      setLoading(false);
      setError(null);
      setFieldErrors({});
      setCooldown(0);
    }
  }, [open]);

  // Cooldown tick.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedName || trimmedName.length < 2) {
      errs.name = "الاسم مطلوب";
    }
    if (!trimmedEmail) {
      errs.email = "البريد الإلكتروني مطلوب";
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      errs.email = "بريد إلكتروني غير صحيح";
    }
    if (trimmedPhone && !PHONE_RE.test(trimmedPhone)) {
      errs.phone = "رقم غير صحيح";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    const { error: err } = await signInWithMagicLink(email.trim(), {
      displayName: displayName.trim(),
      country,
      phoneNumber: phoneNumber.trim() || undefined,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
    setCooldown(COOLDOWN_SECONDS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md font-fustat max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-fustat font-bold text-lg">
            تسجيل حساب جديد في رنّة
          </DialogTitle>
          <DialogDescription className="font-fustat text-xs">
            احفظ تفضيلاتك ومفضّلاتك عبر أجهزتك — لا حاجة لكلمة مرور.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-6 space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="font-fustat font-bold text-sm">تحقّق من بريدك الإلكتروني</p>
              <p className="text-xs font-fustat text-muted-foreground">
                أرسلنا رابط تسجيل الدخول إلى
              </p>
              <p className="text-sm font-fustat font-bold" dir="ltr">
                {email}
              </p>
            </div>
            <p className="text-[11px] font-fustat text-muted-foreground">
              افتح الرابط من نفس الجهاز والمتصفح لإكمال الدخول.
            </p>
            <Button
              variant="outline"
              className="w-full font-fustat"
              onClick={() => {
                setSent(false);
                setError(null);
              }}
              disabled={cooldown > 0}
            >
              {cooldown > 0
                ? `إعادة الإرسال بعد ${cooldown.toLocaleString("ar-EG")} ث`
                : "إرسال إلى بريد آخر"}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 pt-2">
            {/* Display name */}
            <div className="space-y-1.5">
              <label className="text-xs font-fustat text-muted-foreground block">
                الاسم
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="اسمك"
                  autoFocus
                  className="pr-9 font-fustat text-right"
                  dir="rtl"
                />
              </div>
              {fieldErrors.name && (
                <p className="text-[11px] text-destructive font-fustat">{fieldErrors.name}</p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <label className="text-xs font-fustat text-muted-foreground block">
                الدولة
              </label>
              <div className="relative">
                <Globe2 className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <Select value={country} onValueChange={setCountry} dir="rtl">
                  <SelectTrigger className="pr-9 font-fustat text-right">
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

            {/* Phone (optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-fustat text-muted-foreground block">
                رقم الجوال (اختياري)
              </label>
              <div className="relative">
                <Phone className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+249..."
                  className="pr-9 font-fustat"
                  dir="ltr"
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-[11px] text-destructive font-fustat">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-fustat text-muted-foreground block">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@ranna.app"
                  required
                  className="pr-9 font-fustat"
                  dir="ltr"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-destructive font-fustat">{fieldErrors.email}</p>
              )}
            </div>

            {error && (
              <p className="text-xs text-destructive font-fustat leading-relaxed">{error}</p>
            )}

            <p className="text-[11px] font-fustat text-muted-foreground leading-relaxed">
              سنحفظ تفضيلاتك ومفضّلاتك لتعود إليها من أي جهاز.
            </p>

            <Button type="submit" className="w-full gap-2 font-fustat" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "جاري الإرسال..." : "أنشئ الحساب وأرسل الرابط"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SignInSheet;
