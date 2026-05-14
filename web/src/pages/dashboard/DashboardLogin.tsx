import { useState, FormEvent } from "react";
import { Music, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

export function DashboardLogin() {
  const { loginWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error, userNotFound } = await loginWithMagicLink(email);
    setLoading(false);
    if (userNotFound) {
      setError("لا يوجد حساب بهذا البريد");
    } else if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div dir="rtl" className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-sm mx-auto p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center">
            <Music className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-fustat font-bold text-xl text-foreground">لوحة التحكم</h1>
            <p className="text-xs text-muted-foreground">
              {sent ? "تحقّق من بريدك الإلكتروني" : "سجّل دخولك للمتابعة"}
            </p>
          </div>
        </div>
        {sent ? (
          <div className="text-center space-y-3">
            <p className="text-sm font-fustat text-muted-foreground">
              أرسلنا رابط تسجيل الدخول إلى
            </p>
            <p className="text-sm font-fustat font-bold text-foreground" dir="ltr">
              {email}
            </p>
            <p className="text-xs font-fustat text-muted-foreground pt-4">
              افتح الرابط من نفس المتصفح لإكمال الدخول.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                البريد الإلكتروني
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ranna.app"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-destructive font-fustat">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "جاري الإرسال..." : "أرسل الرابط"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
