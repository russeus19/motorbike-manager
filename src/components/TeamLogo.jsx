import { useState, useEffect } from "react";
import { teamDisplayName } from "../utils/teamNaming.js";

const LOGO_BASE = "/assets/teams";
const DEFAULT_LOGO = `${LOGO_BASE}/default.png`;

/**
 * Renders a team's logo without ever hard-coding a path per team: the
 * image URL is built automatically from the team's stable `logoId`
 * (`/assets/teams/<logoId>.png`), which lives in the team's data and is
 * completely independent of its display name — renaming a team or
 * changing its sponsor never breaks the logo.
 *
 * Adding a new team's logo later is a pure asset drop: put the PNG at
 * `public/assets/teams/<logoId>.png` and it's picked up automatically,
 * no code changes required.
 *
 * If `logoId` is missing, or the image fails to load (404, corrupt
 * file, etc.), it falls back to `default.png` instead of a broken
 * image icon or a console error the user has to chase down.
 *
 * Usage: <TeamLogo team={playerTeam} size={56} />
 * or:    <TeamLogo logoId={team.logoId} size={48} />
 * or, for a size that needs to differ by breakpoint (mobile vs
 * desktop): <TeamLogo team={playerTeam} sizeClassName="w-14 h-14 sm:w-[72px] sm:h-[72px]" />
 * — sizeClassName takes over from the fixed size prop entirely when
 * given, since Tailwind's responsive classes can't win against a fixed
 * inline width/height.
 */
export function TeamLogo({ team, logoId, size = 48, sizeClassName, className = "", alt }) {
  const resolvedId = logoId || team?.logoId || null;
  const initialSrc = resolvedId ? `${LOGO_BASE}/${resolvedId}.png` : DEFAULT_LOGO;
  const [src, setSrc] = useState(initialSrc);

  // If the team/logoId changes (e.g. switching teams in career mode),
  // re-resolve the source instead of getting stuck on a stale fallback.
  useEffect(() => {
    setSrc(resolvedId ? `${LOGO_BASE}/${resolvedId}.png` : DEFAULT_LOGO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId]);

  return (
    <img
      src={src}
      alt={alt || (team?.name ? `Logo de ${teamDisplayName(team)}` : "Logo del equipo")}
      {...(sizeClassName ? {} : { width: size, height: size })}
      loading="lazy"
      decoding="async"
      className={`${sizeClassName || ""} ${className}`}
      style={sizeClassName ? { objectFit: "contain", flexShrink: 0 } : { width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      onError={() => {
        // Avoid an infinite loop if default.png itself is ever missing.
        if (src !== DEFAULT_LOGO) setSrc(DEFAULT_LOGO);
      }}
    />
  );
}
