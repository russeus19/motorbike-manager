import { useState } from "react";
import { AlertTriangle, ChevronRight, Flag, PackageCheck } from "lucide-react";
import { BIKE_LABELS } from "../data/bikeAreas.js";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";

export function ResultScreen({ lastResult, accent, continueAfterResult, isLastRound, category }) {
  const { circuitName, isWet, results, arrivals } = lastResult;
  const [tab, setTab] = useState(category);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="text-xs uppercase tracking-[0.2em] mb-1" style={{ color: COLORS.muted }}>Resultado</div>
      <h2 className="text-2xl font-bold mb-1 flex items-center gap-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>
        <Flag size={22} style={{ color: accent }} /> {circuitName}
      </h2>
      <div className="text-xs mb-4" style={{ color: isWet ? COLORS.ice : COLORS.muted }}>
        {isWet ? "🌧️ Carrera en mojado" : "☀️ Carrera en seco"}
      </div>

      {arrivals && arrivals.length > 0 && (
        <div className="mb-4 space-y-2">
          {arrivals.map((a, i) => {
            const kindLabel = a.kind === "research" ? "Investigación" : "Desarrollo";
            const ok = a.success;
            return (
              <div key={i} className="rounded-md px-3 py-2 text-sm flex items-center gap-2"
                style={{ background: ok ? "rgba(227,164,39,0.12)" : "rgba(214,69,69,0.12)", border: `1px solid ${ok ? COLORS.gold : COLORS.danger}` }}>
                {ok ? <PackageCheck size={16} style={{ color: COLORS.gold }} /> : <AlertTriangle size={16} style={{ color: COLORS.danger }} />}
                {ok ? (
                  <span>{kindLabel} de <strong>{BIKE_LABELS[a.area]}</strong> completado con éxito: +{a.gain}</span>
                ) : (
                  <span>{kindLabel} de <strong>{BIKE_LABELS[a.area]}</strong> ha fracasado parcialmente: solo +{a.gain}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 mb-3">
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

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: COLORS.rule }}>
        {(results[tab] || []).map((r, i) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-2 text-sm"
            style={{ background: i % 2 === 0 ? COLORS.panel : COLORS.panel2, borderBottom: `1px solid ${COLORS.rule}` }}>
            <div className="flex items-center gap-3">
              <span className="w-6 text-right font-mono" style={{ color: i < 3 ? COLORS.gold : COLORS.muted }}>{r.crashed ? "—" : r.position}</span>
              <span className="w-2 h-2 rounded-full" style={{ background: r.teamColor }} />
              <span style={{ fontWeight: r.teamId === "player" ? 700 : 400 }}>{r.name}</span>
              <span className="text-xs" style={{ color: COLORS.muted }}>{r.teamName}</span>
              {r.crashed && <AlertTriangle size={13} style={{ color: COLORS.danger }} />}
            </div>
            <span className="font-mono" style={{ color: r.points > 0 ? accent : COLORS.muted }}>{r.crashed ? "DNF" : `+${r.points}`}</span>
          </div>
        ))}
      </div>

      <button onClick={continueAfterResult}
        className="w-full mt-6 py-3 rounded-md font-semibold flex items-center justify-center gap-2"
        style={{ background: accent, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
        {isLastRound ? "Ver resultado final de temporada" : "Continuar"} <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Season End Screen                                                      */
/* ---------------------------------------------------------------------- */

