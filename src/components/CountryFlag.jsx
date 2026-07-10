import { useState, useEffect } from "react";
import { countryIdFromEmoji } from "../data/countryFlags.js";

const FLAG_BASE = "/assets/country";
const DEFAULT_FLAG = `${FLAG_BASE}/default.png`;

/**
 * Renders a country flag as a real image instead of an emoji — emojis
 * render inconsistently (or not at all) across devices/OSes, which is
 * exactly the problem this replaces.
 *
 * Accepts whatever the game already has on hand: the emoji stored on a
 * rider (`nat`) or a circuit (`flag`), or a resolved `countryId` slug
 * directly. The path is always built automatically
 * (`/assets/country/<slug>.png`) — never a manually maintained list.
 *
 * Falls back to `default.png` if the country can't be resolved, or if
 * the image fails to load, so a broken/missing flag never shows up as a
 * broken image icon.
 *
 * Usage: <CountryFlag nat={rider.nat} />
 * or:    <CountryFlag nat={circuitProfile.flag} width={24} />
 * or:    <CountryFlag countryId="spain" width={24} />
 */
export function CountryFlag({ nat, countryId, width = 20, className = "", alt }) {
  const resolvedId = countryId || countryIdFromEmoji(nat) || null;
  const initialSrc = resolvedId ? `${FLAG_BASE}/${resolvedId}.png` : DEFAULT_FLAG;
  const [src, setSrc] = useState(initialSrc);

  useEffect(() => {
    setSrc(resolvedId ? `${FLAG_BASE}/${resolvedId}.png` : DEFAULT_FLAG);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId]);

  const height = Math.round((width * 170) / 256);

  return (
    <img
      src={src}
      alt={alt || (resolvedId ? `Bandera de ${resolvedId.replace(/_/g, " ")}` : "Bandera")}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ width, height, objectFit: "cover", borderRadius: 2, flexShrink: 0, display: "inline-block" }}
      onError={() => {
        if (src !== DEFAULT_FLAG) setSrc(DEFAULT_FLAG);
      }}
    />
  );
}
