import { AlertTriangle, ArrowLeftRight, Award, ChevronRight, Flag, Star, Trophy } from "lucide-react";
import { Panel, OverallBadge } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";
import { CountryFlag } from "./CountryFlag.jsx";
import { RiderPhoto } from "./RiderPhoto.jsx";
import { RiderNumber } from "./RiderNumber.jsx";
import { bikeTierForSeat, MOTOGP_BIKE_TIER_LABELS } from "../data/motogpBikeTiers.js";
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

/**
 * A single rider's row — matches the reference layout: number + photo,
 * then name/nationality/contract info, then the attribute hexagon,
 * then this season's stat cards + points, then a chevron through to
 * the full profile. Always shows everything at once (no second,
 * nested expand/collapse inside an already-expanded panel) — a
 * horizontal 4-part row from sm upward, stacked into readable blocks
 * on a narrow phone screen instead of cramming four columns into it.
 */
export function RiderRow({ rider, isSubstitute, ownerName, substituteFor, points, wins, podiums, rank, category, accent, openProfile, teamName, seasonNumber, teamTier, bikeTier }) {
  return (
    <button
      onClick={() => openProfile(rider, teamName, category)}
      className="w-full text-left rounded-lg overflow-hidden mb-2.5 sm:mb-3 last:mb-0 block"
      style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, borderLeft: `3px solid ${accent}` }}
    >
      {/* ============ MOBILE (below sm) ============ */}
      <div className="sm:hidden">
        <div className="flex items-center gap-3 p-3">
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <RiderPhoto rider={rider} size={64} className="rounded-lg" />
            {!isSubstitute && <RiderNumber rider={rider} size={30} categoryKey={category} plain />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <CountryFlag nat={rider.nat} width={18} />
              <span className="text-base font-bold leading-tight truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{rider.name}</span>
              <OverallBadge value={overallRating(rider)} accent={accent} />
            </div>

            {isSubstitute ? (
              <div className="text-xs flex items-center gap-1.5" style={{ color: COLORS.gold }}>
                <ArrowLeftRight size={12} className="flex-shrink-0" /> Sustituto de {ownerName || "piloto lesionado"}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div><div className="text-xs font-bold" style={{ color: COLORS.text }}>{rider.age} años</div><div className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Edad</div></div>
                <div><div className="text-xs font-bold" style={{ color: COLORS.text }}>{rider.contractYears ?? 0} año{(rider.contractYears ?? 0) === 1 ? "" : "s"}</div><div className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Contrato</div></div>
                <div><div className="text-xs font-bold truncate" style={{ color: COLORS.text }}>€{(rider.salary || 0).toLocaleString()}</div><div className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Salario</div></div>
                <div><div className="text-xs font-bold truncate" style={{ color: COLORS.text }}>{MOTOGP_BIKE_TIER_LABELS[bikeTier] || teamTier || "—"}</div><div className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Estatus</div></div>
              </div>
            )}

            {rider.injury && rider.injury.gpRemaining > 0 && (
              <div className="text-xs mt-1.5 flex items-center gap-1" style={{ color: COLORS.danger }}>
                <AlertTriangle size={11} className="flex-shrink-0" />
                {rider.injury.sidelined ? `Lesión ${rider.injury.severityLabel} · vuelve en ${rider.injury.gpRemaining} GP${rider.injury.gpRemaining === 1 ? "" : "s"}` : `Lesión leve (${rider.injury.gpRemaining} GP) · rendimiento mermado`}
              </div>
            )}
            {substituteFor && (
              <div className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: COLORS.gold }}>
                <ArrowLeftRight size={11} className="flex-shrink-0" /> Sustituto de {substituteFor}
              </div>
            )}
          </div>
        </div>

        <div className="px-3 pb-3">
          <div className="grid grid-cols-4 gap-1.5">
            <MiniStat icon={Trophy} v={podiums} label="Podios" />
            <MiniStat icon={Flag} v={wins} label="Victorias" />
            <MiniStat icon={Award} v={rank != null ? `${rank}º` : "—"} label="Puesto" />
            <div className="rounded-md px-1.5 py-1 flex flex-col items-center justify-center" style={{ background: COLORS.panel }}>
              <span className="text-sm font-bold leading-none" style={{ fontFamily: "Rajdhani, sans-serif", color: accent }}>{points}</span>
              <span className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: COLORS.muted }}>Pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ DESKTOP/TABLET (sm and up) — restored to the
          original, correct layout: photo+number column, name/contract
          column, and a third Rendimiento column with 3 stat cards +
          points, all in a single row, ending in a chevron. ============ */}
      <div className="hidden sm:flex sm:items-center gap-3 p-3">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <RiderPhoto rider={rider} size={88} className="rounded-lg" />
          {!isSubstitute && <RiderNumber rider={rider} size={44} categoryKey={category} plain />}
        </div>

        <div className="w-96 flex-shrink-0 min-w-0">
          <div className="flex items-center gap-2 flex-nowrap mb-1">
            <CountryFlag nat={rider.nat} width={22} />
            <span className="text-2xl font-bold leading-tight truncate min-w-0" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{rider.name}</span>
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
              <div><div className="text-xs font-bold" style={{ color: COLORS.text }}>{MOTOGP_BIKE_TIER_LABELS[bikeTier] || teamTier || "—"}</div><div className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.muted }}>Estatus</div></div>
            </div>
          )}

          {rider.injury && rider.injury.gpRemaining > 0 && (
            <div className="text-xs mt-2 flex items-center gap-1" style={{ color: COLORS.danger }}>
              <AlertTriangle size={11} className="flex-shrink-0" />
              {rider.injury.sidelined ? `Lesión ${rider.injury.severityLabel} · vuelve en ${rider.injury.gpRemaining} GP${rider.injury.gpRemaining === 1 ? "" : "s"}` : `Lesión leve (${rider.injury.gpRemaining} GP) · rendimiento mermado`}
            </div>
          )}
          {substituteFor && (
            <div className="text-xs mt-2 flex items-center gap-1.5" style={{ color: COLORS.gold }}>
              <ArrowLeftRight size={12} className="flex-shrink-0" /> Sustituto de {substituteFor}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <div className="w-72 flex-shrink-0 min-w-0">
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

        <ChevronRight size={20} style={{ color: COLORS.muted }} className="flex-shrink-0" />
      </div>
    </button>
  );
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

function MiniStat({ icon: Icon, v, label }) {
  return (
    <div className="rounded-md px-1.5 py-1 flex flex-col items-center justify-center gap-0.5" style={{ background: COLORS.panel }}>
      <div className="flex items-center gap-1">
        <Icon size={11} style={{ color: COLORS.gold }} className="flex-shrink-0" />
        <span className="text-sm font-bold leading-none" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{v}</span>
      </div>
      <span className="text-[8px] uppercase tracking-wider" style={{ color: COLORS.muted }}>{label}</span>
    </div>
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
export function MyRidersPanel({ playerTeam, riderStandings, riderWins, riderPodiums, gpHistory, category, seasonNumber, accent, openProfile, motogpSeatTiers }) {
  const teamName = teamDisplayName(playerTeam);
  return (
    <Panel
      title="Mis pilotos"
      icon={Star}
      accent={accent}
    >
      <>
        {playerTeam.riders.map((r, i) => (
          <RiderRow
            key={r.id}
            rider={r}
            category={category}
            accent={accent}
            openProfile={openProfile}
            teamName={teamName}
            teamTier={playerTeam.tier}
            bikeTier={bikeTierForSeat(playerTeam, i, category, motogpSeatTiers)}
            seasonNumber={seasonNumber}
            points={riderStandings[r.id]?.points ?? 0}
            wins={riderWins?.[r.id] ?? 0}
            podiums={riderPodiums?.[r.id] ?? 0}
            rank={currentRank(riderStandings, r.id)}
          />
        ))}
        {Object.entries(playerTeam.substitutes || {}).map(([ownerId, sub]) => {
          // Bug fixed: a team's own test rider (see utils/testRiders.js)
          // stepping in to cover an injured titular still lives in
          // BOTH playerTeam.substitutes (the seat they're temporarily
          // filling) AND playerTeam.testRider (their own real slot) at
          // once — rendering both loops unconditionally showed them as
          // two separate rows, one labeled "probador" and one labeled
          // "sustituto", as if they were two different people. Skipped
          // here; their own row in the "Piloto probador" section below
          // picks up the exact same "Sustituto de X" legend instead, so
          // they show up once, with both facts visible on that one row.
          if (playerTeam.testRider && sub.id === playerTeam.testRider.id) return null;
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
        {playerTeam.testRider && (() => {
          // Same reasoning as the skip above, from the other side: if
          // this exact rider is the value for some owner's seat in
          // playerTeam.substitutes, they're actively covering an
          // injury right now — that owner's name is threaded through
          // as ownerName/isSubstitute so RiderRow shows the identical
          // yellow "Sustituto de X" legend a hired-in substitute gets,
          // right here on their own probador row, instead of a second
          // row elsewhere.
          const coveringForId = Object.entries(playerTeam.substitutes || {}).find(([, s]) => s.id === playerTeam.testRider.id)?.[0];
          const coveringForName = coveringForId ? playerTeam.riders.find((r) => r.id === coveringForId)?.name : null;
          return (
            <>
              <div className="text-xs uppercase tracking-wider mt-3 mb-1.5" style={{ color: COLORS.muted }}>Piloto probador</div>
              <RiderRow
                key={playerTeam.testRider.id}
                rider={playerTeam.testRider}
                substituteFor={coveringForName}
                category={category}
                accent={accent}
                openProfile={openProfile}
                teamName={teamName}
                teamTier={playerTeam.tier}
                seasonNumber={seasonNumber}
                points={riderStandings[playerTeam.testRider.id]?.points ?? 0}
                wins={riderWins?.[playerTeam.testRider.id] ?? 0}
                podiums={riderPodiums?.[playerTeam.testRider.id] ?? 0}
                rank={currentRank(riderStandings, playerTeam.testRider.id)}
              />
            </>
          );
        })()}
      </>
    </Panel>
  );
}
