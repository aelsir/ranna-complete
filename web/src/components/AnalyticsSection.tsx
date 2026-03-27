import { useAnalyticsSummary, usePlaysTrend, useContentHealth } from "@/lib/api/hooks";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from "recharts";
import { 
  BarChart3, Users, Music, CheckCircle2, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Headphones, Activity,
  Globe, Layout, Share, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

const AnalyticsSection = () => {
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: trend, isLoading: trendLoading } = usePlaysTrend(14);
  const { data: health, isLoading: healthLoading } = useContentHealth();

  if (summaryLoading || trendLoading || healthLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <Activity className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  const kpis = [
    { 
      label: "إجمالي الاستماع", 
      value: summary?.totalPlays || 0, 
      icon: Headphones, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      trend: "+12%" 
    },
    { 
      label: "دقائق الاستماع", 
      value: Math.round((summary?.totalDuration || 0) / 60), 
      icon: Clock, 
      color: "text-accent", 
      bg: "bg-accent/10",
      trend: "+8%" 
    },
    { 
      label: "عدد المدائح", 
      value: summary?.madhaCount || 0, 
      icon: Music, 
      color: "text-purple-500", 
      bg: "bg-purple-500/10",
      trend: "+5" 
    },
    { 
      label: "المادحين", 
      value: summary?.madihCount || 0, 
      icon: Users, 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10",
      trend: "+2" 
    },
  ];

  const healthMetrics = [
    { label: "اكتمال الكلمات (Lyrics)", value: health?.lyricsPct || 0, color: "bg-blue-500" },
    { label: "ربط المادحين (Artists)", value: health?.madihPct || 0, color: "bg-emerald-500" },
    { label: "ربط الرواة (Narrators)", value: health?.rawiPct || 0, color: "bg-purple-500" },
    { label: "توفر الصور (Thumbnails)", value: health?.imagePct || 0, color: "bg-orange-500" },
    { label: "توفر الصوت (Audio)", value: health?.audioPct || 0, color: "bg-primary" },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full pb-20 scrollbar-hide">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-border/40 shadow-sm overflow-hidden group hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color}`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-fustat bg-background/50 border-border/40">
                    {kpi.trend.startsWith("+") ? (
                      <span className="text-emerald-500 flex items-center gap-0.5">
                        <ArrowUpRight className="h-2.5 w-2.5" />
                        {kpi.trend}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{kpi.trend}</span>
                    )}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-fustat text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <h3 className="text-2xl font-bold font-fustat mt-1 leading-none">{kpi.value.toLocaleString("ar-EG")}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Play Trend Chart */}
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
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placeholder for future detailed stats */}
        <Card className="border-border/40 shadow-sm border-dashed bg-muted/5">
          <CardContent className="h-40 flex flex-col items-center justify-center text-center p-6">
            <Globe className="h-8 w-8 text-muted-foreground mb-3 opacity-20" />
            <h4 className="text-sm font-fustat font-bold text-muted-foreground/40 text-center">التوزيع الجغرافي للجمهور</h4>
            <p className="text-[10px] text-muted-foreground/30 mt-1 uppercase tracking-widest font-fustat">Coming Soon in V3</p>
          </CardContent>
        </Card>
        
        <Card className="border-border/40 shadow-sm border-dashed bg-muted/5">
          <CardContent className="h-40 flex flex-col items-center justify-center text-center p-6">
            <Share className="h-8 w-8 text-muted-foreground mb-3 opacity-20" />
            <h4 className="text-sm font-fustat font-bold text-muted-foreground/40 text-center">الإحالات ومصادر الزيارات</h4>
            <p className="text-[10px] text-muted-foreground/30 mt-1 uppercase tracking-widest font-fustat">Coming Soon in V3</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsSection;
