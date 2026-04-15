import {
  useAnalyticsSummary,
  usePlaysTrend,
  useContentHealth,
  useEngagementMetrics,
  useTrendingThisWeek,
  useContentTypeDistribution,
  useTopFavorited,
  useUserActivity,
} from "@/lib/api/hooks";
import {
  CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, Music, CheckCircle2, AlertCircle,
  ArrowUpRight, ArrowDownRight, Headphones, Activity,
  Heart, Clock, Flame, PieChart as PieIcon, Smartphone,
  UserCheck, Sparkles, Trophy, Percent, Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

// ── Small helpers ──────────────────────────────────────────
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-muted/30 ${className}`} />
);

const CardSpinner = () => (
  <div className="h-full w-full flex items-center justify-center">
    <Activity className="h-6 w-6 animate-spin text-primary/40" />
  </div>
);

const AnalyticsSection = () => {
  // NOTE: Each card renders independently — no page-wide loading gate.
  // Cards show a skeleton while their own query resolves.
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: trend, isLoading: trendLoading } = usePlaysTrend(14);
  const { data: health, isLoading: healthLoading } = useContentHealth();
  const { data: engagement, isLoading: engagementLoading } = useEngagementMetrics();
  const { data: trendingWeek, isLoading: trendingLoading } = useTrendingThisWeek(7, 5);
  const { data: typeDist, isLoading: typeDistLoading } = useContentTypeDistribution();
  const { data: topFavs, isLoading: topFavsLoading } = useTopFavorited(5);
  const { data: userActivity, isLoading: userActivityLoading } = useUserActivity();

  const kpis = [
    {
      label: "إجمالي الاستماع",
      value: summary?.totalPlays ?? 0,
      icon: Headphones,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      trend: summary?.playsTrendPct ?? null,
      loading: summaryLoading,
    },
    {
      label: "دقائق الاستماع",
      value: Math.round((summary?.totalDuration ?? 0) / 60),
      icon: Clock,
      color: "text-accent",
      bg: "bg-accent/10",
      trend: summary?.durationTrendPct ?? null,
      loading: summaryLoading,
    },
    {
      label: "عدد المدائح",
      value: summary?.madhaCount ?? 0,
      icon: Music,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      trend: null as string | null,
      loading: summaryLoading,
    },
    {
      label: "المادحين",
      value: summary?.madihCount ?? 0,
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      trend: null as string | null,
      loading: summaryLoading,
    },
    {
      label: "المستمعين",
      value: engagement?.uniqueListeners ?? 0,
      icon: UserCheck,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      trend: null as string | null,
      loading: engagementLoading,
    },
    {
      label: "المفضلة",
      value: engagement?.totalFavorites ?? 0,
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      trend: null as string | null,
      loading: engagementLoading,
    },
  ];

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

  const renderTrendBadge = (trendStr: string | null) => {
    if (!trendStr) return null;
    const isUp = trendStr.startsWith("+") && !trendStr.startsWith("+0");
    const isDown = trendStr.startsWith("-");
    return (
      <Badge variant="outline" className="text-[10px] font-fustat bg-background/50 border-border/40">
        {isUp ? (
          <span className="text-emerald-500 flex items-center gap-0.5">
            <ArrowUpRight className="h-2.5 w-2.5" />
            {trendStr}
          </span>
        ) : isDown ? (
          <span className="text-rose-500 flex items-center gap-0.5">
            <ArrowDownRight className="h-2.5 w-2.5" />
            {trendStr}
          </span>
        ) : (
          <span className="text-muted-foreground">{trendStr}</span>
        )}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full pb-20 scrollbar-hide">
      {/* Row 1: KPI Grid (6 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
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
                  {!kpi.loading && renderTrendBadge(kpi.trend)}
                </div>
                <div className="mt-4">
                  <p className="text-xs font-fustat text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  {kpi.loading ? (
                    <Skeleton className="h-7 w-20 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-bold font-fustat mt-1 leading-none">{kpi.value.toLocaleString("ar-EG")}</h3>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Row 2: Trend chart + Content health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  اتجاهات الاستماع
                </CardTitle>
                <CardDescription className="text-xs">عدد مرات التشغيل خلال الـ 14 يوماً الماضية</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 h-[300px]">
            {trendLoading ? (
              <CardSpinner />
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
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
                <Tooltip
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
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Content Health */}
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
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-1.5 w-full" />
                  </div>
                ))}
              </>
            ) : (
              <>
                {healthMetrics.map((metric) => (
                  <div key={metric.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-fustat">{metric.label}</span>
                      <span className="font-bold">{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} className="h-1.5 bg-muted/30" indicatorClassName={metric.color} />
                  </div>
                ))}

                <div className="mt-6 p-4 rounded-xl bg-muted/20 border border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-fustat text-muted-foreground leading-tight">
                        هناك {Math.round((health?.totalCount || 0) * (1 - (health?.lyricsPct || 0)/100))} مدحة مفقودة الكلمات، يوصى بالتركيز على إضافتها لزيادة التفاعل.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
                      {(idx + 1).toLocaleString("ar-EG")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-fustat font-bold truncate">{t.title}</p>
                    </div>
                    {t.playCount > 0 && (
                      <Badge variant="outline" className="text-[10px] font-fustat shrink-0">
                        {t.playCount.toLocaleString("ar-EG")} تشغيل
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
                  <Tooltip
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
      </div>

      {/* Row 4: Listening behavior — 3 stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Percent className="h-4 w-4" />
              </div>
              <p className="text-xs font-fustat text-muted-foreground uppercase tracking-wider">نسبة الإكمال</p>
            </div>
            {engagementLoading ? (
              <Skeleton className="h-8 w-24 mb-2" />
            ) : (
              <h3 className="text-3xl font-bold font-fustat leading-none mb-2">
                {(engagement?.completionRate ?? 0).toLocaleString("ar-EG")}%
              </h3>
            )}
            <p className="text-[11px] font-fustat text-muted-foreground">
              نسبة المستمعين الذين أكملوا المقطع حتى النهاية
            </p>
            {!engagementLoading && (
              <Progress
                value={engagement?.completionRate || 0}
                className="h-1.5 bg-muted/30 mt-3"
                indicatorClassName="bg-emerald-500"
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-5">
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
                {avgDurMin.toLocaleString("ar-EG")}
                <span className="text-lg text-muted-foreground">د </span>
                {avgDurSec.toLocaleString("ar-EG")}
                <span className="text-lg text-muted-foreground">ث</span>
              </h3>
            )}
            <p className="text-[11px] font-fustat text-muted-foreground">
              متوسط طول الاستماع لكل جلسة تشغيل
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-5">
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
                      {(idx + 1).toLocaleString("ar-EG")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-fustat font-bold truncate">{t.title}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-fustat shrink-0 gap-1">
                      <Heart className="h-2.5 w-2.5" />
                      {t.favCount.toLocaleString("ar-EG")}
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
                  {(userActivity?.activeThisWeek || 0).toLocaleString("ar-EG")}
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
                  {(userActivity?.activeThisMonth || 0).toLocaleString("ar-EG")}
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
                  {(userActivity?.newThisMonth || 0).toLocaleString("ar-EG")}
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
                  {(userActivity?.totalUsers || 0).toLocaleString("ar-EG")}
                </h3>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsSection;
