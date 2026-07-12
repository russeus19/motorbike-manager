import { AlertTriangle, ChevronRight, Users } from "lucide-react";
import { FreeAgentsPanel } from "../components/RiderMarket.jsx";
import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";

/**
 * "Completar plantilla" — the mandatory gate that replaced any kind of
 * automatic renewal or automatic fill for the player's own team. If the
 * season transition leaves the player with fewer than two contracted
 * riders (they chose not to renew, didn't sign a replacement in time,
 * etc.), this screen blocks the new season until exactly two seats are
 * filled — through the same negotiation system as any other signing,
 * never a button that just assigns someone.
 *
 * Deliberately reuses FreeAgentsPanel (already filters to riders
 * actually eligible for this category and opens the shared
 * RiderProfileModal on click) instead of building a second free-agent
 * browser just for this screen.
 */
export function RosterCompletionScreen({ playerTeam, freeAgents, category, accent, openProfile, onContinue }) {
  const seatsLeft = Math.max(0, 2 - playerTeam.riders.length);
  const canContinue = seatsLeft === 0;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <Users size={20} style={{ color: accent }} />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Completar plantilla</span>
      </div>
      <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>{playerTeam.name}</h2>

      <div className="mb-4 rounded-md p-3 flex items-start gap-2 text-sm" style={{ background: "rgba(214,69,69,0.12)", border: `1px solid ${COLORS.danger}` }}>
        <AlertTriangle size={16} style={{ color: COLORS.danger, flexShrink: 0, marginTop: 2 }} />
        <div>
          {seatsLeft === 2
            ? "Vuestro equipo se ha quedado sin ningún piloto con contrato en vigor."
            : "A vuestro equipo le falta un piloto con contrato en vigor."} No podrá comenzar la temporada hasta que negociéis {seatsLeft === 2 ? "dos fichajes" : "un fichaje"} con pilotos libres.
        </div>
      </div>

      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
        Elegid entre los pilotos libres disponibles para {CATEGORY_DATA[category].label} y abrid su ficha para negociar un contrato — salario, duración y bonus. El piloto evaluará vuestra propuesta exactamente igual que en cualquier otra negociación del mercado; podrá aceptar, rechazar o presentar una contraoferta.
      </p>

      <div className="rounded-md px-4 py-2 mb-4 flex justify-between items-center" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
        <span className="text-sm">Plazas por cubrir</span>
        <span className="font-mono font-semibold" style={{ color: seatsLeft > 0 ? COLORS.danger : "#3F9142" }}>{2 - seatsLeft} / 2</span>
      </div>

      <div className="mb-6">
        <FreeAgentsPanel freeAgents={freeAgents} category={category} accent={accent} openProfile={openProfile} />
      </div>

      <button disabled={!canContinue} onClick={onContinue}
        className="w-full py-3 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ background: accent, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
        Empezar la temporada <ChevronRight size={18} />
      </button>
    </div>
  );
}
