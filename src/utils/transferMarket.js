import { CATEGORY_DATA } from "../data/categories.js";
import { clamp } from "./random.js";
import { makeRookie } from "./riderGeneration.js";
import { computeContinuityScore, continuityToRenewalProbability, proposedContractYears, riderWantsToStay, scoreCandidateForTeam, teamPullingPower, wouldRiderJoin } from "./marketAI.js";
import { computeSalary, fireRiderCost, isFreeAgentEligibleForCategory, overallRating, photoIdFor, substituteHireCost } from "./riders.js";
import { evaluateRiderSeason, shouldRetire, teamExpectationTier } from "./seasonHistory.js";
import { evaluateSeasonVsExpectation } from "./teamExpectations.js";

/**
 * The full season-end market pass, across every playable category at
 * once — this is what replaced the old "renew almost everyone, then
 * fill whatever's left with the best-rated candidate" logic.
 *
 * `categoriesData` shape: { motogp: { teams, riderStandings,
 * teamStandings, excludeTeamId }, moto2: {...}, moto3: {...} }.
 * `log` shape: { motogp: [], moto2: [], moto3: [] } (mutated in place).
 * Returns { teamsByCategory, pool } — `pool` is the shared free-agent
 * pool after every renewal/release/signing this pass produced.
 *
 * Runs in three stages, mirroring the design:
 *  1) Continuity + renewal, per rider, per team (fase 1-2) — never a
 *     flat "contract ended → gone", always a two-sided probability
 *     roll (team wants them / they want to stay).
 *  2) Every vacancy across all three categories collected into one
 *     list, ordered by how attractive the buying team is — so the
 *     biggest teams see the deepest pool first and whatever's left
 *     cascades down to smaller ones (the "efecto dominó").
 *  3) Each vacancy walks its own sorted candidate list until someone
 *     actually says yes (wouldRiderJoin), or falls back to a freshly
 *     generated prospect if the whole pool says no.
 */
export function resolveSeasonMarketAcrossCategories(categoriesData, freeAgentPool, retiredIds, log) {
  let pool = [...freeAgentPool];
  const teamsByCategory = {};

  // --- Fase 1 + 2: retirement, then continuity-driven renewal ---
  Object.entries(categoriesData).forEach(([ck, catData]) => {
    const { teams, riderStandings, teamStandings, excludeTeamId } = catData;
    const teamRows = teams.map((t) => ({ id: t.id, points: teamStandings?.[t.id] || 0 })).sort((a, b) => b.points - a.points);
    const teamPosById = {};
    teamRows.forEach((row, i) => { teamPosById[row.id] = i + 1; });
    const riderRows = Object.entries(riderStandings || {}).sort((a, b) => b[1].points - a[1].points);
    const riderPosById = {};
    riderRows.forEach(([id], i) => { riderPosById[id] = i + 1; });

    teamsByCategory[ck] = teams.map((t) => {
      if (t.id === excludeTeamId) return t;
      const tier = teamExpectationTier(t);
      const teamExpectationVerdict = evaluateSeasonVsExpectation(teamPosById[t.id], t.expectation);
      const [r1, r2] = t.riders;
      const kept = [];
      t.riders.forEach((r) => {
        const teammatePts = r.id === r1?.id ? (riderStandings?.[r2?.id]?.points || 0) : (riderStandings?.[r1?.id]?.points || 0);
        const points = riderStandings?.[r.id]?.points || 0;
        const crashes = r.crashesThisSeason || 0;
        const evalLabelForRetire = evaluateRiderSeason(r, points, teammatePts, tier, crashes);
        const retireCtx = {
          lostSeat: false,
          seasonsUnsigned: r.seasonsUnsigned || 0,
          seasonRating: evalLabelForRetire,
          isOfficial: t.tier === "Fábrica" || t.tier === "Puntero",
          recentSevereInjury: !!(r.injury && (r.injury.severity === "grave" || r.injury.severity === "muyGrave")),
        };
        if (shouldRetire(r, retireCtx)) {
          retiredIds?.add(r.id);
          log[ck].push({ type: "retiro", riderId: photoIdFor(r), text: `${r.name} se retira`, category: CATEGORY_DATA[ck].label });
          return;
        }
        // Contract truth: still under contract, no market decision needed.
        if ((r.contractYears ?? 0) > 0) { kept.push(r); return; }

        // A rider's own finishing position, judged against the same
        // team-expectation band (scaled ×2 for two riders per team) the
        // rest of the game already uses.
        const riderExpectationVerdict = t.expectation
          ? evaluateSeasonVsExpectation(riderPosById[r.id], { min: Math.max(1, t.expectation.min * 2 - 1), max: t.expectation.max * 2 })
          : null;
        const continuity = computeContinuityScore(r, t, {
          points, teammatePoints: teammatePts, tier, riderExpectationVerdict, teamExpectationVerdict,
          crashes, injuriesThisSeason: r.injuriesThisSeason || 0,
        });
        const teamWantsToRenew = Math.random() < continuityToRenewalProbability(continuity);
        const riderWillingToStay = teamWantsToRenew ? riderWantsToStay(r, t, ck) : false;

        if (teamWantsToRenew && riderWillingToStay) {
          const years = proposedContractYears(r);
          kept.push({ ...r, contractYears: years, salary: Math.round(computeSalary(r, CATEGORY_DATA[ck].scale) * (0.95 + Math.random() * 0.2)) });
          log[ck].push({ type: "renovacion", riderId: photoIdFor(r), text: `${r.name} renueva con ${t.name} (${years} temporada${years === 1 ? "" : "s"})`, category: CATEGORY_DATA[ck].label });
          return;
        }

        pool.push({ ...r, seasonsUnsigned: 0, _fromCategoryKey: ck, _fromBikeAvg: bikeAvgOf(t) });
        const lowerKey = CATEGORY_DATA[ck]?.lower;
        const isRelegation = lowerKey && r.age <= 26 && ["Mala", "Desastrosa"].includes(evalLabelForRetire);
        if (isRelegation) {
          log[ck].push({ type: "descenso", riderId: photoIdFor(r), text: `${r.name} desciende de categoría tras dejar ${t.name}`, category: CATEGORY_DATA[ck].label });
        } else if (!teamWantsToRenew) {
          log[ck].push({ type: "salida", riderId: photoIdFor(r), text: `${r.name} deja ${t.name} tras una temporada ${evalLabelForRetire.toLowerCase()}`, category: CATEGORY_DATA[ck].label });
        } else {
          log[ck].push({ type: "salida", riderId: photoIdFor(r), text: `${r.name} decide no continuar en ${t.name} pese a la renovación ofrecida`, category: CATEGORY_DATA[ck].label });
        }
      });
      return { ...t, riders: kept };
    });
  });

  // --- Fase 3: vacancies, ordered by how attractive the buying team is ---
  const vacancies = [];
  Object.entries(teamsByCategory).forEach(([ck, teams]) => {
    teams.forEach((t) => {
      if (t.id === categoriesData[ck].excludeTeamId) return;
      for (let i = t.riders.length; i < 2; i++) vacancies.push({ categoryKey: ck, teamId: t.id });
    });
  });
  vacancies.sort((a, b) => teamPullingPower(findTeam(teamsByCategory, b.categoryKey, b.teamId), b.categoryKey) - teamPullingPower(findTeam(teamsByCategory, a.categoryKey, a.teamId), a.categoryKey));

  vacancies.forEach(({ categoryKey, teamId }) => {
    const team = findTeam(teamsByCategory, categoryKey, teamId);
    if (!team || team.riders.length >= 2) return; // already filled by an earlier vacancy in this same pass

    const eligible = pool.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey));
    const bikeAvgOffered = bikeAvgOf(team);
    const ranked = eligible
      .map((r) => ({ r, score: scoreCandidateForTeam(r, team, { categoryKey, teamBudget: team.budget }) }))
      .sort((a, b) => b.score - a.score);

    let signed = null;
    for (const { r } of ranked) {
      const offeredSalary = Math.round(computeSalary(r, CATEGORY_DATA[categoryKey].scale) * (1 + Math.random() * 0.15));
      const accepted = wouldRiderJoin(r, team, categoryKey, offeredSalary, {
        fromCategoryKey: r._fromCategoryKey || categoryKey, bikeAvgOffered, currentBikeAvg: r._fromBikeAvg ?? bikeAvgOffered,
      });
      if (accepted) { signed = { rider: r, salary: offeredSalary }; break; }
    }

    if (signed) {
      pool = pool.filter((r) => r.id !== signed.rider.id);
      const years = proposedContractYears(signed.rider);
      const { _fromCategoryKey, _fromBikeAvg, ...cleanRider } = signed.rider;
      const newRider = { ...cleanRider, contractYears: years, salary: signed.salary, isNewTeamThisSeason: true, seasonsUnsigned: 0 };
      applyRiderToTeam(teamsByCategory, categoryKey, teamId, newRider);
      const catRank = { motogp: 3, moto2: 2, moto3: 1 };
      const fromCat = _fromCategoryKey;
      let logType = "fichaje";
      let text;
      if (fromCat && fromCat !== categoryKey && catRank[categoryKey] > catRank[fromCat]) {
        logType = "ascenso";
        text = `${newRider.name} asciende de ${CATEGORY_DATA[fromCat].label} a ${CATEGORY_DATA[categoryKey].label} (${team.name})`;
      } else if (fromCat && fromCat !== categoryKey && catRank[categoryKey] < catRank[fromCat]) {
        logType = "descenso";
        text = `${newRider.name} baja de ${CATEGORY_DATA[fromCat].label} a ${CATEGORY_DATA[categoryKey].label} (${team.name})`;
      } else {
        text = `${newRider.name} ficha por ${team.name}`;
      }
      log[categoryKey].push({ type: logType, riderId: photoIdFor(newRider), text, category: CATEGORY_DATA[categoryKey].label });
    } else {
      // Nobody in the whole pool wanted this seat — a fresh prospect
      // gets their shot instead, exactly like the old rookie fallback.
      const rookie = makeRookie(CATEGORY_DATA[categoryKey].scale);
      applyRiderToTeam(teamsByCategory, categoryKey, teamId, rookie);
      log[categoryKey].push({ type: "debut", riderId: photoIdFor(rookie), text: `${rookie.name} debuta con ${team.name} (${rookie.age} años)`, category: CATEGORY_DATA[categoryKey].label });
    }
  });

  return { teamsByCategory, pool };
}

function bikeAvgOf(team) {
  if (!team?.bike) return 60;
  const vals = Object.values(team.bike);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function findTeam(teamsByCategory, categoryKey, teamId) {
  return (teamsByCategory[categoryKey] || []).find((t) => t.id === teamId) || null;
}

function applyRiderToTeam(teamsByCategory, categoryKey, teamId, rider) {
  teamsByCategory[categoryKey] = teamsByCategory[categoryKey].map((t) => (t.id === teamId ? { ...t, riders: [...t.riders, rider] } : t));
}

/**
 * A substitute's contract is temporary by definition — it exists only to
 * cover an injured rider's seat, and never survives past the season it
 * was created in unless the market separately hands them a real
 * contract. Called once per category at the very start of the
 * season-end market pass, so any substitute released here is
 * immediately back in the shared pool and eligible to be signed
 * permanently in that same market pass if a team happens to want them.
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

