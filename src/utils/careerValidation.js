import { BIKE_AREA_KEYS } from "../data/bikeAreas.js";
import { ROOKIE_ELIGIBLE_CATEGORIES } from "../data/categories.js";
import { WAREHOUSE_PARTS } from "../data/warehouseParts.js";
import { ensureRD } from "./bikeDevelopment.js";
import { makeRookie } from "./riderGeneration.js";
import { initWarehouse } from "./warehouseEngine.js";

/**
 * Whole-game integrity check, run once at the very end of a season
 * transition, after every other piece of market/roster logic has had
 * its say. Independent of *why* something might have gone wrong — this
 * doesn't care whether the cause was a duplicate negotiation, a stale
 * save, or a bug nobody's found yet. It only cares about one invariant:
 * every rider must exist in exactly one place — one team's roster, or
 * the free-agent pool — never zero, never two or more.
 *
 * If the same rider ID is found in more than one location, only the
 * FIRST one encountered (player team, then rivals, then each background
 * category in order, then free agents) is kept; every later occurrence
 * is dropped as a duplicate. This can never make a rider disappear —
 * disappearing riders are caught separately, by comparing against a
 * snapshot taken before the transition started (see App.jsx's
 * runSeasonTransition) — this function's only job is refusing to let
 * the same rider exist twice.
 */
export function validateGlobalRiderIntegrity({ playerTeam, rivalTeams, otherCategories, freeAgents }) {
  const seenAt = new Map();
  const issues = [];

  function claim(rider, location) {
    if (seenAt.has(rider.id)) {
      issues.push(`Piloto duplicado detectado: ${rider.name} (${rider.id}) ya estaba en ${seenAt.get(rider.id)}, también encontrado en ${location} — se ha eliminado la copia duplicada.`);
      return false;
    }
    seenAt.set(rider.id, location);
    return true;
  }

  const cleanedPlayerTeam = { ...playerTeam, riders: playerTeam.riders.filter((r) => claim(r, "tu equipo")) };
  const cleanedRivalTeams = rivalTeams.map((t) => ({ ...t, riders: t.riders.filter((r) => claim(r, `equipo rival ${t.name}`)) }));
  const cleanedOtherCategories = {};
  Object.entries(otherCategories || {}).forEach(([key, catState]) => {
    cleanedOtherCategories[key] = {
      ...catState,
      teams: catState.teams.map((t) => ({ ...t, riders: t.riders.filter((r) => claim(r, `${key}/${t.name}`)) })),
    };
  });
  const cleanedFreeAgents = (freeAgents || []).filter((r) => claim(r, "agentes libres"));

  return {
    playerTeam: cleanedPlayerTeam,
    rivalTeams: cleanedRivalTeams,
    otherCategories: cleanedOtherCategories,
    freeAgents: cleanedFreeAgents,
    issues,
  };
}

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
export function validateAndRepairTeam(team, scale, { padRosterTo2 = true, categoryKey = null } = {}) {
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
  while (padRosterTo2 && riders.length < 2) {
    // Bug fixed: this emergency-fill rookie always defaulted to male,
    // even for WorldWCR — the one category in the game that requires
    // every rider to be female. Harmless everywhere else, but a real
    // problem here: a team ending up short a rider (a load-time repair,
    // a data glitch) would silently get a man handed a WorldWCR seat.
    // Bug fixed: this also used to generate a brand-new rookie for ANY
    // category, including MotoGP/Moto2/WorldSBK — but nobody debuts
    // directly into those three in real life. Unlike the season-end
    // market engine (transferMarket.js), this function only ever sees
    // ONE isolated team — it has no visibility into other categories'
    // rosters to pull an existing rider up from instead. So for these
    // three, it simply doesn't fabricate anyone here at all; the team
    // is left short a rider rather than handed an implausible new
    // debutant, and the next real season transition's market engine
    // (which CAN see the whole grid) fills the seat properly with
    // someone who actually exists.
    if (categoryKey && !ROOKIE_ELIGIBLE_CATEGORIES.includes(categoryKey)) {
      issues.push("plaza vacía sin cubrir (categoría sin generación de debutantes) — se resolverá en la próxima transición de temporada");
      break;
    }
    riders.push(makeRookie(scale ?? 1, categoryKey, categoryKey === "worldwcr" ? "F" : "M"));
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
export function validateAndRepairTeams(teams, scale, categoryKey) {
  const allIssues = [];
  const repaired = (teams || []).map((t) => {
    const { team, issues } = validateAndRepairTeam(t, scale, { categoryKey });
    if (issues.length) allIssues.push({ team: t.name, issues });
    return team;
  });
  return { teams: repaired, allIssues };
}
