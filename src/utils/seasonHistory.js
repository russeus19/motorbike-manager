import { EVAL_LABELS } from "../data/evaluationLabels.js";
import { bikeAvg } from "./bikeDevelopment.js";
import { evolveRiderPrestigeForSeason } from "./prestige.js";
import { clamp } from "./random.js";
import { overallRating } from "./riders.js";

/* Builds this season's history entry for a single rider, if they actually
   have a standings entry (i.e. they raced at least once this season under
   this category/team). Shared by both titular riders and substitutes below
   so the exact same rules apply to either — no duplicated logic. */
function buildHistoryEntryIfRaced(rider, teamName, standingsForCategory, posById, categoryKey, seasonNum) {
  const pos = posById[rider.id];
  if (!pos) return rider;
  const points = standingsForCategory[rider.id]?.points ?? 0;
  const badge = pos === 1 ? "campeon" : pos === 2 ? "subcampeon" : pos === 3 ? "tercero" : null;
  const entry = { season: seasonNum, category: categoryKey, position: pos, teamName, points, badge };
  return { ...rider, history: [...(rider.history || []), entry] };
}

/* Every rider who raced at least one Grand Prix this season under this
   category — titular or substitute — gets a history entry for it. A
   substitute's points and final standing already belong to them (not to
   the rider they replaced), so they must be recorded exactly the same
   way a titular rider is. This runs once per category, so a rider who
   competed in two categories in the same season (e.g. substituting in
   both) naturally ends up with two separate entries — one per call —
   never overwriting each other. */
export function recordSeasonHistory(teams, standingsForCategory, categoryKey, seasonNum) {
  const sorted = Object.entries(standingsForCategory).sort((a, b) => b[1].points - a[1].points);
  const posById = {};
  sorted.forEach(([id], i) => { posById[id] = i + 1; });
  const totalRiders = sorted.length;
  return teams.map((t) => {
    const [r1, r2] = t.riders;
    const riders = t.riders.map((r) => {
      const withHistory = buildHistoryEntryIfRaced(r, t.name, standingsForCategory, posById, categoryKey, seasonNum);
      const pos = posById[r.id];
      const teammatePoints = r.id === r1?.id ? standingsForCategory[r2?.id]?.points : standingsForCategory[r1?.id]?.points;
      const lastEntry = withHistory.history?.[withHistory.history.length - 1];
      const prestige = evolveRiderPrestigeForSeason(withHistory, {
        position: pos, totalRiders, points: standingsForCategory[r.id]?.points ?? 0,
        teammatePoints, badge: pos ? lastEntry?.badge : null,
        crashes: r.crashesThisSeason || 0, categoryKey, racedThisCategory: !!pos,
      });
      return { ...withHistory, prestige };
    });
    const substitutes = {};
    Object.entries(t.substitutes || {}).forEach(([ownerId, sub]) => {
      substitutes[ownerId] = buildHistoryEntryIfRaced(sub, t.name, standingsForCategory, posById, categoryKey, seasonNum);
    });
    return { ...t, riders, substitutes };
  });
}


export function teamExpectationTier(team) {
  const avg = bikeAvg(team.bike);
  const topTier = team.tier === "Fábrica" || team.tier === "Puntero";
  if (topTier && avg >= 78) return "title";
  if (topTier || avg >= 62) return "midfield";
  return "backmarker";
}


export function evaluateRiderSeason(rider, points, teammatePoints, tier, crashes) {
  let score = 2; // start at "Aceptable"
  if (tier === "title") {
    if (points > 200) score += 2;
    else if (points > 120) score += 1;
    else if (points < 60) score -= 1;
    else if (points < 25) score -= 2;
  } else if (tier === "midfield") {
    if (points > 130) score += 2;
    else if (points > 70) score += 1;
    else if (points < 20) score -= 1;
  } else {
    if (points > 60) score += 2;
    else if (points > 20) score += 1;
    else if (points < 5) score -= 1;
  }
  if (points > teammatePoints * 1.4) score += 1;
  else if (points < teammatePoints * 0.55) score -= 1;
  if (crashes >= 6) score -= 1;
  if (crashes >= 10) score -= 1;
  return EVAL_LABELS[clamp(score, 0, 4)];
}

/* Retirement is never a hard cutoff — from 35 onward each rider rolls a
   probability that climbs with age and is shaped by their career: a
   still-competitive, in-demand rider can race on past 40 as a genuine
   exception; an ageing rider adrift without a seat, out of form, or fresh
   off a bad injury is far more likely to call it a day. */


export function retirementChance(rider, ctx = {}) {
  if (rider.age < 35) return 0;
  let chance = 0.03 + (rider.age - 35) * 0.055;

  // Factors that push a rider toward retirement
  if (ctx.lostSeat) chance += 0.05;
  chance += clamp((rider.seasonsUnsigned || 0) * 0.06, 0, 0.3);
  if (ctx.seasonRating === "Mala") chance += 0.05;
  if (ctx.seasonRating === "Desastrosa") chance += 0.09;
  if (overallRating(rider) < 65) chance += 0.06;
  if (ctx.recentSevereInjury) chance += 0.12;

  // Factors that keep a rider on the grid
  if (ctx.seasonRating === "Excelente") chance -= 0.12;
  else if (ctx.seasonRating === "Buena") chance -= 0.07;
  if (ctx.isOfficial) chance -= 0.05;
  if ((ctx.wins || 0) >= 1) chance -= 0.06;
  if ((ctx.podiums || 0) >= 2) chance -= 0.03;
  if (rider.morale >= 70) chance -= 0.04;

  return clamp(chance, 0.01, 0.85);
}


export function shouldRetire(rider, ctx = {}) {
  if (rider.age < 35) return false;
  return Math.random() < retirementChance(rider, ctx);
}

/* Whether an AI team renews an out-of-contract rider: young, high-upside
   riders survive poor seasons; ageing, low-upside, expensive riders don't
   survive good ones. */

