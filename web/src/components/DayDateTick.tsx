/**
 * Two-line X-axis tick for date-based charts: Arabic short weekday on
 * top, Western numeric date below. Designed for Recharts XAxis via the
 * `tick={<DayDateTick />}` prop.
 *
 * Recharts injects `x`, `y`, and `payload` at render time. The optional
 * `interval`/density handling is left to the host XAxis.
 */

interface TickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

/** Short Arabic weekday: ح / ن / ث / ر / خ / ج / س-style three-char
 *  letters via `weekday: "short"` (Intl's Arabic locale renders these
 *  as "أحد", "إثنين", "ثلاث", "أربع", "خميس", "جمعة", "سبت"). Falls
 *  back to "narrow" on environments that disagree. */
function arWeekdayShort(d: Date): string {
  try {
    return d.toLocaleDateString("ar", { weekday: "short" });
  } catch {
    return d.toLocaleDateString("ar", { weekday: "narrow" });
  }
}

export function DayDateTick({ x = 0, y = 0, payload }: TickProps) {
  if (!payload?.value) return null;
  const d = new Date(payload.value);
  if (Number.isNaN(d.getTime())) return null;

  const dayName = arWeekdayShort(d);
  const datePart = d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        style={{
          fontSize: 10,
          fontFamily: "Fustat",
          fill: "hsl(var(--foreground))",
          fontWeight: 600,
        }}
      >
        {dayName}
      </text>
      <text
        x={0}
        y={0}
        dy={26}
        textAnchor="middle"
        style={{
          fontSize: 9,
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fill: "hsl(var(--muted-foreground))",
        }}
      >
        {datePart}
      </text>
    </g>
  );
}
