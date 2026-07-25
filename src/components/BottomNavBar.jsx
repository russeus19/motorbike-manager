import { COLORS } from "../data/colors.js";
import { SEASON_TABS } from "../data/navigationTabs.js";

/**
 * Same visual language as the rest of today's pass: an icon inside a
 * color-ringed circle for whichever tab is active (matching Panel's
 * header icon, HomeCard, TeamPickCard), a soft blur behind the whole
 * bar instead of a flat panel color, and a quick scale/color transition
 * on every interaction instead of an instant, static swap.
 */
export function BottomNavBar({ active, onChange, accent, badgeTabs }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background: "rgba(27,31,38,0.92)",
        backdropFilter: "blur(10px)",
        borderTop: `1px solid ${COLORS.rule}`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -6px 18px rgba(0,0,0,0.25)",
      }}
    >
      {SEASON_TABS.map((t) => {
        const isActive = active === t.key;
        const hasBadge = badgeTabs?.includes(t.key);
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-transform duration-150 active:scale-90"
          >
            <div
              className="relative flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                width: 34,
                height: 34,
                background: isActive ? `${accent}1F` : "transparent",
                border: `1px solid ${isActive ? accent : "transparent"}`,
              }}
            >
              <Icon size={18} style={{ color: isActive ? accent : COLORS.muted }} />
              {hasBadge && (
                <span className="absolute rounded-full" style={{ top: -1, right: -1, width: 9, height: 9, background: COLORS.gold, border: `2px solid ${COLORS.panel}` }} />
              )}
            </div>
            <span
              className="text-[10px] font-semibold transition-colors duration-200"
              style={{ fontFamily: "Rajdhani, sans-serif", color: isActive ? accent : COLORS.muted }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
