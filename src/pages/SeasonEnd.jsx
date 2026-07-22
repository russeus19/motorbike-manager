import { useState } from "react";
import { ArrowLeftRight, Crown, TrendingDown, TrendingUp } from "lucide-react";
import { StandingsPanel } from "../components/Standings.jsx";
import { RiderPhoto } from "../components/RiderPhoto.jsx";
import { RiderNumber } from "../components/RiderNumber.jsx";
import { TeamLogo } from "../components/TeamLogo.jsx";
import { Panel } from "../components/UIPrimitives.jsx";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { findInTeamRoster } from "../utils/raceSimulation.js";
import { findSeasonAwards } from "../utils/teamExpectations.js";

export function SeasonEndScreen({ riderStandings, teamStandings, playerTeam, rivalTeams, otherCategories, category, goToMarket, seasonNumber, openProfile, findRiderInCategory, onOpenTeamProfile, isCareer }) {
  const riderRows = Object.entries(riderStandings).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.points - a.points);
  const allTeamNames = { player: playerTeam.name, ...Object.fromEntries(rivalTeams.map((t) => [t.id, t.name])) };
  const teamRows = Object.entries(teamStandings).map(([id, pts]) => ({ id, name: allTeamNames[id], points: pts })).sort((a, b) => b.points - a.points);
  const champion = riderRows[0];
  const champTeam = teamRows[0];
  const accentGold = COLORS.gold;
  const myPosition = teamRows.findIndex((t) => t.id === "player") + 1;
  const [awardsTab, setAwardsTab] = useState(category);

  const championFull = findInTeamRoster(playerTeam, champion?.id) || rivalTeams.map((t) => findInTeamRoster(t, champion?.id)).find(Boolean);

  // Each category has its own set of four awards — the tab picks which
  // category's teams/standings feed the comparison, same data shape
  // whether it's the one you're playing or one of the other two.
  const awardsCatData = awardsTab === category
    ? { teams: [playerTeam, ...rivalTeams], riderStandings, teamStandings }
    : { teams: otherCategories[awardsTab]?.teams || [], riderStandings: otherCategories[awardsTab]?.riderStandings || {}, teamStandings: otherCategories[awardsTab]?.teamStandings || {} };
  const { riderRevelacion, riderDecepcion, teamRevelacion, teamDecepcion } = findSeasonAwards(awardsCatData);

  function findRider(id) {
    const own = findInTeamRoster(playerTeam, id);
    if (own) return { rider: own, teamName: playerTeam.name };
    for (const t of rivalTeams) {
      const found = findInTeamRoster(t, id);
      if (found) return { rider: found, teamName: t.name };
    }
    return null;
  }

  function handleClick(id) {
    const found = findRider(id);
    if (found) openProfile(found.rider, found.teamName, category);
  }

  function openAwardRider(entry) {
    if (!entry) return;
    openProfile(entry.rider, entry.teamName, awardsTab);
  }

  function openAwardTeam(entry) {
    if (!entry || !onOpenTeamProfile) return;
    onOpenTeamProfile(entry.team, awardsTab);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="text-center mb-8">
        <Crown size={32} style={{ color: accentGold }} className="mx-auto mb-3" />
        <div className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: COLORS.muted }}>{CATEGORY_DATA[category].label} · Fin de temporada {seasonNumber}</div>
        {championFull && (
          <div className="flex flex-col items-center gap-1.5 mb-3">
            <RiderPhoto rider={championFull} size={96} className="rounded-xl" />
            <RiderNumber rider={championFull} size={48} className="-mt-1" categoryKey={category} />
          </div>
        )}
        <h2 className="text-3xl font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>{champion?.name} es campeón de {CATEGORY_DATA[category].label}</h2>
        <p className="text-sm mt-1" style={{ color: COLORS.muted }}>{champTeam?.name} se lleva el título de constructores. Tu equipo, {playerTeam.name}, terminó {myPosition}º.</p>
      </div>

      <div className="mb-6">
        <StandingsPanel
          category={category}
          riderStandings={riderStandings}
          teamStandings={teamStandings}
          otherCategories={otherCategories}
          playerTeam={playerTeam}
          rivalTeams={rivalTeams}
          accent={accentGold}
          findRiderInCategory={findRiderInCategory}
          openProfile={openProfile}
          onOpenTeamProfile={onOpenTeamProfile}
        />
      </div>

      <div className="flex gap-2 mb-3">
        {CATEGORY_ORDER.map((ck) => (
          <button key={ck} onClick={() => setAwardsTab(ck)}
            className="text-xs px-2 py-1 rounded font-semibold"
            style={{
              background: awardsTab === ck ? accentGold : COLORS.panel2,
              color: awardsTab === ck ? "#12151A" : COLORS.muted,
              border: `1px solid ${awardsTab === ck ? accentGold : COLORS.rule}`,
              fontFamily: "Rajdhani, sans-serif",
            }}>
            {CATEGORY_DATA[ck].label}{ck === category ? " (tuya)" : ""}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Panel title="Piloto revelación" icon={TrendingUp} accent="#3F9142">
          {riderRevelacion ? (
            <button onClick={() => openAwardRider(riderRevelacion)} className="w-full text-left hover:opacity-80">
              <div className="flex items-center gap-3">
                <RiderPhoto rider={riderRevelacion.rider} size={44} className="rounded-lg" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{riderRevelacion.rider.name}</div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>{riderRevelacion.teamName} · terminó {riderRevelacion.finalPos}º</div>
                </div>
              </div>
            </button>
          ) : <p className="text-sm" style={{ color: COLORS.muted }}>Nadie ha superado claramente su expectativa esta temporada.</p>}
        </Panel>

        <Panel title="Piloto decepción" icon={TrendingDown} accent={COLORS.danger}>
          {riderDecepcion ? (
            <button onClick={() => openAwardRider(riderDecepcion)} className="w-full text-left hover:opacity-80">
              <div className="flex items-center gap-3">
                <RiderPhoto rider={riderDecepcion.rider} size={44} className="rounded-lg" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{riderDecepcion.rider.name}</div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>{riderDecepcion.teamName} · terminó {riderDecepcion.finalPos}º</div>
                </div>
              </div>
            </button>
          ) : <p className="text-sm" style={{ color: COLORS.muted }}>Nadie se ha quedado claramente por debajo de lo esperado.</p>}
        </Panel>

        <Panel title="Escudería revelación" icon={TrendingUp} accent="#3F9142">
          {teamRevelacion ? (
            <button onClick={() => openAwardTeam(teamRevelacion)} className="w-full text-left hover:opacity-80">
              <div className="flex items-center gap-3">
                <TeamLogo team={teamRevelacion.team} size={40} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{teamRevelacion.team.name}</div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>terminó {teamRevelacion.finalPos}º (esperaban {teamRevelacion.team.expectation.label})</div>
                </div>
              </div>
            </button>
          ) : <p className="text-sm" style={{ color: COLORS.muted }}>Ninguna escudería ha superado claramente su expectativa.</p>}
        </Panel>

        <Panel title="Escudería decepción" icon={TrendingDown} accent={COLORS.danger}>
          {teamDecepcion ? (
            <button onClick={() => openAwardTeam(teamDecepcion)} className="w-full text-left hover:opacity-80">
              <div className="flex items-center gap-3">
                <TeamLogo team={teamDecepcion.team} size={40} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{teamDecepcion.team.name}</div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>terminó {teamDecepcion.finalPos}º (esperaban {teamDecepcion.team.expectation.label})</div>
                </div>
              </div>
            </button>
          ) : <p className="text-sm" style={{ color: COLORS.muted }}>Ninguna escudería se ha quedado claramente por debajo.</p>}
        </Panel>
      </div>

      <button onClick={goToMarket}
        className="w-full py-3 rounded-md font-semibold flex items-center justify-center gap-2"
        style={{ background: accentGold, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
        <ArrowLeftRight size={18} /> {isCareer ? "Ver ofertas de fichaje" : "Cerrar la temporada"}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Transfer Market Screen                                                 */
/* ---------------------------------------------------------------------- */

