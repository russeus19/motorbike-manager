import { useState } from "react";
import { Archive, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, TrendingUp, Trophy } from "lucide-react";
import { Panel, RiderNameButton } from "./UIPrimitives.jsx";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";

export function StandingsPanel({ category, riderStandings, teamStandings, otherCategories, playerTeam, rivalTeams, accent, findRiderInCategory, openProfile, onOpenTeamProfile }) {
  const [tab, setTab] = useState(category);
  const [showAll, setShowAll] = useState(false);
  const [teamView, setTeamView] = useState("equipos");

  const isCurrent = tab === category;
  const rs = isCurrent ? riderStandings : (otherCategories[tab]?.riderStandings || {});
  const ts = isCurrent ? teamStandings : (otherCategories[tab]?.teamStandings || {});

  // Reliable id -> real team lookup (this used to only keep the name,
  // which meant a clicked row had no way to open that team's profile).
  const teamById = {};
  if (isCurrent) {
    teamById[playerTeam.id] = playerTeam;
    rivalTeams.forEach((t) => { teamById[t.id] = t; });
  } else {
    (otherCategories[tab]?.teams || []).forEach((t) => { teamById[t.id] = t; });
  }

  const riderRowsAll = Object.entries(rs).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.points - a.points);
  const riderRows = showAll ? riderRowsAll : riderRowsAll.slice(0, 8);
  const teamRows = Object.entries(ts)
    .map(([id, pts]) => ({ id, name: teamById[id]?.name || id, points: pts }))
    .sort((a, b) => b.points - a.points);

  const constructorMap = {};
  Object.entries(ts).forEach(([id, pts]) => {
    const mfr = teamById[id]?.manufacturer || "—";
    constructorMap[mfr] = (constructorMap[mfr] || 0) + pts;
  });
  const constructorRows = Object.entries(constructorMap)
    .map(([name, points]) => ({ id: name, name, points }))
    .sort((a, b) => b.points - a.points);

  const teamOrConstructorRows = teamView === "equipos" ? teamRows : constructorRows;

  function handleRiderClick(id) {
    const found = findRiderInCategory(tab, id);
    if (found) openProfile(found.rider, found.teamName, tab);
  }

  function handleTeamClick(id) {
    const team = teamById[id];
    if (team && onOpenTeamProfile) onOpenTeamProfile(team, tab);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {CATEGORY_ORDER.map((ck) => (
          <button key={ck} onClick={() => setTab(ck)}
            className="text-xs px-2 py-1 rounded font-semibold"
            style={{
              background: tab === ck ? accent : COLORS.panel2,
              color: tab === ck ? "#12151A" : COLORS.muted,
              border: `1px solid ${tab === ck ? accent : COLORS.rule}`,
              fontFamily: "Rajdhani, sans-serif",
            }}>
            {CATEGORY_DATA[ck].label}{ck === category ? " (tuya)" : ""}
          </button>
        ))}
      </div>

      <Panel
        title="Clasificación de pilotos"
        icon={Trophy}
        accent={accent}
        onHeaderClick={() => setShowAll((v) => !v)}
        headerRight={showAll ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
      >
        <ol className={`text-sm space-y-1 ${showAll ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
          {riderRows.map((r, i) => (
            <li key={r.id} className="flex justify-between">
              <span style={{ color: i < 3 ? COLORS.gold : COLORS.text }}>
                {i + 1}. <RiderNameButton rider={{ name: r.name }} onClick={() => handleRiderClick(r.id)} /> <span style={{ color: COLORS.muted }}>({r.teamName})</span>
              </span>
              <span className="font-mono" style={{ color: COLORS.muted }}>{r.points}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel
        title={teamView === "equipos" ? "Clasificación de escuderías" : "Clasificación de constructores"}
        icon={TrendingUp}
        accent={accent}
        headerRight={
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setTeamView("equipos")}
              className="text-xs px-2 py-0.5 rounded font-semibold"
              style={{ background: teamView === "equipos" ? accent : COLORS.panel2, color: teamView === "equipos" ? "#12151A" : COLORS.muted, border: `1px solid ${teamView === "equipos" ? accent : COLORS.rule}`, fontFamily: "Rajdhani, sans-serif" }}>
              Equipos
            </button>
            <button onClick={() => setTeamView("constructores")}
              className="text-xs px-2 py-0.5 rounded font-semibold"
              style={{ background: teamView === "constructores" ? accent : COLORS.panel2, color: teamView === "constructores" ? "#12151A" : COLORS.muted, border: `1px solid ${teamView === "constructores" ? accent : COLORS.rule}`, fontFamily: "Rajdhani, sans-serif" }}>
              Constructores
            </button>
          </div>
        }
      >
        <ol className="text-sm space-y-1">
          {teamOrConstructorRows.map((t, i) => (
            <li key={t.id} className="flex justify-between">
              {teamView === "equipos" ? (
                <button onClick={() => handleTeamClick(t.id)}
                  className="text-left hover:opacity-80 cursor-pointer"
                  style={{ color: isCurrent && t.id === playerTeam.id ? accent : COLORS.text, fontWeight: isCurrent && t.id === playerTeam.id ? 700 : 400 }}>
                  {i + 1}. {t.name}
                </button>
              ) : (
                <span>{i + 1}. {t.name}</span>
              )}
              <span className="font-mono" style={{ color: COLORS.muted }}>{t.points}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Season Dashboard                                                       */
/* ---------------------------------------------------------------------- */


export function DetailedStandingsPanel({ category, riderStandings, teamStandings, riderWins, riderPodiums, otherCategories, playerTeam, rivalTeams, accent, findRiderInCategory, openProfile, onOpenTeamProfile }) {
  const [tab, setTab] = useState(category);
  const [teamView, setTeamView] = useState("equipos");
  const isCurrent = tab === category;
  const rs = isCurrent ? riderStandings : (otherCategories[tab]?.riderStandings || {});
  const rw = isCurrent ? riderWins : (otherCategories[tab]?.riderWins || {});
  const rp = isCurrent ? riderPodiums : (otherCategories[tab]?.riderPodiums || {});
  const ts = isCurrent ? teamStandings : (otherCategories[tab]?.teamStandings || {});
  const teamsList = isCurrent ? [playerTeam, ...rivalTeams] : (otherCategories[tab]?.teams || []);

  const riderRows = Object.entries(rs)
    .map(([id, v]) => ({ id, ...v, wins: rw[id] || 0, podiums: rp[id] || 0 }))
    .sort((a, b) => b.points - a.points);

  const teamRows = teamsList.map((t) => {
    const ids = [...t.riders.map((r) => r.id), ...Object.values(t.substitutes || {}).map((r) => r.id)];
    return {
      id: t.id, name: t.name,
      points: ts[t.id] || 0,
      wins: ids.reduce((s, id) => s + (rw[id] || 0), 0),
      podiums: ids.reduce((s, id) => s + (rp[id] || 0), 0),
    };
  }).sort((a, b) => b.points - a.points);

  const constructorMap = {};
  teamsList.forEach((t) => {
    const mfr = t.manufacturer || "—";
    const ids = [...t.riders.map((r) => r.id), ...Object.values(t.substitutes || {}).map((r) => r.id)];
    const entry = constructorMap[mfr] || { id: mfr, name: mfr, points: 0, wins: 0, podiums: 0 };
    entry.points += ts[t.id] || 0;
    entry.wins += ids.reduce((s, id) => s + (rw[id] || 0), 0);
    entry.podiums += ids.reduce((s, id) => s + (rp[id] || 0), 0);
    constructorMap[mfr] = entry;
  });
  const constructorRows = Object.values(constructorMap).sort((a, b) => b.points - a.points);

  function handleRiderClick(id) {
    const found = findRiderInCategory(tab, id);
    if (found) openProfile(found.rider, found.teamName, tab);
  }

  function handleTeamClick(id) {
    const team = teamsList.find((t) => t.id === id);
    if (team && onOpenTeamProfile) onOpenTeamProfile(team, tab);
  }

  const teamOrConstructorRows = teamView === "equipos" ? teamRows : constructorRows;

  return (
    <Panel title="Clasificaciones" icon={Trophy} accent={accent}>
      <div className="flex gap-2 mb-3">
        {CATEGORY_ORDER.map((ck) => (
          <button key={ck} onClick={() => setTab(ck)}
            className="text-xs px-2 py-1 rounded font-semibold"
            style={{ background: tab === ck ? accent : COLORS.panel2, color: tab === ck ? "#12151A" : COLORS.muted, border: `1px solid ${tab === ck ? accent : COLORS.rule}`, fontFamily: "Rajdhani, sans-serif" }}>
            {CATEGORY_DATA[ck].label}{ck === category ? " (tuya)" : ""}
          </button>
        ))}
      </div>

      <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: COLORS.muted }}>Pilotos</div>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        <div className="flex items-center px-1 py-1 text-xs uppercase" style={{ color: COLORS.muted }}>
          <span className="w-6 text-right">#</span>
          <span className="flex-1 ml-2">Piloto</span>
          <span className="w-8 text-right">V</span>
          <span className="w-8 text-right">P</span>
          <span className="w-12 text-right">Pts</span>
        </div>
        {riderRows.map((r, i) => (
          <div key={r.id} className="flex items-center px-1 py-1.5 text-sm" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
            <span className="w-6 text-right font-mono" style={{ color: i < 3 ? COLORS.gold : COLORS.muted }}>{i + 1}</span>
            <span className="flex-1 ml-2 min-w-0 truncate">
              <RiderNameButton rider={{ name: r.name }} onClick={() => handleRiderClick(r.id)} />
              <span className="text-xs ml-1" style={{ color: COLORS.muted }}>{r.teamName}</span>
            </span>
            <span className="w-8 text-right font-mono text-xs" style={{ color: COLORS.muted }}>{r.wins}</span>
            <span className="w-8 text-right font-mono text-xs" style={{ color: COLORS.muted }}>{r.podiums}</span>
            <span className="w-12 text-right font-mono" style={{ color: accent }}>{r.points}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-1.5 mt-4">
        <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>{teamView === "equipos" ? "Escuderías" : "Constructores"}</div>
        <div className="flex gap-1.5">
          <button onClick={() => setTeamView("equipos")}
            className="text-xs px-2 py-0.5 rounded font-semibold"
            style={{ background: teamView === "equipos" ? accent : COLORS.panel2, color: teamView === "equipos" ? "#12151A" : COLORS.muted, border: `1px solid ${teamView === "equipos" ? accent : COLORS.rule}`, fontFamily: "Rajdhani, sans-serif" }}>
            Equipos
          </button>
          <button onClick={() => setTeamView("constructores")}
            className="text-xs px-2 py-0.5 rounded font-semibold"
            style={{ background: teamView === "constructores" ? accent : COLORS.panel2, color: teamView === "constructores" ? "#12151A" : COLORS.muted, border: `1px solid ${teamView === "constructores" ? accent : COLORS.rule}`, fontFamily: "Rajdhani, sans-serif" }}>
            Constructores
          </button>
        </div>
      </div>
      <div style={{ maxHeight: 240, overflowY: "auto" }}>
        <div className="flex items-center px-1 py-1 text-xs uppercase" style={{ color: COLORS.muted }}>
          <span className="w-6 text-right">#</span>
          <span className="flex-1 ml-2">{teamView === "equipos" ? "Equipo" : "Marca"}</span>
          <span className="w-8 text-right">V</span>
          <span className="w-8 text-right">P</span>
          <span className="w-12 text-right">Pts</span>
        </div>
        {teamOrConstructorRows.map((t, i) => (
          <div key={t.id} className="flex items-center px-1 py-1.5 text-sm" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
            <span className="w-6 text-right font-mono" style={{ color: i < 3 ? COLORS.gold : COLORS.muted }}>{i + 1}</span>
            {teamView === "equipos" ? (
              <button onClick={() => handleTeamClick(t.id)}
                className="flex-1 ml-2 min-w-0 truncate text-left hover:opacity-80 cursor-pointer"
                style={{ color: isCurrent && t.id === "player" ? accent : COLORS.text, fontWeight: isCurrent && t.id === "player" ? 700 : 400 }}>
                {t.name}
              </button>
            ) : (
              <span className="flex-1 ml-2 min-w-0 truncate">{t.name}</span>
            )}
            <span className="w-8 text-right font-mono text-xs" style={{ color: COLORS.muted }}>{t.wins}</span>
            <span className="w-8 text-right font-mono text-xs" style={{ color: COLORS.muted }}>{t.podiums}</span>
            <span className="w-12 text-right font-mono" style={{ color: accent }}>{t.points}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/**
 * Browses the permanent archive of completed seasons (utils/seasonArchive.js
 * — one entry per season, captured right before the transition to the
 * next one resets anything). Purely a viewer: season and category
 * pickers, then whichever of pilotos/equipos/constructores is selected
 * for that season+category snapshot.
 */
export function SeasonArchivePanel({ seasonArchive, accent, category }) {
  const [seasonIdx, setSeasonIdx] = useState(Math.max(0, (seasonArchive || []).length - 1));
  const [catTab, setCatTab] = useState(category);
  const [viewTab, setViewTab] = useState("pilotos");

  if (!seasonArchive || seasonArchive.length === 0) {
    return (
      <Panel title="Histórico de temporadas" icon={Archive} accent={accent}>
        <p className="text-sm" style={{ color: COLORS.muted }}>Aún no se ha completado ninguna temporada en esta partida.</p>
      </Panel>
    );
  }

  const clampedIdx = clampIdx(seasonIdx, seasonArchive.length);
  const entry = seasonArchive[clampedIdx];
  const catData = entry.categories[catTab] || { riders: [], teams: [], constructors: [] };
  const rows = viewTab === "pilotos" ? catData.riders : viewTab === "equipos" ? catData.teams : catData.constructors;

  return (
    <Panel title={`Histórico de temporadas — T${entry.seasonNumber}`} icon={Archive} accent={accent}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setSeasonIdx(clampIdx(clampedIdx - 1, seasonArchive.length))} disabled={clampedIdx === 0}
          className="p-1 rounded disabled:opacity-30" style={{ background: COLORS.panel2 }}>
          <ChevronLeft size={16} style={{ color: COLORS.muted }} />
        </button>
        <span className="text-xs font-semibold" style={{ color: COLORS.text }}>Temporada {entry.seasonNumber}</span>
        <button onClick={() => setSeasonIdx(clampIdx(clampedIdx + 1, seasonArchive.length))} disabled={clampedIdx === seasonArchive.length - 1}
          className="p-1 rounded disabled:opacity-30" style={{ background: COLORS.panel2 }}>
          <ChevronRight size={16} style={{ color: COLORS.muted }} />
        </button>
      </div>

      <div className="flex gap-1.5 mb-2">
        {CATEGORY_ORDER.map((ck) => (
          <button key={ck} onClick={() => setCatTab(ck)}
            className="text-xs px-2 py-1 rounded font-semibold"
            style={{
              background: catTab === ck ? accent : COLORS.panel2,
              color: catTab === ck ? "#12151A" : COLORS.muted,
              border: `1px solid ${catTab === ck ? accent : COLORS.rule}`,
              fontFamily: "Rajdhani, sans-serif",
            }}>
            {CATEGORY_DATA[ck].label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 mb-3">
        {[["pilotos", "Pilotos"], ["equipos", "Escuderías"], ["constructores", "Constructores"]].map(([key, label]) => (
          <button key={key} onClick={() => setViewTab(key)}
            className="text-xs px-2 py-0.5 rounded font-semibold"
            style={{
              background: viewTab === key ? COLORS.panel2 : "transparent",
              color: viewTab === key ? accent : COLORS.muted,
              borderBottom: viewTab === key ? `2px solid ${accent}` : "2px solid transparent",
              fontFamily: "Rajdhani, sans-serif",
            }}>
            {label}
          </button>
        ))}
      </div>

      <ol className="text-sm space-y-1 max-h-80 overflow-y-auto pr-1">
        {rows.length === 0 && <p style={{ color: COLORS.muted }}>Sin datos para esta categoría.</p>}
        {rows.map((r, i) => (
          <li key={r.id || r.name} className="flex justify-between">
            <span style={{ color: i < 3 ? COLORS.gold : COLORS.text }}>
              {i + 1}. {r.name}{r.teamName ? <span style={{ color: COLORS.muted }}> ({r.teamName})</span> : null}
            </span>
            <span className="font-mono" style={{ color: COLORS.muted }}>{r.points}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function clampIdx(i, len) {
  return Math.max(0, Math.min(len - 1, i));
}

