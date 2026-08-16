import { X, ChevronRight } from "lucide-react";
import { COLORS } from "../data/colors.js";
import { CATEGORY_DATA } from "../data/categories.js";
import { manufacturerInfo } from "../data/manufacturers.js";
import { ManufacturerLogo } from "./ManufacturerLogo.jsx";
import { TeamLogo } from "./TeamLogo.jsx";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { OverallBadge } from "./UIPrimitives.jsx";
import { bikeAvg } from "../utils/bikeDevelopment.js";
import { bikeForSeat, bikeTierForSeat, teamHasSplitBikeTiers, MOTOGP_BIKE_TIER_LABELS } from "../data/motogpBikeTiers.js";
import { overallRating } from "../utils/riders.js";
import { teamDisplayName } from "../utils/teamNaming.js";

/**
 * Manufacturer profile — same shell as TeamProfileModal/RiderProfileModal
 * (fixed header, scrollable body, click-outside/X to close). Shows every
 * team in this ONE category currently riding this manufacturer's bikes,
 * each with its own bike average and full rider list — the same
 * manufacturer appears completely separately per category (Ducati's
 * MotoGP roster has nothing to do with its WorldSBK one), so this is
 * always scoped to a single categoryKey, never "every category at once".
 */
export function ManufacturerProfileModal({ target, onClose, onOpenTeamProfile, onOpenRiderProfile, motogpSeatTiers, manufacturerPreviousBikes, onTop = true }) {
  if (!target) return null;
  const { manufacturer, categoryKey, teams } = target;
  const { nat } = manufacturerInfo(manufacturer);
  const accent = COLORS.gold;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", zIndex: onTop ? 70 : 60 }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border" style={{ background: COLORS.panel, borderColor: COLORS.rule, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center rounded-xl flex-shrink-0 overflow-hidden" style={{ width: 72, height: 72, background: COLORS.panel2, border: `2px solid ${accent}` }}>
              <ManufacturerLogo name={manufacturer} accent={accent} size={54} />
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif" }}>{manufacturer}</h3>
              <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
                {nat && <CountryFlag nat={nat} width={16} />}
                <span>{CATEGORY_DATA[categoryKey]?.label}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full flex-shrink-0 transition-transform active:scale-90" style={{ background: COLORS.panel2, color: COLORS.muted }}><X size={18} /></button>
        </div>

        <div className="p-5 pt-4" style={{ overflowY: "auto" }}>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>{teams.length} equipo{teams.length === 1 ? "" : "s"} con {manufacturer}</div>
          <div className="space-y-3">
            {teams.map((team) => {
              const isSplit = teamHasSplitBikeTiers(team, categoryKey, motogpSeatTiers);
              // Bug fixed: this used to read team.bike directly,
              // regardless of tier — for a team whose seats are
              // uniformly "previous" (demoted together, not split,
              // since split means the two seats DIFFER), that showed
              // a stale customerTop-era value that was never updated
              // when the team got demoted, instead of the real,
              // 10%-penalized frozen snapshot. bikeForSeat resolves
              // the correct value for whichever tier the team's seats
              // actually hold now.
              const avg = isSplit ? null : Math.round(bikeAvg(bikeForSeat(team, 0, categoryKey, manufacturerPreviousBikes, motogpSeatTiers)));
              const teamAccent = team.color || accent;
              return (
                <div key={team.id} className="rounded-xl p-3" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                  <button onClick={() => onOpenTeamProfile(team, categoryKey)} className="w-full flex items-center gap-2.5 mb-2 text-left">
                    <TeamLogo team={team} size={32} className="rounded flex-shrink-0" />
                    <span className="flex-1 min-w-0 text-sm font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{teamDisplayName(team)}</span>
                    {avg != null && <span className="text-xs font-mono flex-shrink-0" style={{ color: teamAccent }}>Moto: {avg}</span>}
                    <ChevronRight size={16} style={{ color: COLORS.muted }} className="flex-shrink-0" />
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    {(team.riders || []).map((r, i) => {
                      const tier = bikeTierForSeat(team, i, categoryKey, motogpSeatTiers);
                      const riderBikeAvg = isSplit ? Math.round(bikeAvg(bikeForSeat(team, i, categoryKey, manufacturerPreviousBikes, motogpSeatTiers))) : null;
                      return (
                        <button key={r.id} onClick={() => onOpenRiderProfile(r, teamDisplayName(team), categoryKey)}
                          className="flex items-center gap-2 rounded-lg p-1.5 text-left" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
                          <RiderPhoto rider={r} size={32} className="rounded flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: COLORS.text }}>{r.name}</div>
                            {isSplit && tier && (
                              <div className="text-[9px] truncate" style={{ color: teamAccent }}>{MOTOGP_BIKE_TIER_LABELS[tier]} · {riderBikeAvg}</div>
                            )}
                          </div>
                          <OverallBadge value={overallRating(r)} accent={teamAccent} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
