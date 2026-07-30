import { CATEGORY_DATA } from "../data/categories.js";
import { COLORS } from "../data/colors.js";

// The two "ladders" the game's six categories fall into. Adding a
// seventh category later means adding it to whichever ladder it
// belongs to here — everywhere that renders <CategoryTabSelector>
// picks it up automatically, no per-screen changes needed.
export const CATEGORY_LADDERS = {
  motogp: { label: "MotoGP", categories: ["motogp", "moto2", "moto3"] },
  worldsbk: { label: "WorldSBK", categories: ["superbikes", "supersport", "sportbike", "worldwcr"] },
};

function ladderOf(categoryKey) {
  return Object.keys(CATEGORY_LADDERS).find((l) => CATEGORY_LADDERS[l].categories.includes(categoryKey)) || "motogp";
}

/** Two-level category picker: a top row of "parent" ladder tabs
 * (MotoGP / WorldSBK), and directly below it, a sub-row of that
 * ladder's own three categories — replacing what used to be a single
 * flat row of all six category tabs at once. That flat row reliably
 * broke into an orphaned, disconnected-looking second line on a phone
 * screen once Sportbike became the sixth category; splitting into two
 * levels keeps each row to at most 3 items, which fits on one line at
 * normal phone widths regardless of how many more categories get added
 * to either ladder later.
 *
 * The active ladder is DERIVED from `value` (whichever ladder contains
 * the currently selected category), not tracked as separate state —
 * so if `value` changes from outside (e.g. a career promotion), the
 * right parent tab expands automatically instead of needing to be
 * kept in sync by hand. Clicking a parent tab that isn't already
 * active jumps straight to that ladder's own top category (its first
 * entry) rather than just revealing an empty sub-row with nothing
 * selected. `playerCategory`, if given, adds the "(tuya)" suffix to
 * whichever sub-tab is the one actually being played, exactly like
 * the old single-row version did. */
export function CategoryTabSelector({ value, onChange, accent, playerCategory, size = "normal", renderExtra }) {
  const activeLadder = ladderOf(value);
  const pad = size === "compact" ? "px-2.5 py-1" : "px-3 py-1.5";
  const textSize = size === "compact" ? "text-xs" : "text-sm";

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2 mb-1.5">
        {Object.entries(CATEGORY_LADDERS).map(([ladderKey, ladder]) => {
          const isActive = ladderKey === activeLadder;
          return (
            <button key={ladderKey}
              onClick={() => { if (!isActive) onChange(ladder.categories[0]); }}
              className={`${pad} ${textSize} rounded-full font-bold transition-transform active:scale-95`}
              style={{
                background: isActive ? (accent || COLORS.gold) : COLORS.panel2,
                color: isActive ? "#12151A" : COLORS.text,
                border: `1px solid ${isActive ? (accent || COLORS.gold) : COLORS.rule}`,
                fontFamily: "Rajdhani, sans-serif",
              }}>
              {ladder.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_LADDERS[activeLadder].categories.map((ck) => {
          const isActive = ck === value;
          return (
            <button key={ck} onClick={() => onChange(ck)}
              className={`${pad} ${textSize} rounded font-semibold transition-transform active:scale-95`}
              style={{
                background: isActive ? (accent || COLORS.gold) : COLORS.panel2,
                color: isActive ? "#12151A" : COLORS.muted,
                border: `1px solid ${isActive ? (accent || COLORS.gold) : COLORS.rule}`,
                fontFamily: "Rajdhani, sans-serif",
              }}>
              {CATEGORY_DATA[ck].label}{ck === playerCategory ? " (tuya)" : ""}{renderExtra ? ` ${renderExtra(ck)}` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
