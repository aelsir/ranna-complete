import { useState } from "react";
import {
  ArrowRight,
  Trophy,
  TrendingUp,
  BarChart3,
  Clock,
  Activity,
  CheckCircle2,
} from "lucide-react";
import {
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompletionStats } from "@/lib/api/hooks";

// Same time-window options as the main stats page.
type TimeWindow = { label: string; days: number | null };
const TIME_WINDOWS: TimeWindow[] = [
  { label: "آخر 7 أيام", days: 7 },
  { label: "آخر 30 يوم", days: 30 },
  { label: "آخر 90 يوم", days: 90 },
  { label: "كل الوقت", days: null },
];

const fmt = (n: number) => n.toLocaleString("en-US");

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-muted/30 ${className}`} />
);

const CardSpinner = () => (
  <div className="h-full w-full flex items-center justify-center">
    <Activity className="h-6 w-6 animate-spin text-primary/40" />
  </div>
);

interface Props {
  onBack: () => void;
}

const CompletionSection = ({ onBack }: Props) => {
  const [windowDays, setWindowDays] = useState<number | null>(30);
  const { data, isLoading } = useCompletionStats({ windowDays });

  const topTracks = data?.top_tracks ?? [];
  const trend = data?.daily_trend ?? [];
  const depthOrder = ["0-25", "25-50", "50-75", "75-99", "100"];
  const depthLabels: Record<string, string> = {
    "0-25": "≤ 25%",
    "25-50": "25–50%",
    "50-75": "50–75%",
    "75-99": "75–99%",
    "100": "اكتمل",
    unknown: "غير معروف",
  };
  const depth = [...(data?.depth_distribution ?? [])]
    .filter((d) => d.bucket !== "unknown")
    .sort((a, b) => depthOrder.indexOf(a.bucket) - depthOrder.indexOf(b.bucket));

  const durationOrder = ["0-2", "2-5", "5-10", "10-20", "20+"];
  const durationLabels: Record<string, string> = {
    "0-2": "أقل من 2د",
    "2-5": "2–5د",
    "5-10": "5–10د",
    "10-20": "10–20د",
    "20+": "أكثر من 20د",
    unknown: "غير معروف",
  };
  const durationBuckets = [...(data?.duration_buckets ?? [])]
    .filter((d) => d.bucket !== "unknown")
    .sort((a, b) => durationOrder.indexOf(a.bucket) - durationOrder.indexOf(b.bucket));

  // Overall completion rate across the window — useful as a baseline
  // reference on the trend chart.
  const overallRate = (() => {
    const totals = (data?.daily_trend ?? []).reduce(
      (acc, d) => ({ plays: acc.plays + d.plays, completed: acc.completed + d.completed }),
      { plays: 0, completed: 0 },
    );
    return totals.plays > 0
      ? Math.round((totals.completed / totals.plays) * 1000) / 10
      : 0;
  })();

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full pb-20 scrollbar-hide" dir="rtl">
      {/* ── Header — back button + window filter ───────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 font-fustat">
            <ArrowRight className="h-4 w-4" />
            رجوع للإحصائيات
          </Button>
          <div>
            <h1 className="text-xl font-fustat font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              تفاصيل الإكمال
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading
                ? "جاري التحميل..."
                : `إجمالي معدل الإكمال خلال هذه الفترة: ${fmt(overallRate)}%`}
            </p>
          </div>
        </div>

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
      </div>

      {/* ── 0. Top 10 most-completed tracks ─────────────────────────────────── */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            أعلى 10 مقاطع إكمالاً
          </CardTitle>
          <CardDescription className="text-xs">
            مرتّبة حسب عدد مرات الإكمال (التشغيلات التي وصلت لنهاية المقطع). معدل الإكمال
            معروض بجانب كل مقطع لقياس الجودة بصرف النظر عن عدد التشغيلات.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : topTracks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 font-fustat">
              لا توجد بيانات إكمال بعد في هذه الفترة.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-muted-foreground font-fustat border-b border-border/30">
                    <th className="text-start py-2 px-2 w-8">#</th>
                    <th className="text-start py-2 px-2">المقطع</th>
                    <th className="text-start py-2 px-2 hidden md:table-cell">المادح</th>
                    <th className="text-start py-2 px-2 hidden md:table-cell">المؤلف</th>
                    <th className="text-start py-2 px-2 w-24">الإكمال</th>
                    <th className="text-start py-2 px-2 w-24">إجمالي التشغيلات</th>
                    <th className="text-start py-2 px-2 w-20">المعدل</th>
                  </tr>
                </thead>
                <tbody>
                  {topTracks.map((t, i) => (
                    <tr
                      key={t.track_id}
                      className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                    >
                      <td className="py-2.5 px-2 text-xs font-mono text-muted-foreground">
                        {fmt(i + 1)}
                      </td>
                      <td className="py-2.5 px-2 font-fustat font-medium">{t.title}</td>
                      <td className="py-2.5 px-2 text-xs text-muted-foreground font-fustat hidden md:table-cell">
                        {t.artist_name || "—"}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-muted-foreground font-fustat hidden md:table-cell">
                        {t.author_name || "—"}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-emerald-500 font-semibold">
                        {fmt(t.completed_plays)}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-muted-foreground">
                        {fmt(t.total_plays)}
                      </td>
                      <td className="py-2.5 px-2 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs ${
                            t.completion_rate >= 75
                              ? "bg-emerald-500/15 text-emerald-500"
                              : t.completion_rate >= 50
                                ? "bg-amber-500/15 text-amber-500"
                                : "bg-rose-500/15 text-rose-500"
                          }`}
                        >
                          {fmt(t.completion_rate)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 1. Daily completion rate trend (line chart) ─────────────────────── */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            معدل الإكمال اليومي
          </CardTitle>
          <CardDescription className="text-xs">
            نسبة التشغيلات التي اكتملت كل يوم. الخط المتقطّع الرمادي هو متوسط الفترة ({fmt(overallRate)}%).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 h-[300px]">
          {isLoading ? (
            <CardSpinner />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 18, bottom: 0, left: 18 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                  tickMargin={6}
                  tickFormatter={(s) =>
                    new Date(s).toLocaleDateString("en-US", { day: "numeric", month: "short" })
                  }
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                  width={36}
                  tickMargin={6}
                  tickFormatter={(v: number) => `${fmt(v)}%`}
                />
                <ReferenceLine
                  y={overallRate}
                  stroke="rgba(255,255,255,0.25)"
                  strokeDasharray="4 4"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontFamily: "Fustat",
                    color: "#fff",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}
                  labelFormatter={(label: string) =>
                    new Date(label).toLocaleDateString("en-US", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  }
                  formatter={(value: number, name: string, item: { payload?: CompletionTrendPayload }) => {
                    if (name === "rate") {
                      const row = item?.payload;
                      return [
                        `${fmt(value)}% (${fmt(row?.completed ?? 0)} من ${fmt(row?.plays ?? 0)})`,
                        "نسبة الإكمال",
                      ];
                    }
                    return [value, name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981" }}
                  activeDot={{ r: 5 }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── 2. Listen depth distribution ────────────────────────────────────── */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-500" />
            توزيع عمق الاستماع
          </CardTitle>
          <CardDescription className="text-xs">
            كم من المقطع يصل إليه المستمعون قبل أن يتوقّفوا. تكدّس البيانات يسارًا (نسب منخفضة)
            = مشكلة في الجذب الأولي؛ تكدّسها بجانب 75–99% = مشكلة في الطول.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 h-[300px]">
          {isLoading ? (
            <CardSpinner />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={depth} margin={{ top: 8, right: 18, bottom: 0, left: 18 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="bucket"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)", fontFamily: "Fustat" }}
                  tickMargin={6}
                  tickFormatter={(b: string) => depthLabels[b] ?? b}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                  width={48}
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
                    color: "#fff",
                  }}
                  labelFormatter={(b: string) => depthLabels[b] ?? b}
                  formatter={(value: number) => [fmt(value), "عدد التشغيلات"]}
                />
                <Bar dataKey="plays" radius={[6, 6, 0, 0]} animationDuration={900}>
                  {depth.map((d) => (
                    <Cell
                      key={d.bucket}
                      fill={d.bucket === "100" ? "#10b981" : "#06b6d4"}
                      opacity={d.bucket === "100" ? 1 : 0.45 + depthOrder.indexOf(d.bucket) * 0.12}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Completion rate by track length ──────────────────────────────── */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-500" />
            معدل الإكمال حسب طول المقطع
          </CardTitle>
          <CardDescription className="text-xs">
            هل الطول يقتل الإكمال؟ كل عمود يعرض المعدل ضمن فئة طول، ورقم التشغيلات يظهر فوقه
            (الفئات ذات الأعداد الصغيرة قد تكون ضوضاء إحصائية).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 h-[300px]">
          {isLoading ? (
            <CardSpinner />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationBuckets} margin={{ top: 24, right: 18, bottom: 0, left: 18 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="bucket"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)", fontFamily: "Fustat" }}
                  tickMargin={6}
                  tickFormatter={(b: string) => durationLabels[b] ?? b}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                  width={36}
                  tickMargin={6}
                  tickFormatter={(v: number) => `${fmt(v)}%`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontFamily: "Fustat",
                    color: "#fff",
                  }}
                  labelFormatter={(b: string) => durationLabels[b] ?? b}
                  formatter={(value: number, _name: string, item: { payload?: CompletionDurationPayload }) => {
                    const row = item?.payload;
                    return [
                      `${fmt(value)}% (${fmt(row?.completed ?? 0)} من ${fmt(row?.plays ?? 0)})`,
                      "نسبة الإكمال",
                    ];
                  }}
                />
                <Bar
                  dataKey="rate"
                  radius={[6, 6, 0, 0]}
                  animationDuration={900}
                  fill="#a855f7"
                  label={{
                    position: "top",
                    fill: "rgba(255,255,255,0.5)",
                    fontSize: 10,
                    formatter: (v: number) => `${fmt(v)}%`,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Type aliases for the recharts payload field on the row level —
// recharts ships them as a generic record, this lets us pull our shape
// out without `any`.
type CompletionTrendPayload = { plays: number; completed: number; rate: number };
type CompletionDurationPayload = { plays: number; completed: number; rate: number };

export default CompletionSection;
