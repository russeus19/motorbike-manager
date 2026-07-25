import { ChevronRight } from "lucide-react";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { TeamLogo } from "./TeamLogo.jsx";
import { OverallBadge } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { overallRating } from "../utils/riders.js";
import { teamDisplayName } from "../utils/teamNaming.js";

/**
 * Shared team-choice card — used by every screen where the player picks
 * a real team (Partida Rápida, el arranque de Modo Carrera, las ofertas
 * de fichaje a mitad de carrera). One design, everywhere, instead of
 * three near-identical hand-rolled cards that drift apart over time.
 * Deliberately gives the logo and the riders' faces real visual weight
 * — a logo in a color-ringed frame, riders large enough to actually
 * recognize — rather than the small inline icons a plain settings list
 * would use, since choosing a team is one of the most important,
 * least-frequent decisions in the game and should feel like it.
 */
export function TeamPickCard({ team, onClick, badge, disabled, delay = 0 }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left rounded-2xl border p-4 transition-transform duration-150 active:scale-[0.98] hover:scale-[1.012] disabled:opacity-40 disabled:pointer-events-none relative group"
      style={{ background: COLORS.panel, borderColor: COLORS.rule, animation: "teamCardIn 0.42s ease-out both", animationDelay: `${delay}ms`, boxShadow: "0 6px 18px rgba(0,0,0,0.25)" }}
    >
      <div className="flex items-center gap-3 mb-3.5">
        <div className="flex items-center justify-center rounded-xl flex-shrink-0 overflow-hidden" style={{ width: 58, height: 58, background: COLORS.panel2, border: `2px solid ${team.color || COLORS.gold}` }}>
          <TeamLogo team={team} size={44} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[15px] leading-tight truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: team.color || COLORS.text }}>{teamDisplayName(team)}</div>
          {badge && <div className="text-[11px] uppercase tracking-wide mt-1 truncate" style={{ color: COLORS.muted }}>{badge}</div>}
        </div>
      </div>

      <div className="space-y-1.5">
        {team.riders.map((r) => (
          <div key={r.id || r.name} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5" style={{ background: COLORS.panel2 }}>
            <span className="flex items-center gap-2.5 min-w-0">
              <RiderPhoto rider={r} size={40} shape="circle" />
              <span className="min-w-0 truncate text-sm" style={{ color: COLORS.text }}>
                {r.name}{r.age != null && <span className="text-xs ml-1" style={{ color: COLORS.muted }}>({r.age} años)</span>}
              </span>
            </span>
            <OverallBadge value={overallRating(r)} accent={team.color || COLORS.gold} />
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="absolute top-3 right-3 flex items-center justify-center rounded-full transition-transform duration-150 group-hover:translate-x-0.5" style={{ width: 26, height: 26, border: `1px solid ${COLORS.gold}` }}>
          <ChevronRight size={13} style={{ color: COLORS.gold }} />
        </div>
      )}
    </button>
  );
}

/** Shared keyframes for the staggered entrance — include this <style>
 * once per screen that renders a grid of TeamPickCard. */
export const TEAM_PICK_CARD_KEYFRAMES = `
  @keyframes teamCardIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
