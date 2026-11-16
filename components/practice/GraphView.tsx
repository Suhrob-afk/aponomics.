import { useId } from "react";
import type { GraphSpec, GraphTone } from "@/lib/practice/graph";

const W = 480;
const H = 340;
const M = { top: 28, right: 64, bottom: 44, left: 52 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

const TONES: Record<GraphTone, string> = {
  primary: "#0F5C4A",
  secondary: "#9A5B13",
  neutral: "#5F5A4E",
};

const FONT = "var(--font-sans), ui-sans-serif, system-ui, sans-serif";

/** Catmull-Rom spline through the points, as cubic Bézier segments. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 3) return linePath(pts);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function linePath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function GraphView({ spec, alt }: { spec: GraphSpec; alt: string }) {
  const descId = useId();
  const sx = (x: number) => M.left + (x / spec.xAxis.max) * PLOT_W;
  const sy = (y: number) => M.top + PLOT_H - (y / spec.yAxis.max) * PLOT_H;
  const toScreen = (pts: [number, number][]) => pts.map(([x, y]) => [sx(x), sy(y)] as [number, number]);
  const x0 = sx(0);
  const y0 = sy(0);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Graph"
        aria-describedby={descId}
        className="w-full h-auto max-w-[520px] mx-auto block select-none"
        style={{ fontFamily: FONT }}
      >
        {/* Shaded regions first so curves draw on top. */}
        {spec.regions?.map((r, i) => {
          const pts = toScreen(r.points);
          const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          return (
            <g key={`r${i}`}>
              <polygon points={pts.map((p) => p.join(",")).join(" ")} fill="#0F5C4A" fillOpacity={0.12} />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={600} fill="#1A1A1A">
                {r.label}
              </text>
            </g>
          );
        })}

        {/* Guide lines from labelled points to the axes. */}
        {spec.points
          ?.filter((p) => p.guides)
          .map((p, i) => (
            <path
              key={`g${i}`}
              d={`M${x0},${sy(p.y)} L${sx(p.x)},${sy(p.y)} L${sx(p.x)},${y0}`}
              fill="none"
              stroke="#8A8475"
              strokeWidth={1.25}
              strokeDasharray="4 4"
            />
          ))}

        {/* Axes */}
        <path d={`M${x0},${M.top - 8} L${x0},${y0} L${M.left + PLOT_W + 8},${y0}`} fill="none" stroke="#1A1A1A" strokeWidth={1.5} />
        <text x={x0 - 6} y={M.top - 14} fontSize={13} fill="#1A1A1A">
          {spec.yAxis.label}
        </text>
        <text x={M.left + PLOT_W + 8} y={y0 + 30} fontSize={13} textAnchor="end" fill="#1A1A1A">
          {spec.xAxis.label}
        </text>
        <text x={x0 - 8} y={y0 + 16} fontSize={12} textAnchor="end" fill="#5F5A4E">
          0
        </text>

        {spec.xAxis.ticks?.map((t, i) => (
          <g key={`xt${i}`}>
            <line x1={sx(t.value)} x2={sx(t.value)} y1={y0} y2={y0 + 5} stroke="#1A1A1A" strokeWidth={1.25} />
            <text x={sx(t.value)} y={y0 + 18} fontSize={12} textAnchor="middle" fill="#1A1A1A">
              {t.label}
            </text>
          </g>
        ))}
        {spec.yAxis.ticks?.map((t, i) => (
          <g key={`yt${i}`}>
            <line x1={x0 - 5} x2={x0} y1={sy(t.value)} y2={sy(t.value)} stroke="#1A1A1A" strokeWidth={1.25} />
            <text x={x0 - 8} y={sy(t.value)} fontSize={12} textAnchor="end" dominantBaseline="central" fill="#1A1A1A">
              {t.label}
            </text>
          </g>
        ))}

        {/* Curves */}
        {spec.curves.map((c, i) => {
          const pts = toScreen(c.points);
          const color = TONES[c.tone ?? "primary"];
          const last = pts[pts.length - 1];
          const prev = pts[pts.length - 2];
          // Nudge the label along the curve's final direction so it clears the line end.
          const dx = last[0] - prev[0];
          const dy = last[1] - prev[1];
          const len = Math.hypot(dx, dy) || 1;
          const lx = clamp(last[0] + (dx / len) * 10 + 4, 4, W - 4);
          const ly = clamp(last[1] + (dy / len) * 10, 12, H - 4);
          return (
            <g key={`c${i}`}>
              <path
                d={c.smooth ? smoothPath(pts) : linePath(pts)}
                fill="none"
                stroke={color}
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={c.dashed ? "7 5" : undefined}
              />
              <text x={lx} y={ly} fontSize={13} fontWeight={600} fill={color} dominantBaseline="central">
                {c.label}
              </text>
            </g>
          );
        })}

        {/* Points */}
        {spec.points?.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill="#1A1A1A" />
            {p.label && (
              <text x={sx(p.x) + 7} y={sy(p.y) - 9} fontSize={13} fontWeight={600} fill="#1A1A1A">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <figcaption id={descId} className="sr-only">
        {alt}
      </figcaption>
    </figure>
  );
}
