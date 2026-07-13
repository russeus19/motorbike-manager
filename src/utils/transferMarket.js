import { CATEGORY_DATA } from "../data/categories.js";
import { clamp } from "./random.js";
import { makeRookie, makeRookiesCupProspect } from "./riderGeneration.js";
import { fireRiderCost, isFreeAgentEligibleForCategory, overallRating, photoIdFor, substituteHireCost } from "./riders.js";
import { evaluateRiderSeason, shouldRetire, teamExpectationTier } from "./seasonHistory.js";

/* What a team expects from its season, based on its own level — used to
   judge whether a rider's season was actually good relative to their
   situation, not just their raw championship position. */


/* `expectationVerdict` (from evaluateSeasonVsExpectation, see
   teamExpectations.js) is optional and additive: when the caller doesn't
   have one (or the team has no expectation assigned yet, e.g. an old
   save), this behaves exactly as before. When present, it's the main
   new signal this system adds — whether the rider actually met what was
   realistically expected of them matters more than their raw rating. */
export function aiRenewalDecision(rider, evalLabel, team, expectationVerdict) {
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
  if (expectationVerdict === "extraordinaria") chance += 0.25;
  else if (expectationVerdict === "sobresaliente") chance += 0.1;
  else if (expectationVerdict === "por_debajo") chance -= 0.1;
  else if (expectationVerdict === "decepcionante") chance -= 0.25;
  if (team.budget && rider.salary > team.budget * 0.4) chance -= 0.15;
  return Math.random() < clamp(chance, 0.05, 0.95);
}

/**
 * The Red Bull Rookies Cup's own season-end maintenance (section 20) —
 * deliberately NOT routed through runCategoryMarket, which assumes
 * every team needs exactly 2 riders. This category is a single team
 * with 26 riders, every one of them on a single-season contract by
 * design (section 9), so "contractYears > 0" would otherwise empty the
 * entire roster at once instead of the gradual turnover every other
 * category has.
 *
 * Anyone who signed elsewhere during the season is already gone by the
 * time this runs (applyConfirmedNegotiations handles that generically,
 * same as any other category). Everyone else's single-year contract
 * has just run out — no retirement check makes sense at 14-18 years
 * old, so every vacated seat is simply refilled with a brand new
 * prospect (makeRookiesCupProspect), keeping the grid at exactly 26.
 */
export function regenerateRookiesCupGrid(team, log) {
  const staying = team.riders.filter((r) => (r.contractYears ?? 0) > 0);
  const seatsToFill = 26 - staying.length;
  const fresh = [];
  for (let i = 0; i < seatsToFill; i++) {
    const prospect = makeRookiesCupProspect();
    fresh.push(prospect);
    log.push({ type: "debut", riderId: photoIdFor(prospect), text: `${prospect.name} debuta en la Red Bull Rookies Cup (${prospect.age} años)`, category: "Red Bull Rookies Cup" });
  }
  return { ...team, riders: [...staying, ...fresh] };
}

/* One category's full end-of-season market pass for its AI-controlled
   teams: retire, renew or release every out-of-contract rider (riders
   still under contract just carry on), then fill any resulting vacancies
   from the shared free-agent pool. Mutates `freeAgentPool` and `log`.
   `excludeTeamId` lets the player's own team pass through untouched when
   it's mixed in with its AI rivals. */


export function runCategoryMarket(teams, riderStandingsForCategory, teamStandingsForCategory, freeAgentPool, log, categoryLabel, excludeTeamId, categoryKey, retiredIds) {
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
        retiredIds?.add(r.id);
        log.push({ type: "retiro", riderId: photoIdFor(r), text: `${r.name} se retira`, category: categoryLabel });
        return;
      }
      // Contract truth: renewals no longer happen here at all — they're
      // decided mid-season through the exact same negotiation engine as
      // every other signing (see marketNegotiations.js's
      // maybeGenerateAIRenewalNegotiations). If a rider is still at 0
      // contract years by the time this runs, that renewal either didn't
      // happen or was declined, and they simply become a free agent —
      // there is no second, separate renewal system here anymore.
      if ((r.contractYears ?? 0) > 0) { kept.push(r); return; }
      freeAgentPool.push({ ...r, seasonsUnsigned: 0 });
      // A young rider who was clearly out of his depth (not just an
      // ordinary release) and still has a lower category to go back to
      // reads as a relegation rather than a plain exit — same pool, same
      // free-agent eligibility rules, only the framing changes.
      const lowerKey = CATEGORY_DATA[categoryKey]?.lower;
      const isRelegation = lowerKey && r.age <= 26 && ["Mala", "Desastrosa"].includes(evalLabel);
      if (isRelegation) {
        log.push({ type: "descenso", riderId: photoIdFor(r), text: `${r.name} desciende de categoría tras dejar ${t.name}`, category: categoryLabel });
      } else {
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
      riders.push({ ...affordable, contractYears: 2, isNewTeamThisSeason: true, seasonsUnsigned: 0 });
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
      riders.push({ ...best, contractYears: 2, isNewTeamThisSeason: true });
      log.push({ type: "ascenso", riderId: photoIdFor(best), text: `${best.name} asciende de ${lowerLabel} a ${categoryLabel} (${t.name})`, category: categoryLabel });
    }
    return { ...t, riders };
  });
}

/* Moto3 has no category below it — any remaining vacancies there are
   filled with freshly generated young prospects. */


/**
 * A substitute's contract is temporary by definition — it exists only to
 * cover an injured rider's seat, and never survives past the season it
 * was created in unless the market separately hands them a real
 * contract. Called once per category at the very start of the
 * season-end market pass (before runCategoryMarket), so any substitute
 * released here is immediately back in the shared pool and eligible to
 * be signed permanently in that same market pass if a team happens to
 * want them — the "excepción" the design calls for falls out naturally
 * from the ordering, with no special-casing needed.
 *
 * Every team ends up with `substitutes: {}`; nothing about `team.riders`
 * (the actual titular/contracted riders) is touched here.
 */
export function releaseSubstitutesToPool(teams, freeAgentPool, log, categoryLabel) {
  let pool = [...freeAgentPool];
  const teamsReleased = teams.map((t) => {
    const subs = Object.values(t.substitutes || {});
    if (!subs.length) return t;
    subs.forEach((sub) => {
      pool.push({ ...sub, contractYears: 0, isNewTeamThisSeason: false, seasonsUnsigned: 0 });
      if (log) log.push({ type: "salida", riderId: photoIdFor(sub), text: `${sub.name} finaliza su cesión temporal en ${t.name} y vuelve a agentes libres`, category: categoryLabel });
    });
    return { ...t, substitutes: {} };
  });
  return { teams: teamsReleased, pool };
}

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
  // A team expecting to fight at the front is a little less patient with
  // an underperforming rider than one with modest ambitions — but this
  // stays a rare, exceptional event either way (0.010-0.020 range).
  const ambitionFactor = team.expectation ? clamp(1.4 - team.expectation.min * 0.04, 0.65, 1.35) : 1;
  if (Math.random() > 0.015 * ambitionFactor) return team;

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
    riders: [...remaining, { ...better, contractYears: 2, isNewTeamThisSeason: true }],
  };
}

