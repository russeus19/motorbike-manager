import { BIKE_AREA_KEYS } from "../data/bikeAreas.js";
import { WAREHOUSE_PARTS } from "../data/warehouseParts.js";
import { ensureRD } from "./bikeDevelopment.js";
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

  // R&D fields introduced by the Base Tecnológica redesign: older saves
  // won't have techBase/factory/staff at all, and even newer ones could
  // in principle end up with a malformed value (missing area, corrupt
  // level, stray upgrade object) after an interrupted save. ensureRD
  // already knows how to fill in sensible defaults for anything missing,
  // so repairing here is just "trust its output, always".
  const { techBase, factory, staff } = ensureRD(repaired);
  const validTechBase = BIKE_AREA_KEYS.every((k) => Number.isFinite(team.techBase?.[k]));
  const validFactory = team.factory && Number.isFinite(team.factory.level);
  const validStaff = team.staff && Number.isFinite(team.staff.level);
  if (!validTechBase) issues.push("base tecnológica inválida o ausente, reconstruida a partir de la moto actual");
  if (!validFactory) issues.push("nivel de Fábrica inválido o ausente, restablecido");
  if (!validStaff) issues.push("nivel de Staff inválido o ausente, restablecido");
  repaired.techBase = techBase;
  repaired.factory = factory;
  repaired.staff = staff;

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
