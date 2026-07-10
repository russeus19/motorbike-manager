import { WAREHOUSE_PARTS } from "../data/warehouseParts.js";
import { makeRookie } from "./riderGeneration.js";
import { initWarehouse } from "./warehouseEngine.js";

/**
 * Repairs a single team's economic/roster state so it can never leave the
 * season-end market transition in a state that would freeze the game:
 * budget floored at 0, exactly 2 valid/unique riders, valid contracts,
 * valid warehouse stock.
 *
 * This is a safety net, not the fix itself — the actual causes (running
 * costs that could go negative, unchecked AI renewals/signings) are fixed
 * at their source in raceWeekend.js and transferMarket.js. This function
 * exists so that (a) nothing new can slip through in the future, and
 * (b) existing save files that already drifted into a broken state before
 * those fixes get pulled back into a valid one the moment a new season
 * starts, instead of staying stuck forever.
 */
export function validateAndRepairTeam(team, scale) {
  const repaired = { ...team };
  const issues = [];

  if (!Number.isFinite(repaired.budget) || repaired.budget < 0) {
    issues.push(`presupuesto inválido (${repaired.budget}) corregido a 0`);
    repaired.budget = 0;
  }

  let riders = Array.isArray(repaired.riders) ? [...repaired.riders] : [];
  const seenIds = new Set();
  riders = riders.filter((r) => {
    if (!r || !r.id || seenIds.has(r.id)) {
      issues.push("piloto duplicado o inválido eliminado");
      return false;
    }
    seenIds.add(r.id);
    return true;
  });
  while (riders.length < 2) {
    riders.push(makeRookie(scale ?? 1));
    issues.push("plaza vacía cubierta con un piloto de emergencia");
  }
  if (riders.length > 2) {
    riders = riders.slice(0, 2);
    issues.push("exceso de pilotos recortado a 2");
  }
  riders = riders.map((r) => (
    (!Number.isFinite(r.contractYears) || r.contractYears < 0) ? { ...r, contractYears: 1 } : r
  ));
  repaired.riders = riders;

  const warehouse = { ...(repaired.warehouse || initWarehouse()) };
  WAREHOUSE_PARTS.forEach((part) => {
    const p = warehouse[part];
    if (!p || !Number.isFinite(p.stock) || p.stock < 0 || !Array.isArray(p.orders)) {
      issues.push(`inventario de ${part} inválido, restablecido`);
      warehouse[part] = { stock: 2, orders: [] };
    }
  });
  repaired.warehouse = warehouse;

  return { team: repaired, issues };
}

/** Runs validateAndRepairTeam across a whole category's teams. Returns the
 * repaired team list plus a flat list of {team, issues} for anything that
 * needed fixing (useful for a debug notification later; safe to ignore). */
export function validateAndRepairTeams(teams, scale) {
  const allIssues = [];
  const repaired = (teams || []).map((t) => {
    const { team, issues } = validateAndRepairTeam(t, scale);
    if (issues.length) allIssues.push({ team: t.name, issues });
    return team;
  });
  return { teams: repaired, allIssues };
}
