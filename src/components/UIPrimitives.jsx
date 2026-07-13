import { AlertTriangle, Mail } from "lucide-react";
import { ATTRS } from "../data/attributes.js";
import { COLORS } from "../data/colors.js";

// Maps buildPriorityAlerts' string iconKey to an actual icon component —
// keeps utils/priorityAlerts.js icon-agnostic, consistent with every
// other utils/*.js file in this project.
const PRIORITY_ALERT_ICONS = { warning: AlertTriangle, mail: Mail };

/**
 * The single shared visual for every priority alert on the "Inicio"
 * screen (utils/priorityAlerts.js) — same design, same animation, same
 * behavior for the warehouse stock warning, contract-expiring notices,
 * incoming-offer notices, and any future alert type. Only the icon and
 * text differ.
 */
export function PriorityAlertBanner({ iconKey, text, onClick }) {
  const Icon = PRIORITY_ALERT_ICONS[iconKey] || AlertTriangle;
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-md px-3 py-2.5 text-sm flex items-center gap-2"
      style={{ background: "rgba(227,164,39,0.12)", border: `1px solid ${COLORS.gold}`, color: COLORS.gold }}>
      <Icon size={16} className="flex-shrink-0" />
      {text}
    </button>
  );
}
/* One shared visual family for every "own rider" action button in the
   profile modal (renovar, despedir, designar libre al final de
   temporada, and any future one) — same height, width, radius, font,
   padding, hover/press animation and shadow; only the background color
   changes, so the color alone carries the meaning of the action
   (positive/destructive/planning) instead of a mix of borders, muted
   text and solid fills that used to make the three look unrelated. */
const RIDER_ACTION_TONES = {
  green: "#3F9142",
  red: COLORS.danger,
  blue: COLORS.ice,
};

export function RiderActionButton({ tone, onClick, disabled, className = "", children }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full mb-3 text-xs px-3 py-2 rounded font-semibold text-white shadow-sm transition duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:hover:brightness-100 disabled:active:scale-100 ${className}`}
      style={{ background: RIDER_ACTION_TONES[tone] }}>
      {children}
    </button>
  );
}

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

