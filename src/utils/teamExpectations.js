import { bikeAvg, ensureRD } from "./bikeDevelopment.js";
import { clamp } from "./random.js";
import { overallRating } from "./riders.js";

/**
 * Expectations engine — the shared foundation used by season evaluation,
 * AI renewals, mid-season firings and free-agent signings (see
 * transferMarket.js). Kept as its own module, separated into four clear
 * responsibilities, so any of those future extensions the game mentions
 * (personal objectives, morale, team reputation, contract negotiations)
 * can plug into this without reworking the architecture:
 *
 *   1. computeTeamStrengthScore   — how strong is this team, right now?
 *   2. assignSeasonExpectations   — turn strength into a single, exclusive
 *                                   target position for every team in a
 *                                   category, and one of five fixed
 *                                   expectation tiers for every rider on
 *                                   it, based on their rank within the
 *                                   whole category.
 *   3. computeRiderScore          — a rider's personal, comparable rating
 *                                   for that ranking; never just their
 *                                   own rating in isolation.
 *   4. evaluateSeasonVsExpectation — did the actual result meet, beat, or
 *                                   miss what was expected?
 */

/* ----------------------------------------------------------------------
   1. TEAM STRENGTH SCORE
   ------------------------------------------------------------------- */

const BASE_WEIGHTS = {
  budget: 0.20,
  bike: 0.25,
  research: 0.15,
  factory: 0.15,
  staff: 0.10,
  riders: 0.15,
};

/** Weighted combination of budget, bike, hidden research base, factory,
 * staff and rider quality — normalized so every factor contributes on a
 * comparable 0-100 scale, with no single one able to dominate the
 * result. `includeResearch` is false only for a season 1 that has no
 * research history yet; its weight is redistributed proportionally
 * across the remaining factors rather than just dropped, so the other
 * weights still sum to 1. `maxBudgetInCategory` normalizes budget
 * relative to the rest of the grid (an absolute euro amount means
 * nothing on its own — €5M is huge in Moto3, modest in MotoGP). */
export function computeTeamStrengthScore(team, maxBudgetInCategory, includeResearch) {
  const { techBase, factory, staff } = ensureRD(team);

  const budgetScore = clamp(((team.budget || 0) / Math.max(1, maxBudgetInCategory)) * 100, 0, 100);
  const bikeScore = clamp(bikeAvg(team.bike), 0, 100);
  const researchScore = clamp(bikeAvg(techBase), 0, 100);
  const factoryScore = clamp(factory.level, 0, 100);
  const staffScore = clamp(staff.level, 0, 100);
  const ridersScore = clamp(team.riders.reduce((s, r) => s + overallRating(r), 0) / Math.max(1, team.riders.length), 0, 100);

  const weights = { ...BASE_WEIGHTS };
  if (!includeResearch) {
    const dropped = weights.research;
    weights.research = 0;
    const remainingKeys = Object.keys(weights).filter((k) => k !== "research");
    const remainingTotal = remainingKeys.reduce((s, k) => s + weights[k], 0);
    remainingKeys.forEach((k) => { weights[k] += dropped * (weights[k] / remainingTotal); });
  }

  return (
    budgetScore * weights.budget +
    bikeScore * weights.bike +
    researchScore * weights.research +
    factoryScore * weights.factory +
    staffScore * weights.staff +
    ridersScore * weights.riders
  );
}

/* ----------------------------------------------------------------------
   2. SINGLE TARGET POSITION PER TEAM + RANK-BASED RIDER TIERS
   ------------------------------------------------------------------- */

/**
 * Ranks every team in a category by strength and gives each one a single,
 * exclusive target position — rank 1 gets "1º", rank 2 gets "2º", and so
 * on with no two teams ever sharing a position (ties in raw score are
 * broken by whichever the sort settles first, which still produces a
 * strict, gap-free 1..N sequence). This is effectively a pre-season
 * strength ranking of the whole grid.
 *
 * Rider expectations are assigned the same way conceptually: every rider
 * in the category is scored individually (see computeRiderScore — same
 * inputs as before: their own rating/potential, the bike, the team, and
 * the team's own expectation), then all of them are ranked against each
 * other, and that ranking — not a raw score threshold — determines which
 * of the five fixed tiers they land on.
 *
 * Called once per category at the start of every season, including the
 * very first one, where `includeResearch` should be false.
 */
export function assignSeasonExpectations(teams, includeResearch) {
  const maxBudget = Math.max(1, ...teams.map((t) => t.budget || 0));
  const scored = teams.map((t) => ({ team: t, score: computeTeamStrengthScore(t, maxBudget, includeResearch) }));
  const ranked = [...scored].sort((a, b) => b.score - a.score);

  const expectationByTeamId = {};
  ranked.forEach((entry, i) => {
    const rank = i + 1;
    expectationByTeamId[entry.team.id] = { min: rank, max: rank, label: `${rank}º`, score: Math.round(entry.score) };
  });

  const riderEntries = [];
  scored.forEach(({ team }) => {
    const teamExpectation = expectationByTeamId[team.id];
    team.riders.forEach((r) => {
      riderEntries.push({ riderId: r.id, score: computeRiderScore(r, teamExpectation) });
    });
  });
  riderEntries.sort((a, b) => b.score - a.score);
  const tierByRiderId = {};
  riderEntries.forEach((entry, i) => {
    tierByRiderId[entry.riderId] = riderTierForRank(i + 1);
  });

  return scored.map(({ team }) => {
    const expectation = expectationByTeamId[team.id];
    const riders = team.riders.map((r) => ({ ...r, expectation: tierByRiderId[r.id] }));
    return { ...team, expectation, riders };
  });
}

/* ----------------------------------------------------------------------
   3. RIDER EXPECTATION
   ------------------------------------------------------------------- */

/** The only five rider expectation levels that may ever be assigned, most
 * to least demanding. No other wording is used anywhere in the game. */
export const RIDER_EXPECTATION_TIERS = [
  "Luchar por el campeonato",
  "Entrar en el Top 5",
  "Luchar por el Top 10",
  "Estar regularmente en los puntos",
  "Intentar puntuar",
];

/** Fixed distribution by rank within the category's full rider ranking:
 * 1-3 → tier 0, 4-7 → tier 1, 8-13 → tier 2, 14-19 → tier 3, everyone
 * else → tier 4. */
function riderTierForRank(rank) {
  if (rank <= 3) return RIDER_EXPECTATION_TIERS[0];
  if (rank <= 7) return RIDER_EXPECTATION_TIERS[1];
  if (rank <= 13) return RIDER_EXPECTATION_TIERS[2];
  if (rank <= 19) return RIDER_EXPECTATION_TIERS[3];
  return RIDER_EXPECTATION_TIERS[4];
}

/** A rider's expectation is never just their own rating in isolation —
 * the same 88-rated rider means something completely different on a
 * factory Ducati than it would on a satellite team, which is why the
 * team's own strength/expectation feeds into this too. This produces the
 * raw comparable score; assignSeasonExpectations ranks every rider in
 * the category against each other using this and only then maps that
 * ranking onto one of the five fixed tiers (see riderTierForRank) — the
 * tier was never meant to come from an absolute score threshold. */
export function computeRiderScore(rider, teamExpectation) {
  const ca = overallRating(rider);
  const potentialGap = (rider.pa ?? ca) - ca;
  const teamScore = teamExpectation?.score ?? 50;
  return ca * 0.55 + teamScore * 0.30 + clamp(potentialGap, 0, 30) * 0.15;
}

/* ----------------------------------------------------------------------
   4. SEASON EVALUATION VS EXPECTATION
   ------------------------------------------------------------------- */

/**
 * Compares an actual final championship position against the expectation
 * range assigned at the start of the season. This is deliberately
 * separate from utils/seasonHistory.js's evaluateRiderSeason (which
 * grades a rider against their own teammate) — this grades them against
 * what the team/rider situation itself justified expecting, which is the
 * signal renewals/firings should actually be using.
 */
export function evaluateSeasonVsExpectation(finalPosition, expectation) {
  if (!expectation || !Number.isFinite(finalPosition)) return null;
  const { min, max } = expectation;
  if (finalPosition < min) {
    return (min - finalPosition) >= 4 ? "extraordinaria" : "sobresaliente";
  }
  if (finalPosition > max) {
    return (finalPosition - max) >= 4 ? "decepcionante" : "por_debajo";
  }
  return "cumplida";
}

/** Approximate expected final rank for each rider expectation tier (see
 * RIDER_EXPECTATION_TIERS/riderTierForRank above) — the tier is a label,
 * not a number, so this maps each one back to the midpoint of the rank
 * band it was actually assigned from, giving a fair, comparable number
 * to weigh against where the rider actually finished. */
const RIDER_TIER_EXPECTED_RANK = {
  "Luchar por el campeonato": 2,
  "Entrar en el Top 5": 5.5,
  "Luchar por el Top 10": 10.5,
  "Estar regularmente en los puntos": 16.5,
  "Intentar puntuar": 22,
};

/**
 * End-of-season awards for ONE category: the single biggest positive
 * surprise and the single biggest negative surprise, for riders and for
 * teams. A rider/team's own pre-season expectation
 * (assignSeasonExpectations, fixed for the whole season) is compared
 * against where they actually finished; the bigger that gap, the
 * stronger the candidate. Returns null for any award with no valid
 * candidate (e.g. missing expectation data), rather than forcing a
 * misleading pick.
 */
export function findSeasonAwards({ teams, riderStandings, teamStandings }) {
  let riderUp = null, riderDown = null, teamUp = null, teamDown = null;

  const ridersById = {};
  (teams || []).forEach((t) => t.riders.forEach((r) => { ridersById[r.id] = { rider: r, teamName: t.name }; }));

  const riderRows = Object.entries(riderStandings || {}).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.points - a.points);
  riderRows.forEach((row, i) => {
    const info = ridersById[row.id];
    const expectedRank = info && RIDER_TIER_EXPECTED_RANK[info.rider.expectation];
    if (!info || !Number.isFinite(expectedRank)) return;
    const finalPos = i + 1;
    const delta = expectedRank - finalPos;
    const entry = { rider: info.rider, teamName: info.teamName, finalPos, delta };
    if (delta > 0 && (!riderUp || delta > riderUp.delta)) riderUp = entry;
    if (delta < 0 && (!riderDown || delta < riderDown.delta)) riderDown = entry;
  });

  const teamRows = Object.entries(teamStandings || {}).map(([id, pts]) => ({ id, points: pts })).sort((a, b) => b.points - a.points);
  teamRows.forEach((row, i) => {
    const team = (teams || []).find((t) => t.id === row.id);
    if (!team || !team.expectation) return;
    const finalPos = i + 1;
    const delta = team.expectation.min - finalPos;
    const entry = { team, finalPos, delta };
    if (delta > 0 && (!teamUp || delta > teamUp.delta)) teamUp = entry;
    if (delta < 0 && (!teamDown || delta < teamDown.delta)) teamDown = entry;
  });

  return { riderRevelacion: riderUp, riderDecepcion: riderDown, teamRevelacion: teamUp, teamDecepcion: teamDown };
}
