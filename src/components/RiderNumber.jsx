import { useState, useEffect } from "react";

const NUMBER_BASE = "/assets/numbers";
const DEFAULT_NUMBER = `${NUMBER_BASE}/default.png`;

/**
 * Renders a rider's real race number graphic — each design is personal
 * to that rider (the same number can look completely different on two
 * different riders), so the image is keyed by the rider's permanent
 * `id` (same identifier RiderPhoto uses), never by the number itself.
 *
 * Adding a rider's number later is a pure asset drop: put the PNG at
 * `public/assets/numbers/<id>.png` (e.g. `r7.png`) — no code changes.
 *
 * If the rider has no dorsal graphic yet, or the image fails to load,
 * it falls back to a generic numbered badge using `rider.number`
 * instead of a broken image icon.
 *
 * Usage: <RiderNumber rider={rider} size={32} />
 * or:    <RiderNumber riderId={rider.id} number={rider.number} size={24} />
 *
 * Pass `plain` to drop the dark rounded box behind the fallback digits
 * (used where the number needs to sit directly on the page/panel
 * background instead of looking like its own little badge — e.g. the
 * rider profile screen).
 *
 * Pass `categoryKey` so the fallback digits can use Supersport's own
 * blue (#344ec4) instead of the default orange — purely a Supersport
 * quirk, every other category keeps the original orange regardless of
 * `categoryKey`. Only matters for riders who don't have a real dorsal
 * graphic yet; once a rider gets a real dorsal PNG, this has no effect.
 *
 * Pass `alignStart` to left-align the fallback digits within their box
 * instead of centering them, and let the box hug the digits' actual
 * width instead of reserving the full `size` — useful when the number
 * sits directly above something narrower (like a small flag) that
 * starts flush at the same left edge and is immediately followed by
 * more content (name, badge…): reserving the full square width would
 * push everything after it too far right even with the text
 * left-aligned inside.
 */
export function RiderNumber({ rider, riderId, number, size = 32, className = "", plain = false, categoryKey = null, alignStart = false }) {
  const resolvedId = riderId || rider?.photoId || rider?.id || null;
  const resolvedNumber = number ?? rider?.number ?? null;
  const initialSrc = resolvedId ? `${NUMBER_BASE}/${resolvedId}.png` : DEFAULT_NUMBER;
  const [src, setSrc] = useState(initialSrc);

  useEffect(() => {
    setSrc(resolvedId ? `${NUMBER_BASE}/${resolvedId}.png` : DEFAULT_NUMBER);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId]);

  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [resolvedId]);

  if (broken || !resolvedId) {
    if (!Number.isFinite(resolvedNumber)) return null;
    const isSupersport = categoryKey === "supersport";
    return (
      <div
        className={className}
        style={{
          width: alignStart ? "auto" : size, height: size, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: alignStart ? "flex-start" : "center",
          borderRadius: plain ? 0 : "6px",
          background: plain ? "transparent" : "#1C2128",
          fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
          color: isSupersport ? "#344ec4" : "#E3A427",
          fontSize: size * 0.5,
        }}>
        {resolvedNumber}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={Number.isFinite(resolvedNumber) ? `Dorsal ${resolvedNumber}` : "Dorsal del piloto"}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      onError={() => setBroken(true)}
    />
  );
}
