import { CATEGORY_DATA, ROOKIE_ELIGIBLE_CATEGORIES } from "../data/categories.js";
import { clamp } from "./random.js";
import { makeRookie } from "./riderGeneration.js";
import { computeContinuityScore, continuityToRenewalProbability, proposedContractYears, riderWantsToStay, scoreCandidateForTeam, teamPullingPower, wouldRiderJoin } from "./marketAI.js";
import { assignUniqueNumber, categoryRankDelta, computeSalary, crossoverCandidatePoolSize, crossoverPotentialFloor, fireRiderCost, isFreeAgentEligibleForCategory, overallRating, passesCrossoverGate, photoIdFor, substituteHireCost } from "./riders.js";
import { evaluateRiderSeason, shouldRetire, teamExpectationTier } from "./seasonHistory.js";
import { teamDisplayName } from "./teamNaming.js";
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
/**
 * Strips a rider ID out of every team's roster, in every category,
 * except the one team they're about to actually join. Call this right
 * before committing any signing that could plausibly cross categories
 * — without it, a rider who wasn't cleanly detached from their old
 * roster ends up duplicated (old team AND new team both list them),
 * and the season-transition's later cross-category integrity check
 * (which keeps whichever copy it finds first, in category order) can
 * end up favoring the stale copy and silently discarding the very
 * signing the market log just announced.
 */
function stripRiderFromAllRosters(teamsByCategory, riderId, exceptCategoryKey, exceptTeamId) {
  Object.keys(teamsByCategory).forEach((ck) => {
    teamsByCategory[ck] = teamsByCategory[ck].map((t) => {
      if (ck === exceptCategoryKey && t.id === exceptTeamId) return t;
      if (!t.riders.some((r) => r.id === riderId)) return t;
      return { ...t, riders: t.riders.filter((r) => r.id !== riderId) };
    });
  });
}

export function resolveSeasonMarketAcrossCategories(categoriesData, freeAgentPool, retiredIds, log, seasonNumber = 1) {
  let pool = [...freeAgentPool];
  const teamsByCategory = {};
  const teamExpectationVerdictById = {};
  const riderPosByIdByCategory = {};
  // Full data (not just the id) for every rider who retires this
  // transition — retiredIds alone was only ever enough to say "this
  // rider legitimately left the game", never enough to actually look
  // them up again afterward. See App.jsx, which folds these into a
  // persistent archive so a retired rider's profile stays available
  // for good, exactly like it was the day they hung up their boots.
  const retiredRiders = [];

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
          retiredRiders.push({ ...r, retired: true, retiredSeasonNumber: seasonNumber, lastCategoryKey: ck, lastTeamName: teamDisplayName(t) });
          log[ck].push({ type: "retiro", riderId: photoIdFor(r), personId: r.id, riderName: r.name, text: `${r.name} se retira`, category: CATEGORY_DATA[ck].label });
          return;
        }
        riders.push(r);
      });
      return { ...t, riders };
    });
  });

  // Hoisted above Fase 2 (used to live inside Fase 2.5 only) so both
  // phases can share the exact same definition of "which category feeds
  // which" — see the ambition check at the top of Fase 2's renewal
  // decision below, and Fase 2.5's own promotion pass further down.
  // WorldWCR's own promotion path is deliberately two entries, not one:
  // placed BEFORE the Sportbike pair (forEach runs in array order), so
  // an exceptional WorldWCR rider gets first crack at a direct
  // Supersport call-up — a real precedent exists for exactly this
  // (Ana Carrasco, WorldWCR's inaugural champion, later raced in
  // Supersport) — before anyone left over falls through to the normal,
  // far more common step up to Sportbike right after.
  const PROMOTION_PAIRS = [
    { higher: "motogp", lower: "moto2" }, { higher: "moto2", lower: "moto3" },
    { higher: "superbikes", lower: "supersport" }, { higher: "supersport", lower: "sportbike" },
    { higher: "supersport", lower: "worldwcr" }, { higher: "moto3", lower: "worldwcr" }, { higher: "sportbike", lower: "worldwcr" },
  ];
  // Reverse lookup: for a given lower category, which higher one(s) it
  // can feed into, in the SAME priority order as PROMOTION_PAIRS itself
  // (WorldWCR's direct-to-Supersport listed before its Sportbike step,
  // matching the "exceptional case first" precedence Fase 2.5 uses).
  const higherCategoriesFor = {};
  PROMOTION_PAIRS.forEach(({ higher, lower }) => {
    (higherCategoriesFor[lower] ||= []).push(higher);
  });
  // How many of a category's own top finishers are genuinely in the
  // running for a call-up — mirrors Fase 2.5's own candidate slice
  // exactly, so a rider only ever gets treated as "ambitious" here if
  // they'd actually be considered there too. WorldWCR uses its own
  // much smaller slice (see crossoverCandidatePoolSize); every other
  // category uses the same Top-10 Fase 2.5 always has.
  function ambitionSliceSize(categoryKey) {
    return categoryKey === "worldwcr" ? crossoverCandidatePoolSize(seasonNumber) : 10;
  }

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
      // A category's own age ceiling overrides even an active contract
      // — once a rider ages out of eligibility, the category simply
      // isn't an option anymore, contract or not, exactly like a real
      // team wouldn't keep someone past the real-world age cutoff.
      // Bug fixed: this used to be hardcoded to `ck === "moto3"` only —
      // correct back when Moto3 was the only category with an age cap,
      // but Sportbike has one too (see isFreeAgentEligibleForCategory)
      // and never got added here, so a Sportbike rider could simply
      // stay on regardless of age forever. Driving this off the same
      // eligibility function every other age check in this file
      // already uses means it can't drift out of sync with a future
      // category's own cap either.
      // Moto2's own age cap (≤30) has only ever been a filter on new
      // signings, never a forced-retirement rule for someone already
      // on the roster — excluded here on purpose, so this fix doesn't
      // silently start kicking out existing Moto2 riders over 30, a
      // behavior change nobody asked for.
      if (ck !== "moto2" && !isFreeAgentEligibleForCategory(r, ck)) {
        pool.push({ ...r, seasonsUnsigned: 0, _fromCategoryKey: ck, _fromBikeAvg: bikeAvgOf(t) });
        log[ck].push({ type: "salida", riderId: photoIdFor(r), personId: r.id, riderName: r.name, text: `${r.name} deja ${teamDisplayName(t)} al superar la edad límite de ${CATEGORY_DATA[ck].label}`, category: CATEGORY_DATA[ck].label });
        return;
      }
      // Contract truth: still under contract, no market decision needed.
      if ((r.contractYears ?? 0) > 0) { kept.push(r); return; }

      // Bug fixed: a genuine star having a great season in a lower
      // category almost always just renewed with their own team for
      // several YEARS at a time, instead of ever getting a real shot at
      // moving up — the exact opposite of how an ambitious athlete
      // actually behaves. Running Fase 2.5 before this was tried first
      // and reverted — it backfires the other way, since MotoGP's own
      // vacancies mostly come from ITS OWN release decisions right here
      // in Fase 2, so promoting first just means there's usually
      // nothing open yet to promote INTO. And pulling the rider straight
      // into the free-agent pool from here doesn't work either — Fase
      // 2.5 right after this only looks for candidates still sitting on
      // a lower-category TEAM's roster, so a rider already yanked out
      // into the pool becomes invisible to it.
      // The fix that actually works: a rider who'd genuinely be a Fase
      // 2.5 candidate — ranked in the real contention slice of a
      // category with somewhere higher to go — stays MUCH less willing
      // to just settle for a renewal, and even if they do end up
      // staying, it's for one season only, never multiple years. That
      // keeps them sitting right where Fase 2.5 (immediately after this)
      // can still find and poach them this very transition, AND makes
      // sure they come up for a fresh decision again next season instead
      // of being locked away on a long deal the moment no vacancy
      // happens to be open this exact year.
      const higherOptions = higherCategoriesFor[ck];
      const ownRank = riderPosByIdByCategory[ck]?.[r.id];
      const isAmbitious = higherOptions?.length && ownRank && ownRank <= ambitionSliceSize(ck)
        && higherOptions.some((hk) => isFreeAgentEligibleForCategory(r, hk));

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
        // Bug fixed: budget only ever nudged a candidate's score down a
        // little (scoreCandidateForTeam), it never actually blocked a
        // signing outright — a team could end up committing to a
        // salary it plainly couldn't sustain. A hard check here (and at
        // every other signing point in this file) means an unaffordable
        // candidate is simply skipped, the same way a human manager
        // couldn't offer a contract with money they don't have.
        if (offeredSalary > t.budget) return;
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
          stripRiderFromAllRosters(teamsByCategory, newRider.id, ck, teamId);
          kept.push(newRider);
          log[ck].push({ type: "fichaje", riderId: photoIdFor(newRider), personId: newRider.id, riderName: newRider.name, text: `${newRider.name} ficha por ${teamDisplayName(t)}, que prescinde de ${r.name} tras encontrar una opción mejor en el mercado`, category: CATEGORY_DATA[ck].label });
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
      // An ambitious rider only settles for staying a fraction as often
      // as a normal one would — most of the time they'd rather test
      // whether somewhere higher comes calling instead of just taking
      // the renewal on offer.
      const riderWillingToStay = teamWantsToRenew ? (riderWantsToStay(r, t, ck) && (!isAmbitious || Math.random() < 0.25)) : false;

      if (teamWantsToRenew && riderWillingToStay) {
        const years = isAmbitious ? 1 : proposedContractYears(r);
        kept.push({ ...r, contractYears: years, salary: Math.round(computeSalary(r, CATEGORY_DATA[ck].scale) * (0.95 + Math.random() * 0.2)) });
        log[ck].push({ type: "renovacion", riderId: photoIdFor(r), personId: r.id, riderName: r.name, text: `${r.name} renueva con ${teamDisplayName(t)} (${years} temporada${years === 1 ? "" : "s"})`, category: CATEGORY_DATA[ck].label });
        return;
      }

      pool.push({ ...r, seasonsUnsigned: 0, _fromCategoryKey: ck, _fromBikeAvg: bikeAvgOf(t) });
      const evalLabelForRetire = evaluateRiderSeason(r, points, teammatePts, tier, crashes);
      const lowerKey = CATEGORY_DATA[ck]?.lower;
      const isRelegation = lowerKey && r.age <= 26 && ["Mala", "Desastrosa"].includes(evalLabelForRetire);
      if (isRelegation) {
        log[ck].push({ type: "descenso", riderId: photoIdFor(r), personId: r.id, riderName: r.name, text: `${r.name} desciende de categoría tras dejar ${teamDisplayName(t)}`, category: CATEGORY_DATA[ck].label });
      } else if (!teamWantsToRenew) {
        log[ck].push({ type: "salida", riderId: photoIdFor(r), personId: r.id, riderName: r.name, text: `${r.name} deja ${teamDisplayName(t)} tras una temporada ${evalLabelForRetire.toLowerCase()}`, category: CATEGORY_DATA[ck].label });
      } else {
        log[ck].push({ type: "salida", riderId: photoIdFor(r), personId: r.id, riderName: r.name, text: `${r.name} decide no continuar en ${teamDisplayName(t)} pese a la renovación ofrecida`, category: CATEGORY_DATA[ck].label });
      }
    });
    teamsByCategory[ck] = teamsByCategory[ck].map((team) => (team.id === teamId ? { ...team, riders: kept } : team));
  });

  // --- Fase 2.5: cross-category promotion — real teams actively chase
  // the best of the category below instead of only ever drawing from
  // whoever happens to already be a free agent. Runs BEFORE Fase 2's
  // own renewal decisions on purpose (this used to run after — bug
  // fixed): a rider having a genuinely great season wants to test
  // whether a higher category will come calling before ever settling
  // for a renewal with their current team, exactly like a real
  // ambitious athlete would. Running this first means a Moto2 champion
  // gets evaluated for a MotoGP call-up before their own team ever gets
  // the chance to lock them into a renewal — the old order let that
  // renewal happen FIRST, so a standout season in a lower category
  // almost never actually led anywhere, no matter how good it was.
  // A rider poached this way leaves their own category's roster
  // regardless of whether they were about to renew — the same way a
  // real MotoGP call-up overrides a Moto2 rider's plan to stay.
  // Whatever seat they leave behind (here, or from Fase 1 retirements)
  // is a genuine vacancy Fase 2's own continuity-vs-market pass and
  // Fase 3 below both still see normally.
  // WorldWCR's own promotion path is deliberately two entries, not one:
  // placed BEFORE the Sportbike pair (forEach runs in array order), so
  // an exceptional WorldWCR rider gets first crack at a direct
  // Supersport call-up — a real precedent exists for exactly this
  // (Ana Carrasco, WorldWCR's inaugural champion, later raced in
  // Supersport) — before anyone left over falls through to the normal,
  // far more common step up to Sportbike right after. Whichever pass
  // signs a rider first marks them isNewTeamThisSeason, which the
  // other pass's own candidate filter already excludes, so nobody can
  // double-promote in the same transition.
  PROMOTION_PAIRS.forEach(({ higher, lower }) => {
    if (!teamsByCategory[higher] || !teamsByCategory[lower]) return;
    const lowerStandings = categoriesData[lower]?.riderStandings || {};
    const rankedLowerIds = Object.entries(lowerStandings).sort((a, b) => b[1].points - a[1].points).map(([id]) => id);

    // Only genuine Top-10 finishers of the category below are ever
    // actively chased this way — everyone else is already covered
    // naturally once they hit the shared pool in Fase 3. A rider who
    // JUST got a fresh signing this exact same transition (isNewTeamThisSeason
    // — could be the player's own market signing, or an AI one) is
    // excluded here on purpose: overriding a plain renewal with a
    // higher category's call-up is deliberate real-world behavior (see
    // the comment above), but instantly sweeping away someone who was
    // just actively recruited this very transition undermines the
    // decision that was just made, in a way a renewal doesn't.
    // WorldWCR needs its own, much stricter version of this filter.
    // Top-10 (out of a 22-24 rider MotoGP/Superbikes-style grid) is a
    // reasonable "genuinely in contention" slice — but WorldWCR only
    // has 34 riders total across a 6-round season, where a large chunk
    // of the field ties on zero points. Sorting "top 10 by points" in
    // that situation isn't picking the 10 best riders, it's picking 10
    // essentially at random among everyone tied at the bottom — which
    // is exactly how someone genuinely outside position 20 ended up
    // getting promoted. Two changes fix that: a much smaller slice (a
    // real elite handful, not a third of the whole grid), and an
    // explicit potential floor so a team only ever signs someone
    // because they're actually worth it, never just because a promotion
    // pair happened to need a name to fill a slot. The bar is
    // noticeably higher for the rarer direct-to-Supersport jump than
    // for the ordinary step up to Sportbike.
    const isWcrSource = lower === "worldwcr";
    const wcrPotentialFloor = crossoverPotentialFloor(higher, seasonNumber);
    const lowerSlice = isWcrSource ? rankedLowerIds.slice(0, crossoverCandidatePoolSize(seasonNumber)) : rankedLowerIds.slice(0, 10);
    const candidatePool = [];
    lowerSlice.forEach((riderId) => {
      for (const t of teamsByCategory[lower]) {
        const idx = t.riders.findIndex((r) => r.id === riderId);
        if (idx >= 0) {
          // Bug fixed: the player's own team was never excluded from
          // this pool — meaning an AI team in the higher category could
          // poach the player's own rider straight off their roster, with
          // no offer to accept or decline, the moment that rider had a
          // good enough season. Every other AI-vs-AI mechanism in this
          // file (Fase 2's market swaps, Fase 3's vacancy fills) already
          // respects excludeTeamId; this cross-category promotion pass
          // is the one place that check had never been added.
          if (t.id === categoriesData[lower]?.excludeTeamId) break;
          const r = t.riders[idx];
          if (isWcrSource && (r.potential ?? 0) < wcrPotentialFloor) break;
          if (!r.isNewTeamThisSeason && isFreeAgentEligibleForCategory(r, higher)) candidatePool.push({ rider: r, fromTeamId: t.id });
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
          if (offeredSalary > liveTeam.budget) continue;
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
        log[higher].push({ type: "ascenso", riderId: photoIdFor(newRider), personId: newRider.id, riderName: newRider.name, text: `${newRider.name} asciende de ${CATEGORY_DATA[lower].label} a ${CATEGORY_DATA[higher].label} (${teamDisplayName(findTeam(teamsByCategory, higher, teamId))})`, category: CATEGORY_DATA[higher].label });
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

    // Same tightening as the promotion-pairs pass above, and for the
    // same reason: this pool is shared across every category. Checking
    // gender directly (via passesCrossoverGate, not just
    // _fromCategoryKey === "worldwcr") is deliberate — a female rider
    // sitting in the pool as a hand-authored free agent
    // (data/freeAgentLegends.js) never carries that marker at all,
    // since she was never dynamically released from a WorldWCR team
    // this transition, so checking only the marker let every static
    // female free agent bypass this entirely. A genuinely capable
    // woman should still be able to find a seat elsewhere; one filling
    // gaps only because nobody else was available should not.
    const eligible = pool.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey) && passesCrossoverGate(r, categoryKey, seasonNumber));
    const bikeAvgOffered = bikeAvgOf(team);
    const ranked = eligible
      .map((r) => ({ r, score: scoreCandidateForTeam(r, team, { categoryKey, teamBudget: team.budget }) }))
      .sort((a, b) => b.score - a.score);

    let signed = null;
    for (const { r } of ranked) {
      const offeredSalary = Math.round(computeSalary(r, CATEGORY_DATA[categoryKey].scale) * (1 + Math.random() * 0.15));
      if (offeredSalary > team.budget) continue;
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
      stripRiderFromAllRosters(teamsByCategory, newRider.id, categoryKey, teamId);
      applyRiderToTeam(teamsByCategory, categoryKey, teamId, newRider);
      // Bug fixed: this local copy of the category ranking was missing
      // worldwcr — the exact same class of bug already found twice
      // elsewhere in this file — meaning a WorldWCR-origin signing here
      // would silently log as a plain "fichaje" instead of correctly
      // showing as an "ascenso"/"descenso". Reusing the one shared
      // definition (categoryRankDelta) means there's only one place
      // left that can ever go stale.
      const fromCat = _fromCategoryKey;
      let logType = "fichaje";
      let text;
      if (fromCat && fromCat !== categoryKey && categoryRankDelta(categoryKey, fromCat) > 0) {
        logType = "ascenso";
        text = `${newRider.name} asciende de ${CATEGORY_DATA[fromCat].label} a ${CATEGORY_DATA[categoryKey].label} (${teamDisplayName(team)})`;
      } else if (fromCat && fromCat !== categoryKey && categoryRankDelta(categoryKey, fromCat) < 0) {
        logType = "descenso";
        text = `${newRider.name} baja de ${CATEGORY_DATA[fromCat].label} a ${CATEGORY_DATA[categoryKey].label} (${teamDisplayName(team)})`;
      } else {
        text = `${newRider.name} ficha por ${teamDisplayName(team)}`;
      }
      log[categoryKey].push({ type: logType, riderId: photoIdFor(newRider), personId: newRider.id, riderName: newRider.name, text, category: CATEGORY_DATA[categoryKey].label });
    } else if (ROOKIE_ELIGIBLE_CATEGORIES.includes(categoryKey)) {
      // Nobody in the whole pool wanted this seat — a fresh prospect
      // gets their shot instead, exactly like the old rookie fallback.
      // Only ever happens in the four entry categories (see the branch
      // below for MotoGP/Moto2/WorldSBK, which never generate anyone
      // new at all).
      // Bug fixed: this always generated a male rookie regardless of
      // category, since makeRookie defaults to gender "M" — harmless
      // everywhere else, but WorldWCR requires every rider to be
      // female (isFreeAgentEligibleForCategory enforces this for the
      // free-agent POOL, but a freshly-created rookie never passes
      // through that filter at all, since it isn't drawn from the pool
      // in the first place).
      const rookie = makeRookie(CATEGORY_DATA[categoryKey].scale, categoryKey, categoryKey === "worldwcr" ? "F" : "M");
      applyRiderToTeam(teamsByCategory, categoryKey, teamId, rookie);
      log[categoryKey].push({ type: "debut", riderId: photoIdFor(rookie), personId: rookie.id, riderName: rookie.name, text: `${rookie.name} debuta con ${teamDisplayName(team)} (${rookie.age} años)`, category: CATEGORY_DATA[categoryKey].label });
    } else {
      // Bug fixed: MotoGP, Moto2 and WorldSBK used to fall back to
      // generating a brand-new rookie here too, just like the entry
      // categories above — meaning a vacancy nobody in the market
      // wanted could still end up "filled" by a rider who came from
      // absolutely nowhere. Nobody debuts directly into these three in
      // real life; every rider already works their way up through an
      // entry category first. So instead of ever creating someone new,
      // this forces a real, EXISTING rider into the seat.
      // Bug fixed: this used to check the general free-agent pool
      // FIRST and only fall back to the feeder category if the pool
      // was completely empty — meaning a mediocre free agent from a
      // totally unrelated category (a released WorldSPB rider, say)
      // could get force-signed into MotoGP ahead of a genuinely good
      // Moto2 rider, just because the pool happened to have someone in
      // it at all. A real MotoGP team desperate for a body pulls up
      // from Moto2 first — that's who they actually know and scout —
      // and only reaches into the wider free-agent pool if the feeder
      // category itself has nobody eligible left to give up.
      let forced = null;
      let forcedFromTeamId = null;
      const feeder = CATEGORY_DATA[categoryKey]?.lower;
      const feederTeams = feeder ? teamsByCategory[feeder] : null;
      if (feederTeams) {
        // Bug fixed: this never excluded the player's own team when
        // searching the feeder category — meaning a player managing a
        // Moto2/Supersport/Sportbike team could have their own rider
        // pulled away to fill an AI team's urgent MotoGP/Moto2/
        // Superbikes vacancy with no offer to accept or decline, the
        // exact same class of bug already found and fixed once for
        // Fase 2.5's own promotion pass — this "urgent call-up"
        // fallback had the identical gap and was never covered by that
        // earlier fix.
        const feederCandidates = feederTeams
          .filter((t) => t.id !== categoriesData[feeder]?.excludeTeamId)
          .flatMap((t) => t.riders.map((r) => ({ r, teamId: t.id })));
        // Bug fixed: this picked the single best-scoring rider out of
        // the ENTIRE feeder category with no quality floor at all —
        // "best of whoever's left" isn't the same as "actually good
        // enough for MotoGP/Moto2/Superbikes". passesCrossoverGate
        // already knows the right bar for a natural-feeder crossing;
        // it just needs _fromCategoryKey to check against, which a
        // rider still racing on their own team's roster (rather than
        // sitting in the free-agent pool) never carries — so it's set
        // here explicitly for the check alone.
        const bestFeeder = feederCandidates
          .filter(({ r }) => passesCrossoverGate({ ...r, _fromCategoryKey: feeder }, categoryKey, seasonNumber))
          .map(({ r, teamId: ftId }) => ({ r, teamId: ftId, score: scoreCandidateForTeam(r, team, { categoryKey, teamBudget: team.budget }) }))
          .sort((a, b) => b.score - a.score)[0];
        if (bestFeeder) { forced = bestFeeder.r; forcedFromTeamId = bestFeeder.teamId; }
      }
      if (!forced) forced = ranked[0]?.r ?? null;
      if (forced) {
        pool = pool.filter((r) => r.id !== forced.id);
        const years = proposedContractYears(forced);
        const offeredSalary = Math.round(computeSalary(forced, CATEGORY_DATA[categoryKey].scale) * (1 + Math.random() * 0.15));
        const { _fromCategoryKey, _fromBikeAvg, ...cleanRider } = forced;
        const newRider = { ...cleanRider, contractYears: years, salary: offeredSalary, isNewTeamThisSeason: true, seasonsUnsigned: 0 };
        if (forcedFromTeamId) {
          teamsByCategory[CATEGORY_DATA[categoryKey].lower] = teamsByCategory[CATEGORY_DATA[categoryKey].lower].map((t) => (
            t.id === forcedFromTeamId ? { ...t, riders: t.riders.filter((r) => r.id !== forced.id) } : t
          ));
        } else {
          stripRiderFromAllRosters(teamsByCategory, newRider.id, categoryKey, teamId);
        }
        applyRiderToTeam(teamsByCategory, categoryKey, teamId, newRider);
        const fromCat = _fromCategoryKey || (forcedFromTeamId ? CATEGORY_DATA[categoryKey].lower : null);
        const text = fromCat && fromCat !== categoryKey
          ? `${newRider.name} sube de urgencia de ${CATEGORY_DATA[fromCat].label} a ${CATEGORY_DATA[categoryKey].label} (${teamDisplayName(team)}), sin nadie más disponible en el mercado`
          : `${newRider.name} ficha por ${teamDisplayName(team)} de urgencia, sin nadie más disponible en el mercado`;
        log[categoryKey].push({ type: "ascenso", riderId: photoIdFor(newRider), personId: newRider.id, riderName: newRider.name, text, category: CATEGORY_DATA[categoryKey].label });
      }
      // If there's truly nobody anywhere — an extreme edge case this
      // should never realistically reach — the seat is simply left
      // open rather than conjuring someone from nothing.
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
        const eligible = pool.filter((r) => isFreeAgentEligibleForCategory(r, ck) && passesCrossoverGate(r, ck, seasonNumber));
        if (!eligible.length) break;
        const teamBudget = liveTeam.budget;
        const riderScores = liveTeam.riders.map((r) => scoreCandidateForTeam(r, liveTeam, { categoryKey: ck, teamBudget }));
        const weakestIdx = riderScores[0] <= riderScores[1] ? 0 : 1;
        const weakest = liveTeam.riders[weakestIdx];
        if (weakest.injury && weakest.injury.sidelined) break; // never mid-treatment — same rule the in-season version already follows
        const weakestScore = riderScores[weakestIdx];

        const ranked = eligible
          .map((r) => ({ r, score: scoreCandidateForTeam(r, liveTeam, { categoryKey: ck, teamBudget }) }))
          .filter(({ score }) => score > weakestScore + UPGRADE_MARGIN)
          .sort((a, b) => b.score - a.score);

        for (const { r } of ranked) {
          const bikeAvgOffered = bikeAvgOf(liveTeam);
          const offeredSalary = Math.round(computeSalary(r, CATEGORY_DATA[ck].scale) * (1.1 + Math.random() * 0.2));
          // Bug fixed: releasing your OWN rider mid-contract to make
          // room used to be completely free — no cost at all, even
          // though poaching an equivalent rider FROM another team
          // always required paying that team compensation
          // (needsTeamCompensation). Same idea applies here: cutting a
          // rider loose before their contract is up has a real cost
          // (fireRiderCost, the same formula the mid-season upgrade
          // mechanism already uses), and the team needs to genuinely be
          // able to afford BOTH that and the new rider's salary — not
          // just have the new salary nudge their score down a little.
          const releaseCost = fireRiderCost(weakest);
          if (releaseCost + offeredSalary > liveTeam.budget) continue;
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
          stripRiderFromAllRosters(teamsByCategory, newRider.id, ck, teamId);
          teamsByCategory[ck] = teamsByCategory[ck].map((t) => (
            t.id === teamId ? { ...t, budget: t.budget - releaseCost, riders: [...t.riders.filter((x) => x.id !== weakest.id), newRider] } : t
          ));
          log[ck].push({ type: "fichaje", riderId: photoIdFor(newRider), personId: newRider.id, riderName: newRider.name, text: `${newRider.name} ficha por ${teamDisplayName(liveTeam)}, que prescinde de ${weakest.name} para mejorar la plantilla`, category: CATEGORY_DATA[ck].label });
          log[ck].push({ type: "salida", riderId: photoIdFor(weakest), personId: weakest.id, riderName: weakest.name, text: `${weakest.name} queda libre tras la mejora de plantilla de ${teamDisplayName(liveTeam)}`, category: CATEGORY_DATA[ck].label });
          changed = true;
          liveTeam = findTeam(teamsByCategory, ck, teamId);
          break;
        }
      }
    });
  });

  return { teamsByCategory, pool, retiredRiders };
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
  const existingNumbers = teamsByCategory[categoryKey].flatMap((t) => t.riders.map((r) => r.number)).filter(Number.isFinite);
  const finalRider = (Number.isFinite(rider.number) && !existingNumbers.includes(rider.number))
    ? rider
    : { ...rider, number: assignUniqueNumber(existingNumbers) };
  teamsByCategory[categoryKey] = teamsByCategory[categoryKey].map((t) => (t.id === teamId ? { ...t, riders: [...t.riders, finalRider] } : t));
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
      if (log) log.push({ type: "salida", riderId: photoIdFor(sub), text: `${sub.name} finaliza su cesión temporal en ${teamDisplayName(t)} y vuelve a agentes libres`, category: categoryLabel });
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


export function pickBestFreeAgentSub(pool, categoryKey, budget, scale, team) {
  if (!pool || !pool.length) return null;
  const eligible = pool.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey) && substituteHireCost(r, scale) <= (budget ?? 0) && !(r.injury && r.injury.sidelined && r.injury.gpRemaining > 0));
  if (!eligible.length) return null;
  const scored = eligible.map((r) => ({
    r,
    score: overallRating(r) + (r.age >= 27 ? 3 : 0) - (r.salary || 0) / 3000000,
  })).sort((a, b) => b.score - a.score);
  // A short substitute stint is a much lower bar than a real contract —
  // no salary negotiation, no long-term commitment — so this leans on
  // wouldRiderJoin exactly like a real signing would, just with a
  // token salary and isUnemployed always true (their actual pay for
  // stepping in is handled separately via substituteHireCost). This is
  // what stops a free MotoGP-caliber legend from reflexively taking
  // any open seat regardless of category: the same prestige-gap logic
  // that already governs real signings decides whether they'd bother.
  for (const { r } of scored) {
    if (!team) return r; // some callers (e.g. background-only contexts) may not have a team handy — fall back to the old behavior
    if (wouldRiderJoin(r, team, categoryKey, r.salary || 0, { fromCategoryKey: r._fromCategoryKey || categoryKey, isUnemployed: false, seasonsUnsigned: r.seasonsUnsigned || 0 })) {
      return r;
    }
  }
  return null;
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

  const eligiblePool = poolRef.pool.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey) && passesCrossoverGate(r, categoryKey, ctx.seasonNumber));
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
    notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(weakest), personId: weakest.id, riderName: weakest.name, text: `${teamDisplayName(team)} rescinde el contrato de ${weakest.name} en plena temporada y ficha a ${better.name} para reforzar la plantilla.` });

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

