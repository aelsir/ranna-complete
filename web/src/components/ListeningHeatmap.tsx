import { useMemo } from "react";
import type { StatsHeatmapCell } from "@/lib/api/analytics";

/**
 * 24-hour × 7-day listening heatmap. Pure CSS grid — no chart library.
 *
 * X axis (columns) → day of week, Sat..Fri reading right-to-left in RTL,
 *                    which lines up with the Arabic week. Postgres EXTRACT(DOW)
 *                    returns 0=Sun..6=Sat; we re-index so the visual order
 *                    is Saturday-first.
 * Y axis (rows)    → hour 0..23.
 *
 * Cell intensity is a linear map of count → opacity over a single
 * primary-colored fill. Aggregated over the heatmap_weeks window in the
 * RPC (default 4 weeks).
 */

interface Props {
  cells: StatsHeatmapCell[];
}

// Day labels in Saturday-first order (Arabic week starts on Saturday).
const DAY_LABELS_AR: { dow: number; short: string; full: string }[] = [
  { dow: 6, short: "السبت",   full: "السبت" },
  { dow: 0, short: "الأحد",   full: "الأحد" },
  { dow: 1, short: "الاثنين", full: "الاثنين" },
  { dow: 2, short: "الثلاثاء", full: "الثلاثاء" },
  { dow: 3, short: "الأربعاء", full: "الأربعاء" },
  { dow: 4, short: "الخميس",  full: "الخميس" },
  { dow: 5, short: "الجمعة",  full: "الجمعة" },
];

const HOURS = Array.from({ length: 24 }, (_, h) => h);

function formatHour12(h: number): string {
  if (h === 0) return "١٢ ص";
  if (h < 12) return `${h.toLocaleString("ar-EG")} ص`;
  if (h === 12) return "١٢ ظ";
  return `${(h - 12).toLocaleString("ar-EG")} م`;
}

export function ListeningHeatmap({ cells }: Props) {
  // Build a fast lookup: dow,hour → count.
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
    if (count <= 0 || maxCount === 0) {
      return "hsl(var(--muted) / 0.35)";
    }
    // 5 buckets so the gradient reads at a glance.
    const ratio = count / maxCount;
    const alpha = 0.18 + ratio * 0.82; // 0.18 (faintest visible) → 1.0
    return `hsl(var(--primary) / ${alpha.toFixed(2)})`;
  };

  // Find the peak cell for the caption below.
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
        <table className="border-separate border-spacing-1 mx-auto text-[10px]">
          <thead>
            <tr>
              <th className="w-10" />
              {DAY_LABELS_AR.map((d) => (
                <th
                  key={d.dow}
                  className="px-1 pb-1 font-fustat font-medium text-muted-foreground text-center"
                  scope="col"
                  title={d.full}
                >
                  {d.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h}>
                <th
                  scope="row"
                  className="pr-1 font-mono text-[9px] text-muted-foreground text-left whitespace-nowrap"
                >
                  {formatHour12(h)}
                </th>
                {DAY_LABELS_AR.map((d) => {
                  const count = byKey.get(`${d.dow}:${h}`) ?? 0;
                  return (
                    <td
                      key={`${d.dow}:${h}`}
                      className="w-7 h-5 rounded-[3px] cursor-default"
                      style={{ backgroundColor: colorFor(count) }}
                      title={`${d.full} · ${formatHour12(h)} — ${count.toLocaleString("ar-EG")} مرة تشغيل`}
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
              {DAY_LABELS_AR.find((d) => d.dow === peak.dow)?.full} ·{" "}
              {formatHour12(peak.hour)}
            </span>{" "}
            <span className="text-muted-foreground/70">
              ({peak.count.toLocaleString("ar-EG")} تشغيل)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
