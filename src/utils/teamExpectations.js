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
 *   2. assignSeasonExpectations   — turn strength into a realistic
 *                                   position-range for every team in a
 *                                   category, and a text expectation for
 *                                   every rider on it.
 *   3. computeRiderExpectationLabel — a rider's personal expectation,
 *                                   never just their own rating in
 *                                   isolation.
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
   2. POSITION-RANGE ASSIGNMENT
   ------------------------------------------------------------------- */

/** Converts a strength rank into a realistic (not exact) finishing
 * position range: tight near the very top and bottom of the grid, a
 * little wider in the competitive midfield where results are naturally
 * less predictable. */
function formatPositionRange(rank, totalTeams) {
  if (totalTeams <= 1) return { min: 1, max: 1, label: "1º" };
  const normalizedPos = (rank - 1) / (totalTeams - 1); // 0 = best team, 1 = worst
  const distFromEdge = Math.min(normalizedPos, 1 - normalizedPos); // 0 at either edge, 0.5 mid-grid
  const halfWidth = Math.round(1 + distFromEdge * 2); // 1 at the edges, up to ~2 mid-grid
  const min = clamp(rank - halfWidth, 1, totalTeams);
  const max = clamp(rank + halfWidth, 1, totalTeams);
  const label = min === max ? `${min}º` : `${min}º-${max}º`;
  return { min, max, label };
}

/**
 * Ranks every team in a category by strength and attaches a fresh
 * `expectation` ({ min, max, label, score }) to each team, plus a
 * personal `expectation` (a short text description) to every rider in
 * `team.riders`. Meant to be called once per category at the start of
 * every season — including the very first one, where `includeResearch`
 * should be false since there's no research history yet.
 */
export function assignSeasonExpectations(teams, includeResearch) {
  const maxBudget = Math.max(1, ...teams.map((t) => t.budget || 0));
  const scored = teams.map((t) => ({ team: t, score: computeTeamStrengthScore(t, maxBudget, includeResearch) }));
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const rankById = {};
  ranked.forEach((entry, i) => { rankById[entry.team.id] = i + 1; });

  return scored.map(({ team, score }) => {
    const rank = rankById[team.id];
    const { min, max, label } = formatPositionRange(rank, teams.length);
    const expectation = { min, max, label, score: Math.round(score) };
    const riders = team.riders.map((r) => ({
      ...r,
      expectation: computeRiderExpectationLabel(r, team, expectation),
    }));
    return { ...team, expectation, riders };
  });
}

/* ----------------------------------------------------------------------
   3. RIDER EXPECTATION
   ------------------------------------------------------------------- */

/** A rider's expectation is never just their own rating in isolation —
 * the same 88-rated rider means something completely different on a
 * factory Ducati than it would on a satellite team, which is why the
 * team's own strength/expectation feeds into this too. Young riders with
 * a lot of unrealized potential get framed around development instead of
 * results, regardless of their current raw numbers. */
export function computeRiderExpectationLabel(rider, team, teamExpectation) {
  const ca = overallRating(rider);
  const potentialGap = (rider.pa ?? ca) - ca;
  if (rider.age <= 20 && potentialGap >= 15) {
    return "Adaptarse a la categoría y progresar.";
  }

  const teamScore = teamExpectation?.score ?? 50;
  const riderScore = ca * 0.55 + teamScore * 0.30 + clamp(potentialGap, 0, 30) * 0.15;

  if (riderScore >= 85) return "Luchar por el título del campeonato.";
  if (riderScore >= 75) return "Luchar por el podio del campeonato.";
  if (riderScore >= 65) return "Pelear por entrar regularmente en el top 5.";
  if (riderScore >= 55) return "Puntuar regularmente.";
  if (riderScore >= 45) return "Sumar puntos ocasionales y ganar experiencia.";
  return "Adaptarse a la categoría y progresar.";
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
