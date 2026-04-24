import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Bell,
  ChevronLeft,
  Heart,
  Clock,
  Headphones,
  LogOut,
  Mail,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import SignInSheet from "@/components/auth/SignInSheet";
import { useAuth } from "@/context/AuthContext";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LOGIN_COOLDOWN_SECONDS = 60;

type MenuItem = {
  icon: typeof Heart;
  label: string;
  desc: string;
  path?: string;
  toggle?: boolean;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

function buildMenuSections(opts: { isRealUser: boolean }): MenuSection[] {
  const settingsItems: MenuItem[] = [
    // Profile-edit entry is only meaningful once the user has a real
    // identity. Anonymous users haven't signed up yet.
    ...(opts.isRealUser
      ? [
          {
            icon: User,
            label: "بيانات الحساب",
            desc: "الاسم والدولة ورقم الجوال",
            path: "/account/edit",
          } satisfies MenuItem,
        ]
      : []),
    { icon: Bell, label: "الإشعارات", desc: "تفضيلات التنبيهات", toggle: true },
  ];
  return [
    {
      title: "نشاطي",
      items: [
        { icon: Heart, label: "مُختاراتي", desc: "المدائح المحفوظة", path: "/favorites" },
        { icon: Clock, label: "سجل الاستماع", desc: "آخر ما استمعت إليه", path: "/listening-history" },
        { icon: Headphones, label: "إحصائيات الاستماع", desc: "عدد مرات التشغيل والمدة", path: "/listening-stats" },
      ],
    },
    {
      title: "الإعدادات",
      items: settingsItems,
    },
  ];
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const MyAccountPage = () => {
  const navigate = useNavigate();
  const { user, isAnonymous, loading, signOut, loginWithMagicLink } = useAuth();
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signUpPrefillEmail, setSignUpPrefillEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  // Inline login (email only) — for returning users who just want a magic
  // link without re-entering profile data. New users use the "إنشاء حساب
  // جديد" link which opens the full registration sheet.
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSent, setLoginSent] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginUserNotFound, setLoginUserNotFound] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(0);

  useEffect(() => {
    if (loginCooldown <= 0) return;
    const t = setTimeout(() => setLoginCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [loginCooldown]);

  const isRealUser = !!user && !isAnonymous;
  const displayName = isRealUser
    ? user.user_metadata?.display_name || user.email?.split("@")[0] || "حسابي"
    : "زائر";
  const avatarLabel = isRealUser ? (displayName[0] || "?").toUpperCase() : "ز";
  const subtitle = isRealUser ? user.email ?? "" : "لم يتم تسجيل الدخول";

  const menuSections = buildMenuSections({ isRealUser });

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const handleInlineLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginUserNotFound(false);
    const trimmed = loginEmail.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setLoginError("بريد إلكتروني غير صحيح");
      return;
    }
    setLoginLoading(true);
    const { error, userNotFound } = await loginWithMagicLink(trimmed);
    setLoginLoading(false);
    if (userNotFound) {
      // Not registered yet — show an error with a clickable signup link
      // rather than auto-opening the signup sheet.
      setLoginUserNotFound(true);
      setSignUpPrefillEmail(trimmed);
      return;
    }
    if (error) {
      setLoginError(error.message);
      return;
    }
    setLoginSent(true);
    setLoginCooldown(LOGIN_COOLDOWN_SECONDS);
  };

  return (
    <div>
      <Navbar />
      <div className="px-4 pb-5 md:px-12 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <h1 className="font-fustat text-2xl font-extrabold text-foreground">زاويتي</h1>
        </motion.div>

        {/* Anon users get a drastically simplified screen: avatar + inline
            login + "create account" link. No menu, no logout. */}
        {!isRealUser ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center pt-6"
          >
            <Avatar className="h-20 w-20 border-2 border-primary/20 mb-3">
              <AvatarFallback className="bg-primary/10 text-primary font-fustat text-2xl font-bold">
                {avatarLabel}
              </AvatarFallback>
            </Avatar>
            <p className="font-fustat text-lg font-bold text-foreground mb-8">زائر</p>

            {loginSent ? (
              <div className="w-full max-w-sm flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="font-fustat text-sm font-bold text-foreground">
                  تحقّق من بريدك الإلكتروني
                </p>
                <p className="text-xs text-muted-foreground font-fustat">
                  أرسلنا رابط الدخول إلى
                  <span className="font-bold mx-1" dir="ltr">{loginEmail}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLoginSent(false);
                    setLoginError(null);
                  }}
                  disabled={loginCooldown > 0}
                  className="mt-2 text-xs font-fustat text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {loginCooldown > 0
                    ? `إعادة الإرسال بعد ${loginCooldown.toLocaleString("ar-EG")} ث`
                    : "إرسال إلى بريد آخر"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleInlineLogin} className="w-full max-w-sm space-y-3">
                <label className="text-sm font-fustat text-foreground block text-right">
                  دخول ببريدك الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginUserNotFound) setLoginUserNotFound(false);
                    }}
                    placeholder="example@ranna.app"
                    className="pr-9 font-fustat h-11"
                    dir="ltr"
                    disabled={loading || loginLoading}
                  />
                </div>
                {loginUserNotFound ? (
                  <p className="text-xs text-destructive font-fustat text-right leading-relaxed">
                    لا يوجد حساب بهذا البريد. اضغط على{" "}
                    <button
                      type="button"
                      onClick={() => setSignUpOpen(true)}
                      className="font-bold text-primary hover:underline"
                    >
                      رابط إنشاء حساب جديد
                    </button>
                    {" "}لفتح حساب في رنّة.
                  </p>
                ) : loginError ? (
                  <p className="text-xs text-destructive font-fustat text-right">
                    {loginError}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={loading || loginLoading}
                  className="w-full rounded-xl bg-primary text-primary-foreground font-fustat text-sm h-11 hover:bg-primary/90"
                >
                  {loginLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "دخول"
                  )}
                </Button>
                <p className="text-center text-xs font-fustat text-muted-foreground pt-2">
                  أول مرة هنا؟{" "}
                  <button
                    type="button"
                    onClick={() => setSignUpOpen(true)}
                    className="font-fustat font-bold text-primary hover:underline"
                  >
                    إنشاء حساب جديد
                  </button>
                </p>
              </form>
            )}
          </motion.div>
        ) : (
          <>
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl bg-card border border-border/60 p-5 mb-6 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={user?.user_metadata?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-fustat text-xl font-bold">
                    {avatarLabel}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-fustat text-lg font-bold text-foreground truncate">{displayName}</p>
                  <p className="text-sm text-muted-foreground font-noto-naskh truncate" dir="ltr">
                    {subtitle}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Menu Sections */}
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
              {menuSections.map((section) => (
                <motion.div key={section.title} variants={item}>
                  <h2 className="font-fustat text-sm font-bold text-muted-foreground mb-2 px-1">
                    {section.title}
                  </h2>
                  <div className="rounded-2xl bg-card border border-border/60 overflow-hidden shadow-sm">
                    {section.items.map((menuItem, idx) => (
                      <div key={menuItem.label}>
                        <button
                          onClick={() => menuItem.path && navigate(menuItem.path)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors text-right"
                        >
                          <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                            <menuItem.icon className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-fustat text-sm font-bold text-foreground">{menuItem.label}</p>
                            <p className="text-xs text-muted-foreground font-noto-naskh">{menuItem.desc}</p>
                          </div>
                          {menuItem.toggle ? (
                            <Switch />
                          ) : (
                            <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                        {idx < section.items.length - 1 && (
                          <Separator className="mr-16" />
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Logout */}
            <motion.div variants={item} initial="hidden" animate="show" className="mt-6">
              <Button
                variant="ghost"
                disabled={signingOut}
                onClick={handleSignOut}
                className="w-full rounded-2xl h-12 font-fustat text-sm text-destructive hover:bg-destructive/10 border border-border/60"
              >
                <LogOut className="h-4 w-4 ml-2" />
                {signingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
              </Button>
            </motion.div>

            <p className="text-center text-xs text-muted-foreground mt-6 font-noto-naskh">
              رنّة — نسخة ١.٠
            </p>
          </>
        )}
      </div>

      <SignInSheet
        open={signUpOpen}
        onOpenChange={setSignUpOpen}
        initialEmail={signUpPrefillEmail}
      />
    </div>
  );
};

export default MyAccountPage;
