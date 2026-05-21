import { useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  Activity,
  Layers,
  Eye,
  Percent,
} from "lucide-react";
import {
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLyricsStats } from "@/lib/api/hooks";
import { DayDateTick } from "@/components/DayDateTick";

// Same time-window options as the rest of the stats pages.
type TimeWindow = { label: string; days: number | null };
const TIME_WINDOWS: TimeWindow[] = [
  { label: "آخر 7 أيام", days: 7 },
  { label: "آخر 30 يوم", days: 30 },
  { label: "آخر 90 يوم", days: 90 },
  { label: "كل الوقت", days: null },
];

const fmt = (n: number) => n.toLocaleString("en-US");

const axisTitleStyle = {
  fill: "hsl(var(--foreground))",
  fontSize: 12,
  fontFamily: "Fustat",
  fontWeight: 700,
};

const CardSpinner = () => (
  <div className="h-full w-full flex items-center justify-center">
    <Activity className="h-6 w-6 animate-spin text-primary/40" />
  </div>
);

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-muted/30 ${className}`} />
);

interface Props {
  onBack: () => void;
}

const LyricsSection = ({ onBack }: Props) => {
  const [windowDays, setWindowDays] = useState<number | null>(30);
  const { data, isLoading } = useLyricsStats({ windowDays });

  const trend = data?.daily_trend ?? [];

  return (
    <div
      className="p-6 space-y-6 overflow-y-auto h-full pb-20 scrollbar-hide"
      dir="rtl"
    >
      {/* ── Header — back button + window filter ───────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 font-fustat"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع للإحصائيات
          </Button>
          <div>
            <h1 className="text-xl font-fustat font-bold flex items-center gap-2">
              <BookOpenText className="h-5 w-5 text-violet-500" />
              تفاصيل الكلمات
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              مقارنة بين إجمالي التشغيلات والتشغيلات على مقاطع لها كلمات،
              وعدد مرات فتح شاشة الكلمات من المستخدمين.
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

      {/* ── Headline KPI strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="إجمالي التشغيلات"
          value={data?.total_plays ?? 0}
          icon={Layers}
          color="text-primary"
          bg="bg-primary/10"
          loading={isLoading}
        />
        <KpiCard
          label="تشغيلات على مقاطع لها كلمات"
          value={data?.plays_with_lyrics ?? 0}
          icon={BookOpenText}
          color="text-violet-500"
          bg="bg-violet-500/10"
          loading={isLoading}
        />
        <KpiCard
          label="نسبة التغطية"
          value={data?.lyrics_coverage_pct ?? 0}
          suffix="%"
          icon={Percent}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
          loading={isLoading}
        />
        <KpiCard
          label="عدد فتحات شاشة الكلمات"
          value={data?.total_lyric_views ?? 0}
          icon={Eye}
          color="text-cyan-500"
          bg="bg-cyan-500/10"
          loading={isLoading}
          sub={
            (data?.unique_viewers ?? 0) > 0
              ? `${fmt(data?.unique_viewers ?? 0)} قارئ مسجَّل فريد`
              : "لا يحتسب المستخدمين غير المسجَّلين"
          }
        />
      </div>

      {/* ── 3-line daily trend chart ────────────────────────────────────── */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-fustat font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            الكلمات يوميًا
          </CardTitle>
          <CardDescription className="text-xs">
            ثلاثة خطوط على نفس المحور: إجمالي التشغيلات،
            التشغيلات على مقاطع لها كلمات،
            وعدد مرات فتح شاشة الكلمات في التطبيقات. إذا كان خط الفتحات منخفضًا
            بينما خط التشغيلات-بكلمات مرتفع، فالمستخدمون يستمعون لكن لا يقرؤون.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 h-[360px]">
          {isLoading ? (
            <CardSpinner />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend}
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
                    style: axisTitleStyle,
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  width={52}
                  tickMargin={6}
                  tickFormatter={(v: number) => fmt(v)}
                  label={{
                    value: "العدد",
                    angle: -90,
                    position: "insideLeft",
                    offset: 6,
                    style: { ...axisTitleStyle, textAnchor: "middle" },
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
                    const dayName = d.toLocaleDateString("ar-EG", {
                      weekday: "long",
                    });
                    const datePart = d.toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                    return `${dayName} · ${datePart}`;
                  }}
                  formatter={(value: number, name: string) => {
                    const label =
                      name === "plays"
                        ? "إجمالي التشغيلات"
                        : name === "plays_with_lyrics"
                          ? "تشغيلات مقاطع لها كلمات"
                          : name === "lyric_views"
                            ? "فتحات شاشة الكلمات"
                            : name;
                    return [fmt(value), label];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  wrapperStyle={{ fontSize: "11px", fontFamily: "Fustat" }}
                  formatter={(value: string) => {
                    if (value === "plays") return "إجمالي التشغيلات";
                    if (value === "plays_with_lyrics") return "تشغيلات مقاطع لها كلمات";
                    if (value === "lyric_views") return "فتحات شاشة الكلمات";
                    return value;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="plays"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationDuration={900}
                />
                <Line
                  type="monotone"
                  dataKey="plays_with_lyrics"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationDuration={900}
                />
                <Line
                  type="monotone"
                  dataKey="lyric_views"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                  animationDuration={900}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ── Small KPI card used in the headline strip above the chart ────────
interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: typeof Activity;
  color: string;
  bg: string;
  loading?: boolean;
  sub?: string;
}

const KpiCard = ({
  label,
  value,
  suffix,
  icon: Icon,
  color,
  bg,
  loading,
  sub,
}: KpiCardProps) => (
  <Card className="border-border/40 shadow-sm overflow-hidden">
    <CardContent className="p-5">
      <div className={`p-2.5 rounded-xl w-fit ${bg} ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4">
        <p className="text-xs font-fustat text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-7 w-20 mt-1" />
        ) : (
          <h3 className="text-2xl font-bold font-fustat mt-1 leading-none">
            {fmt(value)}
            {suffix ? <span className="text-base ml-0.5">{suffix}</span> : null}
          </h3>
        )}
        {sub && (
          <p className="text-[10px] text-muted-foreground mt-1.5 font-fustat">
            {sub}
          </p>
        )}
      </div>
    </CardContent>
  </Card>
);

export default LyricsSection;
