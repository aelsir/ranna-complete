/**
 * Onboarding effectiveness — standalone admin page at /dashboard/onboarding.
 *
 * First of the "own page, own route" generation of dashboard analytics
 * (moving away from sections rendered inside the dashboard shell).
 *
 * Reads three layers, top to bottom as a story:
 *   1. The cohort — how many new users arrived, did they start listening?
 *   2. Feature adoption — did they find what the onboarding teaches?
 *   3. The onboarding funnel itself — Mixpanel territory; rendered as a
 *      ready-to-wire placeholder until the Mixpanel integration lands.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenText,
  Download,
  Heart,
  Loader2,
  Sparkles,
  UserRoundPlus,
  Users,
  PlayCircle,
  Timer,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useOnboardingEffectiveness } from "@/lib/api/hooks";
import type { FeatureAdoption } from "@/lib/api/onboarding-analytics";
import { DashboardLogin } from "./DashboardLogin";
import { DashboardUnauthorized } from "./DashboardUnauthorized";

const fmt = (n: number) => n.toLocaleString("en-US");

/** "12 د" / "1.5 س" — keep the unit readable for non-analysts. */
function fmtMinutes(min: number | null): string {
  if (min === null) return "—";
  if (min < 1) return "أقل من دقيقة";
  if (min < 60) return `${Math.round(min)} د`;
  return `${(min / 60).toFixed(1)} س`;
}

const WINDOWS = [
  { days: 7, label: "٧ أيام" },
  { days: 30, label: "٣٠ يوم" },
  { days: 90, label: "٩٠ يوم" },
];

const ADOPTION_META: Record<
  string,
  { label: string; hint: string; icon: typeof Heart; bar: string; chip: string }
> = {
  lyrics: {
    label: "قراءة الكلمات",
    hint: "فتحوا شاشة كلمات مديح مرة واحدة على الأقل",
    icon: BookOpenText,
    bar: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-500",
  },
  download: {
    label: "التحميل دون اتصال",
    hint: "حمّلوا مقطعاً واحداً على الأقل",
    icon: Download,
    bar: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-600",
  },
  favorite: {
    label: "المفضلة",
    hint: "أضافوا مقطعاً إلى مختاراتهم",
    icon: Heart,
    bar: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-500",
  },
  follow: {
    label: "المتابعة",
    hint: "تابعوا مادحاً أو راوياً",
    icon: UserRoundPlus,
    bar: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-600",
  },
};

/** The Mixpanel events the apps already fire — listed so wiring the funnel
 *  later is a lookup, not an archaeology dig. */
const MIXPANEL_EVENTS = [
  "onboarding_started",
  "onboarding_step_viewed",
  "onboarding_completed",
  "tour_shown",
  "tour_step_done",
  "tour_skipped",
  "sign_up_completed",
];

const FUNNEL_STEPS = [
  "فتحوا التطبيق",
  "صفحة الترحيب",
  "اختيار الذوق",
  "صفحة الحساب",
  "أكملوا التهيئة",
];

const OnboardingAnalyticsPage = () => {
  const { user, isAnonymous, isAdmin, loading: authLoading, signOut } =
    useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || isAnonymous) return <DashboardLogin />;
  if (!isAdmin) return <DashboardUnauthorized signOut={signOut} />;

  return <OnboardingAnalyticsContent />;
};

const OnboardingAnalyticsContent = () => {
  const [windowDays, setWindowDays] = useState(30);
  const { data, isLoading } = useOnboardingEffectiveness(windowDays);

  const kpis = [
    {
      label: "مستخدمون جدد",
      value: data ? fmt(data.cohortSize) : "…",
      icon: Users,
      chip: "bg-blue-500/10 text-blue-500",
      hint: `حسابات جديدة (غير داخلية) أُنشئت خلال آخر ${windowDays} يوم. هذا هو "الفوج" الذي تقاس عليه كل أرقام الصفحة.`,
    },
    {
      label: "التفعيل",
      value: data ? `${data.activationPct}%` : "…",
      icon: PlayCircle,
      chip: "bg-primary/10 text-primary",
      hint: `نسبة الفوج الذين شغّلوا مقطعاً واحداً على الأقل (${
        data ? fmt(data.activated) : "…"
      } مستخدم). إن هبط هذا الرقم بعد إطلاق التهيئة فهي تعيق الوصول للمحتوى.`,
    },
    {
      label: "الوقت حتى أول استماع",
      value: data ? fmtMinutes(data.medianMinutesToFirstPlay) : "…",
      icon: Timer,
      chip: "bg-cyan-500/10 text-cyan-500",
      hint: "الوسيط بين إنشاء الحساب وأول تشغيل. التهيئة تضيف خطوات قبل المحتوى — راقب ألا يتضخم هذا الرقم.",
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-fustat"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              لوحة التحكم
            </Link>
            <h1 className="font-fustat font-bold text-2xl mt-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              فعالية التهيئة
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
              هل يكتشف المستخدمون الجدد مزايا رنّة التي تعرّفهم بها شاشات
              التهيئة والجولات التعريفية؟ كل الأرقام أدناه محسوبة على
              المستخدمين الذين انضموا خلال الفترة المختارة.
            </p>
          </div>

          {/* Window selector */}
          <div className="flex items-center gap-1 rounded-full border border-border/60 p-1 bg-card">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                type="button"
                onClick={() => setWindowDays(w.days)}
                className={`px-3 py-1 rounded-full text-xs font-fustat font-bold transition-colors ${
                  windowDays === w.days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 1. Cohort KPIs ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border-border/40 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.chip}`}
                  >
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-fustat">
                      {kpi.label}
                    </p>
                    <p className="font-fustat font-bold text-2xl leading-tight">
                      {kpi.value}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                  {kpi.hint}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── 2. Feature adoption ── */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-fustat font-bold">
              تبنّي المزايا
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              نسبة المستخدمين الجدد الذين استخدموا كل ميزة مرة واحدة على الأقل
              خلال الفترة — هذا هو المقياس الحقيقي لنجاح التهيئة: ارتفاعه بعد
              الإطلاق يعني أن الجولات التعريفية تعمل.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3 pb-5 space-y-4">
            {isLoading || !data
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded-xl bg-muted animate-pulse"
                  />
                ))
              : data.adoption.map((a: FeatureAdoption) => {
                  const meta = ADOPTION_META[a.key];
                  if (!meta) return null;
                  return (
                    <div key={a.key} className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${meta.chip}`}
                      >
                        <meta.icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-fustat font-bold text-sm">
                            {meta.label}
                            <span className="font-normal text-[11px] text-muted-foreground mr-2">
                              {meta.hint}
                            </span>
                          </p>
                          <p className="font-fustat font-bold text-sm shrink-0">
                            {a.unavailable ? (
                              <span
                                className="text-muted-foreground text-[11px]"
                                title="يتطلب ترحيل قاعدة البيانات 053 (سياسة قراءة المتابعات للمشرفين)"
                              >
                                غير متاح بعد
                              </span>
                            ) : (
                              <>
                                {a.pct}%
                                <span className="font-normal text-[11px] text-muted-foreground mr-1.5">
                                  ({fmt(a.users)})
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="h-2 rounded-full bg-muted mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${meta.bar}`}
                            style={{
                              width: a.unavailable ? "0%" : `${a.pct}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
          </CardContent>
        </Card>

        {/* ── 3. Onboarding funnel — Mixpanel-ready placeholder ── */}
        <Card className="border-border/40 shadow-sm border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base font-fustat font-bold">
                  قمع التهيئة
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed max-w-xl">
                  أين يتوقف المستخدمون داخل شاشات التهيئة نفسها؟ هذه الأحداث
                  تُرسل من التطبيق إلى Mixpanel — وستظهر هنا فور ربط الحساب.
                </CardDescription>
              </div>
              <span className="text-[10px] font-fustat font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 shrink-0">
                بانتظار ربط Mixpanel
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-3 pb-5 space-y-5">
            {/* Skeleton funnel — fixed illustrative widths, no fake numbers */}
            <div className="space-y-2">
              {FUNNEL_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <p className="text-[11px] text-muted-foreground font-fustat w-28 shrink-0 text-left">
                    {step}
                  </p>
                  <div
                    className="h-7 rounded-lg bg-muted"
                    style={{ width: `${100 - i * 16}%` }}
                  />
                  <span className="text-[11px] text-muted-foreground/60 font-fustat">
                    ؟
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-[11px] font-fustat font-bold flex items-center gap-1.5 mb-2">
                <Info className="h-3.5 w-3.5" />
                الأحداث المُرسلة فعلاً من التطبيق
              </p>
              <div className="flex flex-wrap gap-1.5" dir="ltr">
                {MIXPANEL_EVENTS.map((e) => (
                  <code
                    key={e}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-background border border-border/60 text-muted-foreground"
                  >
                    {e}
                  </code>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2.5 leading-relaxed">
                يشمل ذلك خصائص كل حدث: طريقة إكمال التهيئة (تسجيل / زائر /
                تخطّي)، آخر صفحة وصلها المستخدم، اختيارات الذوق، وأي خطوة من
                الجولة التعريفية اكتملت أو تُخطّيت.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingAnalyticsPage;
