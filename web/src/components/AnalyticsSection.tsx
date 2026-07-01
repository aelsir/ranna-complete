import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useContentHealth,
  useEngagementMetrics,
  useTrendingThisWeek,
  useContentTypeDistribution,
  useTopFavorited,
  useUserActivity,
  useDownloadAnalytics,
  useStatsOverview,
  useLyricsWorkQueueCounts,
} from "@/lib/api/hooks";
import {
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ComposedChart, Line, LineChart, AreaChart, Area, XAxis, YAxis,
  PieChart, Pie, Cell, Legend, ReferenceLine,
} from "recharts";
import {
  Users, Music, CheckCircle2, AlertCircle,
  ArrowUpRight, ArrowDownRight, Headphones, Activity,
  Heart, Clock, Flame, PieChart as PieIcon, Smartphone,
  UserCheck, Sparkles, Trophy, Percent, Timer, Download, Info,
  CalendarClock, BookOpenText, ChevronDown, Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { ListeningHeatmap } from "@/components/ListeningHeatmap";
import { UsageFunnel } from "@/components/UsageFunnel";
import { DayDateTick } from "@/components/DayDateTick";

// ── Small helpers ──────────────────────────────────────────
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-muted/30 ${className}`} />
);

const CardSpinner = () => (
  <div className="h-full w-full flex items-center justify-center">
    <Activity className="h-6 w-6 animate-spin text-primary/40" />
  </div>
);

// Time-window filter for the top KPI bar + trend chart.
// `null` = lifetime (no time bound).
type TimeWindow = { label: string; days: number | null };
const TIME_WINDOWS: TimeWindow[] = [
  { label: "آخر 7 أيام",  days: 7 },
  { label: "آخر 30 يوم",  days: 30 },
  { label: "آخر 90 يوم",  days: 90 },
  { label: "كل الوقت",    days: null },
];

/** Western-digit number formatter — used throughout the stats page. */
const fmt = (n: number) => n.toLocaleString("en-US");

/** % change vs. previous period. `null` = prev was 0 but now there's data
 *  (a percentage would be meaningless — the UI shows "جديد" instead). */
function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return current > 0 ? null : 0;
  return ((current - prev) / prev) * 100;
}

const formatPct = (pct: number) =>
  `${Math.abs(pct) < 10 ? Math.abs(pct).toFixed(1) : Math.round(Math.abs(pct))}%`;

/**
 * Delta vs. previous equal-length window. Green when up, red when down,
 * neutral when flat; "جديد" when the previous window had zero. Hidden
 * entirely when no comparison exists (lifetime view / RPC pre-055).
 */
const DeltaChip = ({ current, prev }: { current: number; prev?: number | null }) => {
  if (prev === undefined || prev === null) return null;
  const pct = pctChange(current, prev);
  const chip = (cls: string, content: React.ReactNode) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-fustat font-bold ${cls}`}>
          {content}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px] font-fustat" dir="rtl">
        الفترة السابقة المماثلة: {fmt(prev)}
      </TooltipContent>
    </Tooltip>
  );
  if (pct === null) return chip("bg-emerald-500/10 text-emerald-500", <>جديد</>);
  if (pct === 0)
    return chip("bg-muted/40 text-muted-foreground", <><Minus className="h-2.5 w-2.5" />0%</>);
  if (pct > 0)
    return chip("bg-emerald-500/10 text-emerald-500", <><ArrowUpRight className="h-2.5 w-2.5" />{formatPct(pct)}</>);
  return chip("bg-red-500/10 text-red-500", <><ArrowDownRight className="h-2.5 w-2.5" />{formatPct(pct)}</>);
};

interface AnalyticsSectionProps {
  onOpenCompletion?: () => void;
  onOpenLyrics?: () => void;
}

const AnalyticsSection = ({
  onOpenCompletion,
  onOpenLyrics,
}: AnalyticsSectionProps = {}) => {
  // NOTE: Each card renders independently — no page-wide loading gate.
  // Cards show a skeleton while their own query resolves.
  const { data: health, isLoading: healthLoading } = useContentHealth();
  const { data: engagement, isLoading: engagementLoading } = useEngagementMetrics();
  const { data: trendingWeek, isLoading: trendingLoading } = useTrendingThisWeek(7, 5);
  const { data: workQueue } = useLyricsWorkQueueCounts();

  // Time-window filter (defaults to last 30 days). Scopes the top KPI
  // bar and the trend chart; the heatmap keeps its own 4-week window.
  const [windowDays, setWindowDays] = useState<number | null>(30);

  // The activity chart is one card with two views (see below).
  const [activityView, setActivityView] = useState<"plays" | "dau">("plays");

  // Secondary blocks live behind "المزيد من الإحصائيات" and only fetch
  // once expanded — they rarely drive decisions, so don't pay for them
  // on every page visit.
  const [showMore, setShowMore] = useState(false);
  const { data: typeDist, isLoading: typeDistLoading } = useContentTypeDistribution(showMore);
  const { data: topFavs, isLoading: topFavsLoading } = useTopFavorited(5, showMore);
  const { data: userActivity, isLoading: userActivityLoading } = useUserActivity(showMore);
  const { data: downloads, isLoading: downloadsLoading } = useDownloadAnalytics(showMore);

  // New single-RPC aggregator. Powers the top KPI bar, the combined
  // plays/minutes trend chart, and the listening heatmap below.
  const { data: stats, isLoading: statsLoading } = useStatsOverview({
    windowDays,
  });

  // Combined trend data — plays and minutes on the same x-axis so the
  // admin can see at a glance whether high play counts also produced
  // high listening minutes (real listens vs. skip-after-5-seconds).
  const trendData = (stats?.trend ?? []).map((d) => ({
    date: d.date,
    plays: d.plays,
    minutes: d.minutes,
  }));

  // ── Top KPI bar — exactly four cards per the spec ────────────────
  // Each card carries its previous-period value (migration 055) so the
  // DeltaChip can show an honest ± comparison.
  const topKpis: Array<{
    label: string;
    value: number;
    prev?: number | null;
    icon: typeof Headphones;
    color: string;
    bg: string;
    info?: string;
  }> = [
    {
      label: "إجمالي مرات الاستماع",
      value: stats?.total_plays ?? 0,
      prev: stats?.prev?.total_plays,
      icon: Headphones,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "ساعات الاستماع",
      value: stats?.total_hours ?? 0,
      prev: stats?.prev?.total_hours,
      icon: Clock,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "المستمعين",
      value: stats?.unique_listeners ?? 0,
      prev: stats?.prev?.unique_listeners,
      icon: UserCheck,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      info:
        "عدد المستخدمين الفريدين الذين شغّلوا مقطعًا واحدًا على الأقل ضمن الفترة المختارة. الاستماعات بدون تسجيل دخول (anonymous) لا تُحتسب هنا. هذا الرقم يختلف عن \"إجمالي المستخدمين\" أدناه — ذاك يعدّ كل من سجّل في رنّة حتى لو لم يسمع شيئًا.",
    },
    {
      label: "المفضلة",
      value: stats?.total_favorites ?? 0,
      prev: stats?.prev?.total_favorites,
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      info:
        "عدد علامات ❤️ (المفضلة) التي أُضيفت ضمن الفترة المختارة عبر كل المستخدمين. مثلاً: 3 مستخدمين أضافوا 4 مقاطع كلٌّ = 12. ليس عدد المقاطع الفريدة ولا عدد المستخدمين.",
    },
  ];

  // ── Digest: the biggest mover among the four KPIs vs. the previous
  // period — one sentence that answers "what changed?" ────────────────
  const kpiDeltas = stats?.prev
    ? topKpis
        .map((k) => ({ label: k.label, cur: k.value, prev: k.prev ?? 0, pct: pctChange(k.value, k.prev ?? 0) }))
        .filter((d) => d.pct !== null && (d.cur > 0 || d.prev > 0))
    : [];
  const biggestMover = [...kpiDeltas].sort(
    (a, b) => Math.abs(b.pct as number) - Math.abs(a.pct as number),
  )[0];
  const topTrackOfWeek = trendingWeek?.[0];

  const healthMetrics = [
    { label: "اكتمال الكلمات (Lyrics)", value: health?.lyricsPct || 0, color: "bg-blue-500" },
    { label: "ربط المادحين (Artists)", value: health?.madihPct || 0, color: "bg-emerald-500" },
    { label: "ربط الرواة (Narrators)", value: health?.rawiPct || 0, color: "bg-purple-500" },
    { label: "توفر الصور (Thumbnails)", value: health?.imagePct || 0, color: "bg-orange-500" },
    { label: "توفر الصوت (Audio)", value: health?.audioPct || 0, color: "bg-primary" },
  ];

  // Content type distribution → pie data
  const typeLabels: Record<string, string> = {
    madha: "المدائح",
    quran: "القرآن",
    lecture: "الدروس",
    dhikr: "الأذكار",
    inshad: "الإنشاد",
  };
  const typeColors: Record<string, string> = {
    madha: "#8b5cf6",
    quran: "#10b981",
    lecture: "#f59e0b",
    dhikr: "#ec4899",
    inshad: "#06b6d4",
  };
  const typePieData = Object.entries(typeDist || {})
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => ({
      name: typeLabels[k] || k,
      value: v as number,
      key: k,
    }));

  // Device breakdown data
  const deviceLabels: Record<string, string> = {
    mobile: "موبايل",
    desktop: "ديسكتوب",
    tablet: "تابلت",
    ios: "iOS",
    android: "أندرويد",
    web: "ويب",
    unknown: "غير معروف",
  };
  const deviceEntries = Object.entries(engagement?.deviceBreakdown || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  const totalDevicePlays = deviceEntries.reduce((acc, [, v]) => acc + (v as number), 0);

  const avgDurMin = engagement
    ? Math.floor(engagement.avgDurationSeconds / 60)
    : 0;
  const avgDurSec = engagement
    ? engagement.avgDurationSeconds % 60
    : 0;

  // Completion rate with an explicit judgment scale — audio apps typically
  // sit around 40–60%; below ~30% most plays are being cut short.
  const completionRate = engagement?.completionRate ?? 0;
  const completionMeta =
    completionRate >= 40
      ? { verdict: "أداء جيد", text: "text-emerald-500", bg: "bg-emerald-500/10", bar: "bg-emerald-500" }
      : completionRate >= 30
        ? { verdict: "متوسط — راقبه", text: "text-amber-500", bg: "bg-amber-500/10", bar: "bg-amber-500" }
        : { verdict: "منخفض — أغلب التشغيلات تُقطع مبكرًا", text: "text-red-500", bg: "bg-red-500/10", bar: "bg-red-500" };

  return (
    <TooltipProvider delayDuration={150}>
    <div className="p-6 space-y-6 overflow-y-auto h-full pb-20 scrollbar-hide">
      {/* ── Time-window filter ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap" dir="rtl">
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/40">
          {TIME_WINDOWS.map((w) => {
            const isActive = windowDays === w.days;
            return (
              <button
                key={w.label}
                type="button"
                onClick={() => setWindowDays(w.days)}
                className={`px-3 py-1.5 text-xs font-fustat rounded-lg transition-colors ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w.label}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-muted-foreground font-fustat">
          {windowDays === null
            ? "البطاقات والمنحنى يعرضان كل البيانات منذ بداية رنّة"
            : `البطاقات والمنحنى يعرضان آخر ${fmt(windowDays)} يوم`}
        </span>
      </div>

      {/* ── Digest: what changed, what's hot, what needs work ── */}
      <Card className="border-primary/20 bg-primary/[0.03] shadow-sm" dir="rtl">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* What changed vs. previous period */}
            <div>
              <p className="text-[10px] font-fustat text-muted-foreground uppercase tracking-wider mb-2">
                ماذا تغيّر؟
              </p>
              {statsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : windowDays === null ? (
                <p className="text-xs font-fustat text-muted-foreground leading-relaxed">
                  اختر فترة (٧ / ٣٠ / ٩٠ يوم) بالأعلى لعرض المقارنة مع الفترة السابقة.
                </p>
              ) : !stats?.prev || !biggestMover ? (
                <p className="text-xs font-fustat text-muted-foreground leading-relaxed">
                  لا توجد بيانات كافية للمقارنة مع الفترة السابقة بعد.
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-fustat font-bold leading-relaxed">
                    {biggestMover.label}{" "}
                    <span className={(biggestMover.pct as number) >= 0 ? "text-emerald-500" : "text-red-500"}>
                      {(biggestMover.pct as number) >= 0 ? "ارتفعت" : "انخفضت"} {formatPct(biggestMover.pct as number)}
                    </span>{" "}
                    عن الفترة السابقة
                  </p>
                  <p className="text-[11px] font-fustat text-muted-foreground">
                    من {fmt(biggestMover.prev)} إلى {fmt(biggestMover.cur)} خلال آخر {fmt(windowDays)} يوم — التفاصيل في البطاقات أدناه.
                  </p>
                </div>
              )}
            </div>

            {/* Breakout track (fixed 7-day window, independent of the filter) */}
            <div className="md:border-x md:border-border/40 md:px-5">
              <p className="text-[10px] font-fustat text-muted-foreground uppercase tracking-wider mb-2">
                الأبرز آخر ٧ أيام
              </p>
              {trendingLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : topTrackOfWeek ? (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-fustat font-bold truncate">{topTrackOfWeek.title}</p>
                    {topTrackOfWeek.playCount > 0 && (
                      <p className="text-[11px] font-fustat text-muted-foreground">
                        {fmt(topTrackOfWeek.playCount)} تشغيلة هذا الأسبوع
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-fustat text-muted-foreground">لا توجد تشغيلات هذا الأسبوع.</p>
              )}
            </div>

            {/* Work queues — stats that end in a click */}
            <div>
              <p className="text-[10px] font-fustat text-muted-foreground uppercase tracking-wider mb-2">
                مهام المحتوى
              </p>
              <div className="flex flex-col gap-1.5">
                <Link
                  to="/dashboard?section=lyrics_review&lyrics=unreviewed"
                  className="group flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 hover:border-orange-400/60 transition-colors"
                >
                  <span className="flex items-center gap-2 text-xs font-fustat">
                    <span className="h-2.5 w-2.5 rounded-[3px] bg-orange-400 shrink-0" />
                    كلمات بانتظار المراجعة
                  </span>
                  <span className="text-xs font-fustat font-bold text-orange-400 group-hover:translate-x-[-2px] transition-transform">
                    {workQueue ? fmt(workQueue.unreviewed) : "…"} ←
                  </span>
                </Link>
                <Link
                  to="/dashboard?section=lyrics_review&lyrics=missing"
                  className="group flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 hover:border-red-400/60 transition-colors"
                >
                  <span className="flex items-center gap-2 text-xs font-fustat">
                    <span className="h-2.5 w-2.5 rounded-[3px] border-2 border-dashed border-red-400/70 shrink-0" />
                    مقاطع بدون كلمات
                  </span>
                  <span className="text-xs font-fustat font-bold text-red-400 group-hover:translate-x-[-2px] transition-transform">
                    {workQueue ? fmt(workQueue.missing) : "…"} ←
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Top KPI bar — 4 cards (plays · hours · listeners · favorites) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topKpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/40 shadow-sm overflow-hidden group hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color}`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  {kpi.info && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="ما معنى هذا الرقم؟"
                          className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 -m-1"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="max-w-xs text-[11px] leading-relaxed font-fustat"
                        dir="rtl"
                      >
                        {kpi.info}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-xs font-fustat text-muted-foreground uppercase tracking-wider">
                    {kpi.label}
                  </p>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-20 mt-1" />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <h3 className="text-2xl font-bold font-fustat leading-none">
                        {kpi.value.toLocaleString("en-US")}
                      </h3>
                      <DeltaChip current={kpi.value} prev={kpi.prev} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Platform-usage funnel: accounts → played → registered ── */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-500" />
            قمع استخدام المنصة
          </CardTitle>
          <CardDescription className="text-xs">
            رنّة تتيح الاستماع بدون تسجيل دخول، فالقمع يعرض النسب بين الحسابات الكلّية،
            ومن بينها مَن استمع، ومن استكمل التسجيل بإيميل. الأرقام تراكميّة (كل الوقت) ولا تتأثّر بمرشّح الفترة بالأعلى.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-5">
          <UsageFunnel
            totalAccounts={stats?.total_accounts ?? 0}
            playedAccounts={stats?.played_accounts ?? 0}
            registeredAccounts={stats?.registered_accounts ?? 0}
            loading={statsLoading}
          />
        </CardContent>
      </Card>

      {/* ── Sub-page CTAs: deeper analytics pages ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {onOpenCompletion && (
            <button
              type="button"
              onClick={onOpenCompletion}
              className="group w-full text-right rounded-2xl border border-border/40 bg-card shadow-sm hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-fustat font-bold text-sm">تفاصيل الإكمال</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    أعلى المقاطع المُكمَلة، اتجاه يومي لمعدل الإكمال، توزيع عمق الاستماع، ومعدل الإكمال حسب طول المقطع.
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground group-hover:text-emerald-500 transition-colors text-sm font-fustat shrink-0">
                افتح →
              </span>
            </button>
          )}

          {onOpenLyrics && (
            <button
              type="button"
              onClick={onOpenLyrics}
              className="group w-full text-right rounded-2xl border border-border/40 bg-card shadow-sm hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                  <BookOpenText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-fustat font-bold text-sm">تفاصيل الكلمات</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    مقارنة بين إجمالي التشغيلات والتشغيلات على مقاطع لها كلمات، وعدد فتحات شاشة الكلمات.
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground group-hover:text-violet-500 transition-colors text-sm font-fustat shrink-0">
                افتح →
              </span>
            </button>
          )}

          {/* Unlike the two above, this opens its OWN PAGE (/dashboard/
              onboarding) instead of swapping a section inside this view —
              the direction all analytics sub-pages are migrating toward. */}
          <Link
            to="/dashboard/onboarding"
            className="group w-full text-right rounded-2xl border border-border/40 bg-card shadow-sm hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-fustat font-bold text-sm">فعالية التهيئة</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  رحلة المستخدم الجديد: التفعيل، تبنّي المزايا (الكلمات،
                  التحميل، المفضلة، المتابعة)، وقمع التهيئة عند ربط Mixpanel.
                </p>
              </div>
            </div>
            <span className="text-muted-foreground group-hover:text-amber-500 transition-colors text-sm font-fustat shrink-0">
              افتح →
            </span>
          </Link>
        </div>

      {/* ── Listening activity — ONE chart, two views (plays+minutes / DAU).
             Merged because they answer the same question ("when do people
             listen?") and three separate time-series buried the signal. ── */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap" dir="rtl">
            <div>
              <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                نشاط الاستماع
              </CardTitle>
              <CardDescription className="text-xs">
                {activityView === "plays" ? (
                  <>مقارنة عدد التشغيلات بدقائق الاستماع — إذا تشابهت المنحنيات فالمستمعون يكملون المقاطع، أمّا إذا ارتفع التشغيل وانخفضت الدقائق فأغلبهم يتخطّى بسرعة.</>
                ) : (
                  <>
                    عدد المستخدمين الفريدين الذين شغّلوا مقطعًا واحدًا على الأقل كل يوم.{" "}
                    <span className="text-amber-500/90">ملاحظة:</span>{" "}
                    لا يحتسب المستمعين غير المسجَّلين.
                  </>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {activityView === "dau" && (
                <div className="flex items-center gap-4 text-[11px] font-fustat">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">المتوسط</span>
                    {statsLoading ? (
                      <Skeleton className="h-5 w-12 mt-0.5" />
                    ) : (
                      <span className="text-lg font-bold font-mono">{fmt(stats?.dau_avg ?? 0)}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">الذروة</span>
                    {statsLoading ? (
                      <Skeleton className="h-5 w-16 mt-0.5" />
                    ) : stats?.dau_peak ? (
                      <span className="font-mono">
                        <span className="text-lg font-bold">{fmt(stats.dau_peak.users)}</span>{" "}
                        <span className="text-[10px] text-muted-foreground">
                          ({new Date(stats.dau_peak.date).toLocaleDateString("ar-EG", { weekday: "long" })})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/40">
                {([
                  { key: "plays", label: "التشغيل والدقائق" },
                  { key: "dau", label: "المستخدمون اليوميون" },
                ] as const).map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setActivityView(v.key)}
                    className={`px-3 py-1.5 text-xs font-fustat rounded-lg transition-colors ${
                      activityView === v.key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 h-[320px]">
          {statsLoading ? (
            <CardSpinner />
          ) : activityView === "plays" ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trendData}
                margin={{ top: 8, right: 18, bottom: 0, left: 18 }}
              >
                <defs>
                  <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  height={44}
                  tickMargin={4}
                  tick={<DayDateTick />}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  yAxisId="plays"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#8b5cf6" }}
                  width={48}
                  tickMargin={6}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <YAxis
                  yAxisId="minutes"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#FF6B66" }}
                  width={52}
                  tickMargin={6}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontFamily: "Fustat",
                    color: "#fff"
                  }}
                  itemStyle={{ color: "#fff" }}
                  labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "plays") return [value, "عدد التشغيلات"];
                    if (name === "minutes") return [`${value} دقيقة`, "دقائق الاستماع"];
                    return [value, name];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  wrapperStyle={{ fontSize: "11px", fontFamily: "Fustat" }}
                  formatter={(value: string) => {
                    if (value === "plays") return "عدد التشغيلات";
                    if (value === "minutes") return "دقائق الاستماع";
                    return value;
                  }}
                />
                <Area
                  yAxisId="plays"
                  type="monotone"
                  dataKey="plays"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPlays)"
                  animationDuration={1200}
                />
                <Line
                  yAxisId="minutes"
                  type="monotone"
                  dataKey="minutes"
                  stroke="#FF6B66"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationDuration={1200}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats?.daily_active_users ?? []}
                margin={{ top: 12, right: 24, bottom: 30, left: 28 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border) / 0.5)"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  height={62}
                  tickMargin={4}
                  tick={<DayDateTick />}
                  interval="preserveStartEnd"
                  minTickGap={20}
                  label={{
                    value: "اليوم",
                    position: "insideBottom",
                    offset: -2,
                    style: {
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                      fontFamily: "Fustat",
                      fontWeight: 700,
                    },
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  width={52}
                  tickMargin={6}
                  tickFormatter={(v: number) => fmt(v)}
                  label={{
                    value: "عدد المستخدمين",
                    angle: -90,
                    position: "insideLeft",
                    offset: 6,
                    style: {
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                      fontFamily: "Fustat",
                      fontWeight: 700,
                      textAnchor: "middle",
                    },
                  }}
                />
                <ReferenceLine
                  y={stats?.dau_avg ?? 0}
                  stroke="hsl(var(--muted-foreground) / 0.6)"
                  strokeDasharray="4 4"
                  label={{
                    value: `المتوسط ${fmt(stats?.dau_avg ?? 0)}`,
                    position: "insideTopRight",
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                    fontFamily: "Fustat",
                  }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontFamily: "Fustat",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  labelStyle={{
                    color: "hsl(var(--muted-foreground))",
                    marginBottom: "4px",
                  }}
                  labelFormatter={(label: string) => {
                    const d = new Date(label);
                    const dayName = d.toLocaleDateString("ar-EG", { weekday: "long" });
                    const datePart = d.toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                    return `${dayName} · ${datePart}`;
                  }}
                  formatter={(value: number) => [`${fmt(value)} مستخدم`, "مستخدمون نشطون"]}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#06b6d4" }}
                  activeDot={{ r: 5 }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Content Health ── */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            صحة المحتوى
          </CardTitle>
          <CardDescription className="text-xs">نسبة اكتمال البيانات للمدائح</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {healthLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {healthMetrics.map((metric) => (
                  <div key={metric.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-fustat">{metric.label}</span>
                      <span className="font-bold">{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} className="h-1.5 bg-muted/30" indicatorClassName={metric.color} />
                  </div>
                ))}
              </div>

              {/* Actionable: this stat ends in a click, not contemplation. */}
              <Link
                to="/dashboard?section=lyrics_review&lyrics=missing"
                className="group mt-2 p-4 rounded-xl bg-muted/20 border border-border/20 hover:border-orange-500/50 hover:bg-orange-500/5 transition-colors flex items-center justify-between gap-3"
                dir="rtl"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-[11px] font-fustat text-muted-foreground leading-tight">
                    هناك {fmt(workQueue?.missing ?? Math.round((health?.totalCount || 0) * (1 - (health?.lyricsPct || 0) / 100)))} مقطع بدون كلمات — إضافتها ترفع التفاعل (شاشة الكلمات من أكثر المزايا استخدامًا).
                  </p>
                </div>
                <span className="text-xs font-fustat text-muted-foreground group-hover:text-orange-500 transition-colors shrink-0">
                  افتح القائمة ←
                </span>
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Row 3: Trending this week + Content type distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              الأكثر تشغيلاً هذا الأسبوع
            </CardTitle>
            <CardDescription className="text-xs">أعلى 5 مقاطع خلال آخر 7 أيام</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {trendingLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : trendingWeek && trendingWeek.length > 0 ? (
              <div className="space-y-2">
                {trendingWeek.map((t, idx) => (
                  <div
                    key={t.trackId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm font-fustat ${
                      idx === 0 ? "bg-amber-500/20 text-amber-500" :
                      idx === 1 ? "bg-slate-400/20 text-slate-400" :
                      idx === 2 ? "bg-orange-700/20 text-orange-700" :
                      "bg-muted/30 text-muted-foreground"
                    }`}>
                      {(idx + 1).toLocaleString("en-US")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-fustat font-bold truncate">{t.title}</p>
                    </div>
                    {t.playCount > 0 && (
                      <Badge variant="outline" className="text-[10px] font-fustat shrink-0">
                        {t.playCount.toLocaleString("en-US")} تشغيل
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-muted-foreground font-fustat">
                لا توجد بيانات تشغيل هذا الأسبوع
              </div>
            )}
          </CardContent>
        </Card>

        {/* Listening quality — completion with an explicit "what good looks
            like" band, plus average session length. */}
        <div className="space-y-6">
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-5" dir="rtl">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${completionMeta.bg} ${completionMeta.text}`}>
                  <Percent className="h-4 w-4" />
                </div>
                <p className="text-xs font-fustat text-muted-foreground uppercase tracking-wider">نسبة الإكمال</p>
              </div>
              {engagementLoading ? (
                <Skeleton className="h-8 w-24 mb-2" />
              ) : (
                <div className="flex items-baseline gap-3 mb-2">
                  <h3 className={`text-3xl font-bold font-fustat leading-none ${completionMeta.text}`}>
                    {completionRate.toLocaleString("en-US")}%
                  </h3>
                  <span className={`text-[11px] font-fustat font-bold ${completionMeta.text}`}>
                    {completionMeta.verdict}
                  </span>
                </div>
              )}
              <p className="text-[11px] font-fustat text-muted-foreground">
                نسبة جلسات التشغيل التي وصلت إلى نهاية المقطع.{" "}
                <span className="text-muted-foreground/70">
                  النطاق المعتاد لتطبيقات الاستماع ٤٠–٦٠٪ — أقل من ٣٠٪ يعني أن أغلب التشغيلات تُقطع مبكرًا.
                </span>
              </p>
              {!engagementLoading && (
                <div className="relative mt-3">
                  <Progress
                    value={completionRate}
                    className="h-1.5 bg-muted/30"
                    indicatorClassName={completionMeta.bar}
                  />
                  {/* Healthy-range marker at 40% */}
                  <div className="absolute top-[-3px] bottom-[-3px] w-px bg-muted-foreground/40" style={{ right: "40%" }} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-5" dir="rtl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Timer className="h-4 w-4" />
                </div>
                <p className="text-xs font-fustat text-muted-foreground uppercase tracking-wider">متوسط مدة الاستماع</p>
              </div>
              {engagementLoading ? (
                <Skeleton className="h-8 w-28 mb-2" />
              ) : (
                <h3 className="text-3xl font-bold font-fustat leading-none mb-2">
                  {avgDurMin.toLocaleString("en-US")}
                  <span className="text-lg text-muted-foreground">د </span>
                  {avgDurSec.toLocaleString("en-US")}
                  <span className="text-lg text-muted-foreground">ث</span>
                </h3>
              )}
              <p className="text-[11px] font-fustat text-muted-foreground">
                متوسط طول الاستماع لكل جلسة تشغيل
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── المزيد من الإحصائيات — secondary blocks. Collapsed by default
             and their queries only fire on expand: they're context, not
             decisions. If one starts driving weekly action, promote it. ── */}
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-border/60 text-sm font-fustat text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        dir="rtl"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
        {showMore ? "إخفاء الإحصائيات الإضافية" : "المزيد من الإحصائيات — خريطة الأوقات، التوزيع، الأجهزة، المفضلة، التحميلات"}
      </button>

      {showMore && (
      <>
      {/* ── Listening heatmap (last 4 weeks, hour × day-of-week) ── */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-accent" />
            خريطة أوقات الاستماع
          </CardTitle>
          <CardDescription className="text-xs">
            تكثيف عمليات التشغيل آخر {fmt(stats?.heatmap_weeks ?? 4)} أسابيع
            موزّعةً على أيام الأسبوع (محور Y) وساعات اليوم (محور X) — بتوقيت {stats?.tz ?? "الخرطوم"}.
            كلّ خانة لون أغمق = نشاط أعلى في تلك الساعة من ذلك اليوم.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {statsLoading ? (
            <div className="h-[260px]"><CardSpinner /></div>
          ) : (
            <ListeningHeatmap cells={stats?.heatmap ?? []} />
          )}
        </CardContent>
      </Card>

      {/* ── Content distribution + device split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-purple-500" />
              توزيع المحتوى
            </CardTitle>
            <CardDescription className="text-xs">عدد المقاطع حسب الفئة</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 h-[280px]">
            {typeDistLoading ? (
              <CardSpinner />
            ) : typePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    animationDuration={1500}
                  >
                    {typePieData.map((entry) => (
                      <Cell key={entry.key} fill={typeColors[entry.key] || "#8b5cf6"} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "Fustat",
                      color: "#fff"
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", fontFamily: "Fustat" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-fustat">
                لا توجد بيانات
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-5" dir="rtl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                <Smartphone className="h-4 w-4" />
              </div>
              <p className="text-xs font-fustat text-muted-foreground uppercase tracking-wider">الأجهزة</p>
            </div>
            {engagementLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-1 w-full" />
                  </div>
                ))}
              </div>
            ) : deviceEntries.length > 0 ? (
              <div className="space-y-2">
                {deviceEntries.slice(0, 4).map(([device, count]) => {
                  const pct = totalDevicePlays > 0 ? Math.round(((count as number) / totalDevicePlays) * 100) : 0;
                  return (
                    <div key={device} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-fustat text-muted-foreground">{deviceLabels[device] || device}</span>
                        <span className="font-bold">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1 bg-muted/30" indicatorClassName="bg-cyan-500" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-fustat mt-4">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Top favorited + User activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              الأكثر إعجاباً
            </CardTitle>
            <CardDescription className="text-xs">أعلى 5 مقاطع من حيث عدد المفضلات</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {topFavsLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                ))}
              </div>
            ) : topFavs && topFavs.length > 0 ? (
              <div className="space-y-2">
                {topFavs.map((t, idx) => (
                  <div
                    key={t.trackId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-sm font-fustat">
                      {(idx + 1).toLocaleString("en-US")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-fustat font-bold truncate">{t.title}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-fustat shrink-0 gap-1">
                      <Heart className="h-2.5 w-2.5" />
                      {t.favCount.toLocaleString("en-US")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-muted-foreground font-fustat">
                لا توجد مفضلات حتى الآن
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              نشاط المستخدمين
            </CardTitle>
            <CardDescription className="text-xs">إحصائيات التفاعل مع التطبيق</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-cyan-500" />
                <p className="text-[10px] font-fustat text-muted-foreground uppercase tracking-wider">نشطون (7 أيام)</p>
              </div>
              {userActivityLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <h3 className="text-2xl font-bold font-fustat leading-none">
                  {(userActivity?.activeThisWeek || 0).toLocaleString("en-US")}
                </h3>
              )}
            </div>

            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-500" />
                <p className="text-[10px] font-fustat text-muted-foreground uppercase tracking-wider">نشطون (30 يوم)</p>
              </div>
              {userActivityLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <h3 className="text-2xl font-bold font-fustat leading-none">
                  {(userActivity?.activeThisMonth || 0).toLocaleString("en-US")}
                </h3>
              )}
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <p className="text-[10px] font-fustat text-muted-foreground uppercase tracking-wider">جدد هذا الشهر</p>
              </div>
              {userActivityLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <h3 className="text-2xl font-bold font-fustat leading-none">
                  {(userActivity?.newThisMonth || 0).toLocaleString("en-US")}
                </h3>
              )}
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-[10px] font-fustat text-muted-foreground uppercase tracking-wider">إجمالي المستخدمين</p>
              </div>
              {userActivityLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <h3 className="text-2xl font-bold font-fustat leading-none">
                  {(userActivity?.totalUsers || 0).toLocaleString("en-US")}
                </h3>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 6: Download Analytics */}
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-fustat font-bold">إحصائيات التحميل</h2>
            <p className="text-xs text-muted-foreground font-fustat">تحليل تحميلات المقاطع للاستماع بدون إنترنت</p>
          </div>
        </div>
      </div>

      {/* Download KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي التحميلات", value: downloads?.totalDownloads ?? 0, color: "text-teal-500", bg: "bg-teal-500/10", icon: Download },
          { label: "مقاطع فريدة", value: downloads?.uniqueTracksDownloaded ?? 0, color: "text-violet-500", bg: "bg-violet-500/10", icon: Music },
          { label: "آخر 7 أيام", value: downloads?.downloadsLast7Days ?? 0, color: "text-sky-500", bg: "bg-sky-500/10", icon: Activity },
          { label: "آخر 30 يوم", value: downloads?.downloadsLast30Days ?? 0, color: "text-amber-500", bg: "bg-amber-500/10", icon: Clock },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/40 shadow-sm overflow-hidden group hover:border-teal-500/50 transition-colors">
              <CardContent className="p-5">
                <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color} w-fit`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div className="mt-4">
                  <p className="text-xs font-fustat text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  {downloadsLoading ? (
                    <Skeleton className="h-7 w-20 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-bold font-fustat mt-1 leading-none">{kpi.value.toLocaleString("en-US")}</h3>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Download Trend Chart + Top Downloaded */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
              <Download className="h-4 w-4 text-teal-500" />
              اتجاهات التحميل
            </CardTitle>
            <CardDescription className="text-xs">عدد التحميلات خلال الـ 14 يوماً الماضية</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 h-[300px]">
            {downloadsLoading ? (
              <CardSpinner />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={downloads?.dailyTrend || []}>
                  <defs>
                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                    tickFormatter={(str) => {
                      const date = new Date(str);
                      return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
                    }}
                  />
                  <YAxis hide />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "Fustat",
                      color: "#fff"
                    }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#14b8a6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorDownloads)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Downloaded + Device Split */}
        <div className="space-y-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-teal-500" />
                الأكثر تحميلاً
              </CardTitle>
              <CardDescription className="text-xs">أعلى 5 مقاطع من حيث عدد التحميلات</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {downloadsLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              ) : downloads?.topDownloadedTracks && downloads.topDownloadedTracks.length > 0 ? (
                <div className="space-y-2">
                  {downloads.topDownloadedTracks.slice(0, 5).map((t, idx) => (
                    <div
                      key={t.trackId}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm font-fustat ${
                        idx === 0 ? "bg-teal-500/20 text-teal-500" :
                        idx === 1 ? "bg-slate-400/20 text-slate-400" :
                        idx === 2 ? "bg-amber-600/20 text-amber-600" :
                        "bg-muted/30 text-muted-foreground"
                      }`}>
                        {(idx + 1).toLocaleString("en-US")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-fustat font-bold truncate">{t.title}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-fustat shrink-0 gap-1">
                        <Download className="h-2.5 w-2.5" />
                        {t.downloadCount.toLocaleString("en-US")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-muted-foreground font-fustat">
                  لا توجد تحميلات حتى الآن
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500">
                  <Smartphone className="h-4 w-4" />
                </div>
                <p className="text-xs font-fustat text-muted-foreground uppercase tracking-wider">أجهزة التحميل</p>
              </div>
              {downloadsLoading ? (
                <div className="space-y-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <Skeleton className="h-1 w-full" />
                    </div>
                  ))}
                </div>
              ) : downloads?.downloadsByDevice && downloads.downloadsByDevice.length > 0 ? (
                <div className="space-y-2">
                  {downloads.downloadsByDevice.map(({ device, count }) => {
                    const total = downloads.totalDownloads || 1;
                    const pct = Math.round((count / total) * 100);
                    const deviceLabelsMap: Record<string, string> = { ios: "iOS", android: "أندرويد", unknown: "غير معروف" };
                    return (
                      <div key={device} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-fustat text-muted-foreground">{deviceLabelsMap[device] || device}</span>
                          <span className="font-bold">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1 bg-muted/30" indicatorClassName="bg-teal-500" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-fustat mt-4">لا توجد بيانات</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </>
      )}
    </div>
    </TooltipProvider>
  );
};

export default AnalyticsSection;
