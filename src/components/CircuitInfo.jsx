import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, X } from "lucide-react";
import { CountryFlag } from "./CountryFlag.jsx";
import { Panel, StatBar } from "./UIPrimitives.jsx";
import { CategoryTabSelector } from "./CategoryTabSelector.jsx";
import { ATTRS } from "../data/attributes.js";
import { BIKE_AREA_KEYS, BIKE_LABELS } from "../data/bikeAreas.js";
import { CIRCUITS, CIRCUIT_PROFILES, dateForRound } from "../data/circuits.js";
import { SUPERBIKES_CIRCUITS, SUPERBIKES_CIRCUIT_PROFILES } from "../data/circuitsSuperbikes.js";
import { SUPERBIKES_RACE_MAIN_ROUNDS } from "../data/superbikesCalendar.js";
import { WCR_RACE_SBK_ROUNDS, WCR_RACE_MAIN_ROUNDS } from "../data/wcrCalendar.js";
import { COLORS } from "../data/colors.js";
import { findGpHistoryEntry } from "../utils/raceHistory.js";

const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function formatShortDate(date) {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

/** The detailed circuit breakdown (blurb, real specs, tags, tech/rider
 * demand bars) — shared between CircuitInfoPanel's own expanded state
 * (Info tab) and CircuitHero's "Ver información del circuito" toggle
 * (Inicio tab), so both read from one single piece of markup instead
 * of two copies that could drift apart. */
export function CircuitDetailContent({ circuitProfile, accent }) {
  const c = circuitProfile;
  return (
    <div>
      <p className="text-sm mb-2">{c.blurb}</p>
      <p className="text-xs mb-3" style={{ color: COLORS.muted }}>{c.style}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3" style={{ color: COLORS.muted }}>
        <div>Año: <span style={{ color: COLORS.text }}>{c.built}</span></div>
        <div>Longitud: <span style={{ color: COLORS.text }}>{c.lengthKm} km</span></div>
        <div>Curvas izq/der: <span style={{ color: COLORS.text }}>{c.cornersLeft} / {c.cornersRight}</span></div>
        <div>Recta principal: <span style={{ color: COLORS.text }}>{c.mainStraightM} m</span></div>
        <div>Sentido: <span style={{ color: COLORS.text }}>{c.direction}</span></div>
        <div>Clima: <span style={{ color: COLORS.text }}>☀️ {c.dryPct}% · 🌧️ {c.wetPct}%</span></div>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {c.tags.map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.muted }}>{tag}</span>
        ))}
      </div>
      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>Exigencia técnica</div>
      {BIKE_AREA_KEYS.map((k) => (
        <StatBar key={k} label={BIKE_LABELS[k]} value={c.tech[k]} accent={accent} />
      ))}
      <div className="text-xs uppercase tracking-wider mb-1 mt-2" style={{ color: COLORS.muted }}>Exigencia al piloto</div>
      {ATTRS.map((a) => (
        <StatBar key={a.key} label={a.label} value={c.riderWeight[a.key]} accent={accent} />
      ))}
    </div>
  );
}

export function CircuitInfoPanel({ circuitProfile, accent, round, seasonNumber, daysUntilNextRace }) {
  const [expanded, setExpanded] = useState(false);
  const c = circuitProfile;
  const dateLabel = round != null && seasonNumber != null ? formatShortDate(dateForRound(round, seasonNumber)) : null;
  const daysLabel = daysUntilNextRace != null
    ? (daysUntilNextRace <= 0 ? "Esta semana" : daysUntilNextRace === 1 ? "Mañana" : `Quedan ${daysUntilNextRace} días`)
    : null;
  return (
    <Panel
      title="Circuito"
      icon={MapPin}
      accent={accent}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          {dateLabel && <span className="text-xs font-semibold" style={{ color: accent }}>{dateLabel}</span>}
          <span className="text-xs flex items-center gap-1.5"><CountryFlag nat={c.flag} width={20} /> {c.country}</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {daysLabel && (
        <div className="text-xs font-semibold mb-2" style={{ color: accent }}>{daysLabel}</div>
      )}
      {!expanded && (
        <div className="flex items-center justify-between text-xs" style={{ color: COLORS.muted }}>
          <span>{c.lengthKm} km · {c.cornersLeft + c.cornersRight} curvas · {c.direction}</span>
          <span>☀️ {c.dryPct}% · 🌧️ {c.wetPct}%</span>
        </div>
      )}
      {expanded && <CircuitDetailContent circuitProfile={c} accent={accent} />}
    </Panel>
  );
}



export function CalendarPanel({ round, accent, gpHistory, seasonNumber, category }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);

  const isSbkCalendar = category === "superbikes" || category === "supersport" || category === "sportbike" || category === "worldwcr";
  // WorldWCR only ever shows its own 6 rounds here, not all 12 shared by
  // Superbikes/Supersport/Sportbike — WCR_RACE_SBK_ROUNDS picks out
  // just those 6 circuits (and their matching main-calendar rounds)
  // from the full 12, rather than listing rounds it never actually
  // races on.
  const isWcr = category === "worldwcr";
  const circuitsList = isWcr ? WCR_RACE_SBK_ROUNDS.map((i) => SUPERBIKES_CIRCUITS[i]) : isSbkCalendar ? SUPERBIKES_CIRCUITS : CIRCUITS;
  const profilesList = isWcr ? WCR_RACE_SBK_ROUNDS.map((i) => SUPERBIKES_CIRCUIT_PROFILES[i]) : isSbkCalendar ? SUPERBIKES_CIRCUIT_PROFILES : CIRCUIT_PROFILES;
  // For Superbikes and Supersport (same 12 rounds, same weekend), each
  // round maps to a specific week on the shared 22-week master clock
  // (data/superbikesCalendar.js) — that's what decides its status and
  // what looks up the right gpHistory entry, since history is always
  // recorded by the master round. WorldWCR nests one level deeper
  // still (its own 6 rounds are themselves a subset of Superbikes'
  // 12), so it uses WCR_RACE_MAIN_ROUNDS instead of re-deriving that
  // chain here.
  const masterRoundFor = (i) => (isWcr ? WCR_RACE_MAIN_ROUNDS[i] : isSbkCalendar ? SUPERBIKES_RACE_MAIN_ROUNDS[i] : i);

  return (
    <Panel title="Calendario" icon={MapPin} accent={accent} onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}>
      {expanded && (
        <div className="space-y-1" style={{ maxHeight: 384, overflowY: "auto" }}>
          {circuitsList.map((c, i) => {
            const prof = profilesList[i];
            const masterRound = masterRoundFor(i);
            const status = masterRound < round ? "Disputada" : masterRound === round ? "Próxima" : "Pendiente";
            const statusColor = masterRound === round ? accent : COLORS.muted;
            return (
              <button key={i} onClick={() => setSelectedRound(i)}
                className="w-full flex items-center justify-between text-sm py-1.5 text-left"
                style={{ borderBottom: `1px solid ${COLORS.rule}`, opacity: masterRound < round ? 0.5 : 1 }}>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-6 text-right font-mono text-xs flex-shrink-0" style={{ color: COLORS.muted }}>{i + 1}</span>
                  <CountryFlag nat={prof.flag} width={18} className="flex-shrink-0" />
                  <span className="truncate">{c.split("—")[0].replace("Gran Premio de ", "").replace("Ronda de ", "").trim()}</span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-xs font-mono" style={{ color: COLORS.muted }}>{formatShortDate(dateForRound(masterRound, seasonNumber))}</span>
                  <span className="text-xs font-semibold" style={{ color: statusColor }}>{status}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {selectedRound !== null && (
        <GpResultModal
          round={selectedRound}
          circuitName={circuitsList[selectedRound]}
          isPlayed={masterRoundFor(selectedRound) < round}
          entry={findGpHistoryEntry(gpHistory, seasonNumber, masterRoundFor(selectedRound))}
          category={category}
          accent={accent}
          onClose={() => setSelectedRound(null)}
        />
      )}
    </Panel>
  );
}

/**
 * Shows the full classification of a single Grand Prix's three
 * categories, exactly as it was recorded the moment that GP was
 * simulated (see utils/raceHistory.js) — never recalculated, so a
 * rider's later team change, injury or substitution never alters what's
 * shown here. Reuses the same modal shell and tabbed-category pattern
 * used elsewhere in the game rather than introducing a new visual style.
 */
function GpResultModal({ round, circuitName, isPlayed, entry, category, accent, onClose }) {
  const [tab, setTab] = useState(category);
  const gpTitle = circuitName.split("—")[0].trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border" style={{ background: COLORS.panel, borderColor: COLORS.rule, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
          <div className="min-w-0">
            <h3 className="text-xl font-bold truncate" style={{ fontFamily: "Rajdhani, sans-serif" }}>{gpTitle}</h3>
            <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>Ronda {round + 1}{entry?.isWet ? " · Carrera en mojado" : ""}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full flex-shrink-0" style={{ background: COLORS.panel2, color: COLORS.muted }}><X size={18} /></button>
        </div>

        <div className="p-5 pt-4" style={{ overflowY: "auto" }}>
          {!isPlayed && (
            <p className="text-sm" style={{ color: COLORS.muted }}>Este Gran Premio todavía no se ha disputado.</p>
          )}
          {isPlayed && !entry && (
            <p className="text-sm" style={{ color: COLORS.muted }}>No se guardaron datos de este Gran Premio.</p>
          )}
          {isPlayed && entry && (
            <>
              <CategoryTabSelector value={tab} onChange={setTab} accent={accent} size="compact" />
              <div className="space-y-1">
                {(entry.results[tab] || []).map((r) => (
                  <div key={r.riderId} className="flex items-center px-1 py-1.5 text-sm" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
                    <span className="w-6 text-right font-mono text-xs flex-shrink-0" style={{ color: r.position <= 3 ? COLORS.gold : COLORS.muted }}>{r.crashed ? "-" : r.position}</span>
                    <span className="flex-1 ml-2 min-w-0 truncate">{r.name}</span>
                    <span className="text-xs truncate ml-2" style={{ color: COLORS.muted, maxWidth: 140 }}>{r.teamName}</span>
                    <span className="w-14 text-right font-mono ml-2 flex-shrink-0" style={{ color: r.crashed ? COLORS.danger : accent }}>{r.crashed ? "DNF" : `${r.points} pts`}</span>
                  </div>
                ))}
                {(!entry.results[tab] || entry.results[tab].length === 0) && (
                  <p className="text-sm" style={{ color: COLORS.muted }}>Sin datos para esta categoría.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

