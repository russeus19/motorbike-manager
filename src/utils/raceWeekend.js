import { advanceFacilityUpgrades, advanceTeamProjects, aiConsiderFacilityUpgrade, aiConsiderProject, aiDecidePendingPackages } from "./bikeDevelopment.js";
import { bumpCareerStats } from "./raceSimulation.js";
import { photoIdFor, substituteHireCost } from "./riders.js";
import { aiMaybeFireRider, pickBestFreeAgentSub } from "./transferMarket.js";
import { aiManageWarehouse, consumeWarehouseForResult, initWarehouse, resolveWarehouseProduction } from "./warehouseEngine.js";

export function processTeamAfterRace(team, raceResults, categoryKey, ctx, poolRef, notifQueue) {
  const teamResults = raceResults.filter((r) => r.teamId === team.id);

  let warehouse = resolveWarehouseProduction(team.warehouse || initWarehouse());
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
  if (!ctx.isPlayer) {
    const prizeUnit = Math.max(1, Math.round(28000 * ctx.scale));
    const prize = teamResults.reduce((s, r) => s + (r.crashed ? Math.round(20000 * ctx.scale) : Math.max(Math.round(20000 * ctx.scale), (16 - r.position) * prizeUnit)), 0);
    const runningCost = Math.round(130000 * ctx.scale);
    runningBudget = Math.max(0, runningBudget + prize - runningCost);
  }

  let afterAI = { ...team, budget: runningBudget };

  // Priority order (highest first): 1) make sure the team can actually
  // race — substitute a sidelined rider, keep the warehouse stocked —
  // 2) opportunistic firing/signing, 3) only then discretionary R&D
  // spending with whatever's left over. Development/research used to run
  // first and could starve the essentials of funds; it now always runs
  // last.
  let substitutes = { ...(afterAI.substitutes || {}) };
  Object.entries(substitutes).forEach(([ownerId, sub]) => {
    const subResult = teamResults.find((x) => x.seatOwnerId === ownerId);
    if (subResult) substitutes[ownerId] = bumpCareerStats(sub, categoryKey, subResult.position, subResult.crashed, subResult.points);
  });

  let budgetAfterSubs = afterAI.budget;
  const riders = afterAI.riders.map((r) => {
    const ownResult = teamResults.find((x) => x.id === r.id);
    let next = r;

    if (ownResult) {
      next = bumpCareerStats(next, categoryKey, ownResult.position, ownResult.crashed, ownResult.points);
      if (ownResult.crashed && ownResult.dnfCause === "mechanical") {
        notifQueue.push({ type: "dev", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} (${team.name}) se retira por avería mecánica.` });
      }
      if (ownResult.crashed && ownResult.dnfCause === "electrical") {
        notifQueue.push({ type: "dev", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} (${team.name}) se retira por avería electrónica.` });
      }
      if (ownResult.injuryResult) {
        const inj = ownResult.injuryResult;
        next = { ...next, injury: inj };
        notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} sufre una caída y se diagnostica ${inj.name.toLowerCase()} (lesión ${inj.severityLabel}).` });
        if (inj.sidelined) {
          notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} se perderá ${inj.gpTotal} Gran${inj.gpTotal === 1 ? "" : "es"} Premio${inj.gpTotal === 1 ? "" : "s"} con ${team.name}.` });
          if (ctx.isPlayer) {
            ctx.setPendingSub({ teamId: team.id, riderId: next.id, riderName: next.name });
          } else {
            const sub = pickBestFreeAgentSub(poolRef.pool, categoryKey, budgetAfterSubs, ctx.scale);
            if (sub) {
              poolRef.pool = poolRef.pool.filter((x) => x.id !== sub.id);
              substitutes[next.id] = { ...sub, isNewTeamThisSeason: true };
              budgetAfterSubs = Math.max(0, budgetAfterSubs - substituteHireCost(sub, ctx.scale));
              notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(sub), text: `${sub.name} sustituirá a ${next.name} en ${team.name} hasta su recuperación.` });
            } else {
              notifQueue.push({ type: "market", category: categoryKey, riderId: photoIdFor(next), text: `${team.name} no encuentra sustituto elegible para ${next.name} y correrá con un solo piloto.` });
            }
          }
        } else {
          notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} seguirá compitiendo pese a la lesión, con el rendimiento algo mermado.` });
        }
      }
    }

    if (next.injury && next.injury.gpRemaining > 0) {
      const gpRemaining = next.injury.gpRemaining - 1;
      if (gpRemaining <= 0) {
        notifQueue.push({ type: "injury", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} recibe el alta médica y vuelve a competir con ${team.name}.` });
        if (substitutes[next.id]) {
          poolRef.pool = [...poolRef.pool, substitutes[next.id]];
          delete substitutes[next.id];
        }
        next = { ...next, injury: null };
      } else {
        next = { ...next, injury: { ...next.injury, gpRemaining } };
      }
    }

    return next;
  });

  let finalBudget = ctx.isPlayer ? afterAI.budget : budgetAfterSubs;
  if (!ctx.isPlayer) {
    const managed = aiManageWarehouse({ ...afterAI, warehouse, budget: finalBudget }, ctx.scale, notifQueue, categoryKey);
    warehouse = managed.warehouse;
    finalBudget = Math.max(0, managed.budget);
  }

  let midTeam = { ...afterAI, riders, substitutes, warehouse, budget: finalBudget };
  if (!ctx.isPlayer) midTeam = aiMaybeFireRider(midTeam, categoryKey, ctx, poolRef, notifQueue);

  // R&D (development/research) is the lowest priority spend: it only ever
  // touches whatever budget is left once racing capability and roster
  // needs have already been paid for. Factory/Staff upgrades tick down
  // and get considered right alongside it — same low-priority tier,
  // since they're long-term infrastructure bets rather than weekly needs.
  if (ctx.isPlayer) return midTeam;
  const afterProjects = advanceTeamProjects(midTeam).team;
  const afterPackages = aiDecidePendingPackages(afterProjects, notifQueue, categoryKey, ctx.scale);
  const afterFacilities = advanceFacilityUpgrades(afterPackages).team;
  const afterRD = aiConsiderProject(afterFacilities, ctx);
  const afterFacilityInvestment = aiConsiderFacilityUpgrade(afterRD, ctx.scale);
  return { ...afterFacilityInvestment, budget: Math.max(0, afterFacilityInvestment.budget) };
}

