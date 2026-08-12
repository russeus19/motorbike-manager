import { useState, useEffect } from "react";
import { Bike } from "lucide-react";
import { COLORS } from "../data/colors.js";

const BIKE_BASE = "/assets/bikes";

/**
 * Renders a team's own bike photo, resolved automatically from its
 * stable `logoId` — the exact same identifier already used for the
 * team's logo (see TeamLogo.jsx), reused here rather than inventing a
 * second id system for the same team. Image lives at
 * `/assets/bikes/<logoId>.png` and needs no code change to add: drop
 * the file in with the right name and it appears.
 *
 * If `logoId` is missing, or the image fails to load (no file dropped
 * in yet, 404, corrupt file), falls back to a simple motorcycle icon
 * on a soft accent-tinted circle rather than a broken image icon —
 * useful right away, before any real photos exist.
 *
 * `sizeClassName` (Tailwind responsive width/height classes, e.g.
 * "w-40 sm:w-full") takes over from the fixed `size` prop entirely
 * when given — same pattern as TeamLogo, for a size that needs to
 * scale up at a breakpoint instead of staying fixed.
 *
 * `objectFit`/`objectPosition` default to "contain"/"center" (shrink
 * to fit, nothing cropped) — pass objectFit="cover" with an
 * objectPosition biased toward the top (e.g. "center 15%") to instead
 * fill the whole box edge to edge, tightly cropped on the bike's own
 * front/cockpit — the visually busiest, most recognizable part of a
 * front-on team livery photo — rather than shrinking the entire bike
 * down into a mostly-empty box.
 *
 * Usage: <BikePhoto team={playerTeam} accent={accent} size={220} />
 * or:    <BikePhoto team={playerTeam} accent={accent} sizeClassName="w-40 sm:w-full" />
 */
export function BikePhoto({ team, logoId, accent = COLORS.gold, size = 200, sizeClassName, objectFit = "contain", objectPosition = "center", className = "", alt }) {
  const resolvedId = logoId || team?.logoId || null;
  const initialSrc = resolvedId ? `${BIKE_BASE}/${resolvedId}.png` : null;
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(!initialSrc);

  useEffect(() => {
    const next = resolvedId ? `${BIKE_BASE}/${resolvedId}.png` : null;
    setSrc(next);
    setFailed(!next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId]);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center rounded-full flex-shrink-0 ${sizeClassName || ""} ${className}`}
        style={sizeClassName ? { background: `${accent}1A`, border: `1px solid ${accent}40` } : { width: size, height: size, background: `${accent}1A`, border: `1px solid ${accent}40` }}
      >
        <Bike size={sizeClassName ? "60%" : Math.round(size * 0.42)} style={{ color: accent }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || (team?.name ? `Moto de ${team.name}` : "Moto del equipo")}
      loading="lazy"
      decoding="async"
      className={`${sizeClassName || ""} ${className}`}
      style={sizeClassName ? { objectFit, objectPosition, flexShrink: 0 } : { width: size, height: "auto", maxHeight: size * 1.5, objectFit, objectPosition, flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}
