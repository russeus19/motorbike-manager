import { ATTRS } from "../data/attributes.js";
import { COLORS } from "../data/colors.js";

export function StatBar({ label, value, accent }) {
  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-xs mb-0.5" style={{ color: COLORS.muted }}>
        <span>{label}</span>
        <span className="font-mono" style={{ color: COLORS.text }}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full w-full" style={{ background: COLORS.rule }}>
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${value}%`, background: accent }} />
      </div>
    </div>
  );
}


export function AttrGrid({ rider, accent }) {
  return (
    <div>
      {ATTRS.map((a) => (
        <StatBar key={a.key} label={a.label} value={rider[a.key]} accent={accent} />
      ))}
    </div>
  );
}


export function Panel({ title, icon: Icon, accent, children, className = "", onHeaderClick, headerRight }) {
  return (
    <div className={`rounded-lg border p-4 ${className}`} style={{ background: COLORS.panel, borderColor: COLORS.rule }}>
      <div className={`flex items-center justify-between mb-3 ${onHeaderClick ? "cursor-pointer select-none" : ""}`} onClick={onHeaderClick}>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} style={{ color: accent }} />}
          <h3 className="text-xs tracking-widest uppercase font-semibold" style={{ color: COLORS.muted, fontFamily: "Rajdhani, sans-serif" }}>{title}</h3>
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}


export function CheckerStrip({ accent, solid = false }) {
  return (
    <div className="h-1.5 w-full" style={solid
      ? { background: accent }
      : { backgroundImage: `repeating-linear-gradient(90deg, ${accent} 0 10px, transparent 10px 20px)`, opacity: 0.55 }} />
  );
}


export function OverallBadge({ value, accent }) {
  return (
    <span className="inline-flex items-center justify-center rounded font-mono text-xs font-bold px-1.5 py-0.5"
      style={{ background: accent, color: "#12151A", minWidth: 28 }}>
      {value}
    </span>
  );
}


export function RiderNameButton({ rider, accent, onClick, className = "" }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`text-left hover:opacity-80 cursor-pointer ${className}`}
      style={{ color: "inherit" }}>
      {rider.name}
    </button>
  );
}

