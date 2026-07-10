import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { Panel, StatBar } from "./UIPrimitives.jsx";
import { ATTRS } from "../data/attributes.js";
import { BIKE_AREA_KEYS, BIKE_LABELS } from "../data/bikeAreas.js";
import { CIRCUITS, CIRCUIT_PROFILES } from "../data/circuits.js";
import { COLORS } from "../data/colors.js";

export function CircuitInfoPanel({ circuitProfile, accent }) {
  const [expanded, setExpanded] = useState(false);
  const c = circuitProfile;
  return (
    <Panel
      title="Circuito"
      icon={MapPin}
      accent={accent}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          <span className="text-xs">{c.flag} {c.country}</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {!expanded && (
        <div className="flex items-center justify-between text-xs" style={{ color: COLORS.muted }}>
          <span>{c.lengthKm} km · {c.cornersLeft + c.cornersRight} curvas · {c.direction}</span>
          <span>☀️ {c.dryPct}% · 🌧️ {c.wetPct}%</span>
        </div>
      )}
      {expanded && (
        <div>
          <p className="text-sm mb-2">{c.blurb}</p>
          <p className="text-xs mb-3" style={{ color: COLORS.muted }}>{c.style}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3" style={{ color: COLORS.muted }}>
            <div>Año: <span style={{ color: COLORS.text }}>{c.built}</span></div>
            <div>Longitud: <span style={{ color: COLORS.text }}>{c.lengthKm} km</span></div>
            <div>Curvas izq/der: <span style={{ color: COLORS.text }}>{c.cornersLeft} / {c.cornersRight}</span></div>
            <div>Recta principal: <span style={{ color: COLORS.text }}>{c.mainStraightM} m</span></div>
            <div>Sentido: <span style={{ color: COLORS.text }}>{c.direction}</span></div>
            <div>Clima: <span style={{ color: COLORS.text }}>☀️ {c.dryPct}% · 🌧️ {c.wetPct}%</span></div>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {c.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.muted }}>{tag}</span>
            ))}
          </div>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>Exigencia técnica</div>
          {BIKE_AREA_KEYS.map((k) => (
            <StatBar key={k} label={BIKE_LABELS[k]} value={c.tech[k]} accent={accent} />
          ))}
          <div className="text-xs uppercase tracking-wider mb-1 mt-2" style={{ color: COLORS.muted }}>Exigencia al piloto</div>
          {ATTRS.map((a) => (
            <StatBar key={a.key} label={a.label} value={c.riderWeight[a.key]} accent={accent} />
          ))}
        </div>
      )}
    </Panel>
  );
}


export function CalendarPanel({ round, accent }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Panel title="Calendario" icon={MapPin} accent={accent} onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}>
      {expanded && (
        <div className="space-y-1" style={{ maxHeight: 384, overflowY: "auto" }}>
          {CIRCUITS.map((c, i) => {
            const prof = CIRCUIT_PROFILES[i];
            const status = i < round ? "Disputada" : i === round ? "Próxima" : "Pendiente";
            const statusColor = i === round ? accent : COLORS.muted;
            return (
              <div key={i} className="flex items-center justify-between text-sm py-1.5" style={{ borderBottom: `1px solid ${COLORS.rule}`, opacity: i < round ? 0.5 : 1 }}>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-6 text-right font-mono text-xs flex-shrink-0" style={{ color: COLORS.muted }}>{i + 1}</span>
                  <span className="flex-shrink-0">{prof.flag}</span>
                  <span className="truncate">{c.split("—")[0].replace("Gran Premio de ", "").trim()}</span>
                </span>
                <span className="text-xs font-semibold flex-shrink-0 ml-2" style={{ color: statusColor }}>{status}</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

