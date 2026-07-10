import { useState, useEffect } from "react";

const PHOTO_BASE = "/assets/riders";
const DEFAULT_PHOTO = `${PHOTO_BASE}/default.png`;

/**
 * Renders a rider's photo without ever depending on their display name:
 * the image URL is built automatically from the rider's permanent `id`
 * (`/assets/riders/<id>.png`), the same identifier assigned once at
 * creation (see utils/idGenerator.js) and kept for that rider's entire
 * life in the save — official rider, free agent, substitute, or rookie,
 * it's exactly the same lookup.
 *
 * Adding a photo later is a pure asset drop: put the PNG at
 * `public/assets/riders/<id>.png` (e.g. `r7.png`) — no code changes.
 *
 * If the rider has no photo yet, or the image fails to load, it falls
 * back to `default.png` instead of a broken image icon.
 *
 * Usage: <RiderPhoto rider={rider} size={72} />
 * or:    <RiderPhoto riderId={rider.id} size={32} shape="circle" />
 */
export function RiderPhoto({ rider, riderId, size = 40, shape = "square", className = "" }) {
  const resolvedId = riderId || rider?.photoId || rider?.id || null;
  const initialSrc = resolvedId ? `${PHOTO_BASE}/${resolvedId}.png` : DEFAULT_PHOTO;
  const [src, setSrc] = useState(initialSrc);

  // Re-resolve if we're handed a different rider (e.g. list re-renders
  // with a recycled component instance) instead of getting stuck on a
  // stale fallback image.
  useEffect(() => {
    setSrc(resolvedId ? `${PHOTO_BASE}/${resolvedId}.png` : DEFAULT_PHOTO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId]);

  return (
    <img
      src={src}
      alt={rider?.name ? `Foto de ${rider.name}` : "Foto del piloto"}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: shape === "circle" ? "9999px" : "8px",
        flexShrink: 0,
      }}
      onError={() => {
        // Avoid an infinite loop if default.png itself is ever missing.
        if (src !== DEFAULT_PHOTO) setSrc(DEFAULT_PHOTO);
      }}
    />
  );
}
