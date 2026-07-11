import { AlertTriangle, X } from "lucide-react";
import { StatBar } from "./UIPrimitives.jsx";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { TeamLogo } from "./TeamLogo.jsx";
import { BIKE_AREA_KEYS, BIKE_LABELS } from "../data/bikeAreas.js";
import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { WAREHOUSE_LABELS, WAREHOUSE_PARTS } from "../data/warehouseParts.js";
import { bikeAvg, ensureRD } from "../utils/bikeDevelopment.js";
import { overallRating } from "../utils/riders.js";

/**
 * Team profile — same shell/behavior as RiderProfileModal (fixed header,
 * scrollable body, click-outside/X to close), reusing StatBar, RiderPhoto,
 * CountryFlag, RiderNameButton and TeamLogo instead of duplicating any of
 * that rendering logic.
 */
export function TeamProfileModal({ target, onClose, onOpenRiderProfile }) {
  if (!target) return null;
  const { team, categoryKey } = target;
  const accent = team.color || COLORS.gold;
  const devAvg = Math.round(bikeAvg(team.bike));
  const { factory, staff } = ensureRD(team);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border" style={{ background: COLORS.panel, borderColor: COLORS.rule, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <TeamLogo team={team} size={72} className="rounded-xl" />
            <div className="min-w-0">
              <h3 className="text-2xl font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif" }}>{team.name}</h3>
              <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{CATEGORY_DATA[categoryKey]?.label} · {team.tier}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full flex-shrink-0" style={{ background: COLORS.panel2, color: COLORS.muted }}><X size={18} /></button>
        </div>

        <div className="p-5 pt-4" style={{ overflowY: "auto" }}>
          {team.expectation && (
            <div className="text-xs mb-3 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
              Expectativa temporada: <span className="font-mono font-bold" style={{ color: accent }}>{team.expectation.label}</span>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 mb-4 text-xs" style={{ color: COLORS.muted }}>
            <div className="rounded-md p-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="uppercase">Presupuesto</div>
              <div className="font-mono text-sm" style={{ color: (team.budget || 0) < 0 ? COLORS.danger : COLORS.text }}>€{Math.round(team.budget || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-md p-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="uppercase">Desarrollo medio</div>
              <div className="font-mono text-sm" style={{ color: COLORS.text }}>{devAvg}</div>
            </div>
            <div className="rounded-md p-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="uppercase">Fábrica</div>
              <div className="font-mono text-sm" style={{ color: COLORS.text }}>Nivel {factory.level}</div>
            </div>
            <div className="rounded-md p-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="uppercase">Staff</div>
              <div className="font-mono text-sm" style={{ color: COLORS.text }}>Nivel {staff.level}</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Desarrollo de la moto</div>
            {BIKE_AREA_KEYS.map((k) => (
              <StatBar key={k} label={BIKE_LABELS[k]} value={team.bike[k]} accent={accent} />
            ))}
          </div>

          {team.warehouse && (
            <div className="mb-4">
              <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Almacén</div>
              <div className="grid grid-cols-4 gap-2">
                {WAREHOUSE_PARTS.map((part) => {
                  const stock = team.warehouse[part]?.stock ?? 0;
                  const stockColor = stock <= 1 ? COLORS.danger : stock <= 2 ? COLORS.gold : "#3F9142";
                  return (
                    <div key={part} className="rounded-md p-2 text-center" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                      <div className="text-[10px] uppercase" style={{ color: COLORS.muted }}>{WAREHOUSE_LABELS[part]}</div>
                      <div className="font-mono text-sm" style={{ color: stockColor }}>{stock}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Pilotos</div>
            <div className="space-y-2">
              {team.riders.map((r) => (
                <div key={r.id} onClick={() => onOpenRiderProfile(r, team.name, categoryKey)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") onOpenRiderProfile(r, team.name, categoryKey); }}
                  className="w-full flex items-center gap-3 text-left rounded-md p-2.5 cursor-pointer"
                  style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                  <RiderPhoto rider={r} size={44} className="rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{r.name}</div>
                    <div className="text-xs flex items-center gap-1.5" style={{ color: COLORS.muted }}>
                      <CountryFlag nat={r.nat} width={16} /> {r.age} años · CA {overallRating(r)} · PA {r.pa} · Contrato: {r.contractYears ?? 0} año{(r.contractYears ?? 0) === 1 ? "" : "s"}
                    </div>
                    {r.injury && r.injury.gpRemaining > 0 && (
                      <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: COLORS.danger }}>
                        <AlertTriangle size={11} /> Lesión {r.injury.severityLabel} · {r.injury.gpRemaining} GP restante{r.injury.gpRemaining === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
