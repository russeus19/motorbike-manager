import { useState } from "react";
import { ChevronDown, ChevronUp, Timer, Eye, Sparkles, X } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { sportingDirectorTierFor, ensureSportingDirector, sportingDirectorUpgradeSpecFor, canStartSportingDirectorUpgrade, rookieClassVisibleSlice } from "../utils/scouting.js";

const ROOKIE_CLASS_CATEGORIES = ["moto3", "worldwcr", "supersport", "sportbike"];

/**
 * Director Deportivo: decide cuántos ojeadores tienes a la vez, cuánto
 * tarda cada informe y cuánto se estrecha la horquilla de potencial.
 * Mismo patrón de nivel/mejora que Fábrica y Staff — sin retroceso,
 * ya que no tiene sentido "despedir" ojeadores.
 */
export function SportingDirectorPanel({ playerTeam, categoryKey, seasonNumber, freeAgents, budget, onStartUpgrade, onCancelScout, onOpenRiderProfileById, accent, scale }) {
  const [expanded, setExpanded] = useState(false);
  const sd = ensureSportingDirector(playerTeam);
  const tier = sportingDirectorTierFor(sd.level);
  const spec = sportingDirectorUpgradeSpecFor(playerTeam, scale);
  const canStart = !sd.upgrading && !!canStartSportingDirectorUpgrade(playerTeam, budget, scale);
  const missions = playerTeam.scoutingMissions || [];
  const scoutedEntries = Object.entries(playerTeam.scoutReports || {});

  return (
    <Panel
      title="Director Deportivo"
      icon={Eye}
      accent={accent}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: COLORS.text }}>{tier.name} · Nivel {sd.level}</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {expanded && (
        <>
          <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
            Decide cuántos ojeadores tienes a la vez ({tier.slots} ahora mismo), cuánto tarda cada informe ({tier.weeksPerReport} semanas) y con cuánta precisión conoces el potencial, la moral y los puntos fuertes/débiles de un piloto que aún no es tuyo.
          </p>

          {sd.upgrading ? (
            <div className="rounded-md p-2.5 mb-3" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-1.5"><Timer size={13} style={{ color: accent }} /> Ampliación en marcha</span>
                <span className="font-mono text-xs" style={{ color: COLORS.muted }}>{sd.upgrading.remaining}/{sd.upgrading.totalGp} GP</span>
              </div>
              <div className="h-1.5 rounded-full w-full mb-1" style={{ background: COLORS.rule }}>
                <div className="h-1.5 rounded-full" style={{ width: `${((sd.upgrading.totalGp - sd.upgrading.remaining) / sd.upgrading.totalGp) * 100}%`, background: accent }} />
              </div>
              <div className="text-xs" style={{ color: COLORS.muted }}>Al terminar: +{sd.upgrading.gain} niveles</div>
            </div>
          ) : (
            <button disabled={!canStart} onClick={onStartUpgrade}
              className="w-full text-left text-xs px-3 py-2 rounded disabled:opacity-30 flex items-center justify-between gap-2 mb-3"
              style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
              <span>Ampliar Director Deportivo (+{spec.gain} niveles)</span>
              <span className="font-mono" style={{ color: COLORS.muted }}>€{spec.money.toLocaleString()} · {spec.gp} GP</span>
            </button>
          )}
          {sd.level >= 99 && <p className="text-xs mb-3" style={{ color: COLORS.gold }}>Nivel máximo alcanzado.</p>}

          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>
            Ojeadores en misión ({missions.length}/{tier.slots})
          </div>
          {missions.length === 0 ? (
            <p className="text-xs mb-4" style={{ color: COLORS.muted }}>Ninguno en marcha. Envía un ojeador desde la ficha de cualquier piloto que aún no conozcas del todo.</p>
          ) : (
            <div className="space-y-1.5 mb-4">
              {missions.map((m) => (
                <div key={m.riderId} className="flex items-center justify-between text-xs px-3 py-2 rounded" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
                  <button className="text-left hover:underline" style={{ color: COLORS.text }} onClick={() => onOpenRiderProfileById(m.riderId, m.categoryKey)}>
                    {m.riderName || "Piloto"}
                  </button>
                  <span className="flex items-center gap-2">
                    <span className="font-mono" style={{ color: COLORS.muted }}>{m.weeksRemaining}/{m.totalWeeks} sem.</span>
                    <button onClick={() => onCancelScout(m.riderId)} title="Cancelar ojeo">
                      <X size={13} style={{ color: COLORS.danger }} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {ROOKIE_CLASS_CATEGORIES.includes(categoryKey) && (() => {
            const visibles = rookieClassVisibleSlice(freeAgents, categoryKey, seasonNumber, sd.level);
            return (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
                  <Sparkles size={12} /> Nueva hornada de rookies ({visibles.length}/5 detectados)
                </div>
                {visibles.length === 0 ? (
                  <p className="text-xs mb-1" style={{ color: COLORS.muted }}>Con este nivel de Director Deportivo todavía no detectáis a ningún debutante de la nueva hornada.</p>
                ) : (
                  <div className="space-y-1.5">
                    {visibles.map(({ rider, ca, potentialRange }) => (
                      <div key={rider.id} className="flex items-center justify-between text-xs px-3 py-2 rounded" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
                        <button className="text-left hover:underline" style={{ color: COLORS.text }} onClick={() => onOpenRiderProfileById(rider.id, categoryKey)}>
                          {rider.name}
                        </button>
                        <span className="font-mono" style={{ color: COLORS.muted }}>CA {ca} · PA {potentialRange[0]}–{potentialRange[1]}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs mt-1.5" style={{ color: COLORS.muted }}>Libres para fichar por cualquier equipo de cara a la próxima temporada. Si nadie los ficha, pasarán a agentes libres normales.</p>
              </div>
            );
          })()}

          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>
            Pilotos ojeados ({scoutedEntries.length})
          </div>
          {scoutedEntries.length === 0 ? (
            <p className="text-xs" style={{ color: COLORS.muted }}>Todavía no has completado ningún informe.</p>
          ) : (
            <div className="space-y-1.5">
              {scoutedEntries.map(([riderId, report]) => (
                <div key={riderId} className="text-xs px-3 py-2 rounded" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <button className="text-left font-semibold hover:underline" style={{ color: COLORS.text }} onClick={() => onOpenRiderProfileById(riderId, report.categoryKey)}>
                      {report.riderName || "Piloto"}
                    </button>
                    <span className="font-mono" style={{ color: COLORS.muted }}>PA {report.potentialRange[0]}–{report.potentialRange[1]}</span>
                  </div>
                  <div style={{ color: COLORS.muted }}>Moral: {report.moraleValue != null ? report.moraleValue : "? (informe caducado)"}</div>
                  <ul className="mt-1 space-y-0.5" style={{ color: COLORS.muted }}>
                    {report.assessment.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
