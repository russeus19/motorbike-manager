import { useState } from "react";
import { AlertTriangle, Medal, X } from "lucide-react";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { AttrGrid } from "./UIPrimitives.jsx";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { badgeEmoji, fireRiderCost, isFreeAgentEligibleForCategory, overallRating } from "../utils/riders.js";

export function RiderProfileModal({ target, onClose, isOwnRider, budget, onRenewContract, onFireRider, playerTeam, category, onSignFreeAgent }) {
  const [confirmFire, setConfirmFire] = useState(false);
  if (!target) return null;
  const { rider, teamName, categoryKey } = target;
  const accent = COLORS.gold;
  const overall = overallRating(rider);
  const history = [...(rider.history || [])].reverse();
  const renewCost = Math.round((rider.marketValue || 0) * 0.08);
  const fireCost = fireRiderCost(rider);
  const isFreeAgent = teamName === "Agente libre";
  const hasVacancy = !!(playerTeam && playerTeam.riders.length < 2);
  const signEligible = isFreeAgent && hasVacancy && !isOwnRider && isFreeAgentEligibleForCategory(rider, category);
  const signCost = Math.round(overallRating(rider) * 5000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border" style={{ background: COLORS.panel, borderColor: COLORS.rule, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <RiderPhoto rider={rider} size={88} className="rounded-xl" />
            <div className="min-w-0">
              <h3 className="text-2xl font-bold flex items-center gap-2 truncate" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                {rider.nat && <CountryFlag nat={rider.nat} width={24} />} {rider.name}
              </h3>
              <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{teamName || "Sin equipo"} {categoryKey ? `· ${CATEGORY_DATA[categoryKey]?.label}` : ""} · {rider.age} años {rider.personality ? `· ${rider.personality}` : ""}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full flex-shrink-0" style={{ background: COLORS.panel2, color: COLORS.muted }}><X size={18} /></button>
        </div>

        <div className="p-5 pt-4" style={{ overflowY: "auto" }}>
        <div className="flex gap-6 mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Media (CA)</div>
            <div className="text-3xl font-mono" style={{ color: accent }}>{overall}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Potencial (PA)</div>
            <div className="text-3xl font-mono" style={{ color: COLORS.text }}>{rider.pa}</div>
          </div>
        </div>

        <AttrGrid rider={rider} accent={accent} />

        <div className="grid grid-cols-3 gap-2 my-3 text-xs" style={{ color: COLORS.muted }}>
          <div className="rounded-md p-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
            <div className="uppercase">Contrato</div>
            <div className="font-mono text-sm" style={{ color: COLORS.text }}>{rider.contractYears ?? 0} año{(rider.contractYears ?? 0) === 1 ? "" : "s"}</div>
          </div>
          <div className="rounded-md p-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
            <div className="uppercase">Salario/año</div>
            <div className="font-mono text-sm" style={{ color: COLORS.text }}>€{(rider.salary || 0).toLocaleString()}</div>
          </div>
          <div className="rounded-md p-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
            <div className="uppercase">Valor de mercado</div>
            <div className="font-mono text-sm" style={{ color: COLORS.text }}>€{(rider.marketValue || 0).toLocaleString()}</div>
          </div>
        </div>

        {rider.injury && rider.injury.gpRemaining > 0 && (
          <div className="mb-3 rounded-md p-2.5 text-xs flex items-center gap-2" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
            <AlertTriangle size={14} />
            Lesión {rider.injury.severityLabel} ({rider.injury.name}) · {rider.injury.gpRemaining} GP restante{rider.injury.gpRemaining === 1 ? "" : "s"}
            {rider.injury.sidelined ? "" : " · sigue compitiendo con el rendimiento mermado"}
          </div>
        )}

        {signEligible && onSignFreeAgent && (
          <button onClick={() => onSignFreeAgent(rider)} disabled={signCost > budget}
            className="w-full mb-3 text-xs px-3 py-2 rounded disabled:opacity-40 font-semibold"
            style={{ background: accent, color: "#12151A" }}>
            Fichar por {playerTeam.name} — €{signCost.toLocaleString()}
          </button>
        )}

        {isOwnRider && onRenewContract && (
          <button onClick={() => onRenewContract(rider.id)} disabled={renewCost > budget}
            className="w-full mb-3 text-xs px-3 py-2 rounded disabled:opacity-40"
            style={{ background: COLORS.panel2, border: `1px solid ${accent}`, color: accent }}>
            Renovar contrato (+1 año) — €{renewCost.toLocaleString()}
          </button>
        )}

        {isOwnRider && onFireRider && !confirmFire && (
          <button onClick={() => setConfirmFire(true)} disabled={fireCost > budget}
            className="w-full mb-3 text-xs px-3 py-2 rounded disabled:opacity-40"
            style={{ background: COLORS.panel2, border: `1px solid ${COLORS.danger}`, color: COLORS.danger }}>
            Despedir — €{fireCost.toLocaleString()}
          </button>
        )}

        {isOwnRider && onFireRider && confirmFire && (
          <div className="mb-3 rounded-md p-3 text-xs" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}` }}>
            <p className="mb-2" style={{ color: COLORS.text }}>
              ¿Rescindir el contrato de {rider.name}? Abandonará la escudería de inmediato y pasará al mercado de pilotos libres. El coste de la rescisión (€{fireCost.toLocaleString()}) se descontará del presupuesto ahora mismo.
            </p>
            <div className="flex gap-2">
              <button onClick={() => onFireRider(rider.id)} disabled={fireCost > budget}
                className="flex-1 py-1.5 rounded font-semibold disabled:opacity-40"
                style={{ background: COLORS.danger, color: "#fff" }}>
                Confirmar despido
              </button>
              <button onClick={() => setConfirmFire(false)} className="flex-1 py-1.5 rounded" style={{ background: COLORS.panel2, color: COLORS.muted }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 my-4">
          {CATEGORY_ORDER.map((ck) => (
            <div key={ck} className="rounded-md p-2 text-center" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="text-xs uppercase" style={{ color: COLORS.muted }}>{CATEGORY_DATA[ck].label}</div>
              <div className="font-mono text-sm">{rider.careerWins?.[ck] || 0}V · {rider.careerPodiums?.[ck] || 0}P</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
            <Medal size={13} /> Historial de temporadas
          </div>
          {history.length === 0 && <p className="text-sm" style={{ color: COLORS.muted }}>Aún no ha completado ninguna temporada en la partida.</p>}
          <ul className="text-sm space-y-1">
            {history.map((h, i) => (
              <li key={i} className="flex justify-between">
                <span>T{h.season} · {CATEGORY_DATA[h.category]?.label} · {h.teamName}</span>
                <span>{h.position}º {badgeEmoji(h.badge)}</span>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main App                                                                */
/* ---------------------------------------------------------------------- */
/* Merges new notification items into the existing per-category histories
   (newest first, capped at 50 each). Pure function so it can be used both
   from the pushNotifications wrapper and directly inside a setGame
   functional update (e.g. runRace, which needs to commit everything in a
   single state update). */

