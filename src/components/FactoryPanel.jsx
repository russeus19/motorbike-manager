import { useState } from "react";
import { Box, ChevronDown, ChevronUp, Timer } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { canStartFacilityUpgrade, ensureRD, factoryUpgradeSpec } from "../utils/bikeDevelopment.js";

/**
 * Fábrica: infraestructura general del equipo (I+D, banco de motores,
 * simuladores, túnel de viento, fabricación...) representada como un
 * único nivel — no se construyen edificios sueltos. Mejorarla aumenta
 * permanentemente la Capacidad Técnica compartida (ver
 * computeTechCapacity) y reduce el riesgo de los proyectos de Desarrollo
 * e Investigación (ver projectSpec).
 */
export function FactoryPanel({ playerTeam, budget, onStartUpgrade, accent, scale }) {
  const [expanded, setExpanded] = useState(false);
  const { factory } = ensureRD(playerTeam);
  const spec = factoryUpgradeSpec(playerTeam, scale);
  const canStart = !factory.upgrading && !!canStartFacilityUpgrade(playerTeam, "factory", budget, scale);

  return (
    <Panel
      title="Fábrica"
      icon={Box}
      accent={accent}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: COLORS.text }}>Nivel {factory.level}</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {expanded && (
        <>
          <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
            Infraestructura general del equipo. Cuanto más alto el nivel, más Capacidad Técnica, mejor calidad de fabricación y menos riesgo en los proyectos de Desarrollo e Investigación.
          </p>
          {factory.upgrading ? (
            <div className="rounded-md p-2.5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-1.5"><Timer size={13} style={{ color: accent }} /> Ampliación en marcha</span>
                <span className="font-mono text-xs" style={{ color: COLORS.muted }}>{factory.upgrading.remaining}/{factory.upgrading.totalGp} GP</span>
              </div>
              <div className="h-1.5 rounded-full w-full mb-1" style={{ background: COLORS.rule }}>
                <div className="h-1.5 rounded-full" style={{ width: `${((factory.upgrading.totalGp - factory.upgrading.remaining) / factory.upgrading.totalGp) * 100}%`, background: accent }} />
              </div>
              <div className="text-xs" style={{ color: COLORS.muted }}>Al terminar: +{factory.upgrading.gain} niveles</div>
            </div>
          ) : (
            <button disabled={!canStart} onClick={onStartUpgrade}
              className="w-full text-left text-xs px-3 py-2 rounded disabled:opacity-30 flex items-center justify-between gap-2"
              style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
              <span>Ampliar Fábrica (+{spec.gain} niveles)</span>
              <span className="font-mono" style={{ color: COLORS.muted }}>€{spec.money.toLocaleString()} · {spec.gp} GP</span>
            </button>
          )}
          {factory.level >= 99 && <p className="text-xs mt-2" style={{ color: COLORS.gold }}>Nivel máximo alcanzado.</p>}
        </>
      )}
    </Panel>
  );
}
