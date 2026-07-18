import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, Timer } from "lucide-react";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { TeamNumberBadge } from "../components/TeamNumberBadge.jsx";

export function QualifyingScreen({ pendingQualifying, accent, category, onContinue }) {
  const { circuitName, isWet, resultByCategory } = pendingQualifying;
  const [tab, setTab] = useState(category);
  const continueLabel = category === "motogp" ? "Continuar al Sprint" : category === "superbikes" ? "Continuar a la Race 1" : "Continuar a la carrera";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const rows = resultByCategory[tab] || [];
  const injured = rows.filter((r) => r.injuryResult);
  const qualifyingLabel = category === "superbikes" ? "Superpole" : "Clasificación";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="text-xs uppercase tracking-[0.2em] mb-1" style={{ color: COLORS.muted }}>{qualifyingLabel}</div>
      <h2 className="text-2xl font-bold mb-1 flex items-center gap-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>
        <Timer size={22} style={{ color: accent }} /> {circuitName}
      </h2>
      <div className="text-xs mb-4" style={{ color: isWet ? COLORS.ice : COLORS.muted }}>
        {isWet ? `🌧️ ${qualifyingLabel} en mojado` : `☀️ ${qualifyingLabel} en seco`}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
        <div className="flex gap-2">
          {CATEGORY_ORDER.map((ck) => (
            <button key={ck} onClick={() => setTab(ck)}
              className="text-xs px-3 py-1.5 rounded font-semibold"
              style={{
                background: tab === ck ? accent : COLORS.panel2,
                color: tab === ck ? "#12151A" : COLORS.muted,
                border: `1px solid ${tab === ck ? accent : COLORS.rule}`,
                fontFamily: "Rajdhani, sans-serif",
              }}>
              {CATEGORY_DATA[ck].label}{ck === category ? " (tuya)" : ""}
            </button>
          ))}
        </div>
        <button onClick={onContinue}
          className="py-2.5 px-5 rounded-md font-bold flex items-center justify-center gap-2 flex-shrink-0"
          style={{ background: accent, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
          {continueLabel} <ChevronRight size={18} />
        </button>
      </div>

      {injured.length > 0 && (
        <div className="mb-4 space-y-2">
          {injured.map((r) => (
            <div key={r.id} className="rounded-md px-3 py-2 text-sm flex items-center gap-2"
              style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}` }}>
              <AlertTriangle size={16} style={{ color: COLORS.danger }} />
              <span>
                <strong>{r.name}</strong> ({r.teamName}) se cae en {qualifyingLabel.toLowerCase()} — {r.injuryResult.name.toLowerCase()} (lesión {r.injuryResult.severityLabel}). No podrá disputar {category === "superbikes" ? "la Race 1" : "la carrera"}.
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: COLORS.rule }}>
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-start justify-between px-4 py-2.5 text-sm"
            style={{ background: i % 2 === 0 ? COLORS.panel : COLORS.panel2, borderBottom: `1px solid ${COLORS.rule}` }}>
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-6 text-right font-mono flex-shrink-0 pt-0.5" style={{ color: i < 3 && !r.crashed ? COLORS.gold : COLORS.muted }}>{r.gridPosition}</span>
              <TeamNumberBadge color={r.teamColor} number={r.number} riderId={r.photoId ?? r.id} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate" style={{ fontWeight: r.teamId === "player" ? 700 : 400 }}>{r.name}</span>
                  {r.crashed && <AlertTriangle size={13} style={{ color: COLORS.danger }} className="flex-shrink-0" />}
                </div>
                <div className="text-xs truncate" style={{ color: COLORS.muted }}>{r.teamName}</div>
              </div>
            </div>
            <span className="font-mono text-xs flex-shrink-0 pt-0.5" style={{ color: r.crashed ? COLORS.danger : (i === 0 ? accent : COLORS.muted) }}>
              {r.qualyTimeDisplay}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
