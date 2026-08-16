import { useState, useEffect } from "react";
import { Bike } from "lucide-react";
import { COLORS } from "../data/colors.js";
import { manufacturerInfo } from "../data/manufacturers.js";

const REVEAL_BASE = "/assets/manufacturer-bike-reveal";

/**
 * A manufacturer's own "season reveal" bike photo — deliberately
 * separate from BikePhoto (which shows a team's own livery) and from
 * ManufacturerLogo (a small badge/icon): this is the big, dramatic
 * shot used specifically by SeasonBikeRevealScreen, one per
 * manufacturer rather than one per team, since every team riding that
 * manufacturer's customerTop/factory spec is riding visually the same
 * bike underneath its own paint. Expected to be a plain black
 * silhouette with the manufacturer's own name/logo on it (the same
 * flavor real manufacturers use for a generic "here's the bike"
 * reveal shot before liveries are finalized), living at
 * `/assets/manufacturer-bike-reveal/<id>.jpg` — see that folder's own
 * README for the full id list. Falls back to a simple bike icon on a
 * dark card if the image is missing or fails to load, exactly like
 * every other photo component in this game already does.
 */
export function ManufacturerBikeRevealPhoto({ manufacturer, accent = COLORS.gold, className = "" }) {
  const { id } = manufacturerInfo(manufacturer);
  const initialSrc = id ? `${REVEAL_BASE}/${id}.jpg` : null;
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(!initialSrc);

  useEffect(() => {
    const next = id ? `${REVEAL_BASE}/${id}.jpg` : null;
    setSrc(next);
    setFailed(!next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center rounded-xl ${className}`} style={{ background: "#171723", border: `1px solid ${accent}40` }}>
        <Bike size={96} style={{ color: accent, opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Moto ${manufacturer} — temporada nueva`}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ objectFit: "contain", background: "#171723" }}
      onError={() => setFailed(true)}
    />
  );
}
