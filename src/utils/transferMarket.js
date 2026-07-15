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
  const teamExpectationVerdictById = {};
  const riderPosByIdByCategory = {};

  // --- Fase 1: retirement only — unaffected by market timing, so this
  // stays a simple independent per-category pass. ---
  Object.entries(categoriesData).forEach(([ck, catData]) => {
    const { teams, riderStandings, teamStandings, excludeTeamId } = catData;
    const teamRows = teams.map((t) => ({ id: t.id, points: teamStandings?.[t.id] || 0 })).sort((a, b) => b.points - a.points);
    const teamPosById = {};
    teamRows.forEach((row, i) => { teamPosById[row.id] = i + 1; });
    const riderRows = Object.entries(riderStandings || {}).sort((a, b) => b[1].points - a[1].points);
    const riderPosById = {};
    riderRows.forEach(([id], i) => { riderPosById[id] = i + 1; });
    riderPosByIdByCategory[ck] = riderPosById;

    teamsByCategory[ck] = teams.map((t) => {
      if (t.id === excludeTeamId) return t;
      teamExpectationVerdictById[`${ck}:${t.id}`] = evaluateSeasonVsExpectation(teamPosById[t.id], t.expectation);
      const tier = teamExpectationTier(t);
      const [r1, r2] = t.riders;
      const riders = [];
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
        riders.push(r);
      });
      return { ...t, riders };
    });
  });

  // --- Fase 2: continuity-vs-market, ordered by how attractive the team
  // is, across every category at once. A real team's management checks
  // the market BEFORE ever committing to a renewal — not the other way
  // around — so this now does the same: for every rider up for renewal,
  // the team first compares them against the single best candidate
  // already loose on the market (including anyone released mid-pass by
  // an earlier, more attractive team, or manually released by the
  // player from the very start), and only falls back to the normal
  // continuity-based renewal roll if nothing out there is clearly
  // better. Processing the biggest, most ambitious teams first means a
  // genuine star has every chance to be picked up as they cascade down
  // through the grid, instead of only ever being visible to whichever
  // team happens to have an empty seat once every renewal is already
  // decided.
  const MARKET_SWAP_MARGIN = 12;
  const teamOrder = [];
  Object.entries(teamsByCategory).forEach(([ck, teams]) => {
    teams.forEach((t) => { if (t.id !== categoriesData[ck].excludeTeamId) teamOrder.push({ ck, teamId: t.id }); });
  });
  teamOrder.sort((a, b) => teamPullingPower(findTeam(teamsByCategory, b.ck, b.teamId), b.ck) - teamPullingPower(findTeam(teamsByCategory, a.ck, a.teamId), a.ck));

  teamOrder.forEach(({ ck, teamId }) => {
    const t = findTeam(teamsByCategory, ck, teamId);
    if (!t) return;
    const tier = teamExpectationTier(t);
    const teamExpectationVerdict = teamExpectationVerdictById[`${ck}:${teamId}`];
    const riderPosById = riderPosByIdByCategory[ck];
    const riderStandings = categoriesData[ck].riderStandings;
    const [r1, r2] = t.riders;
    const kept = [];
    t.riders.forEach((r) => {
      // Contract truth: still under contract, no market decision needed.
      if ((r.contractYears ?? 0) > 0) { kept.push(r); return; }

      const teammatePts = r.id === r1?.id ? (riderStandings?.[r2?.id]?.points || 0) : (riderStandings?.[r1?.id]?.points || 0);
      const points = riderStandings?.[r.id]?.points || 0;
      const crashes = r.crashesThisSeason || 0;

      // The market gets first look, always — before any renewal roll.
      const eligiblePool = pool.filter((p) => isFreeAgentEligibleForCategory(p, ck));
      const ownScore = scoreCandidateForTeam(r, t, { categoryKey: ck, teamBudget: t.budget });
      const bestOutside = eligiblePool
        .map((p) => ({ p, score: scoreCandidateForTeam(p, t, { categoryKey: ck, teamBudget: t.budget }) }))
        .sort((a, b) => b.score - a.score)[0];

      if (bestOutside && bestOutside.score > ownScore + MARKET_SWAP_MARGIN) {
        const bikeAvgOffered = bikeAvgOf(t);
        const offeredSalary = Math.round(computeSalary(bestOutside.p, CATEGORY_DATA[ck].scale) * (1.1 + Math.random() * 0.2));
        const accepted = wouldRiderJoin(bestOutside.p, t, ck, offeredSalary, {
          fromCategoryKey: bestOutside.p._fromCategoryKey || ck, bikeAvgOffered, currentBikeAvg: bestOutside.p._fromBikeAvg ?? bikeAvgOffered,
          isUnemployed: true, seasonsUnsigned: bestOutside.p.seasonsUnsigned || 0,
        });
        if (accepted) {
          pool = pool.filter((x) => x.id !== bestOutside.p.id);
          pool.push({ ...r, seasonsUnsigned: 0, _fromCategoryKey: ck, _fromBikeAvg: bikeAvgOffered });
          const years = proposedContractYears(bestOutside.p);
          const { _fromCategoryKey, _fromBikeAvg, ...cleanRider } = bestOutside.p;
          const newRider = { ...cleanRider, contractYears: years, salary: offeredSalary, isNewTeamThisSeason: true, seasonsUnsigned: 0 };
          kept.push(newRider);
          log[ck].push({ type: "fichaje", riderId: photoIdFor(newRider), text: `${newRider.name} ficha por ${t.name}, que prescinde de ${r.name} tras encontrar una opción mejor en el mercado`, category: CATEGORY_DATA[ck].label });
          return;
        }
      }

      // Nothing outside was clearly better (or they said no) — the
      // normal continuity-based renewal roll decides from here.
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
      const evalLabelForRetire = evaluateRiderSeason(r, points, teammatePts, tier, crashes);
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
    teamsByCategory[ck] = teamsByCategory[ck].map((team) => (team.id === teamId ? { ...team, riders: kept } : team));
  });

  // --- Fase 2.5: cross-category promotion — real teams actively chase
  // the best of the category below instead of only ever drawing from
  // whoever happens to already be a free agent. Without this, a Moto2
  // champion who (correctly) renews with their own team would never
  // become available to MotoGP, and MotoGP's vacancies would only ever
  // be filled from the leftover pool of released/free riders — exactly
  // backwards from how real promotions work. A rider poached this way
  // leaves their own category's roster even if that team had just
  // renewed them, the same way a real MotoGP call-up overrides a Moto2
  // rider's plan to stay. Whatever seat they leave behind is a genuine
  // new vacancy, picked up naturally by Fase 3 below.
  const PROMOTION_PAIRS = [{ higher: "motogp", lower: "moto2" }, { higher: "moto2", lower: "moto3" }];
  PROMOTION_PAIRS.forEach(({ higher, lower }) => {
    if (!teamsByCategory[higher] || !teamsByCategory[lower]) return;
    const lowerStandings = categoriesData[lower]?.riderStandings || {};
    const rankedLowerIds = Object.entries(lowerStandings).sort((a, b) => b[1].points - a[1].points).map(([id]) => id);

    // Only genuine Top-10 finishers of the category below are ever
    // actively chased this way — everyone else is already covered
    // naturally once they hit the shared pool in Fase 3.
    const candidatePool = [];
    rankedLowerIds.slice(0, 10).forEach((riderId) => {
      for (const t of teamsByCategory[lower]) {
        const idx = t.riders.findIndex((r) => r.id === riderId);
        if (idx >= 0) {
          const r = t.riders[idx];
          if (isFreeAgentEligibleForCategory(r, higher)) candidatePool.push({ rider: r, fromTeamId: t.id });
          break;
        }
      }
    });
    if (!candidatePool.length) return;

    const higherTeamsOrder = [...teamsByCategory[higher]]
      .filter((t) => t.id !== categoriesData[higher].excludeTeamId)
      .sort((a, b) => teamPullingPower(b, higher) - teamPullingPower(a, higher));

    higherTeamsOrder.forEach(({ id: teamId }) => {
      let liveTeam = findTeam(teamsByCategory, higher, teamId);
      while (liveTeam && liveTeam.riders.length < 2 && candidatePool.length) {
        const scored = candidatePool
          .map((c, idx) => ({ idx, score: scoreCandidateForTeam(c.rider, liveTeam, { categoryKey: higher, teamBudget: liveTeam.budget }) }))
          .sort((a, b) => b.score - a.score);
        let signedIdx = null, signedSalary = null;
        for (const { idx } of scored) {
          const c = candidatePool[idx];
          const offeredSalary = Math.round(computeSalary(c.rider, CATEGORY_DATA[higher].scale) * (1.15 + Math.random() * 0.25));
          const accepted = wouldRiderJoin(c.rider, liveTeam, higher, offeredSalary, {
            fromCategoryKey: lower, bikeAvgOffered: bikeAvgOf(liveTeam), currentBikeAvg: bikeAvgOf(findTeam(teamsByCategory, lower, c.fromTeamId)),
          });
          if (accepted) { signedIdx = idx; signedSalary = offeredSalary; break; }
        }
        if (signedIdx === null) break; // nobody left in the pool wants THIS particular team
        const { rider, fromTeamId } = candidatePool[signedIdx];
        teamsByCategory[lower] = teamsByCategory[lower].map((t) => (t.id === fromTeamId ? { ...t, riders: t.riders.filter((r) => r.id !== rider.id) } : t));
        const years = proposedContractYears(rider);
        const newRider = { ...rider, contractYears: years, salary: signedSalary, isNewTeamThisSeason: true, seasonsUnsigned: 0 };
        applyRiderToTeam(teamsByCategory, higher, teamId, newRider);
        log[higher].push({ type: "ascenso", riderId: photoIdFor(newRider), text: `${newRider.name} asciende de ${CATEGORY_DATA[lower].label} a ${CATEGORY_DATA[higher].label} (${findTeam(teamsByCategory, higher, teamId).name})`, category: CATEGORY_DATA[higher].label });
        candidatePool.splice(signedIdx, 1);
        liveTeam = findTeam(teamsByCategory, higher, teamId);
      }
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
        isUnemployed: true, seasonsUnsigned: r.seasonsUnsigned || 0,
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

  // --- Fase 3.5: "estrella sin equipo" — a standout free agent left in
  // the pool after every genuine vacancy is filled would, in reality,
  // still draw real interest: a team trades up, releasing its weakest
  // incumbent to sign someone clearly better. A high enough margin is
  // required so this never causes everyday marginal reshuffling — it
  // only stops a rider like a former champion from sitting unsigned
  // purely because no seat happened to be empty.
  const UPGRADE_MARGIN = 15;
  Object.keys(teamsByCategory).forEach((ck) => {
    const teamsOrder = [...teamsByCategory[ck]]
      .filter((t) => t.id !== categoriesData[ck].excludeTeamId)
      .sort((a, b) => teamPullingPower(b, ck) - teamPullingPower(a, ck));

    teamsOrder.forEach(({ id: teamId }) => {
      let liveTeam = findTeam(teamsByCategory, ck, teamId);
      if (!liveTeam || liveTeam.riders.length < 2) return; // a genuine vacancy already got first pick in Fase 3
      let changed = true;
      while (changed) {
        changed = false;
        const eligible = pool.filter((r) => isFreeAgentEligibleForCategory(r, ck));
        if (!eligible.length) break;
        const teamBudget = liveTeam.budget;
        const riderScores = liveTeam.riders.map((r) => scoreCandidateForTeam(r, liveTeam, { categoryKey: ck, teamBudget }));
        const weakestIdx = riderScores[0] <= riderScores[1] ? 0 : 1;
        const weakest = liveTeam.riders[weakestIdx];
        const weakestScore = riderScores[weakestIdx];

        const ranked = eligible
          .map((r) => ({ r, score: scoreCandidateForTeam(r, liveTeam, { categoryKey: ck, teamBudget }) }))
          .filter(({ score }) => score > weakestScore + UPGRADE_MARGIN)
          .sort((a, b) => b.score - a.score);

        for (const { r } of ranked) {
          const bikeAvgOffered = bikeAvgOf(liveTeam);
          const offeredSalary = Math.round(computeSalary(r, CATEGORY_DATA[ck].scale) * (1.1 + Math.random() * 0.2));
          const accepted = wouldRiderJoin(r, liveTeam, ck, offeredSalary, {
            fromCategoryKey: r._fromCategoryKey || ck, bikeAvgOffered, currentBikeAvg: r._fromBikeAvg ?? bikeAvgOffered,
            isUnemployed: true, seasonsUnsigned: r.seasonsUnsigned || 0,
          });
          if (!accepted) continue;
          pool = pool.filter((x) => x.id !== r.id);
          pool.push({ ...weakest, seasonsUnsigned: 0, _fromCategoryKey: ck, _fromBikeAvg: bikeAvgOffered });
          const years = proposedContractYears(r);
          const { _fromCategoryKey, _fromBikeAvg, ...cleanRider } = r;
          const newRider = { ...cleanRider, contractYears: years, salary: offeredSalary, isNewTeamThisSeason: true, seasonsUnsigned: 0 };
          teamsByCategory[ck] = teamsByCategory[ck].map((t) => (
            t.id === teamId ? { ...t, riders: [...t.riders.filter((x) => x.id !== weakest.id), newRider] } : t
          ));
          log[ck].push({ type: "fichaje", riderId: photoIdFor(newRider), text: `${newRider.name} ficha por ${liveTeam.name}, que prescinde de ${weakest.name} para mejorar la plantilla`, category: CATEGORY_DATA[ck].label });
          log[ck].push({ type: "salida", riderId: photoIdFor(weakest), text: `${weakest.name} queda libre tras la mejora de plantilla de ${liveTeam.name}`, category: CATEGORY_DATA[ck].label });
          changed = true;
          liveTeam = findTeam(teamsByCategory, ck, teamId);
          break;
        }
      }
    });
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
  // Give a rider (and the team itself) a fair stretch of the season to
  // settle in before this is even considered.
  if ((ctx.roundIndex ?? 0) < (ctx.totalRounds ?? 22) * 0.35) return team;
  // A team expecting to fight at the front stays a little more alert to
  // the market than one with modest ambitions — but this is still a
  // rare check per race weekend either way, never every round.
  const ambitionFactor = team.expectation ? clamp(1.4 - team.expectation.min * 0.04, 0.65, 1.35) : 1;
  if (Math.random() > 0.035 * ambitionFactor) return team;

  const teamBudget = team.budget || 0;
  // The weakest of the two, judged the exact same way the rest of the
  // market values a candidate (prestige, current form, age, potential —
  // never just raw CA) — not only genuine disasters get reconsidered,
  // any real upgrade opportunity does.
  const scored = team.riders.map((r) => scoreCandidateForTeam(r, team, { categoryKey, teamBudget }));
  const weakestIdx = scored[0] <= scored[1] ? 0 : 1;
  const weakest = team.riders[weakestIdx];
  if (weakest.injury && weakest.injury.sidelined) return team; // never mid-treatment

  const eligiblePool = poolRef.pool.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey));
  const ranked = eligiblePool
    .map((r) => ({ r, score: scoreCandidateForTeam(r, team, { categoryKey, teamBudget }) }))
    .filter(({ score }) => score > scored[weakestIdx] + 15)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return team;

  const fCost = fireRiderCost(weakest);
  const bikeAvgVal = bikeAvgOf(team);
  for (const { r: better } of ranked) {
    const sCost = Math.round(overallRating(better) * 5000);
    if (fCost + sCost > teamBudget) continue;
    const offeredSalary = Math.round(computeSalary(better, ctx.scale ?? 1) * (1.05 + Math.random() * 0.2));
    const accepted = wouldRiderJoin(better, team, categoryKey, offeredSalary, {
      fromCategoryKey: better._fromCategoryKey || categoryKey, bikeAvgOffered: bikeAvgVal, currentBikeAvg: better._fromBikeAvg ?? bikeAvgVal,
      isUnemployed: true, seasonsUnsigned: better.seasonsUnsigned || 0,
    });
    if (!accepted) continue;

    poolRef.pool = poolRef.pool.filter((r) => r.id !== better.id);
    poolRef.pool = [...poolRef.pool, { ...weakest, contractYears: 0, isNewTeamThisSeason: false, _fromCategoryKey: categoryKey, _fromBikeAvg: bikeAvgVal }];
    notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(weakest), text: `${team.name} rescinde el contrato de ${weakest.name} en plena temporada y ficha a ${better.name} para reforzar la plantilla.` });

    const years = proposedContractYears(better);
    const { _fromCategoryKey, _fromBikeAvg, ...cleanBetter } = better;
    const remaining = team.riders.filter((r) => r.id !== weakest.id);
    return {
      ...team,
      budget: teamBudget - fCost - sCost,
      riders: [...remaining, { ...cleanBetter, contractYears: years, salary: offeredSalary, isNewTeamThisSeason: true }],
    };
  }
  return team;
}

