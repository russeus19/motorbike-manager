import { useState } from "react";
import { ChevronDown, ChevronUp, Timer, Users } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { canStartFacilityUpgrade, ensureRD, staffDowngradeSpec, staffUpgradeSpec } from "../utils/bikeDevelopment.js";

/**
 * Staff: director técnico, ingenieros, mecánicos y personal de
 * desarrollo, representados como un único nivel — no se gestionan
 * empleados individuales. Mejorarlo reduce el tiempo y el riesgo de los
 * proyectos de Desarrollo e Investigación y mejora ligeramente su
 * eficacia final (ver projectSpec), además de aportar Capacidad Técnica.
 */
export function StaffPanel({ playerTeam, budget, onStartUpgrade, onStartDowngrade, accent, scale }) {
  const [expanded, setExpanded] = useState(false);
  const { staff } = ensureRD(playerTeam);
  const spec = staffUpgradeSpec(playerTeam, scale);
  const downSpec = staffDowngradeSpec(playerTeam, scale);
  const canStart = !staff.upgrading && !!canStartFacilityUpgrade(playerTeam, "staff", budget, scale);
  const canDowngrade = !staff.upgrading && !!downSpec;

  return (
    <Panel
      title="Staff"
      icon={Users}
      accent={accent}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: COLORS.text }}>Nivel {staff.level}</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {expanded && (
        <>
          <p className="text-xs mb-3" style={{ color: COLORS.muted }}>
            Personal técnico del equipo. Un Staff mejor acelera los proyectos de Desarrollo e Investigación, reduce su riesgo y mejora ligeramente su resultado final.
          </p>
          {staff.upgrading ? (
            <div className="rounded-md p-2.5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-1.5"><Timer size={13} style={{ color: accent }} /> Contratación/formación en marcha</span>
                <span className="font-mono text-xs" style={{ color: COLORS.muted }}>{staff.upgrading.remaining}/{staff.upgrading.totalGp} GP</span>
              </div>
              <div className="h-1.5 rounded-full w-full mb-1" style={{ background: COLORS.rule }}>
                <div className="h-1.5 rounded-full" style={{ width: `${((staff.upgrading.totalGp - staff.upgrading.remaining) / staff.upgrading.totalGp) * 100}%`, background: accent }} />
              </div>
              <div className="text-xs" style={{ color: COLORS.muted }}>Al terminar: +{staff.upgrading.gain} niveles</div>
            </div>
          ) : (
            <div className="space-y-2">
              <button disabled={!canStart} onClick={onStartUpgrade}
                className="w-full text-left text-xs px-3 py-2 rounded disabled:opacity-30 flex items-center justify-between gap-2"
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
                <span>Mejorar Staff (+{spec.gain} niveles)</span>
                <span className="font-mono" style={{ color: COLORS.muted }}>€{spec.money.toLocaleString()} · {spec.gp} GP</span>
              </button>
              {downSpec && (
                <button disabled={!canDowngrade} onClick={onStartDowngrade}
                  className="w-full text-left text-xs px-3 py-2 rounded disabled:opacity-30 flex items-center justify-between gap-2"
                  style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
                  <span>Reducir Staff (-{downSpec.step} niveles)</span>
                  <span className="font-mono" style={{ color: COLORS.gold }}>+€{downSpec.refund.toLocaleString()}</span>
                </button>
              )}
            </div>
          )}
          {staff.level >= 99 && <p className="text-xs mt-2" style={{ color: COLORS.gold }}>Nivel máximo alcanzado.</p>}
        </>
      )}
    </Panel>
  );
}
