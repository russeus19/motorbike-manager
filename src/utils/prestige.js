import { clamp } from "./random.js";
import { overallRating } from "./riders.js";
import { evaluateSeasonVsExpectation } from "./teamExpectations.js";
import { categoryPrestigeRange } from "../data/categoryPrestigeConfig.js";

/**
 * Prestige — how the paddock perceives a rider or a team, completely
 * independent of their raw sporting attributes (CA/PA) or their current
 * team-competitiveness tier (title/midfield/backmarker — see
 * teamExpectationTier in seasonHistory.js, a different concept). A
 * rider or team can have great stats and low prestige, or the reverse.
 *
 * Scale: 0-200 (data/categoryPrestigeConfig.js). Deliberately never
 * recalculated from scratch. Every function below either sets an
 * INITIAL value (only used the moment a rider/team is first created)
 * or returns a small, clamped DELTA applied on top of whatever prestige
 * already existed — so a champion's one bad season doesn't erase years
 * of reputation, and one great year doesn't turn a nobody into a
 * paddock reference overnight.
 *
 * The category itself permanently caps how much prestige is
 * realistically available (data/categoryPrestigeConfig.js) — an
 * excellent Moto3 team should still never outrank a merely-decent
 * MotoGP one. Riders/teams keep their raw numeric prestige when they
 * move category (no rescaling on promotion/relegation), it's just
 * compared against a new range from then on — which is exactly what
 * lets a rising young rider's prestige keep meaning something as they
 * climb the pyramid.
 *
 * Kept deliberately small and self-contained (no dependency on the
 * market/negotiation modules) so it can be reused as-is when the
 * transfer market itself gets rebuilt around prestige next.
 */

function ceilingFor(categoryKey) {
  return categoryPrestigeRange(categoryKey).max;
}

function clampPrestige(value, categoryKey) {
  return Math.round(clamp(value, 0, ceilingFor(categoryKey)));
}

// "Evitar saturar la zona alta": within the last 30 points below a
// category's ceiling, positive prestige gains shrink progressively —
// down to 15% of their nominal value right at the top. Only dampens
// gains, never losses, so a rider already near the ceiling can still
// drop normally after a bad season. This is what makes 190-200 in
// MotoGP genuinely exclusive — reaching it takes several excellent
// seasons in a row, never a single big year.
function dampenGainNearCeiling(delta, current, categoryKey) {
  if (delta <= 0) return delta;
  const max = ceilingFor(categoryKey);
  const zoneWidth = 30;
  const distanceFromCeiling = max - current;
  if (distanceFromCeiling >= zoneWidth) return delta;
  const factor = clamp(0.15 + (distanceFromCeiling / zoneWidth) * 0.85, 0.15, 1);
  return delta * factor;
}

/* ------------------------------------------------------------------ */
/* Initial values — only ever used when a rider/team doesn't have a    */
/* prestige value yet (new game, new rookie, newly generated free      */
/* agent, or an old save loading through). Never called again after.   */
/* For the real 2026 MotoGP grid, most riders instead get an explicit,  */
/* manually-assigned prestige straight in data/teamsMotoGP.js — see     */
/* utils/riderGeneration.js's instantiateTeams, which uses that value   */
/* directly when present and only falls back to the formulas below     */
/* otherwise (Moto2/Moto3 rookies, free agents, future prospects...).   */
/* ------------------------------------------------------------------ */

const TEAM_TIER_PRESTIGE_BONUS = { "Fábrica": 32, "Puntero": 18, "Satélite": 0, "Independiente": -12 };

export function initialTeamPrestige(tier, categoryKey) {
  const { min, max } = categoryPrestigeRange(categoryKey);
  const base = min + (max - min) * 0.35;
  const tierBonus = TEAM_TIER_PRESTIGE_BONUS[tier] ?? 0;
  return clampPrestige(base + tierBonus, categoryKey);
}

export function initialRiderPrestige(rider, categoryKey) {
  const { min, max } = categoryPrestigeRange(categoryKey);
  // A fresh/typical rider starts low within their own category's band —
  // real results (evolveRiderPrestigeForSeason below) build the rest up
  // over time, never the other way around.
  const base = min + (max - min) * 0.2;
  const ca = overallRating(rider);
  const caBonus = (ca - 60) * 1.3;
  // Potential is deliberately a small nudge here, not a driver.
  const potentialBonus = Math.max(0, (rider.potential ?? 50) - 78) * 0.12;
  const ageAdj = rider.age >= 32 ? 6 : rider.age <= 19 ? -4 : 0;
  return clampPrestige(base + caBonus + potentialBonus + ageAdj, categoryKey);
}

// A stored prestige value that's unambiguously impossible under the new
// per-category ranges (data/categoryPrestigeConfig.js) can only be a
// leftover from a save created before this 0-200 rescale — these
// thresholds are deliberately conservative (well below each category's
// new minimum) so an already-valid new-scale value is never
// second-guessed, only genuine old-scale leftovers get migrated.
const LEGACY_SCALE_UPPER_BOUND = { motogp: 100, moto2: 60, moto3: 30 };

function isLikelyLegacyScaleValue(value, categoryKey) {
  const bound = LEGACY_SCALE_UPPER_BOUND[categoryKey];
  return Number.isFinite(bound) && value <= bound;
}

/** Ensures a rider/team has a prestige value, without ever touching one
 * that already exists — the safe way to backfill an old save or a
 * rider/team object built before this system existed. A value that's
 * clearly still on the old 0-100 scale (isLikelyLegacyScaleValue) is
 * rescaled once (×2) instead of being kept as an oddly-low number
 * that would never occur under the current formulas. */
export function ensureRiderPrestige(rider, categoryKey) {
  if (Number.isFinite(rider.prestige)) {
    if (isLikelyLegacyScaleValue(rider.prestige, categoryKey)) {
      return { ...rider, prestige: clampPrestige(rider.prestige * 2, categoryKey) };
    }
    return rider;
  }
  return { ...rider, prestige: initialRiderPrestige(rider, categoryKey) };
}

export function ensureTeamPrestige(team, categoryKey) {
  if (Number.isFinite(team.prestige)) {
    if (isLikelyLegacyScaleValue(team.prestige, categoryKey)) {
      return { ...team, prestige: clampPrestige(team.prestige * 2, categoryKey) };
    }
    return team;
  }
  return { ...team, prestige: initialTeamPrestige(team.tier, categoryKey) };
}

/* ------------------------------------------------------------------ */
/* Season-end evolution — small, clamped deltas on top of the existing  */
/* value. Never a full recompute.                                      */
/* ------------------------------------------------------------------ */

/**
 * @param rider current rider (reads rider.prestige, defaulting sensibly if missing)
 * @param ctx { position, totalRiders, points, teammatePoints, badge,
 *              crashes, injuries, categoryKey, racedThisCategory }
 */
export function evolveRiderPrestigeForSeason(rider, ctx) {
  const {
    position, totalRiders, points, teammatePoints, badge,
    crashes = 0, injuries = 0, categoryKey, racedThisCategory = true,
  } = ctx;
  const current = Number.isFinite(rider.prestige) ? rider.prestige : initialRiderPrestige(rider, categoryKey);

  if (!racedThisCategory) {
    // Out of view for a whole season (injury, no seat, substituted away
    // the whole year) — a mild fade, never a collapse.
    return clampPrestige(current - 2, categoryKey);
  }

  let delta = 0;
  // Resultados deportivos: el factor de mayor peso, pero con una
  // magnitud contenida — el prestigio se construye durante varias
  // temporadas, nunca de golpe en una sola. Un campeonato es un
  // incremento pequeño pero perceptible, no un salto de decenas de
  // puntos; un Top 5 que no sea podio apenas debe notarse.
  if (badge === "campeon") delta += 8;
  else if (badge === "subcampeon") delta += 5;
  else if (badge === "tercero") delta += 3;
  else if (Number.isFinite(position)) {
    // Umbrales absolutos (Top 5 / Top 10), no una fracción de la
    // parrilla, para que un buen resultado en una parrilla grande no
    // quede injustamente diluido — pero la magnitud es intencionadamente
    // muy pequeña frente a un podio real.
    if (position <= 5) delta += 1.5;
    else if (position <= 10) delta += 0.5;
    else if (Number.isFinite(totalRiders) && position >= totalRiders * 0.85) delta -= 4;
    else if (Number.isFinite(totalRiders) && position >= totalRiders * 0.65) delta -= 1.5;
  }
  // Historial acumulado — la trayectoria de varias temporadas debe pesar
  // más que una sola, así que varios títulos/podios previos siguen
  // dando un pequeño empujón adicional, aunque moderado.
  const pastBadgeCount = (rider.history || []).filter((h) => h.badge).length;
  delta += Math.min(pastBadgeCount, 4) * 1;

  // Clearly beating (or being beaten by) a teammate on the same
  // equipment is one of the paddock's favourite yardsticks — un matiz,
  // no un factor grande por sí solo.
  if (Number.isFinite(teammatePoints)) {
    if (points > teammatePoints * 1.4) delta += 1.5;
    else if (points < teammatePoints * 0.55) delta -= 1.5;
  }
  if (crashes >= 8) delta -= 1.5;
  if (crashes >= 14) delta -= 1.5;
  if (injuries >= 2) delta -= 1;
  // Edad, potencial y moral: factores menores por diseño — nunca deben
  // compensar varias temporadas sin resultados.
  if ((rider.age ?? 0) >= 34) delta -= 0.5;

  delta = dampenGainNearCeiling(delta, current, categoryKey);
  return clampPrestige(current + delta, categoryKey);
}

/**
 * @param team current team (reads team.prestige, defaulting sensibly if missing)
 * @param ctx { position, totalTeams, expectationVerdict, categoryKey }
 *   expectationVerdict comes from utils/teamExpectations.js's
 *   evaluateSeasonVsExpectation — "extraordinaria" | "sobresaliente" |
 *   "cumplida" | "por_debajo" | "decepcionante" | null.
 */
export function evolveTeamPrestigeForSeason(team, ctx) {
  const { position, totalTeams, expectationVerdict, categoryKey } = ctx;
  const current = Number.isFinite(team.prestige) ? team.prestige : initialTeamPrestige(team.tier, categoryKey);

  let delta = 0;
  if (position && totalTeams) {
    const frac = position / totalTeams;
    if (position === 1) delta += 4;
    else if (frac <= 0.25) delta += 2;
    else if (frac >= 0.85) delta -= 2;
    else if (frac >= 0.6) delta -= 1;
  }
  if (expectationVerdict === "extraordinaria") delta += 3;
  else if (expectationVerdict === "sobresaliente") delta += 1.5;
  else if (expectationVerdict === "por_debajo") delta -= 1.5;
  else if (expectationVerdict === "decepcionante") delta -= 3;

  delta = dampenGainNearCeiling(delta, current, categoryKey);
  return clampPrestige(current + delta, categoryKey);
}

/* ------------------------------------------------------------------ */
/* Market-weighting helpers — meant to be reused as-is once the        */
/* transfer market itself gets rebuilt around prestige. Kept here, not  */
/* duplicated in utils/marketNegotiations.js, so both the current       */
/* integration and any future overhaul share one source of truth for    */
/* "how much does a prestige gap actually matter".                      */
/* ------------------------------------------------------------------ */

/** How much MORE appealing (or unappealing) a team's prestige makes an
 * offer look to a rider, as an additive percentage-point-style bonus
 * meant to be combined with every other existing factor (never used
 * alone). Positive when the team outclasses the rider's own prestige,
 * negative when it's well below it. */
export function teamPrestigeAppeal(teamPrestige, riderPrestige) {
  const gap = (teamPrestige ?? 0) - (riderPrestige ?? 0);
  return clamp(gap * 0.125, -12, 12);
}

/** Ranks a category's teams by season points and evolves each one's
 * prestige in a single pass, using the expectation they were already
 * carrying (set at the START of the season that just ended, before it
 * gets overwritten for the next one) — the same evaluateSeasonVsExpectation
 * verdict (utils/teamExpectations.js) the rest of the game already
 * relies on for AI renewal decisions. */
export function applyTeamPrestigeEvolution(teams, teamStandingsForCategory, categoryKey) {
  const ranked = [...teams].sort((a, b) => (teamStandingsForCategory[b.id] || 0) - (teamStandingsForCategory[a.id] || 0));
  const rankById = {};
  ranked.forEach((t, i) => { rankById[t.id] = i + 1; });
  return teams.map((t) => {
    const position = rankById[t.id];
    const expectationVerdict = evaluateSeasonVsExpectation(position, t.expectation);
    const prestige = evolveTeamPrestigeForSeason(t, { position, totalTeams: teams.length, expectationVerdict, categoryKey });
    return { ...t, prestige };
  });
}

/** How much a rider's own prestige raises (or lowers) a buying team's
 * interest in signing them, relative to a "typical" prestige for the
 * category — meant to combine with performance/age/potential, never
 * decide a signing by itself. */
export function riderPrestigeInterest(riderPrestige, categoryKey) {
  const { min, max } = categoryPrestigeRange(categoryKey);
  const typical = min + (max - min) * 0.3;
  return clamp(((riderPrestige ?? 0) - typical) * 0.3, -15, 15);
}
