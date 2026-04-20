import { useEffect, useState, FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SignInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Arabic-RTL magic-link sign-in modal. On submit calls
 * `signInWithMagicLink(email)` from AuthContext — which either
 * attaches an email to the current anonymous user (preserving UUID) or
 * sends a plain magic-link OTP.
 *
 * Re-send is rate-limited to 60 seconds to match Supabase's rate limiter.
 */
const COOLDOWN_SECONDS = 60;

const SignInSheet = ({ open, onOpenChange }: SignInSheetProps) => {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Reset state whenever the modal opens fresh.
  useEffect(() => {
    if (open) {
      setEmail("");
      setSent(false);
      setLoading(false);
      setError(null);
      setCooldown(0);
    }
  }, [open]);

  // Cooldown tick.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signInWithMagicLink(email.trim());
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
      <DialogContent dir="rtl" className="sm:max-w-md font-fustat">
        <DialogHeader>
          <DialogTitle className="font-fustat font-bold text-lg">تسجيل الدخول</DialogTitle>
          <DialogDescription className="font-fustat text-xs">
            أدخل بريدك الإلكتروني وسنرسل لك رابط دخول. لا حاجة لكلمة مرور.
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
                  autoFocus
                  className="pr-9 font-fustat"
                  dir="ltr"
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-destructive font-fustat leading-relaxed">{error}</p>
            )}
            <Button type="submit" className="w-full gap-2 font-fustat" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "جاري الإرسال..." : "أرسل الرابط"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SignInSheet;
