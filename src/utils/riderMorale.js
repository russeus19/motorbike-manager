import { clamp } from "./random.js";
import { computeSalary } from "./riders.js";
import { RIDER_EXPECTATION_TIERS } from "./teamExpectations.js";

/**
 * Rider morale — a temporary emotional state, recalculated after every
 * Grand Prix, that nudges race-simulation performance up or down without
 * ever touching a rider's permanent attributes.
 *
 * Philosophy: morale represents sporting CONFIDENCE first and foremost —
 * how a rider is actually competing lately — not merely whether they're
 * meeting a pre-season expectation. A title contender who's winning races
 * should feel great about themselves regardless of whether winning was
 * "expected"; expectations only ever nudge the result up or down a little
 * afterward, they never drive it. Four independently-weighted factors,
 * each its own small function, so new ones (teammate relationships,
 * rivalries, press statements, team-boss confidence, injuries, repeated
 * mechanical trouble, pole streaks, podium streaks...) can be added later
 * as one more weighted term in updateRiderMorale without touching
 * anything else that depends on this module:
 *
 *   1. recentFormScore          (60%) — last up to 3 results, on their
 *                                        own merits (wins/podiums/top5/
 *                                        top10/points/DNFs), recency-
 *                                        weighted so a fading run drags
 *                                        harder than an old one recovers.
 *   2. seasonTrendScore         (20%) — championship position, win/podium
 *                                        tally, gap to the leader.
 *   3. expectationCorrectionScore (15%) — purely corrective: meeting the
 *                                        season expectation is neutral
 *                                        (never a penalty), only clearly
 *                                        over- or under-shooting it moves
 *                                        the needle.
 *   4. contractStabilityScore   (5%)  — contract length + fair salary,
 *                                        always minor, never decisive.
 *
 * IMPORTANT: this is a completely separate concept from the existing
 * numeric `rider.morale` field (0-100) used elsewhere for season-long
 * attribute evolution and market value — that field is untouched by this
 * system. This one lives at `rider.moraleState = { score, tier }`.
 */

/* The only five states a rider's morale may ever be in. `modifier` is a
   multiplier applied to their combined race-simulation skill rating —
   never to individual attributes, and never permanently. Percentages
   unchanged from the original design. */
export const MORALE_TIERS = [
  { key: "muy_alta", label: "Muy alta", color: "#5FA8D3", modifier: 1.06 },
  { key: "alta", label: "Alta", color: "#3F9142", modifier: 1.03 },
  { key: "normal", label: "Normal", color: "#6B7280", modifier: 1.0 },
  { key: "baja", label: "Baja", color: "#E08E45", modifier: 0.97 },
  { key: "muy_baja", label: "Muy baja", color: "#D64545", modifier: 0.94 },
];

export function moraleTierInfo(tierKey) {
  return MORALE_TIERS.find((t) => t.key === tierKey) || MORALE_TIERS[2];
}

function tierIndexForScore(score) {
  if (score >= 75) return 0; // muy_alta
  if (score >= 60) return 1; // alta
  if (score >= 40) return 2; // normal
  if (score >= 25) return 3; // baja
  return 4; // muy_baja
}

/* Each rider expectation tier implies a rough target band within the
   whole category's rider standings — the same distribution used to
   assign the tiers in the first place (see teamExpectations.js), reused
   here rather than duplicated so both systems always agree on what each
   tier actually means. */
const TIER_POSITION_BAND = {
  [RIDER_EXPECTATION_TIERS[0]]: { min: 1, max: 3 },
  [RIDER_EXPECTATION_TIERS[1]]: { min: 4, max: 7 },
  [RIDER_EXPECTATION_TIERS[2]]: { min: 8, max: 13 },
  [RIDER_EXPECTATION_TIERS[3]]: { min: 14, max: 19 },
  [RIDER_EXPECTATION_TIERS[4]]: { min: 20, max: 999 },
};

/* Internal points-style scale for a single result, independent of any
   expectation — a win is a win. Roughly matches the reference scale
   given in the design (win +15, podium +10, top5 +6, top10 +3, scoring
   finish +1, finishing outside the points -4, any DNF -8), tuned so
   three race wins in a row lands at the scale's own ceiling. */
function positionScore(r) {
  if (r.crashed) return -8; // caída or avería — same weight, both are a DNF
  if (r.position === 1) return 15;
  if (r.position <= 3) return 10;
  if (r.position <= 5) return 6;
  if (r.position <= 10) return 3;
  if (r.points > 0) return 1;
  return -4;
}

/* 1. RECENT FORM (60%) — the dominant factor. Recency-weighted average
   of up to the last 3 results (newest counts for half the total weight),
   so a sequence that's trending worse drags the score down harder than
   a stale good result props it up, directly capturing "tendencia" as its
   own signal rather than needing a separate calculation. Normalized
   against 15 (a single win) so three wins in a row saturates the scale. */
function recentFormScore(rider) {
  const recent = rider.recentResults || [];
  if (!recent.length) return 0;
  const weightsByLength = { 1: [1], 2: [0.4, 0.6], 3: [0.2, 0.3, 0.5] };
  const weights = weightsByLength[recent.length];
  const weighted = recent.reduce((s, r, i) => s + positionScore(r) * weights[i], 0);
  return clamp(weighted / 15, -1, 1);
}

/* Three wins in a row (or three straight DNFs) is called out explicitly
   in the design as a case that should "almost always" produce the most
   extreme tier directly, bypassing the usual one-step-per-race limit —
   a genuinely exceptional run earns a bigger jump than routine inertia
   would otherwise allow. */
function exceptionalRecentRun(rider) {
  const recent = rider.recentResults || [];
  if (recent.length < 3) return null;
  if (recent.every((r) => !r.crashed && r.position === 1)) return "hot";
  if (recent.every((r) => r.crashed)) return "cold";
  return null;
}

/* 2. SEASON TREND (20%) — the bigger picture behind the last 3 races:
   where they sit in the championship, how many wins/podiums they've
   banked THIS season, and how far back they are from the man leading
   it. A points leader still gets real credit here even through a rough
   patch. */
function seasonTrendScore(rider, riderRankMap, riderStandings, totalRiders, riderWins, riderPodiums) {
  const rank = riderRankMap[rider.id];
  if (!Number.isFinite(rank) || !totalRiders) return 0;
  const rankScore = totalRiders > 1 ? ((totalRiders - rank) / (totalRiders - 1)) * 2 - 1 : 1; // -1 (last) .. +1 (first)

  const wins = riderWins?.[rider.id] || 0;
  const podiums = riderPodiums?.[rider.id] || 0;
  const formBonus = clamp(wins * 0.12 + podiums * 0.04, 0, 0.6);

  const rows = Object.values(riderStandings || {});
  const leaderPoints = rows.length ? Math.max(...rows.map((r) => r.points || 0)) : 0;
  const myPoints = riderStandings?.[rider.id]?.points || 0;
  const gapPenalty = leaderPoints > 0 ? clamp(-((leaderPoints - myPoints) / leaderPoints), -0.5, 0) : 0;

  return clamp(rankScore * 0.5 + formBonus + gapPenalty, -1, 1);
}

/* 3. EXPECTATION CORRECTION (15%) — purely corrective, never the driver.
   Meeting the target band is exactly neutral (0): it must never subtract
   morale just because a rider is doing what was always assumed of them.
   Only clearly beating or missing it nudges the result. */
function expectationCorrectionScore(rider, riderRankMap) {
  const band = TIER_POSITION_BAND[rider.expectation];
  const rank = riderRankMap[rider.id];
  if (!band || !Number.isFinite(rank)) return 0;
  if (rank >= band.min && rank <= band.max) return 0;
  if (rank < band.min) return clamp((band.min - rank) * 0.12, 0, 1); // muy por encima -> bonus
  const under = rank - band.max;
  return under >= 6 ? clamp(-0.5 - (under - 6) * 0.05, -1, -0.5) : clamp(-under * 0.08, -0.5, 0); // por debajo -> penalización
}

/* 4. CONTRACTUAL STABILITY (5%, never decisive): more years left and a
   salary in line with what the rider's current level would actually
   command both add a small amount of emotional stability. */
function contractStabilityScore(rider, scale) {
  const yearsFactor = clamp((rider.contractYears ?? 0) / 3, 0, 1);
  const fairSalary = computeSalary(rider, scale || 1);
  const salaryRatio = fairSalary > 0 ? (rider.salary || 0) / fairSalary : 1;
  const salaryFactor = clamp(salaryRatio - 1, -0.5, 0.5);
  return clamp((yearsFactor - 0.5) * 0.6 + salaryFactor * 0.6, -1, 1);
}

/**
 * Recomputes a rider's morale after a Grand Prix. Psychological inertia:
 * normally the tier can only move one step per race in either direction
 * (win a single race, at most climb from "baja" to "normal" — never
 * straight to "muy alta"), so a single bad or brilliant weekend can
 * never flip a rider from one extreme to the other on its own. The one
 * exception is an exceptional run — three wins or three DNFs in a row —
 * which is allowed to set the tier directly, per the design's own "casi
 * siempre" rule for that specific case. Returns the rider with a new
 * `moraleState: { score, tier }`; nothing else is touched, and base
 * attributes are never modified.
 */
export function updateRiderMorale(rider, { riderRankMap, riderStandings, totalRiders, riderWins, riderPodiums, team, teamRankMap, scale }) {
  const recent = recentFormScore(rider) * 0.60;
  const trend = seasonTrendScore(rider, riderRankMap || {}, riderStandings, totalRiders, riderWins, riderPodiums) * 0.20;
  const correction = expectationCorrectionScore(rider, riderRankMap || {}) * 0.15;
  const stability = contractStabilityScore(rider, scale) * 0.05;

  const rawSignal = clamp(recent + trend + correction + stability, -1, 1);
  const rawScore = clamp(50 + rawSignal * 50, 0, 100);
  const rawTierIdx = tierIndexForScore(rawScore);

  const prevTierIdx = rider.moraleState ? MORALE_TIERS.findIndex((t) => t.key === rider.moraleState.tier) : 2;
  const safPrevTierIdx = prevTierIdx < 0 ? 2 : prevTierIdx;

  const exceptional = exceptionalRecentRun(rider);
  let nextTierIdx;
  if (exceptional === "hot") nextTierIdx = 0;
  else if (exceptional === "cold") nextTierIdx = 4;
  else nextTierIdx = clamp(rawTierIdx, safPrevTierIdx - 1, safPrevTierIdx + 1);

  const tier = MORALE_TIERS[nextTierIdx];
  const prevScore = rider.moraleState?.score ?? 50;
  const nextScore = clamp(prevScore * 0.5 + rawScore * 0.5, 0, 100);

  return { ...rider, moraleState: { score: Math.round(nextScore), tier: tier.key } };
}

/** Applies updateRiderMorale to every rider (titular and substitute) on
 * every team in a category, given that category's just-updated
 * standings. Meant to be called once per category, right after a race's
 * standings have been finalized for it. */
export function applyMoraleToCategoryTeams(teams, riderStandings, teamStandings, riderWins, riderPodiums, scale) {
  const riderRows = Object.entries(riderStandings || {}).sort((a, b) => b[1].points - a[1].points);
  const riderRankMap = {};
  riderRows.forEach(([id], i) => { riderRankMap[id] = i + 1; });
  const totalRiders = riderRows.length;

  const teamRows = teams.map((t) => ({ id: t.id, points: teamStandings?.[t.id] || 0 })).sort((a, b) => b.points - a.points);
  const teamRankMap = {};
  teamRows.forEach((row, i) => { teamRankMap[row.id] = i + 1; });

  return teams.map((team) => {
    const ctx = { riderRankMap, riderStandings, totalRiders, riderWins, riderPodiums, team, teamRankMap, scale };
    const riders = team.riders.map((r) => updateRiderMorale(r, ctx));
    const substitutes = {};
    Object.entries(team.substitutes || {}).forEach(([ownerId, sub]) => {
      substitutes[ownerId] = updateRiderMorale(sub, ctx);
    });
    return { ...team, riders, substitutes };
  });
}

/** Temporary multiplier applied only inside race-simulation skill
 * calculations — never to a rider's stored attributes. Defaults to the
 * "normal" (no change) multiplier for any rider without a moraleState
 * yet (brand new rider before their first race, or an older save from
 * before this system existed). */
export function moraleSkillMultiplier(rider) {
  return moraleTierInfo(rider.moraleState?.tier).modifier;
}
