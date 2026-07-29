import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { CountryFlag } from "./CountryFlag.jsx";
import { CircuitDetailContent } from "./CircuitInfo.jsx";
import { COLORS } from "../data/colors.js";

const CIRCUIT_ASSET_BASE = "/assets/circuits";

/** Background photo for a circuit — grandstand/track scenery, purely
 * decorative. Falls back to a plain dark gradient (no broken-image
 * icon, no missing asset ever visible to the player) if the file
 * hasn't been uploaded yet, exactly like TeamLogo/RiderPhoto already
 * do for their own images. Path: public/assets/circuits/<ladder>/<index>/bg.jpg
 * — <ladder> is "motogp" for the 22 main-calendar circuits, or
 * "superbikes" for the 12 shared by Superbikes/Supersport/Sportbike. */
function CircuitBackgroundPhoto({ ladder, index }) {
  const src = `${CIRCUIT_ASSET_BASE}/${ladder}/${index}/bg.jpg`;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) {
    return <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1a1d24, #0e1014)" }} />;
  }
  return (
    <img src={src} alt="" loading="lazy" decoding="async"
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => setFailed(true)} />
  );
}

/** The real circuit outline (the same SVG used for the 2D live-race
 * view) drawn in white over the background photo, purely as visual
 * flavor here. Renders nothing at all if the file is missing — an
 * absent decorative line is much less jarring than an absent photo,
 * so no gradient fallback is needed here. Path:
 * public/assets/circuits/<ladder>/<index>/outline.svg */
function CircuitOutlineOverlay({ ladder, index }) {
  const src = `${CIRCUIT_ASSET_BASE}/${ladder}/${index}/outline.svg`;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) return null;
  return (
    <img src={src} alt="" loading="lazy" decoding="async"
      className="absolute right-3 bottom-3 w-24 h-24 object-contain opacity-90"
      style={{ filter: "brightness(0) invert(1)" }}
      onError={() => setFailed(true)} />
  );
}

/** The big "próxima carrera" hero card for the Inicio tab — circuit
 * name, background photo, outline overlay, key stats, and the
 * days-until-next-race text built in utils around dateForRound.
 * `ladder`/`assetIndex` pick which image folder this circuit's photo
 * and outline live in (see the two components above); `laps` is
 * optional since not every caller may have looked up the category's
 * lap count. */
export function CircuitHero({ gpName, circuitName, circuitProfile, ladder, assetIndex, accent, laps, daysLabel }) {
  const c = circuitProfile;
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ border: `1px solid ${COLORS.rule}` }}>
      <div className="relative" style={{ height: 220 }}>
        <CircuitBackgroundPhoto ladder={ladder} index={assetIndex} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,11,14,0.92), rgba(10,11,14,0.15) 60%)" }} />
        <CircuitOutlineOverlay ladder={ladder} index={assetIndex} />
        <div className="absolute inset-0 p-4 flex flex-col justify-end">
          <div className="flex items-center gap-1.5 mb-1">
            <CountryFlag nat={c.flag} width={16} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: COLORS.muted }}>Próxima carrera</span>
          </div>
          <h3 className="text-xl font-bold leading-tight" style={{ fontFamily: "Rajdhani, sans-serif" }}>{gpName}</h3>
          <p className="text-xs" style={{ color: COLORS.muted }}>{circuitName || ""}</p>
        </div>
      </div>
      <div className="px-4 py-2.5 flex items-center justify-between text-xs" style={{ background: COLORS.panel, color: COLORS.muted }}>
        <span className="flex items-center gap-1"><MapPin size={12} /> {c.lengthKm} km</span>
        <span>{c.cornersLeft + c.cornersRight} curvas</span>
        {laps != null && <span>{laps} vueltas</span>}
        <span>☀️ {c.dryPct}% · 🌧️ {c.wetPct}%</span>
      </div>
      {/* This row always shows — "Ver información del circuito" isn't
          tied to whether a day-countdown happens to be computable
          (it isn't, on a fresh season's very first round, since
          there's no previous round yet to count forward from). Bug
          fixed: both used to live behind the same `daysLabel &&`
          check, so the whole row — link included — silently vanished
          whenever there was no countdown to show, not just the days
          text specifically. */}
      <button onClick={() => setShowDetails((v) => !v)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-sm font-bold"
        style={{ background: COLORS.panel2, color: accent, fontFamily: "Rajdhani, sans-serif" }}>
        <span>{daysLabel || ""}</span>
        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: COLORS.muted }}>
          Ver información del circuito
          {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {showDetails && (
        <div className="px-4 py-3" style={{ background: COLORS.panel }}>
          <CircuitDetailContent circuitProfile={c} accent={accent} />
        </div>
      )}
    </div>
  );
}
