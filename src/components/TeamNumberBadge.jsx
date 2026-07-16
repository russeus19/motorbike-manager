import { useEffect, useState } from "react";

const NUMBER_BASE = "/assets/numbers";

/**
 * The rounded team-color rectangle is always the base. When the rider
 * has real dorsal artwork (same asset path as RiderNumber:
 * `/assets/numbers/<id>.png`, keyed by the rider's permanent id), it's
 * layered on top of that rectangle; if there's no real image yet (or it
 * fails to load), the rectangle alone shows the number in text instead.
 */
export function TeamNumberBadge({ color, number, riderId, size = 48 }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [riderId]);

  if (!Number.isFinite(number)) return null;
  const height = size * 0.72;

  return (
    <div
      className="flex-shrink-0 self-center relative flex items-center justify-center overflow-hidden"
      style={{ width: size, height, borderRadius: "5px", background: color }}>
      {riderId && !broken ? (
        <img
          src={`${NUMBER_BASE}/${riderId}.png`}
          alt={`Dorsal ${number}`}
          width={size}
          height={height}
          loading="lazy"
          decoding="async"
          style={{ width: size, height, objectFit: "contain" }}
          onError={() => setBroken(true)}
        />
      ) : (
        <span style={{ color: "#12151A", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: size * 0.42, lineHeight: 1 }}>
          {number}
        </span>
      )}
    </div>
  );
}
