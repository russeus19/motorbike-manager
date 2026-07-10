import { CATEGORY_DATA } from "../data/categories.js";
import { clamp, randInt } from "./random.js";
import { makeRookie } from "./riderGeneration.js";
import { fireRiderCost, isFreeAgentEligibleForCategory, overallRating, photoIdFor, substituteHireCost } from "./riders.js";
import { evaluateRiderSeason, shouldRetire, teamExpectationTier } from "./seasonHistory.js";

export function computeMarket(playerTeam, rivalTeams, teamStandings, otherCategories, category, freeAgents, departures) {
  const rows = [
    { id: "player", points: teamStandings.player || 0 },
    ...rivalTeams.map((t) => ({ id: t.id, points: teamStandings[t.id] || 0 })),
  ];
  rows.sort((a, b) => b.points - a.points);
  const position = rows.findIndex((r) => r.id === "player") + 1;

  let cap;
  if (position <= 2) cap = 99;
  else if (position <= 5) cap = 88;
  else if (position <= 8) cap = 80;
  else cap = 72;

  const budgetBase = (playerTeam.tier === "Fábrica" || playerTeam.tier === "Puntero") ? 1000000 : 650000;
  const transferBudget = Math.round(budgetBase + (12 - position) * 40000);

  const sameCategory = [];
  rivalTeams.forEach((t) => {
    t.riders.forEach((r) => {
      if (overallRating(r) <= cap) {
        sameCategory.push({ rider: r, origin: "market", fromTeamId: t.id, fromTeamName: t.name, cost: Math.round((r.marketValue || overallRating(r) * 9000) * 0.6) });
      }
    });
  });

  const lowerKey = CATEGORY_DATA[category].lower;
  const lowerTeams = lowerKey ? otherCategories[lowerKey]?.teams : null;
  const promoted = [];
  if (lowerTeams) {
    lowerTeams.forEach((t) => {
      t.riders.forEach((r) => {
        if (overallRating(r) <= cap) {
          promoted.push({ rider: r, origin: "lower", fromTeamId: t.id, fromTeamName: t.name, cost: Math.round((r.marketValue || overallRating(r) * 7000) * 0.5) });
        }
      });
    });
  }

  const agents = (freeAgents || [])
    .filter((r) => isFreeAgentEligibleForCategory(r, category))
    .map((r) => ({ rider: r, origin: "freeagent", fromTeamId: null, fromTeamName: "Agente libre", cost: Math.round(overallRating(r) * 5000) }));

  const candidates = [...sameCategory, ...promoted];
  candidates.sort((a, b) => overallRating(b.rider) - overallRating(a.rider));

  return { position, cap, transferBudget, marketRiders: candidates, freeAgentRiders: agents, departures: departures || {} };
}

/* What a team expects from its season, based on its own level — used to
   judge whether a rider's season was actually good relative to their
   situation, not just their raw championship position. */


export function aiRenewalDecision(rider, evalLabel, team) {
  let chance = 0.5;
  const upside = rider.pa - overallRating(rider);
  if (rider.age <= 23 && rider.pa >= 75) chance += 0.35;
  else if (upside >= 15) chance += 0.15;
  if (rider.age >= 33) chance -= 0.2;
  if (rider.age >= 37) chance -= 0.2;
  if (evalLabel === "Excelente") chance += 0.3;
  else if (evalLabel === "Buena") chance += 0.15;
  else if (evalLabel === "Mala") chance -= 0.2;
  else if (evalLabel === "Desastrosa") chance -= 0.4;
  if (team.budget && rider.salary > team.budget * 0.4) chance -= 0.15;
  return Math.random() < clamp(chance, 0.05, 0.95);
}

/* One category's full end-of-season market pass for its AI-controlled
   teams: retire, renew or release every out-of-contract rider (riders
   still under contract just carry on), then fill any resulting vacancies
   from the shared free-agent pool. Mutates `freeAgentPool` and `log`.
   `excludeTeamId` lets the player's own team pass through untouched when
   it's mixed in with its AI rivals. */


export function runCategoryMarket(teams, riderStandingsForCategory, teamStandingsForCategory, freeAgentPool, log, categoryLabel, excludeTeamId, categoryKey) {
  const rows = teams.map((t) => ({ id: t.id, points: teamStandingsForCategory[t.id] || 0 })).sort((a, b) => b.points - a.points);
  const posMap = {};
  rows.forEach((r, i) => { posMap[r.id] = i + 1; });

  const updated = teams.map((t) => {
    if (t.id === excludeTeamId) return t;
    const tier = teamExpectationTier(t);
    const [r1, r2] = t.riders;
    const kept = [];
    let teamBudget = t.budget || 0;
    t.riders.forEach((r) => {
      const teammatePts = r.id === r1?.id ? (riderStandingsForCategory[r2?.id]?.points || 0) : (riderStandingsForCategory[r1?.id]?.points || 0);
      const evalLabel = evaluateRiderSeason(r, riderStandingsForCategory[r.id]?.points || 0, teammatePts, tier, r.crashesThisSeason || 0);
      const retireCtx = {
        lostSeat: false,
        seasonsUnsigned: r.seasonsUnsigned || 0,
        seasonRating: evalLabel,
        isOfficial: t.tier === "Fábrica" || t.tier === "Puntero",
        recentSevereInjury: !!(r.injury && (r.injury.severity === "grave" || r.injury.severity === "muyGrave")),
      };
      if (shouldRetire(r, retireCtx)) {
        log.push({ type: "retiro", riderId: photoIdFor(r), text: `${r.name} se retira`, category: categoryLabel });
        return;
      }
      if ((r.contractYears ?? 0) > 0) { kept.push(r); return; }
      const renewalCost = Math.round((r.marketValue || 0) * 0.08);
      if (aiRenewalDecision(r, evalLabel, t) && renewalCost <= teamBudget) {
        kept.push({ ...r, contractYears: randInt(1, 3) });
        teamBudget -= renewalCost;
        log.push({ type: "renovacion", riderId: photoIdFor(r), text: `${r.name} renueva con ${t.name} (temporada ${evalLabel.toLowerCase()})`, category: categoryLabel });
      } else {
        freeAgentPool.push({ ...r, seasonsUnsigned: 0 });
        log.push({ type: "salida", riderId: photoIdFor(r), text: `${r.name} deja ${t.name} tras una temporada ${evalLabel.toLowerCase()}`, category: categoryLabel });
      }
    });
    return { ...t, riders: kept, budget: teamBudget };
  });

  return updated.map((t) => {
    if (t.id === excludeTeamId || t.riders.length >= 2) return t;
    const riders = [...t.riders];
    let teamBudget = t.budget || 0;
    while (riders.length < 2) {
      const eligible = freeAgentPool
        .filter((r) => isFreeAgentEligibleForCategory(r, categoryKey))
        .sort((a, b) => overallRating(b) - overallRating(a));
      const affordable = eligible.find((r) => Math.round(overallRating(r) * 5000) <= teamBudget);
      if (!affordable) break; // nothing this team can pay for — the free promotion/rookie fallback picks up the vacancy
      const signingCost = Math.round(overallRating(affordable) * 5000);
      freeAgentPool.splice(freeAgentPool.findIndex((r) => r.id === affordable.id), 1);
      teamBudget -= signingCost;
      riders.push({ ...affordable, contractYears: randInt(1, 3), isNewTeamThisSeason: true, seasonsUnsigned: 0 });
      log.push({ type: "fichaje", riderId: photoIdFor(affordable), text: `${affordable.name} ficha como agente libre por ${t.name}`, category: categoryLabel });
    }
    return { ...t, riders, budget: teamBudget };
  });
}

/* Fills any teams still short of two riders by promoting the best
   available talent from the category below — mutates `lowerTeams`. */


export function fillFromLowerCategory(teams, lowerTeams, log, categoryLabel, lowerLabel) {
  return teams.map((t) => {
    if (t.riders.length >= 2) return t;
    const riders = [...t.riders];
    while (riders.length < 2) {
      let best = null, bestTeamIdx = -1;
      lowerTeams.forEach((lt, idx) => {
        lt.riders.forEach((cand) => {
          if (!best || overallRating(cand) > overallRating(best)) { best = cand; bestTeamIdx = idx; }
        });
      });
      if (!best) break;
      lowerTeams[bestTeamIdx] = { ...lowerTeams[bestTeamIdx], riders: lowerTeams[bestTeamIdx].riders.filter((r) => r.id !== best.id) };
      riders.push({ ...best, contractYears: randInt(2, 3), isNewTeamThisSeason: true });
      log.push({ type: "ascenso", riderId: photoIdFor(best), text: `${best.name} asciende de ${lowerLabel} a ${categoryLabel} (${t.name})`, category: categoryLabel });
    }
    return { ...t, riders };
  });
}

/* Moto3 has no category below it — any remaining vacancies there are
   filled with freshly generated young prospects. */


export function fillWithRookies(teams, log, categoryLabel, scale) {
  return teams.map((t) => {
    if (t.riders.length >= 2) return t;
    const riders = [...t.riders];
    while (riders.length < 2) {
      const rookie = makeRookie(scale);
      riders.push(rookie);
      log.push({ type: "debut", riderId: photoIdFor(rookie), text: `${rookie.name} debuta con ${t.name} (${rookie.age} años)`, category: categoryLabel });
    }
    return { ...t, riders };
  });
}


export function getLowerTeamsFor(catKey, otherCatsObj) {
  const lk = CATEGORY_DATA[catKey]?.lower;
  return lk && otherCatsObj[lk] ? otherCatsObj[lk].teams : null;
}

/* Find the best rider a team could realistically sign right now: the top
   candidate from the category below (if any) or from the frozen free
   agent pool. Returns null if nothing is available. */


export function findBestReplacement(lowerTeams, freeAgentsPool) {
  let best = null;
  let source = null;
  let fromTeamId = null;
  if (lowerTeams) {
    lowerTeams.forEach((t) => {
      t.riders.forEach((r) => {
        if (!best || overallRating(r) > overallRating(best)) { best = r; source = "lower"; fromTeamId = t.id; }
      });
    });
  }
  (freeAgentsPool || []).forEach((r) => {
    if (!best || overallRating(r) > overallRating(best)) { best = r; source = "freeagent"; fromTeamId = null; }
  });
  return best ? { rider: best, source, fromTeamId } : null;
}

/* ---------------------------------------------------------------------- */
/* Small UI atoms                                                          */
/* ---------------------------------------------------------------------- */


export function pickBestFreeAgentSub(pool, categoryKey, budget, scale) {
  if (!pool || !pool.length) return null;
  const eligible = pool.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey) && substituteHireCost(r, scale) <= (budget ?? 0));
  if (!eligible.length) return null;
  const scored = eligible.map((r) => ({
    r,
    score: overallRating(r) + (r.age >= 27 ? 3 : 0) - (r.salary || 0) / 3000000,
  })).sort((a, b) => b.score - a.score);
  return scored[0].r;
}

/* Runs a team through everything that happens to it after a race: income,
   R&D progress (AI-directed unless it's the player's own team), and — new
   here — injury bookkeeping. A rider who raced themself gets their crash
   possibly turned into an injury; a rider already sidelined just has
   their recovery clock tick down; when a substitute's stint ends they go
   back into the shared free-agent pool. `poolRef` is a mutable
   { pool: [...] } box so callers can thread the shared free-agent list
   through many teams/categories in one pass; `notifQueue` collects
   {type, text} entries for the Notification Center. */
/* Very rare: an AI team fires a rider mid-season, but only when several
   red flags line up at once (well into the season, low morale, low
   upside, poor current level) AND there's a clearly better free agent
   actually available and affordable. */


export function aiMaybeFireRider(team, categoryKey, ctx, poolRef, notifQueue) {
  if (!team.riders || team.riders.length < 2) return team;
  if ((ctx.roundIndex ?? 0) < (ctx.totalRounds ?? 22) * 0.45) return team;
  if (Math.random() > 0.015) return team;

  const candidate = team.riders.find((r) =>
    r.morale < 35 && r.pa < 55 && overallRating(r) < 66 && !(r.injury && r.injury.sidelined)
  );
  if (!candidate) return team;

  const eligiblePool = poolRef.pool.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey));
  const better = eligiblePool.find((r) => overallRating(r) > overallRating(candidate) + 8);
  if (!better) return team;

  const fCost = fireRiderCost(candidate);
  const sCost = Math.round(overallRating(better) * 5000);
  if (fCost + sCost > (team.budget || 0)) return team;

  poolRef.pool = poolRef.pool.filter((r) => r.id !== better.id);
  poolRef.pool = [...poolRef.pool, { ...candidate, contractYears: 0, isNewTeamThisSeason: false }];
  notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(candidate), text: `${team.name} despide a ${candidate.name} en plena temporada y ficha a ${better.name} como sustituto inmediato.` });

  const remaining = team.riders.filter((r) => r.id !== candidate.id);
  return {
    ...team,
    budget: (team.budget || 0) - fCost - sCost,
    riders: [...remaining, { ...better, contractYears: randInt(1, 3), isNewTeamThisSeason: true }],
  };
}

