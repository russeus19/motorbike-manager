import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, Flag, PackageCheck, Zap } from "lucide-react";
import { BIKE_LABELS } from "../data/bikeAreas.js";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { TeamNumberBadge } from "../components/TeamNumberBadge.jsx";

export function ResultScreen({ lastResult, accent, continueAfterResult, isLastRound, category, sprintMode = false, sessionLabel = null }) {
  const { circuitName, isWet, results, arrivals, classificationByCategory } = lastResult;
  const [tab, setTab] = useState(category);
  const tabClassification = classificationByCategory?.[tab] || results[tab] || [];
  const lapsForTab = tabClassification[0]?.laps;
  const injured = tabClassification.filter((r) => r.injuryResult);

  // sessionLabel covers WorldSBK's Race 1 / Superpole Race specifically;
  // sprintMode still covers MotoGP's Sprint exactly as before.
  const sessionTitle = sessionLabel === "race1" ? "Race 1" : sessionLabel === "superpole" ? "Superpole Race" : sprintMode ? "Sprint" : "Resultado";
  const sessionWord = sessionLabel === "race1" ? "la Race 1" : sessionLabel === "superpole" ? "la Superpole Race" : sprintMode ? "el Sprint" : "la carrera";
  const defaultContinueLabel = sessionLabel === "race1" ? "Continuar a la Superpole Race"
    : sessionLabel === "superpole" ? "Continuar a la Race 2"
    : sprintMode ? "Continuar a la carrera"
    : (isLastRound ? "Ver resultado final de temporada" : "Continuar");

  // This screen used to inherit whatever scroll position the previous
  // screen was left at, so it could open showing the bottom of the
  // classification instead of the winner. It always mounts fresh (this
  // is a new "result" phase render, never a reused instance), so a
  // single scroll-to-top on mount is enough — and switching category
  // tabs below should behave the same way, never carrying over scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="text-xs uppercase tracking-[0.2em] mb-1" style={{ color: COLORS.muted }}>{sessionTitle}</div>
      <h2 className="text-2xl font-bold mb-1 flex items-center gap-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>
        <Flag size={22} style={{ color: accent }} /> {circuitName}
      </h2>
      <div className="text-xs mb-4 flex items-center gap-3" style={{ color: isWet ? COLORS.ice : COLORS.muted }}>
        <span>{isWet ? "🌧️" : "☀️"} {sessionTitle} en {isWet ? "mojado" : "seco"}</span>
        {lapsForTab && <span style={{ color: COLORS.muted }}>· {lapsForTab} vueltas</span>}
      </div>

      {arrivals && arrivals.length > 0 && (
        <div className="mb-4 space-y-2">
          {arrivals.map((a, i) => {
            if (a.pending) return null;
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

      <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
        <div className="flex gap-2">
          {!sprintMode && !sessionLabel && CATEGORY_ORDER.map((ck) => (
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
        <button onClick={continueAfterResult}
          className="py-2.5 px-5 rounded-md font-bold flex items-center justify-center gap-2 disabled:opacity-40 flex-shrink-0"
          style={{ background: accent, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
          {defaultContinueLabel} <ChevronRight size={18} />
        </button>
      </div>

      {injured.length > 0 && (
        <div className="mb-4 space-y-2">
          {injured.map((r) => (
            <div key={r.id} className="rounded-md px-3 py-2 text-sm flex items-center gap-2"
              style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}` }}>
              <AlertTriangle size={16} style={{ color: COLORS.danger }} />
              <span>
                <strong>{r.name}</strong> ({r.teamName}) se cae en {sessionWord} — {r.injuryResult.name.toLowerCase()} (lesión {r.injuryResult.severityLabel}).
                {(sprintMode || sessionLabel === "race1" || sessionLabel === "superpole") ? ` No podrá disputar ${sessionLabel === "race1" ? "la Superpole Race" : sessionLabel === "superpole" ? "la Race 2" : "la carrera"}.` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: COLORS.rule }}>
        {tabClassification.map((r, i) => (
          <div key={r.id} className="flex items-start justify-between px-4 py-2.5 text-sm"
            style={{ background: i % 2 === 0 ? COLORS.panel : COLORS.panel2, borderBottom: `1px solid ${COLORS.rule}` }}>
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-6 text-right font-mono flex-shrink-0 pt-0.5" style={{ color: i < 3 ? COLORS.gold : COLORS.muted }}>{r.crashed ? "—" : r.position}</span>
              <TeamNumberBadge color={r.teamColor} number={r.number} riderId={r.photoId ?? r.id} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate" style={{ fontWeight: r.teamId === "player" ? 700 : 400 }}>{r.name}</span>
                  {r.crashed && <AlertTriangle size={13} style={{ color: COLORS.danger }} className="flex-shrink-0" />}
                  {r.isFastestLap && <Zap size={13} style={{ color: COLORS.gold }} className="flex-shrink-0" />}
                </div>
                <div className="text-xs truncate" style={{ color: COLORS.muted }}>{r.teamName}</div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-mono" style={{ color: r.points > 0 ? accent : COLORS.muted }}>{r.crashed ? "DNF" : `+${r.points}`}</div>
              <div className="font-mono text-xs" style={{ color: COLORS.muted }}>{r.timeDisplay}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Season End Screen                                                      */
/* ---------------------------------------------------------------------- */

