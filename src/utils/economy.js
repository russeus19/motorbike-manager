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

// Real championship points (in this sport, same as MotoGP's actual
// system) ALWAYS go to the top 15 riders, full stop — never top-X% of
// however big the grid happens to be. A rider finishing 20th scores
// zero championship points whether the grid has 22 riders or 42.
// Scaling this bonus zone to grid size (an earlier version of this
// function did exactly that) broke that link: a Supersport rider
// finishing 20th of 42 — genuinely outside the points, a result with
// nothing to show for it — was still earning a serious economic bonus,
// because the bonus zone had been stretched out past position 30 to
// "cover" a bigger grid. That's how a team scoring zero points across
// three straight races still turned a real profit. The bonus zone
// stays fixed at the real points-paying positions regardless of grid
// size; `gridSize` is kept as a parameter so callers don't need to
// change, but it no longer affects anything here.
const BONUS_POSITIONS = 16;
const BASE_PRIZE_UNIT = 28000;
// Calibrated against the weakest real case: an Independiente team that
// scores nothing all season (outside the top 15 every single race).
// 28,000 was the first pass and brought that team to roughly
// break-even on running cost + prize alone. It didn't yet account for
// salaries (a separate, later fix) — once those were added to the
// picture, a handful of real teams whose riders' market-rate salaries
// outstrip what their team-level results can earn back turned out to
// still be losing real money even with a sponsor. 35,000 is a further,
// partial reinforcement against that — it meaningfully shrinks (doesn't
// eliminate) the worst cases, without pushing the floor so high that
// it starts swallowing the real top-15 bonus zone too (that point is
// somewhere around 55,000-60,000, where even a rider finishing 13th
// with real championship points would earn no more than the floor —
// well past the useful range). The remaining gap for a genuinely
// mismatched roster (an experienced, market-expensive rider on a team
// that can't back it up in results) is a salary-side problem, not a
// prize-side one — see teamSalaryCost below.
const BASE_FLOOR = 35000;
const BASE_RUNNING_COST = 130000;

/** How much a single rider's result is worth this GP. Positions 1-15
 * earn a shrinking bonus on top of the floor; 16th and beyond earn just
 * the floor — same zone real championship points use, regardless of
 * how many riders are actually on the grid. `gridSize` is accepted for
 * call-site compatibility but not used in the calculation. */
export function prizeForPosition(position, crashed, scale, gridSize) {
  const floor = Math.round(BASE_FLOOR * scale);
  if (crashed) return floor;
  const unit = Math.max(1, Math.round(BASE_PRIZE_UNIT * scale));
  return Math.max(floor, (BONUS_POSITIONS - position) * unit);
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

// Everything else in the economy (prize money, salaries, sponsor
// income) reuses the same linear `scale` per category, which is fine
// for things that really do track a category's overall prestige/money
// pretty much proportionally. Running cost doesn't really work that
// way in real life — a MotoGP weekend means several articulated
// trucks, a hospitality unit, and dozens of people trackside; a
// WorldSSP privateer's weekend is a van and a handful of mechanics.
// That gap is bigger than a straight linear scale-down implies, so
// running cost bends the category scale through its own exponent
// before applying it — MotoGP (scale 1) is completely unaffected by
// this (1^x is always 1), and every category below it ends up paying
// proportionally less structure cost than the flat linear version
// would have charged, without touching anything else in the economy.
const LOGISTICS_CURVE_EXPONENT = 1.6;

/** Flat per-GP running cost for a team of this tier, at this category's
 * scale. Unknown/missing tier defaults to the full cost rather than
 * quietly discounting a team the game doesn't recognize. */
export function teamRunningCost(scale, tier) {
  const factor = TIER_RUNNING_COST_FACTOR[tier] ?? 1;
  const logisticsScale = Math.pow(clamp01(scale), LOGISTICS_CURVE_EXPONENT);
  return Math.round(BASE_RUNNING_COST * logisticsScale * factor);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v || 0));
}

// Salaries (utils/riders.js#computeSalary, negotiated in
// utils/marketNegotiations.js) are always an ANNUAL figure — "€X/año"
// is literally what the negotiation log prints — so charging the whole
// number every GP would be wildly wrong. Divided evenly across however
// many rounds a category's real season actually has (22 for the
// MotoGP/Moto2/Moto3 main calendar, 12 for the shared Superbikes/
// Supersport calendar), same idea as everything else in this file:
// no fixed constant that assumes every category looks like MotoGP.
const MAIN_LADDER_ROUNDS = 22;
const SBK_CALENDAR_ROUNDS = 12;

export function seasonRoundCount(categoryKey) {
  return (categoryKey === "superbikes" || categoryKey === "supersport" || categoryKey === "sportbike") ? SBK_CALENDAR_ROUNDS : MAIN_LADDER_ROUNDS;
}

/** This GP's share of every signed rider's annual salary — the one
 * recurring cost that, until now, was tracked on the rider but never
 * actually charged anywhere. */
export function teamSalaryCost(team, categoryKey) {
  const rounds = seasonRoundCount(categoryKey);
  const totalAnnual = (team.riders || []).reduce((s, r) => s + (r.salary || 0), 0);
  return Math.round(totalAnnual / rounds);
}
