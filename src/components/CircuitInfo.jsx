import { useState, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, MapPin, X } from "lucide-react";
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



const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Which of the 22 shared master-calendar weeks (0-21) a given category
 * actually races on. MotoGP/Moto2/Moto3 share the full 22-round
 * CIRCUITS calendar directly — no rest weeks at all, every single week
 * is a race week. The Superbikes-family categories share a real 22-week
 * master clock but only race 12 of those weeks (WorldWCR fewer still,
 * 6 of the 12) — see data/superbikesCalendar.js and data/wcrCalendar.js,
 * already used by the old list view this replaces. */
function raceMasterRoundsForCategory(category) {
  if (category === "worldwcr") return new Set(WCR_RACE_MAIN_ROUNDS);
  if (category === "superbikes" || category === "supersport" || category === "sportbike") return new Set(SUPERBIKES_RACE_MAIN_ROUNDS);
  return new Set(Array.from({ length: 22 }, (_, i) => i)); // motogp/moto2/moto3 — every week
}

/** The real session structure this game actually simulates for a race
 * weekend — see App.jsx's runSprint/runSuperbikesRace1/runSuperpoleRace:
 * only MotoGP has a sprint (not Moto2/Moto3), and only Superbikes itself
 * has a Superpole Race (not Supersport/Sportbike/WorldWCR, which race a
 * standard Race 1 + Race 2 weekend). Training isn't implemented yet —
 * shown as a placeholder on the weekdays of an active race week, ready
 * for whenever that mechanic exists, rather than pretending it's real
 * today. */
function sessionLabelsForCategory(category) {
  if (category === "motogp") return { saturday: "Clasificación · Sprint", sunday: "Carrera" };
  if (category === "moto2" || category === "moto3") return { saturday: "Clasificación", sunday: "Carrera" };
  if (category === "superbikes") return { saturday: "Superpole · Carrera 1", sunday: "Superpole Race · Carrera 2" };
  return { saturday: "Superpole · Carrera 1", sunday: "Carrera 2" }; // supersport/sportbike/worldwcr
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** The player's own finishing result for a race day, pulled from the
 * exact snapshot recorded the moment that GP was simulated (never
 * recalculated) — a short "P3 · 16 pts" style line for a raced-and-
 * recorded day, or null if it hasn't happened yet or wasn't saved. */
function playerResultLine(entry, category, playerTeam) {
  if (!entry) return null;
  const rows = entry.results?.[category] || [];
  const mine = rows.filter((r) => playerTeam?.riders?.some((pr) => pr.id === r.riderId));
  if (!mine.length) return null;
  const best = mine.reduce((a, b) => ((a.crashed ? 999 : a.position) <= (b.crashed ? 999 : b.position) ? a : b));
  return best.crashed ? "DNF" : `P${best.position} · ${best.points} pts`;
}

function DayCell({ date, inMonth, isToday, raceInfo, accent, onOpenRace }) {
  return (
    <div className="rounded-md p-2 flex flex-col gap-1.5" style={{ background: isToday ? `${accent}14` : COLORS.panel2, border: `1px solid ${isToday ? accent : COLORS.rule}`, opacity: inMonth ? 1 : 0.4, minHeight: 92 }}>
      <span className="text-xs font-semibold" style={{ color: isToday ? accent : COLORS.text }}>{date.getDate()}</span>
      {raceInfo?.kind === "race" && (
        <button onClick={() => onOpenRace(raceInfo.masterRound, raceInfo.defaultSession)}
          className="rounded px-1.5 py-1 text-left" style={{ background: raceInfo.played ? `${accent}22` : `${accent}14`, border: `1px solid ${accent}55` }}>
          <div className="text-[10px] font-bold leading-tight" style={{ color: accent }}>{raceInfo.label}</div>
          <div className="text-[10px] leading-tight truncate" style={{ color: COLORS.muted }}>{raceInfo.circuitShort}</div>
          {raceInfo.result && <div className="text-[10px] font-mono font-semibold mt-0.5" style={{ color: COLORS.text }}>{raceInfo.result}</div>}
          {raceInfo.played && !raceInfo.result && <div className="text-[10px] mt-0.5" style={{ color: COLORS.muted }}>Disputada</div>}
        </button>
      )}
      {raceInfo?.kind === "training" && (
        <div className="rounded px-1.5 py-1 border-dashed" style={{ border: `1px dashed ${COLORS.rule}` }}>
          <div className="text-[10px] leading-tight" style={{ color: COLORS.muted }}>Entrenamiento</div>
        </div>
      )}
    </div>
  );
}

function GeneralCalendarView({ viewDate, accent, gpHistory, seasonNumber, category, round, playerTeam, circuitsShort, onOpenRace }) {
  const raceMasterRounds = raceMasterRoundsForCategory(category);
  const sessionLabels = sessionLabelsForCategory(category);
  const today = dateForRound(round, seasonNumber);

  // Standard month grid: Monday-start weeks, always 6 rows so the
  // height never jumps between months.
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // 0=Monday
  const gridStart = new Date(year, month, 1 - startOffset);

  // Map every Sunday date across the season to its master round, so any
  // day in the visible grid can be tested against it directly.
  const sundayToMasterRound = new Map();
  for (let mr = 0; mr < 22; mr++) sundayToMasterRound.set(dateForRound(mr, seasonNumber).getTime(), mr);

  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    let raceInfo = null;
    if (dow === 0 || dow === 6) {
      const sunday = dow === 0 ? date : new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      const masterRound = sundayToMasterRound.get(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()).getTime());
      if (masterRound != null && raceMasterRounds.has(masterRound)) {
        const played = masterRound < round;
        const entry = played ? findGpHistoryEntry(gpHistory, seasonNumber, masterRound) : null;
        raceInfo = {
          kind: "race",
          label: dow === 6 ? sessionLabels.saturday : sessionLabels.sunday,
          circuitShort: circuitsShort[masterRound] || "",
          played,
          result: dow === 0 ? playerResultLine(entry, category, playerTeam) : null,
          masterRound,
          // Saturday opens on whichever session actually happens first
          // that day (qualifying, since every category's own weekend
          // starts there); Sunday opens straight on the decisive race
          // — the modal's own session tabs cover everything else either
          // day, this just picks a sensible starting point.
          defaultSession: dow === 6 ? "qualifying" : "main",
        };
      }
    } else {
      // Weekday of an active race week: a placeholder for training,
      // ready for whenever that mechanic actually exists.
      const sundayOfThisWeek = new Date(date);
      sundayOfThisWeek.setDate(date.getDate() + (7 - dow) % 7);
      const masterRound = sundayToMasterRound.get(new Date(sundayOfThisWeek.getFullYear(), sundayOfThisWeek.getMonth(), sundayOfThisWeek.getDate()).getTime());
      if (masterRound != null && raceMasterRounds.has(masterRound)) raceInfo = { kind: "training" };
    }
    return { date, inMonth: date.getMonth() === month, isToday: sameDay(date, today), raceInfo };
  });

  return (
    <>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-[10px] uppercase tracking-wider text-center" style={{ color: COLORS.muted }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => <DayCell key={i} {...c} accent={accent} onOpenRace={onOpenRace} />)}
      </div>
    </>
  );
}

export function CalendarPanel({ round, accent, gpHistory, seasonNumber, category, playerTeam }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState("general");
  const [selectedRound, setSelectedRound] = useState(null);
  const [selectedSession, setSelectedSession] = useState("main");

  const isSbkCalendar = category === "superbikes" || category === "supersport" || category === "sportbike" || category === "worldwcr";
  const isWcr = category === "worldwcr";
  const circuitsList = isWcr ? WCR_RACE_SBK_ROUNDS.map((i) => SUPERBIKES_CIRCUITS[i]) : isSbkCalendar ? SUPERBIKES_CIRCUITS : CIRCUITS;
  const profilesList = isWcr ? WCR_RACE_SBK_ROUNDS.map((i) => SUPERBIKES_CIRCUIT_PROFILES[i]) : isSbkCalendar ? SUPERBIKES_CIRCUIT_PROFILES : CIRCUIT_PROFILES;
  const masterRoundFor = (i) => (isWcr ? WCR_RACE_MAIN_ROUNDS[i] : isSbkCalendar ? SUPERBIKES_RACE_MAIN_ROUNDS[i] : i);

  // The General tab's grid is addressed by master round (0-21, the
  // shared 22-week clock); the Carreras list and GpResultModal are
  // addressed by index into this category's OWN circuit list — for
  // MotoGP/Moto2/Moto3 those are literally the same number, but for
  // every Superbikes-family category they're not, so opening a race
  // clicked on the General grid needs converting back the other way.
  const indexForMasterRound = (masterRound) => {
    if (!isSbkCalendar) return masterRound;
    for (let i = 0; i < circuitsList.length; i++) if (masterRoundFor(i) === masterRound) return i;
    return null;
  };
  const openRaceFromGrid = (masterRound, session) => {
    const idx = indexForMasterRound(masterRound);
    if (idx == null) return;
    setSelectedRound(idx);
    setSelectedSession(session);
  };

  // Short circuit name per master round, for the General grid's compact
  // cards — every one of the 22 weeks that IS a race week for the
  // current category maps back to one of circuitsList's entries.
  const circuitsShort = {};
  circuitsList.forEach((c, i) => { circuitsShort[masterRoundFor(i)] = c.split("—")[0].replace("Gran Premio de ", "").replace("Ronda de ", "").trim(); });

  const today = dateForRound(round, seasonNumber);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Bug fixed: viewDate's useState initial value only ever runs once,
  // on this component's first mount — season 1's month/year. Once the
  // season moved on (dateForRound shifts every round a full year
  // forward per season, see data/circuits.js), the calendar kept
  // showing season 1's dates while every race date it was trying to
  // match against was now a season ahead — nothing in the visible
  // grid could ever line up with sundayToMasterRound's entries, so
  // the whole month rendered empty. Resetting on seasonNumber
  // changing (not on every round, which would fight the "browse a
  // different month" buttons below) keeps the view correctly on the
  // new season the moment it starts, without giving up mid-season
  // browsing.
  useEffect(() => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonNumber]);

  return (
    <Panel title="Calendario" icon={MapPin} accent={accent} onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}>
      {expanded && (
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            {[["general", "General"], ["entrenamiento", "Entrenamiento"], ["carreras", "Carreras"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold"
                style={{ background: tab === key ? accent : COLORS.panel2, color: tab === key ? "#12151A" : COLORS.muted, border: `1px solid ${tab === key ? accent : COLORS.rule}` }}>
                {label}
              </button>
            ))}
          </div>

          {tab === "general" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold capitalize" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>
                  {MONTH_NAMES[viewDate.getMonth()]} de {viewDate.getFullYear()}
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                    className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                    <ChevronLeft size={14} style={{ color: COLORS.text }} />
                  </button>
                  <button onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
                    Hoy
                  </button>
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                    className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
                    <ChevronRight size={14} style={{ color: COLORS.text }} />
                  </button>
                </div>
              </div>
              <GeneralCalendarView viewDate={viewDate} accent={accent} gpHistory={gpHistory} seasonNumber={seasonNumber} category={category} round={round} playerTeam={playerTeam} circuitsShort={circuitsShort} onOpenRace={openRaceFromGrid} />
            </>
          )}

          {tab === "entrenamiento" && (
            <div className="text-center py-8">
              <p className="text-sm font-semibold mb-1" style={{ color: COLORS.text }}>Próximamente</p>
              <p className="text-xs" style={{ color: COLORS.muted }}>El entrenamiento todavía no está implementado en el juego.</p>
            </div>
          )}

          {tab === "carreras" && (
            <div className="space-y-1" style={{ maxHeight: 384, overflowY: "auto" }}>
              {circuitsList.map((c, i) => {
                const prof = profilesList[i];
                const masterRound = masterRoundFor(i);
                const status = masterRound < round ? "Disputada" : masterRound === round ? "Próxima" : "Pendiente";
                const statusColor = masterRound === round ? accent : COLORS.muted;
                return (
                  <button key={i} onClick={() => { setSelectedRound(i); setSelectedSession("main"); }}
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
          initialSession={selectedSession}
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
/** Which sessions this entry can actually show, in weekend order — a
 * save from before this session-level tracking existed will have
 * main-race data with nothing else, falling back gracefully to just
 * "Carrera"/"Race 2" with no selector to switch away from. Every
 * category's own qualifying/sprint/race1/superpole is genuinely
 * available regardless of which one is actually being played (see
 * buildGpHistoryEntry's own doc comment) — a category simply won't
 * have a given session at all if it never runs one (Moto2/Moto3 have
 * no sprint, Supersport/Sportbike/WorldWCR have no superpole race). */
function availableSessions(entry, tabCategory) {
  const mainLabel = ["superbikes", "supersport", "sportbike", "worldwcr"].includes(tabCategory) ? "Carrera 2" : "Carrera";
  const sessions = [];
  if (entry?.qualifying?.[tabCategory]?.length) sessions.push({ key: "qualifying", label: "Clasificación" });
  if (tabCategory === "motogp" && entry?.sprint?.[tabCategory]?.length) sessions.push({ key: "sprint", label: "Sprint" });
  if (["superbikes", "supersport", "sportbike", "worldwcr"].includes(tabCategory) && entry?.race1?.[tabCategory]?.length) sessions.push({ key: "race1", label: "Carrera 1" });
  if (tabCategory === "superbikes" && entry?.superpole?.[tabCategory]?.length) sessions.push({ key: "superpole", label: "Superpole Race" });
  sessions.push({ key: "main", label: mainLabel });
  return sessions;
}

function GpResultModal({ round, circuitName, isPlayed, entry, category, accent, initialSession, onClose }) {
  const [tab, setTab] = useState(category);
  const [session, setSession] = useState(initialSession && initialSession !== "main" ? initialSession : "main");
  const gpTitle = circuitName.split("—")[0].trim();
  const sessions = entry ? availableSessions(entry, tab) : [];
  const rows = session === "main" ? entry?.results?.[tab] : entry?.[session]?.[tab];

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
              <CategoryTabSelector value={tab} onChange={(v) => { setTab(v); setSession("main"); }} accent={accent} size="compact" />
              {sessions.length > 1 && (
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {sessions.map((s) => (
                    <button key={s.key} onClick={() => setSession(s.key)}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: session === s.key ? accent : COLORS.panel2, color: session === s.key ? "#12151A" : COLORS.muted, border: `1px solid ${session === s.key ? accent : COLORS.rule}` }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                {(rows || []).map((r) => (
                  <div key={r.riderId} className="flex items-center px-1 py-1.5 text-sm" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
                    <span className="w-6 text-right font-mono text-xs flex-shrink-0" style={{ color: r.position <= 3 ? COLORS.gold : COLORS.muted }}>{r.crashed ? "-" : r.position}</span>
                    <span className="flex-1 ml-2 min-w-0 truncate">{r.name}</span>
                    <span className="text-xs truncate ml-2" style={{ color: COLORS.muted, maxWidth: 140 }}>{r.teamName}</span>
                    <span className="w-14 text-right font-mono ml-2 flex-shrink-0" style={{ color: r.crashed ? COLORS.danger : accent }}>{r.crashed ? "DNF" : (r.points != null ? `${r.points} pts` : "")}</span>
                  </div>
                ))}
                {(!rows || rows.length === 0) && (
                  <p className="text-sm" style={{ color: COLORS.muted }}>Sin datos para esta sesión.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

