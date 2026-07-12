import { useState } from "react";
import { ArrowLeftRight, ChevronDown, ChevronUp, Crown, TrendingUp, Trophy } from "lucide-react";
import { StandingsPanel } from "../components/Standings.jsx";
import { Panel, RiderNameButton } from "../components/UIPrimitives.jsx";
import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { findInTeamRoster } from "../utils/raceSimulation.js";

export function SeasonEndScreen({ riderStandings, teamStandings, playerTeam, rivalTeams, otherCategories, category, goToMarket, seasonNumber, openProfile, findRiderInCategory, isCareer }) {
  const riderRows = Object.entries(riderStandings).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.points - a.points);
  const allTeamNames = { player: playerTeam.name, ...Object.fromEntries(rivalTeams.map((t) => [t.id, t.name])) };
  const teamRows = Object.entries(teamStandings).map(([id, pts]) => ({ id, name: allTeamNames[id], points: pts })).sort((a, b) => b.points - a.points);
  const champion = riderRows[0];
  const champTeam = teamRows[0];
  const accentGold = COLORS.gold;
  const myPosition = teamRows.findIndex((t) => t.id === "player") + 1;
  const [showAllRiders, setShowAllRiders] = useState(false);

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

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="text-center mb-8">
        <Crown size={36} style={{ color: accentGold }} className="mx-auto mb-2" />
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: COLORS.muted }}>{CATEGORY_DATA[category].label} · Fin de temporada {seasonNumber}</div>
        <h2 className="text-3xl font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>{champion?.name} es campeón de pilotos</h2>
        <p className="text-sm mt-1" style={{ color: COLORS.muted }}>{champTeam?.name} se lleva el título de constructores. Tu equipo, {playerTeam.name}, terminó {myPosition}º.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Panel
          title={`Pilotos ${showAllRiders ? "· todos" : "· top 8"}`}
          icon={Trophy}
          accent={accentGold}
          onHeaderClick={() => setShowAllRiders((v) => !v)}
          headerRight={showAllRiders ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        >
          <ol className={`text-sm space-y-1 ${showAllRiders ? "max-h-96 overflow-y-auto pr-1" : ""}`}>
            {(showAllRiders ? riderRows : riderRows.slice(0, 8)).map((r, i) => (
              <li key={r.id} className="flex justify-between">
                <span style={{ color: i < 3 ? accentGold : COLORS.text }}>{i + 1}. <RiderNameButton rider={r} onClick={() => handleClick(r.id)} /></span>
                <span className="font-mono" style={{ color: COLORS.muted }}>{r.points}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Constructores" icon={TrendingUp} accent={accentGold}>
          <ol className="text-sm space-y-1">
            {teamRows.map((t, i) => (
              <li key={i} className="flex justify-between"><span style={{ color: t.id === "player" ? accentGold : COLORS.text, fontWeight: t.id === "player" ? 700 : 400 }}>{i + 1}. {t.name}</span><span className="font-mono" style={{ color: COLORS.muted }}>{t.points}</span></li>
            ))}
          </ol>
        </Panel>
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
        />
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

