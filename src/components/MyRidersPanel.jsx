import { AlertTriangle, ArrowLeftRight, Award, ChevronRight, Flag, Star, Trophy } from "lucide-react";
import { Panel, OverallBadge } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { RiderNumber } from "./RiderNumber.jsx";
import { overallRating } from "../utils/riders.js";
import { teamDisplayName } from "../utils/teamNaming.js";

/** This rider's current position in the FULL category standings (not
 * just this team's own two riders) — riderStandings already covers
 * every rider in the category, so this just ranks all of them by
 * points and finds where this one lands. Ties keep whatever order
 * they already had (no separate tiebreaker logic exists elsewhere for
 * this, so none is invented here either). */
function currentRank(riderStandings, riderId) {
  const ranked = Object.entries(riderStandings || {}).sort((a, b) => (b[1]?.points ?? 0) - (a[1]?.points ?? 0));
  const idx = ranked.findIndex(([id]) => id === riderId);
  return idx === -1 ? null : idx + 1;
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="rounded-lg px-2.5 py-2 flex items-center gap-2" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
      <Icon size={15} style={{ color: COLORS.gold }} className="flex-shrink-0" />
      <div>
        <div className="text-base font-bold leading-none" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{value}</div>
        <div className="text-[8px] uppercase tracking-wider" style={{ color: COLORS.muted }}>{label}</div>
      </div>
    </div>
  );
}

/**
 * A single rider's row — matches the reference layout: number + photo,
 * then name/nationality/contract info, then the attribute hexagon,
 * then this season's stat cards + points, then a chevron through to
 * the full profile. Always shows everything at once (no second,
 * nested expand/collapse inside an already-expanded panel) — a
 * horizontal 4-part row from sm upward, stacked into readable blocks
 * on a narrow phone screen instead of cramming four columns into it.
 */
function RiderRow({ rider, isSubstitute, ownerName, points, wins, podiums, rank, category, accent, openProfile, teamName, seasonNumber, teamTier }) {
  return (
    <button
      onClick={() => openProfile(rider, teamName, category)}
      className="w-full text-left rounded-lg overflow-hidden mb-3 last:mb-0 block"
      style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
        {/* Photo (bigger now) + number moved underneath it */}
        <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
          <RiderPhoto rider={rider} size={88} className="rounded-lg" />
          {!isSubstitute && <RiderNumber rider={rider} size={44} categoryKey={category} plain />}
        </div>

        {/* Name (with the country flag right before it now, instead of the number), contract grid */}
        <div className="flex-1 min-w-0 sm:w-56 sm:flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <CountryFlag nat={rider.nat} width={22} />
            <span className="text-xl sm:text-2xl font-bold leading-tight" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{rider.name}</span>
            <OverallBadge value={overallRating(rider)} accent={accent} size="lg" />
          </div>

          {isSubstitute ? (
            <div className="text-xs flex items-center gap-1.5" style={{ color: COLORS.gold }}>
              <ArrowLeftRight size={12} className="flex-shrink-0" /> Sustituto de {ownerName || "piloto lesionado"}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div><div className="text-xs font-bold" style={{ color: COLORS.text }}>{rider.age} años</div><div className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Edad</div></div>
              <div><div className="text-xs font-bold" style={{ color: COLORS.text }}>{rider.contractYears ?? 0} año{(rider.contractYears ?? 0) === 1 ? "" : "s"}</div><div className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Contrato</div></div>
              <div><div className="text-xs font-bold" style={{ color: COLORS.text }}>€{(rider.salary || 0).toLocaleString()}</div><div className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Salario anual</div></div>
              <div><div className="text-xs font-bold" style={{ color: COLORS.text }}>{teamTier || "—"}</div><div className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Estatus</div></div>
            </div>
          )}

          {rider.injury && rider.injury.gpRemaining > 0 && (
            <div className="text-xs mt-2 flex items-center gap-1" style={{ color: COLORS.danger }}>
              <AlertTriangle size={11} className="flex-shrink-0" />
              {rider.injury.sidelined ? `Lesión ${rider.injury.severityLabel} · vuelve en ${rider.injury.gpRemaining} GP${rider.injury.gpRemaining === 1 ? "" : "s"}` : `Lesión leve (${rider.injury.gpRemaining} GP) · rendimiento mermado`}
            </div>
          )}
        </div>

        {/* Season stats + points */}
        <div className="sm:flex-1 sm:min-w-0">
          <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Rendimiento {seasonNumber}</div>
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <StatCard icon={Trophy} value={podiums} label="Podios" />
            <StatCard icon={Flag} value={wins} label="Victorias" />
            <StatCard icon={Award} value={rank != null ? `${rank}º` : "—"} label="Puesto" />
          </div>
          <div className="rounded-lg px-2.5 py-1.5 flex items-center justify-between" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Puntos</span>
            <span className="text-sm font-bold" style={{ fontFamily: "Rajdhani, sans-serif", color: accent }}>{points} pts</span>
          </div>
        </div>

        <ChevronRight size={20} style={{ color: COLORS.muted }} className="hidden sm:block flex-shrink-0" />
      </div>
    </button>
  );
}

/**
 * "Mis pilotos" — used identically from both the Inicio screen and the
 * Pilotos screen (previously duplicated JSX in each, now one shared
 * component so a future change only needs making once).
 *
 * Always shown fully expanded — no collapse/expand toggle at all, on
 * either screen it appears on. Every rider row shows everything at
 * once (number, photo, contract grid, attribute hexagon on the rider's
 * own profile now instead of here, and this season's podiums/wins/
 * rank/points) the moment the panel itself renders. Tapping anywhere
 * on a row opens that rider's full profile.
 */
export function MyRidersPanel({ playerTeam, riderStandings, riderWins, riderPodiums, gpHistory, category, seasonNumber, accent, openProfile }) {
  const teamName = teamDisplayName(playerTeam);
  return (
    <Panel
      title="Mis pilotos"
      icon={Star}
      accent={accent}
    >
      <>
        {playerTeam.riders.map((r) => (
          <RiderRow
            key={r.id}
            rider={r}
            category={category}
            accent={accent}
            openProfile={openProfile}
            teamName={teamName}
            teamTier={playerTeam.tier}
            seasonNumber={seasonNumber}
            points={riderStandings[r.id]?.points ?? 0}
            wins={riderWins?.[r.id] ?? 0}
            podiums={riderPodiums?.[r.id] ?? 0}
            rank={currentRank(riderStandings, r.id)}
          />
        ))}
        {Object.entries(playerTeam.substitutes || {}).map(([ownerId, sub]) => {
          const owner = playerTeam.riders.find((r) => r.id === ownerId);
          return (
            <RiderRow
              key={sub.id}
              rider={sub}
              isSubstitute
              ownerName={owner?.name}
              category={category}
              accent={accent}
              openProfile={openProfile}
              teamName={teamName}
              seasonNumber={seasonNumber}
              points={riderStandings[sub.id]?.points ?? 0}
              wins={riderWins?.[sub.id] ?? 0}
              podiums={riderPodiums?.[sub.id] ?? 0}
              rank={currentRank(riderStandings, sub.id)}
            />
          );
        })}
      </>
    </Panel>
  );
}
