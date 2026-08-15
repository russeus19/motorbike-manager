import { ATTRS } from "../data/attributes.js";
import { COLORS } from "../data/colors.js";

/** A single hexagon ring at the given radius, as an SVG points string —
 * used both for the faint background reference rings and, scaled by
 * each attribute's own value/100, for the actual filled data shape. */
function hexPoints(cx, cy, radius) {
  return ATTRS.map((_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3; // start at top, 60° apart
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
}

/**
 * A hexagonal radar/spider chart for a rider's 6 core attributes —
 * Técnica at the top, then Ritmo, Adelantamientos, Mental,
 * Adaptabilidad and Físico going clockwise (the same order data/
 * attributes.js already defines them in), each labeled with its own
 * value right next to its point on the chart, same as the reference
 * layout. Pure SVG, no charting library needed for something this
 * self-contained.
 */
export function RiderRadarChart({ rider, accent, size = 150 }) {
  const cx = size / 2, cy = size / 2;
  const maxRadius = size * 0.32; // leaves room for the value labels outside the hexagon
  const rings = [1, 0.66, 0.33].map((f) => hexPoints(cx, cy, maxRadius * f).map((p) => p.join(",")).join(" "));
  const dataPoints = ATTRS.map((a, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    const r = maxRadius * (clamp01((rider[a.key] ?? 0) / 100));
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  const dataPolygon = dataPoints.map((p) => p.join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
      {rings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke={COLORS.rule} strokeWidth="1" />
      ))}
      {ATTRS.map((_, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI) / 3;
        return <line key={i} x1={cx} y1={cy} x2={cx + maxRadius * Math.cos(angle)} y2={cy + maxRadius * Math.sin(angle)} stroke={COLORS.rule} strokeWidth="1" />;
      })}
      <polygon points={dataPolygon} fill={`${accent}33`} stroke={accent} strokeWidth="2" />
      {dataPoints.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={accent} />)}
      {ATTRS.map((a, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI) / 3;
        const labelRadius = maxRadius * 1.42;
        const x = cx + labelRadius * Math.cos(angle);
        const y = cy + labelRadius * Math.sin(angle);
        const anchor = Math.abs(Math.cos(angle)) < 0.15 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
        return (
          <g key={a.key}>
            <text x={x} y={y - 6} textAnchor={anchor} fontSize="9" fill={COLORS.muted} style={{ letterSpacing: "0.05em" }}>{a.label.slice(0, 4).toUpperCase()}</text>
            <text x={x} y={y + 8} textAnchor={anchor} fontSize="14" fontWeight="700" fill={COLORS.text} fontFamily="Rajdhani, sans-serif">{Math.round(rider[a.key] ?? 0)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
