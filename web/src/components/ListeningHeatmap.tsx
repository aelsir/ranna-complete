import { useMemo } from "react";
import type { StatsHeatmapCell } from "@/lib/api/analytics";

/**
 * Listening heatmap — 7 rows (days) × 24 columns (hours).
 *
 * X axis (columns) → hour of day, 0..23.
 * Y axis (rows)    → day of week (Saturday-first in RTL to match the
 *                    Arabic week). Postgres EXTRACT(DOW) returns
 *                    0=Sun..6=Sat; we re-index.
 *
 * Cell intensity is a linear opacity map of count → primary fill,
 * aggregated over `heatmap_weeks` (default 4 weeks) in the RPC.
 * Western digits throughout per the design spec.
 */

interface Props {
  cells: StatsHeatmapCell[];
}

// Saturday-first weekday order (matches Arabic week).
const DAY_ROWS: { dow: number; short: string; full: string }[] = [
  { dow: 6, short: "السبت",   full: "السبت" },
  { dow: 0, short: "الأحد",   full: "الأحد" },
  { dow: 1, short: "الاثنين", full: "الاثنين" },
  { dow: 2, short: "الثلاثاء", full: "الثلاثاء" },
  { dow: 3, short: "الأربعاء", full: "الأربعاء" },
  { dow: 4, short: "الخميس",  full: "الخميس" },
  { dow: 5, short: "الجمعة",  full: "الجمعة" },
];

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** Compact 24h label using Western digits and AM/PM in Arabic. */
function formatHour(h: number): string {
  if (h === 0) return "12 ص";
  if (h < 12) return `${h} ص`;
  if (h === 12) return "12 ظ";
  return `${h - 12} م`;
}

export function ListeningHeatmap({ cells }: Props) {
  const byKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cells) m.set(`${c.dow}:${c.hour}`, c.count);
    return m;
  }, [cells]);

  const maxCount = useMemo(() => {
    let m = 0;
    for (const c of cells) if (c.count > m) m = c.count;
    return m;
  }, [cells]);

  const colorFor = (count: number): string => {
    if (count <= 0 || maxCount === 0) return "hsl(var(--muted) / 0.35)";
    const ratio = count / maxCount;
    const alpha = 0.18 + ratio * 0.82;
    return `hsl(var(--primary) / ${alpha.toFixed(2)})`;
  };

  const peak = useMemo(() => {
    let best: StatsHeatmapCell | null = null;
    for (const c of cells) {
      if (!best || c.count > best.count) best = c;
    }
    return best;
  }, [cells]);

  return (
    <div className="w-full" dir="rtl">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-[10px] mx-auto">
          <thead>
            <tr>
              <th className="w-16" />
              {HOURS.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="font-mono font-medium text-muted-foreground text-center pb-1 px-0.5 align-bottom"
                  title={formatHour(h)}
                >
                  {/* Hide every other label to reduce clutter on narrow widths */}
                  <span className={h % 2 === 0 ? "" : "opacity-0"}>
                    {formatHour(h)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_ROWS.map((d) => (
              <tr key={d.dow}>
                <th
                  scope="row"
                  className="pr-2 font-fustat font-medium text-muted-foreground text-right whitespace-nowrap"
                >
                  {d.short}
                </th>
                {HOURS.map((h) => {
                  const count = byKey.get(`${d.dow}:${h}`) ?? 0;
                  return (
                    <td
                      key={`${d.dow}:${h}`}
                      className="w-6 h-6 rounded-[3px] cursor-default"
                      style={{ backgroundColor: colorFor(count) }}
                      title={`${d.full} · ${formatHour(h)} — ${count.toLocaleString("en-US")} مرة تشغيل`}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend + peak caption */}
      <div className="mt-3 flex items-center justify-between gap-4 flex-wrap text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>أقل</span>
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((a) => (
            <span
              key={a}
              className="w-4 h-3 rounded-[2px]"
              style={{ backgroundColor: `hsl(var(--primary) / ${a})` }}
            />
          ))}
          <span>أكثر</span>
        </div>
        {peak && peak.count > 0 && (
          <div className="font-fustat">
            <span className="text-muted-foreground/70">الذروة:</span>{" "}
            <span className="text-foreground font-medium">
              {DAY_ROWS.find((d) => d.dow === peak.dow)?.full} ·{" "}
              {formatHour(peak.hour)}
            </span>{" "}
            <span className="text-muted-foreground/70">
              ({peak.count.toLocaleString("en-US")} تشغيل)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
