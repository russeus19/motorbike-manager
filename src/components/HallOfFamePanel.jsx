import { Award, Crown, Flag, Medal, Trophy } from "lucide-react";
import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { Panel } from "./UIPrimitives.jsx";
import { computeHallOfFame } from "../utils/seasonArchive.js";

function RecordRow({ icon: Icon, label, value, detail }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 32, height: 32, background: `${COLORS.gold}1F`, border: `1px solid ${COLORS.gold}` }}>
        <Icon size={15} style={{ color: COLORS.gold }} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.muted }}>{label}</div>
        <div className="text-sm font-semibold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>{value}</div>
        {detail && <div className="text-xs truncate" style={{ color: COLORS.muted }}>{detail}</div>}
      </div>
    </div>
  );
}

/** World records across every rider and team the game has ever
 * simulated, not just the player's own — a companion to
 * SeasonArchivePanel right above it (both read the same seasonArchive,
 * just answer a different question: "what happened this season" vs
 * "what's the best/most/youngest ever recorded"). See
 * utils/seasonArchive.js#computeHallOfFame for what is and isn't
 * derivable from the archive as it stands today — a genuine win-streak
 * record isn't included on purpose, it would need its own tracking. */
export function HallOfFamePanel({ seasonArchive, accent }) {
  const hof = computeHallOfFame(seasonArchive);
  const hasAny = hof.topByTitles || hof.topByWins || hof.topByPodiums || hof.youngestChampion || hof.oldestChampion || hof.topTeam;

  return (
    <Panel title="Salón de la Fama" icon={Trophy} accent={accent}>
      {!hasAny ? (
        <p className="text-sm" style={{ color: COLORS.muted }}>Todavía no hay suficiente historia acumulada — los récords empiezan a aparecer en cuanto se completa la primera temporada.</p>
      ) : (
        <div className="space-y-2">
          {hof.topByTitles && (
            <RecordRow icon={Crown} label="Más campeonatos (todas las categorías)" value={`${hof.topByTitles.name} — ${hof.topByTitles.titles}`} />
          )}
          {hof.topByWins && (
            <RecordRow icon={Flag} label="Más victorias de por vida" value={`${hof.topByWins.name} — ${hof.topByWins.wins}`} />
          )}
          {hof.topByPodiums && (
            <RecordRow icon={Medal} label="Más podios de por vida" value={`${hof.topByPodiums.name} — ${hof.topByPodiums.podiums}`} />
          )}
          {hof.youngestChampion && (
            <RecordRow icon={Award} label="Campeón más joven registrado"
              value={`${hof.youngestChampion.name} — ${hof.youngestChampion.age} años`}
              detail={`T${hof.youngestChampion.seasonNumber} · ${CATEGORY_DATA[hof.youngestChampion.category]?.label}`} />
          )}
          {hof.oldestChampion && (
            <RecordRow icon={Award} label="Campeón más veterano registrado"
              value={`${hof.oldestChampion.name} — ${hof.oldestChampion.age} años`}
              detail={`T${hof.oldestChampion.seasonNumber} · ${CATEGORY_DATA[hof.oldestChampion.category]?.label}`} />
          )}
          {hof.topTeam && (
            <RecordRow icon={Trophy} label="Equipo con más títulos" value={`${hof.topTeam.name} — ${hof.topTeam.titles}`} />
          )}
        </div>
      )}
    </Panel>
  );
}
