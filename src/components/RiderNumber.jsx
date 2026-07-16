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
 */
export function RiderNumber({ rider, riderId, number, size = 32, className = "" }) {
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
    return (
      <div
        className={className}
        style={{
          width: size, height: size, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "6px", background: "#1C2128",
          fontFamily: "Rajdhani, sans-serif", fontWeight: 700, color: "#E3A427",
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
