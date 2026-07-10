import { WAREHOUSE_LABELS } from "../data/warehouseParts.js";
import { advanceTeamProjects, aiConsiderProject } from "./bikeDevelopment.js";
import { bumpCareerStats } from "./raceSimulation.js";
import { photoIdFor, substituteHireCost } from "./riders.js";
import { aiMaybeFireRider, pickBestFreeAgentSub } from "./transferMarket.js";
import { aiManageWarehouse, consumeWarehouseForResult, initWarehouse, resolveWarehouseProduction } from "./warehouseEngine.js";

export function processTeamAfterRace(team, raceResults, categoryKey, ctx, poolRef, notifQueue) {
  const teamResults = raceResults.filter((r) => r.teamId === team.id);

  let warehouse = resolveWarehouseProduction(team.warehouse || initWarehouse());
  teamResults.forEach((r) => {
    if (!r.crashed || !r.dnfCause) return;
    const { warehouse: wh2, consumed } = consumeWarehouseForResult(warehouse, r.dnfCause, r.injuryResult?.severity);
    warehouse = wh2;
    if (consumed.length) {
      notifQueue.push({ type: "dev", category: categoryKey, riderId: photoIdFor(r), text: `${team.name} pierde ${consumed.map((p) => WAREHOUSE_LABELS[p]).join(", ")} tras el incidente de ${r.name}.` });
    }
  });

  let afterAI = team;
  if (!ctx.isPlayer) {
    const prizeUnit = Math.max(1, Math.round(28000 * ctx.scale));
    const prize = teamResults.reduce((s, r) => s + (r.crashed ? Math.round(20000 * ctx.scale) : Math.max(Math.round(20000 * ctx.scale), (16 - r.position) * prizeUnit)), 0);
    const runningCost = Math.round(130000 * ctx.scale);
    const budgetAfterRace = (team.budget || 0) + prize - runningCost;
    const { team: afterProjects } = advanceTeamProjects({ ...team, budget: budgetAfterRace });
    afterAI = aiConsiderProject(afterProjects, ctx);
  }

  let substitutes = { ...(afterAI.substitutes || {}) };
  let budgetAfterSubs = afterAI.budget;
  Object.entries(substitutes).forEach(([ownerId, sub]) => {
    const subResult = teamResults.find((x) => x.seatOwnerId === ownerId);
    if (subResult) substitutes[ownerId] = bumpCareerStats(sub, categoryKey, subResult.position, subResult.crashed);
  });

  const riders = afterAI.riders.map((r) => {
    const ownResult = teamResults.find((x) => x.id === r.id);
    let next = r;

    if (ownResult) {
      next = bumpCareerStats(next, categoryKey, ownResult.position, ownResult.crashed);
      if (ownResult.crashed && ownResult.dnfCause === "mechanical") {
        notifQueue.push({ type: "dev", category: categoryKey, riderId: photoIdFor(next), text: `${next.name} (${team.name}) se retira por avería mecánica.` });
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
              budgetAfterSubs -= substituteHireCost(sub, ctx.scale);
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
    finalBudget = managed.budget;
  }

  const finalTeam = { ...afterAI, riders, substitutes, warehouse, budget: finalBudget };
  if (ctx.isPlayer) return finalTeam;
  return aiMaybeFireRider(finalTeam, categoryKey, ctx, poolRef, notifQueue);
}

/* End of season: next year's bike is generated from a blend of how the
   current bike ended up (55%) and how much was banked in research this
   year (45%), plus a little uncertainty — not simply "keep developing
   forever". Also clears research and any unfinished projects for the new
   season. */

