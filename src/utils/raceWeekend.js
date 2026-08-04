import { advanceFacilityUpgrades, advanceTeamProjects, aiConsiderFacilityDowngrade, aiConsiderFacilityUpgrade, aiConsiderProject, aiDecidePendingPackages, processApprovedPackages } from "./bikeDevelopment.js";
import { prizeForPosition, teamRunningCost, teamSalaryCost } from "./economy.js";
import { bumpCareerStats } from "./raceSimulation.js";
import { photoIdFor, substituteHireCost } from "./riders.js";
import { applySponsorRaceResult, resolveAiSponsorOffers, sponsorGpIncome } from "./sponsors.js";
import { aiMaybeFireRider, pickBestFreeAgentSub } from "./transferMarket.js";
import { aiManageWarehouse, consumeWarehouseForResult, initWarehouse, resolveWarehouseProduction } from "./warehouseEngine.js";
import { teamDisplayName } from "./teamNaming.js";

/**
 * The week-passes-regardless-of-racing half of a team's upkeep:
 * warehouse production, R&D project/package advancement, facility
 * upgrades, and (for AI teams) their own warehouse/R&D/facility
 * decisions. None of this depends on an actual race happening — it's
 * the administrative side of running a team, which real time keeps
 * moving forward on whether or not there's a Grand Prix this
 * particular week.
 *
 * Used in two places: at the end of processTeamAfterRace (a race
 * happened, so this runs right after the race-specific processing
 * above), and directly from a rest week (no race this week, but the
 * calendar still moved forward one week, so this still needs to run
 * on its own). Bug fixed: before this was split out, a rest week
 * (Superbikes/Supersport/Sportbike/WorldWCR only race 6-12 of the
 * calendar's 22 weeks) simply never touched the player's own team, or
 * rivals, or other background categories on their own bye week at
 * all — every one of those "off" weeks meant zero warehouse
 * production and zero R&D/facility progress for everyone in that
 * category, while a MotoGP/Moto2/Moto3 team (racing every single
 * week) kept progressing continuously. Time itself is now what
 * drives this, in weeks, not "did a race happen" — exactly the
 * category-specific quirk this closes off.
 */
export function processTeamWeeklyProgress(team, categoryKey, ctx, notifQueue) {
  const warehouse = resolveWarehouseProduction(team.warehouse || initWarehouse());
  let midTeam = { ...team, warehouse };

  if (!ctx.isPlayer) {
    const managed = aiManageWarehouse(midTeam, ctx.scale, notifQueue, categoryKey);
    midTeam = { ...midTeam, warehouse: managed.warehouse, budget: Math.max(0, managed.budget) };
  }

  const { team: afterProjects, arrivals: projectArrivals } = advanceTeamProjects(midTeam);
  const afterPackages = ctx.isPlayer ? processApprovedPackages(afterProjects) : aiDecidePendingPackages(afterProjects, notifQueue, categoryKey, ctx.scale);
  const { team: afterFacilities, arrivals: facilityArrivals } = advanceFacilityUpgrades(afterPackages);

  if (ctx.isPlayer) return { team: afterFacilities, projectArrivals, facilityArrivals };

  const afterRD = aiConsiderProject(afterFacilities, ctx);
  const afterDistressCheck = aiConsiderFacilityDowngrade(afterRD, ctx.scale, notifQueue, categoryKey);
  const afterFacilityInvestment = aiConsiderFacilityUpgrade(afterDistressCheck, ctx.scale);
  return { team: { ...afterFacilityInvestment, budget: Math.max(0, afterFacilityInvestment.budget) }, projectArrivals, facilityArrivals };
}

export function processTeamAfterRace(team, raceResults, categoryKey, ctx, poolRef, notifQueue) {
  const teamResults = raceResults.filter((r) => r.teamId === team.id);

  let warehouse = team.warehouse || initWarehouse();
  teamResults.forEach((r) => {
    if (!r.crashed || !r.dnfCause) return;
    const { warehouse: wh2 } = consumeWarehouseForResult(warehouse, r.dnfCause, r.injuryResult?.severity);
    warehouse = wh2;
  });

  // Race income/running costs never push a team into debt on their own:
  // if costs outrun what was earned this weekend, the team just ends the
  // race at 0 rather than owing money nobody ever pays back. This is the
  // single biggest source of AI teams drifting into invalid, negative
  // budgets over a season — the fix is here, not a later patch.
  let runningBudget = team.budget || 0;
  let teamForSponsors = team;
  if (!ctx.isPlayer) {
    const prize = teamResults.reduce((s, r) => s + prizeForPosition(r.position, r.crashed, ctx.scale, raceResults.length), 0);
    const runningCost = teamRunningCost(ctx.scale, team.tier);
    const salaryCost = teamSalaryCost(team, categoryKey);
    const sponsorIncome = sponsorGpIncome(team, teamResults.reduce((s, r) => s + (r.points || 0), 0));
    const teamFinishedPositions = teamResults.filter((r) => !r.crashed).map((r) => r.position);
    const teamBestPosition = teamFinishedPositions.length ? Math.min(...teamFinishedPositions) : null;
    const sponsorResult = applySponsorRaceResult(team, teamBestPosition, categoryKey, ctx.scale, ctx.excludeSponsorNames || []);
    teamForSponsors = resolveAiSponsorOffers(sponsorResult.team);
    const sponsorBreakCompensation = sponsorResult.brokenSlots.reduce((s, b) => s + (b.compensation || 0), 0);
    sponsorResult.brokenSlots.forEach(({ name, compensation }) => {
      notifQueue.push({ type: "patrocinio", category: categoryKey, text: `${name} rescinde su contrato de patrocinio con ${teamDisplayName(team)} tras varias carreras muy por debajo de lo esperado, con una compensación de €${(compensation || 0).toLocaleString()}.` });
    });
    sponsorResult.newOfferSlots.forEach((kind) => {
      const signed = teamForSponsors.sponsors[kind];
      if (signed) {
        notifQueue.push({ type: "patrocinio", category: categoryKey, text: `${signed.name} ficha como nuevo patrocinador ${kind === "main" ? "principal" : "secundario"} de ${teamDisplayName(team)} tras su buena racha de resultados.` });
      }
    });
    runningBudget = Math.max(0, runningBudget + prize + sponsorIncome + sponsorBreakCompensation - runningCost - salaryCost);
  }

  let afterAI = { ...teamForSponsors, budget: runningBudget };

  // Priority order (highest first): 1) make sure the team can actually
  // race — substitute a sidelined rider, keep the warehouse stocked —
  // 2) opportunistic firing/signing, 3) only then discretionary R&D
  // spending with whatever's left over. Development/research used to run
  // first and could starve the essentials of funds; it now always runs
  // last.
  let substitutes = { ...(afterAI.substitutes || {}) };
  let budgetAfterSubs = afterAI.budget;
  Object.entries({ ...substitutes }).forEach(([ownerId, subOriginal]) => {
    const subResult = teamResults.find((x) => x.seatOwnerId === ownerId);
    let sub = subOriginal;
    if (subResult) {
      sub = bumpCareerStats(sub, categoryKey, subResult.position, subResult.crashed, subResult.points);
      // A substitute can get hurt too — this used to go completely
      // unrecorded (only their career stats were updated), so a
      // substitute who crashed hard mid-stint kept "racing" every
      // week with an injury nobody ever saw or treated.
      if (subResult.injuryResult) {
        const inj = subResult.injuryResult;
        sub = { ...sub, injury: inj };
        notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(sub), text: `${sub.name} (sustituto) sufre una caída y se diagnostica ${inj.name.toLowerCase()} (lesión ${inj.severityLabel}).` });
      }
    }
    // Bug fixed: a substitute's own injury — whether they somehow came
    // in hurt or got hurt WHILE substituting — used to never count
    // down at all. The normal per-rider injury countdown a few lines
    // below only ever looks at `team.riders`, and a substitute lives in
    // this completely separate `substitutes` map instead, so their
    // injury just sat there at the same gpRemaining forever, no matter
    // how many races went by — exactly the "still hurt weeks later"
    // symptom this closes off.
    if (sub.injury && sub.injury.gpRemaining > 0) {
      const gpRemaining = sub.injury.gpRemaining - 1;
      if (gpRemaining <= 0) {
        sub = { ...sub, injury: null };
      } else {
        sub = { ...sub, injury: { ...sub.injury, gpRemaining } };
        if (sub.injury.sidelined) {
          // The substitute themselves is now genuinely out — they go
          // back to the free-agent pool (still injured, so nobody else
          // can sign them either until they heal — same rule as a
          // normal rider) and the seat needs a SECOND substitute,
          // exactly like the original rider's own injury did.
          const originalRider = afterAI.riders.find((r) => r.id === ownerId);
          const originalName = originalRider?.name || "tu piloto";
          poolRef.pool = [...poolRef.pool, sub];
          delete substitutes[ownerId];
          notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(sub), text: `${sub.name} se lesiona sustituyendo a ${originalName} en ${teamDisplayName(team)} y también causa baja — hace falta un nuevo sustituto.` });
          if (ctx.isPlayer) {
            ctx.setPendingSub({ teamId: team.id, riderId: ownerId, riderName: originalName });
          } else {
            const newSub = pickBestFreeAgentSub(poolRef.pool, categoryKey, budgetAfterSubs, ctx.scale, team, ctx.marketNegotiations);
            if (newSub) {
              poolRef.pool = poolRef.pool.filter((x) => x.id !== newSub.id);
              substitutes[ownerId] = { ...newSub, isNewTeamThisSeason: true };
              budgetAfterSubs = Math.max(0, budgetAfterSubs - substituteHireCost(newSub, ctx.scale));
              notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(newSub), text: `${newSub.name} releva a ${sub.name} como sustituto de ${originalName} en ${teamDisplayName(team)}.` });
            } else {
              notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(originalRider || sub), text: `${teamDisplayName(team)} no encuentra un nuevo sustituto elegible y correrá con un solo piloto.` });
            }
          }
          return;
        }
      }
    }
    substitutes[ownerId] = sub;
  });

  const riders = afterAI.riders.map((r) => {
    const ownResult = teamResults.find((x) => x.id === r.id);
    let next = r;

    if (ownResult) {
      next = bumpCareerStats(next, categoryKey, ownResult.position, ownResult.crashed, ownResult.points);
      if (ownResult.crashed && ownResult.dnfCause === "mechanical") {
        notifQueue.push({ type: "dev", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} (${teamDisplayName(team)}) se retira por avería mecánica.` });
      }
      if (ownResult.crashed && ownResult.dnfCause === "electrical") {
        notifQueue.push({ type: "dev", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} (${teamDisplayName(team)}) se retira por avería electrónica.` });
      }
      if (ownResult.injuryResult) {
        const inj = ownResult.injuryResult;
        next = { ...next, injury: inj };
        notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} sufre una caída y se diagnostica ${inj.name.toLowerCase()} (lesión ${inj.severityLabel}).` });
        if (inj.sidelined) {
          notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} se perderá ${inj.gpTotal} Gran${inj.gpTotal === 1 ? "" : "es"} Premio${inj.gpTotal === 1 ? "" : "s"} con ${teamDisplayName(team)}.` });
          if (ctx.isPlayer) {
            ctx.setPendingSub({ teamId: team.id, riderId: next.id, riderName: next.name });
          } else {
            const sub = pickBestFreeAgentSub(poolRef.pool, categoryKey, budgetAfterSubs, ctx.scale, team, ctx.marketNegotiations);
            if (sub) {
              poolRef.pool = poolRef.pool.filter((x) => x.id !== sub.id);
              substitutes[next.id] = { ...sub, isNewTeamThisSeason: true };
              budgetAfterSubs = Math.max(0, budgetAfterSubs - substituteHireCost(sub, ctx.scale));
              notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(sub), text: `${sub.name} sustituirá a ${next.name} en ${teamDisplayName(team)} hasta su recuperación.` });
            } else {
              notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(next), text: `${teamDisplayName(team)} no encuentra sustituto elegible para ${next.name} y correrá con un solo piloto.` });
            }
          }
        } else {
          notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} seguirá compitiendo pese a la lesión, con el rendimiento algo mermado.` });
        }
      }
    }

    // Bug fixed: a brand-new injury from THIS SAME race (just assigned
    // a few lines above) used to fall straight into this countdown
    // block too — decrementing gpRemaining by one race in the exact
    // same pass it was diagnosed in, before the rider (or their
    // substitute) had raced a single weekend with it. A short injury
    // (gpTotal 1) could clear itself instantly this same race weekend,
    // leaving the substitute the player had just been asked to hire
    // completely orphaned: the original rider shows as healthy again
    // immediately, the substitute never actually races. The countdown
    // below only makes sense for an injury that was ALREADY there
    // before this race started — a fresh one starts counting down from
    // the NEXT race weekend instead, exactly once.
    if (!ownResult?.injuryResult && next.injury && next.injury.gpRemaining > 0) {
      const wasDeferred = !!next.injury.deferSubstituteDecision;
      const gpRemaining = next.injury.gpRemaining - 1;
      if (gpRemaining <= 0) {
        notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} recibe el alta médica y vuelve a competir con ${teamDisplayName(team)}.` });
        if (substitutes[next.id]) {
          poolRef.pool = [...poolRef.pool, substitutes[next.id]];
          delete substitutes[next.id];
        }
        next = { ...next, injury: null };
      } else {
        next = { ...next, injury: { ...next.injury, gpRemaining, deferSubstituteDecision: false } };
        // A same-weekend injury (qualifying or sprint) that still keeps
        // the rider out beyond the race that just happened genuinely
        // needs a stand-in for the races ahead — decided here, right
        // after the race, never before it, since there was never time
        // to arrange anything before Sunday.
        if (wasDeferred && !substitutes[next.id]) {
          notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} seguirá de baja ${next.injury.gpTotal} Gran${next.injury.gpTotal === 1 ? "" : "es"} Premio${next.injury.gpTotal === 1 ? "" : "s"} tras la caída de este fin de semana.` });
          if (ctx.isPlayer) {
            ctx.setPendingSub({ teamId: team.id, riderId: next.id, riderName: next.name });
          } else {
            const sub = pickBestFreeAgentSub(poolRef.pool, categoryKey, budgetAfterSubs, ctx.scale, team, ctx.marketNegotiations);
            if (sub) {
              poolRef.pool = poolRef.pool.filter((x) => x.id !== sub.id);
              substitutes[next.id] = { ...sub, isNewTeamThisSeason: true };
              budgetAfterSubs = Math.max(0, budgetAfterSubs - substituteHireCost(sub, ctx.scale));
              notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(sub), text: `${sub.name} sustituirá a ${next.name} en ${teamDisplayName(team)} hasta su recuperación.` });
            } else {
              notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(next), text: `${teamDisplayName(team)} no encuentra sustituto elegible para ${next.name} y correrá con un solo piloto.` });
            }
          }
        }
      }
    }

    return next;
  });

  let finalBudget = ctx.isPlayer ? afterAI.budget : budgetAfterSubs;
  let midTeam = { ...afterAI, riders, substitutes, warehouse, budget: finalBudget };
  if (!ctx.isPlayer) midTeam = aiMaybeFireRider(midTeam, categoryKey, ctx, poolRef, notifQueue);

  // Everything from here on — warehouse production, R&D, facilities,
  // and (for AI) their own warehouse/R&D/facility decisions — doesn't
  // actually depend on a race having happened at all; it's the same
  // week-by-week upkeep processTeamWeeklyProgress runs for a rest week
  // too. Delegating here instead of duplicating it keeps the two
  // paths from ever drifting out of sync with each other again.
  const weekly = processTeamWeeklyProgress(midTeam, categoryKey, ctx, notifQueue);
  // AI callers throughout the codebase all expect a bare team object
  // back from this function, exactly like before this refactor — only
  // the player path (surfaced through runRace, which needs to show the
  // player what just arrived) gets the richer { team, arrivals } shape.
  return ctx.isPlayer ? weekly : weekly.team;
}

