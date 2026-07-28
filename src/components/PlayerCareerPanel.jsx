import { useState } from "react";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { Panel } from "./UIPrimitives.jsx";
import { buildPlayerCareerHistory, findRiderLaterSeasons } from "../utils/seasonArchive.js";

/** One rider row within a season, expandable in place to show where
 * they raced in every LATER season on record — findRiderLaterSeasons
 * needs nothing new tracked, it just re-reads the archive that's
 * already being built every season transition. */
function RiderTrailRow({ rider, seasonNumber, category, seasonArchive, accent, onOpenRiderProfileById }) {
  const [open, setOpen] = useState(false);
  const trail = open ? findRiderLaterSeasons(seasonArchive, rider.id, seasonNumber) : [];
  return (
    <div className="rounded-lg" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
      <div className="w-full flex items-center justify-between px-3 py-2 text-sm">
        <button
          onClick={(e) => { e.stopPropagation(); onOpenRiderProfileById?.(rider.id, category); }}
          className="flex items-center gap-2 min-w-0 hover:underline"
          style={{ color: COLORS.text }}
        >
          <User size={13} style={{ color: COLORS.muted }} /> <span className="truncate">{rider.name}</span>
        </button>
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 flex-shrink-0 font-mono text-xs" style={{ color: COLORS.muted }}>
          {rider.position}º · {rider.points} pts
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
      {open && (
        <div className="px-3 pb-2.5 text-xs" style={{ color: COLORS.muted }}>
          {trail.length === 0 ? (
            <p>No volvió a competir en ninguna categoría después de esa temporada (al menos, no todavía en esta partida).</p>
          ) : (
            <div className="space-y-1 mt-1">
              {trail.map((t, i) => (
                <div key={i} className="flex items-center justify-between rounded px-2 py-1" style={{ background: COLORS.panel2 }}>
                  <span>T{t.seasonNumber} · {CATEGORY_DATA[t.category]?.label} · {t.teamName}</span>
                  <span className="font-mono flex-shrink-0 ml-2">{t.position}º · {t.points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeasonRow({ entry, seasonArchive, accent, onOpenRiderProfileById }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5">
        <span className="text-sm font-semibold truncate" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>
          Temporada {entry.seasonNumber} · {CATEGORY_DATA[entry.category]?.label} · {entry.teamName}
        </span>
        <span className="flex items-center gap-2 flex-shrink-0 font-mono text-xs ml-2" style={{ color: accent }}>
          {entry.teamPosition ? `${entry.teamPosition}º` : "—"} · {entry.teamPoints} pts
          {open ? <ChevronUp size={15} style={{ color: COLORS.muted }} /> : <ChevronDown size={15} style={{ color: COLORS.muted }} />}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {entry.riders.map((r) => (
            <RiderTrailRow key={r.id} rider={r} seasonNumber={entry.seasonNumber} category={entry.category} seasonArchive={seasonArchive} accent={accent} onOpenRiderProfileById={onOpenRiderProfileById} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PlayerCareerPanel({ seasonArchive, accent, onOpenRiderProfileById }) {
  const history = buildPlayerCareerHistory(seasonArchive);

  return (
    <Panel title="Mi trayectoria" icon={User} accent={accent}>
      {history.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.muted }}>Aún no has completado ninguna temporada en esta partida — vuelve aquí cuando termines la primera.</p>
      ) : (
        <div className="space-y-2">
          {[...history].reverse().map((entry) => (
            <SeasonRow key={entry.seasonNumber} entry={entry} seasonArchive={seasonArchive} accent={accent} onOpenRiderProfileById={onOpenRiderProfileById} />
          ))}
        </div>
      )}
    </Panel>
  );
}
