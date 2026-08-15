import { COLORS } from "../data/colors.js";

/**
 * A small circular progress ring — used for anything that counts down
 * or fills up over a known total (a scouting mission's remaining
 * weeks, an upgrade in progress...). Pure SVG, same reasoning as
 * RiderRadarChart: self-contained enough not to need a charting
 * library for it.
 */
export function ProgressRing({ progress, size = 56, strokeWidth = 5, accent, children }) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.rule} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
