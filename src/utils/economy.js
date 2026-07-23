/**
 * Shared race-weekend economics — used by both the player (App.jsx) and
 * every AI team (utils/raceWeekend.js), so there's exactly one place
 * that defines "how much does finishing here pay" and "how much does
 * running a team cost this weekend" instead of the same two formulas
 * duplicated in both files.
 *
 * Both pieces were tuned against a MotoGP-sized grid (~22 riders) and
 * didn't originally know how big the category they're running in
 * actually is. That was invisible for MotoGP/Moto2/Moto3/WorldSBK (all
 * close enough to 22 that it barely mattered) but broke badly for
 * WorldSSP's real 42-rider grid: the position bonus cut off at a fixed
 * "position 16", so anyone from 16th to 42nd — roughly the entire
 * second half of the field — was paid as if they were a backmarker,
 * even a team finishing dead in the middle of the grid. Combined with
 * a running cost that didn't vary by team tier at all, that made it
 * mathematically impossible for the weaker half of a big grid to break
 * even, no matter how well they raced relative to their own
 * expectations.
 */

// The formula's original tuning target: on a 22-rider grid, positions
// 1-15 earn a shrinking bonus on top of the floor, and 16th onward gets
// just the floor. Every other grid size scales relative to this.
const REFERENCE_GRID_SIZE = 22;
const REFERENCE_BONUS_POSITIONS = 16;
const BASE_PRIZE_UNIT = 28000;
const BASE_FLOOR = 20000;
const BASE_RUNNING_COST = 130000;

/** How much a single rider's result is worth this GP. `gridSize` is the
 * number of riders who actually raced in their category that weekend —
 * pass the real number whenever it's known; anything falsy falls back
 * to the 22-rider reference so nothing breaks if a caller can't supply
 * it. The bonus zone (and how much each position within it is worth)
 * both scale with the real grid, but the value of P1 stays close to
 * what it's always been — winning is still worth winning, this only
 * changes how the rest of a bigger field is treated. */
export function prizeForPosition(position, crashed, scale, gridSize) {
  const floor = Math.round(BASE_FLOOR * scale);
  if (crashed) return floor;
  const grid = gridSize && gridSize > 0 ? gridSize : REFERENCE_GRID_SIZE;
  const bonusCutoff = Math.ceil(grid * (REFERENCE_BONUS_POSITIONS / REFERENCE_GRID_SIZE));
  const unit = Math.max(1, Math.round(BASE_PRIZE_UNIT * scale * (REFERENCE_GRID_SIZE / grid)));
  return Math.max(floor, (bonusCutoff - position) * unit);
}

// A Fábrica team's championship-level running costs are real; a
// one-bike Independiente privateer's genuinely aren't the same
// operation. Tiers are shared verbatim across every category's team
// data (data/teams*.js), so this table applies everywhere unchanged.
const TIER_RUNNING_COST_FACTOR = {
  "Fábrica": 1.0,
  "Puntero": 0.9,
  "Satélite": 0.8,
  "Independiente": 0.65,
};

/** Flat per-GP running cost for a team of this tier, at this category's
 * scale. Unknown/missing tier defaults to the full cost rather than
 * quietly discounting a team the game doesn't recognize. */
export function teamRunningCost(scale, tier) {
  const factor = TIER_RUNNING_COST_FACTOR[tier] ?? 1;
  return Math.round(BASE_RUNNING_COST * scale * factor);
}
