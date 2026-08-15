import { useState, useEffect } from "react";
import { Factory } from "lucide-react";
import { COLORS } from "../data/colors.js";
import { manufacturerInfo } from "../data/manufacturers.js";

const MANUFACTURER_BASE = "/assets/manufacturers";

/**
 * Renders a manufacturer's own logo, resolved automatically from its
 * stable id (see data/manufacturers.js). Image lives at
 * `/assets/manufacturers/<id>.png` and needs no code change to add:
 * drop the file in with the right name and it appears — see
 * public/assets/manufacturers/README.md for the full name-to-filename
 * list.
 *
 * If the logo is missing, or fails to load, falls back to a simple
 * factory icon on a soft accent-tinted circle rather than a broken
 * image icon.
 *
 * Usage: <ManufacturerLogo name="Ducati" accent={accent} size={64} />
 */
export function ManufacturerLogo({ name, accent = COLORS.gold, size = 56, className = "" }) {
  const { id } = manufacturerInfo(name);
  const initialSrc = id ? `${MANUFACTURER_BASE}/${id}.png` : null;
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(!initialSrc);

  useEffect(() => {
    const next = id ? `${MANUFACTURER_BASE}/${id}.png` : null;
    setSrc(next);
    setFailed(!next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center rounded-full flex-shrink-0 ${className}`}
        style={{ width: size, height: size, background: `${accent}1A`, border: `1px solid ${accent}40` }}
      >
        <Factory size={Math.round(size * 0.5)} style={{ color: accent }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Logo de ${name}`}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}
