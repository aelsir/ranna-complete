import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Lock, Bell, ChevronLeft, LogIn, Heart, Clock, Headphones, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import SignInSheet from "@/components/auth/SignInSheet";
import { useAuth } from "@/context/AuthContext";

const menuSections = [
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
    items: [
      { icon: User, label: "بيانات الحساب", desc: "الاسم، البريد الإلكتروني" },
      { icon: Lock, label: "كلمة المرور", desc: "تغيير كلمة المرور" },
      { icon: Bell, label: "الإشعارات", desc: "تفضيلات التنبيهات", toggle: true },
    ],
  },
];

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
  const { user, isAnonymous, loading, signOut } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isRealUser = !!user && !isAnonymous;
  const displayName = isRealUser
    ? user.user_metadata?.display_name || user.email?.split("@")[0] || "حسابي"
    : "زائر";
  const avatarLabel = isRealUser ? (displayName[0] || "?").toUpperCase() : "ز";
  const subtitle = isRealUser ? user.email ?? "" : "لم يتم تسجيل الدخول";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
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
              <p className="text-sm text-muted-foreground font-noto-naskh truncate" dir={isRealUser ? "ltr" : "rtl"}>
                {subtitle}
              </p>
            </div>
            {!isRealUser && (
              <Button
                onClick={() => setSignInOpen(true)}
                disabled={loading}
                className="rounded-xl bg-primary text-primary-foreground font-fustat text-sm px-5 h-10 hover:bg-primary/90"
              >
                <LogIn className="h-4 w-4 ml-2" />
                تسجيل الدخول
              </Button>
            )}
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

        {/* Logout — enabled only for real (non-anonymous) users. */}
        <motion.div variants={item} initial="hidden" animate="show" className="mt-6">
          <Button
            variant="ghost"
            disabled={!isRealUser || signingOut}
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
      </div>

      <SignInSheet open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  );
};

export default MyAccountPage;
