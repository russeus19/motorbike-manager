import { AlertTriangle } from "lucide-react";
import { CountryFlag } from "../components/CountryFlag.jsx";
import { RiderPhoto } from "../components/RiderPhoto.jsx";
import { AttrGrid, OverallBadge, RiderNameButton } from "../components/UIPrimitives.jsx";
import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { isFreeAgentEligibleForCategory, overallRating, substituteHireCost } from "../utils/riders.js";

export function SubstituteScreen({ playerTeam, pendingSubstitution, freeAgents, rookiesCupRiders, category, budget, scale, onConfirm, onSkip, openProfile }) {
  const accent = playerTeam.color;
  const injuredRider = playerTeam.riders.find((r) => r.id === pendingSubstitution.riderId);
  // Section 16: a Rookies Cup rider can cover an injured seat in any
  // category while still holding their Rookies Cup contract — the same
  // eligible-candidates list just also draws from that roster now,
  // alongside free agents.
  const candidates = [
    ...(freeAgents || []).map((r) => ({ ...r, _sourceLabel: "Agente libre" })),
    ...(rookiesCupRiders || []).map((r) => ({ ...r, _sourceLabel: "Red Bull KTM Rookies Cup" })),
  ];
  const eligible = candidates.filter((r) => isFreeAgentEligibleForCategory(r, category));
  const sorted = [...eligible].sort((a, b) => overallRating(b) - overallRating(a));
  const ageRuleApplies = category === "moto2" || category === "moto3";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle size={20} style={{ color: COLORS.danger }} />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Baja médica</span>
      </div>
      <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>Seleccionar piloto sustituto</h2>
      {injuredRider && (
        <p className="text-sm mb-2" style={{ color: COLORS.muted }}>
          <strong style={{ color: COLORS.text }}>{injuredRider.name}</strong> se perderá {injuredRider.injury?.gpRemaining} Gran{injuredRider.injury?.gpRemaining === 1 ? "" : "es"} Premio{injuredRider.injury?.gpRemaining === 1 ? "" : "s"} por una lesión {injuredRider.injury?.severityLabel} ({injuredRider.injury?.name?.toLowerCase()}). Elegí un piloto libre para cubrir su asiento hasta que se recupere — al volver, el sustituto regresará automáticamente al mercado de libres.
        </p>
      )}
      {ageRuleApplies && (
        <p className="text-xs mb-6" style={{ color: COLORS.muted }}>Solo se muestran agentes libres de 26 años o menos: {CATEGORY_DATA[category].label} no ficha veteranos como sustitutos.</p>
      )}
      {!ageRuleApplies && <div className="mb-6" />}

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {sorted.map((r) => {
          const cost = substituteHireCost(r, scale);
          const canAfford = cost <= budget;
          return (
            <div key={r.id} className="text-left rounded-lg border p-3" style={{ background: COLORS.panel, borderColor: COLORS.rule, opacity: canAfford ? 1 : 0.5 }}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold flex items-center gap-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                  <RiderPhoto rider={r} size={36} className="rounded" />
                  <RiderNameButton rider={r} onClick={() => openProfile(r, r._sourceLabel, r._sourceLabel === "Agente libre" ? null : "rookiescup")} />
                  <OverallBadge value={overallRating(r)} accent={accent} />
                </span>
                <span className="text-xs font-mono" style={{ color: COLORS.muted }}>€{cost.toLocaleString()}</span>
              </div>
              <div className="text-xs mb-2 flex items-center gap-1.5" style={{ color: COLORS.muted }}><CountryFlag nat={r.nat} width={16} /> {r.age} años · {r._sourceLabel}</div>
              <AttrGrid rider={r} accent={accent} />
              <button disabled={!canAfford} onClick={() => onConfirm(r)}
                className="mt-2 text-xs px-2 py-1.5 rounded w-full font-semibold disabled:opacity-40"
                style={{ background: accent, color: "#12151A" }}>
                {canAfford ? "Ficharlo como sustituto" : "Presupuesto insuficiente"}
              </button>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-sm col-span-2" style={{ color: COLORS.muted }}>No hay pilotos libres elegibles ahora mismo.</p>
        )}
      </div>

      <button onClick={onSkip}
        className="w-full py-3 rounded-md font-semibold"
        style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}`, fontFamily: "Rajdhani, sans-serif" }}>
        Correr solo con el piloto disponible
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Notification Center                                                    */
/* ---------------------------------------------------------------------- */

