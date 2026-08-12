import { useState, useEffect } from "react";
import { COLORS } from "../data/colors.js";
import { sponsorId } from "../utils/sponsorAssets.js";

const SPONSOR_BASE = "/assets/sponsors";

/**
 * Renders a sponsor's logo, resolved automatically from its name via
 * sponsorId (a pure, deterministic slug — no id needs storing
 * anywhere). Image lives at `/assets/sponsors/<sponsorId(name)>.png`
 * and needs no code change to add: drop the file in with the right
 * name and it appears — see public/assets/sponsors/README.md for the
 * full name-to-filename list.
 *
 * If the logo is missing, or fails to load, falls back to the
 * sponsor's own name as a plain text badge instead of a broken image
 * icon — always shows something meaningful even before any real logos
 * exist.
 *
 * Usage: <SponsorLogo name={sponsor.name} height={40} />
 */
export function SponsorLogo({ name, height = 36, className = "", alt }) {
  const id = sponsorId(name);
  const initialSrc = id ? `${SPONSOR_BASE}/${id}.png` : null;
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(!initialSrc);

  useEffect(() => {
    const next = id ? `${SPONSOR_BASE}/${id}.png` : null;
    setSrc(next);
    setFailed(!next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (failed || !src) {
    return (
      <span className={`text-sm font-bold text-center ${className}`} style={{ color: COLORS.text, fontFamily: "Rajdhani, sans-serif" }}>
        {name}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt || `Logo de ${name}`}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ height, maxWidth: "100%", objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}
