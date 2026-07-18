import { useEffect, useRef, useState } from "react";
import { ChevronRight, FastForward, Flag } from "lucide-react";
import { COLORS } from "../data/colors.js";
import { TeamNumberBadge } from "../components/TeamNumberBadge.jsx";

const TICK_MS = 550;

export function LiveRaceScreen({ pendingLiveRace, accent, onFinish }) {
  const { kind, laps, frames } = pendingLiveRace;
  const [lap, setLap] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [ticker, setTicker] = useState([]);
  const tickerRef = useRef(null);

  useEffect(() => {
    if (lap >= laps) return undefined;
    const id = setInterval(() => {
      setLap((prev) => Math.min(laps, prev + speed));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [lap, laps, speed]);

  // Every time the visible lap advances, fold in any events from the
  // laps just passed through (speed > 1 can skip several at once).
  const lastFoldedLap = useRef(0);
  useEffect(() => {
    if (lap <= lastFoldedLap.current) return;
    const newEvents = [];
    for (let l = lastFoldedLap.current + 1; l <= lap; l++) {
      newEvents.push(...(frames[l]?.events || []));
    }
    lastFoldedLap.current = lap;
    if (newEvents.length) setTicker((prev) => [...prev, ...newEvents]);
  }, [lap, frames]);

  useEffect(() => {
    tickerRef.current?.scrollTo({ top: tickerRef.current.scrollHeight, behavior: "smooth" });
  }, [ticker]);

  const frame = frames[lap] || frames[frames.length - 1];
  const finished = lap >= laps;

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="text-xs uppercase tracking-[0.2em] mb-1" style={{ color: COLORS.muted }}>
        {kind === "sprint" ? "Sprint en directo" : kind === "worldsbk-race1" ? "Race 1 en directo" : kind === "worldsbk-superpole" ? "Superpole Race en directo" : "Carrera en directo"}
      </div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>
        <Flag size={22} style={{ color: accent }} /> Vuelta {lap} de {laps}
      </h2>

      <div className="flex items-center gap-2 mb-4">
        {[1, 4, 10].map((s) => (
          <button key={s} onClick={() => setSpeed(s)}
            className="text-xs px-3 py-1.5 rounded font-semibold"
            style={{
              background: speed === s ? accent : COLORS.panel2,
              color: speed === s ? "#12151A" : COLORS.muted,
              border: `1px solid ${speed === s ? accent : COLORS.rule}`,
              fontFamily: "Rajdhani, sans-serif",
            }}>
            x{s}
          </button>
        ))}
        <button onClick={() => setLap(laps)}
          className="text-xs px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 ml-auto"
          style={{ background: COLORS.panel2, color: COLORS.muted, border: `1px solid ${COLORS.rule}`, fontFamily: "Rajdhani, sans-serif" }}>
          <FastForward size={14} /> Saltar al resultado
        </button>
      </div>

      {finished && (
        <button onClick={onFinish}
          className="w-full mb-4 py-3 rounded-md font-bold flex items-center justify-center gap-2"
          style={{ background: accent, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
          Ver resultado <ChevronRight size={18} />
        </button>
      )}

      <div ref={tickerRef} className="rounded-lg p-3 mb-4 text-xs space-y-1.5" style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, maxHeight: 160, overflowY: "auto" }}>
        {ticker.length === 0 && <p style={{ color: COLORS.muted }}>La carrera está a punto de arrancar...</p>}
        {ticker.map((line, i) => (
          <p key={i} style={{ color: COLORS.text }}>{line}</p>
        ))}
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: COLORS.rule }}>
        {frame.order.map((r, i) => {
          const gapAhead = i === 0 ? null : r.gap - frame.order[i - 1].gap;
          return (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm"
              style={{ background: i % 2 === 0 ? COLORS.panel : COLORS.panel2, borderBottom: `1px solid ${COLORS.rule}` }}>
              <span className="w-5 text-right font-mono flex-shrink-0" style={{ color: i < 3 ? accent : COLORS.muted }}>{i + 1}</span>
              <TeamNumberBadge color={r.teamColor} number={r.number} riderId={r.photoId ?? r.id} size={30} />
              <span className="truncate flex-1">{r.name}</span>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: COLORS.muted }}>
                {gapAhead == null ? "Líder" : `+${gapAhead.toFixed(3)}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
