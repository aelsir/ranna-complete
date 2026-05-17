import { Users, Headphones, UserCheck } from "lucide-react";

/**
 * Platform-usage funnel.
 *
 * Three sequential stages, each rendered as a horizontal bar whose width
 * is proportional to its count (largest = 100%). Conversion arrows
 * between stages show the drop-off percentage.
 *
 * Stages — all-time:
 *   1. Total accounts        — every row in auth.users.
 *   2. Played at least once  — distinct user_id in user_plays.
 *   3. Registered with email — auth.users with a real email (excludes
 *                              anonymous Supabase sign-ins).
 *
 * Numbers are all-time on purpose: a funnel reads clearest as a
 * cumulative conversion picture, not a windowed slice.
 */

interface Props {
  totalAccounts: number;
  playedAccounts: number;
  registeredAccounts: number;
  loading?: boolean;
}

const fmt = (n: number) => n.toLocaleString("en-US");

/** Western-digit percentage, one decimal when < 100, no decimals at exactly 0/100. */
function pct(part: number, whole: number): string {
  if (whole <= 0) return "—";
  const ratio = (part / whole) * 100;
  if (ratio === 0 || ratio === 100) return `${ratio.toFixed(0)}%`;
  if (ratio >= 10) return `${ratio.toFixed(0)}%`;
  return `${ratio.toFixed(1)}%`;
}

export function UsageFunnel({
  totalAccounts,
  playedAccounts,
  registeredAccounts,
  loading,
}: Props) {
  const maxValue = Math.max(totalAccounts, playedAccounts, registeredAccounts, 1);

  const stages = [
    {
      label: "إجمالي الحسابات",
      hint: "كل من له حساب على رنّة (يشمل الحسابات المجهولة إن وُجدت)",
      value: totalAccounts,
      icon: Users,
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.15)",
    },
    {
      label: "استمعوا فعلاً",
      hint: "أصحاب الحسابات الذين شغّلوا مقطعًا واحدًا على الأقل",
      value: playedAccounts,
      icon: Headphones,
      color: "#06b6d4",
      bg: "rgba(6, 182, 212, 0.15)",
    },
    {
      label: "مسجّلون ببريد إلكتروني",
      hint: "حسابات لها بريد فعلي — تستثني الحسابات المجهولة",
      value: registeredAccounts,
      icon: UserCheck,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.15)",
    },
  ];

  return (
    <div className="space-y-1" dir="rtl">
      {stages.map((s, i) => {
        const widthPct = (s.value / maxValue) * 100;
        const prev = i > 0 ? stages[i - 1].value : null;
        return (
          <div key={s.label}>
            {/* Conversion delta from previous stage */}
            {prev !== null && (
              <div className="flex items-center justify-center gap-2 my-1.5 text-[10px] text-muted-foreground font-mono">
                <span className="text-muted-foreground/60">↓</span>
                <span>
                  {pct(s.value, prev)}{" "}
                  <span className="text-muted-foreground/60">من الخطوة السابقة</span>
                </span>
              </div>
            )}

            {/* Bar */}
            <div className="flex items-center gap-3">
              <div
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: s.bg, color: s.color }}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-fustat font-medium text-foreground">
                      {s.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-fustat">
                      {s.hint}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    {loading ? (
                      <span className="inline-block h-5 w-16 rounded bg-muted/30 animate-pulse" />
                    ) : (
                      <span className="text-base font-bold font-mono">
                        {fmt(s.value)}
                      </span>
                    )}
                    {!loading && i > 0 && totalAccounts > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        ({pct(s.value, totalAccounts)} من الإجمالي)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: loading ? "0%" : `${widthPct}%`,
                      background: s.color,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
