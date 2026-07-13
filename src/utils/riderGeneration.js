import { CATEGORY_DATA } from "../data/categories.js";
import { BIKE_AREA_KEYS } from "../data/bikeAreas.js";
import { FREE_AGENT_LEGENDS_DATA } from "../data/freeAgentLegends.js";
import { ROOKIE_FIRST, ROOKIE_LAST } from "../data/rookieNames.js";
import { ROOKIE_NATS } from "../data/rookieNats.js";
import { bikeAvg } from "./bikeDevelopment.js";
import { nextId } from "./idGenerator.js";
import { clamp, pick, randInt } from "./random.js";
import { finalizeRiderEconomics, initRiderPotentialFields } from "./riders.js";
import { initWarehouse } from "./warehouseEngine.js";

export function instantiateTeams(categoryKey) {
  const data = CATEGORY_DATA[categoryKey].teams;
  const scale = CATEGORY_DATA[categoryKey].scale;
  return data.map((t, i) => {
    const isBig = t.tier === "Fábrica" || t.tier === "Puntero";
    const techBase = {};
    BIKE_AREA_KEYS.forEach((k) => { techBase[k] = clamp(Math.round(t.bike[k] * 0.85), 1, 99); });
    return {
      id: `${categoryKey}-team-${i}`,
      logoId: t.logoId || null,
      name: t.name,
      tier: t.tier,
      color: t.color,
      bike: { ...t.bike },
      budget: t.budget,
      baseBudget: t.budget,
      facilitiesRating: Math.round(bikeAvg(t.bike)),
      techBase,
      factory: { level: isBig ? 55 : 35, upgrading: null },
      staff: { level: isBig ? 50 : 35, upgrading: null },
      activeProjects: [],
      warehouse: initWarehouse(),
      riders: t.riders.map((r) => {
        const base = { ...r, id: nextId(), seasonPoints: 0 };
        const withPotential = { ...base, ...initRiderPotentialFields(base) };
        return finalizeRiderEconomics(withPotential, scale);
      }),
    };
  });
}


export function rollRookiePotential() {
  const roll = Math.random();
  if (roll < 0.55) return randInt(38, 58); // most: perfectly average, may never make it far
  if (roll < 0.85) return randInt(58, 75); // some: promising, could climb a category or two
  return randInt(75, 94); // rare: genuine star potential
}


export function makeRookie(scale) {
  const base = {
    name: `${pick(ROOKIE_FIRST)} ${pick(ROOKIE_LAST)}`,
    nat: pick(ROOKIE_NATS),
    age: randInt(16, 18),
    potential: rollRookiePotential(),
    tecnica: randInt(40, 62),
    ritmo: randInt(38, 60),
    adelantamientos: randInt(38, 60),
    mental: randInt(35, 55),
    adaptabilidad: randInt(35, 55),
    fisico: randInt(45, 65),
    seasonPoints: 0,
  };
  const withPotential = { id: nextId(), ...base, ...initRiderPotentialFields(base), isNewTeamThisSeason: true };
  return finalizeRiderEconomics(withPotential, scale ?? 0.32);
}

/**
 * A brand-new Red Bull Rookies Cup prospect — filling a vacant seat
 * during the category's annual grid refresh (section 20). Younger
 * (14-18) and a notch below even makeRookie's Moto3 debutants, but with
 * the same wide potential spread so future stars keep appearing, not
 * just filler. Always a single year of contract, exactly like every
 * other Rookies Cup rider.
 */
export function makeRookiesCupProspect() {
  const scale = CATEGORY_DATA.rookiescup.scale;
  const base = {
    name: `${pick(ROOKIE_FIRST)} ${pick(ROOKIE_LAST)}`,
    nat: pick(ROOKIE_NATS),
    age: randInt(14, 18),
    potential: rollRookiePotential(),
    tecnica: randInt(35, 55),
    ritmo: randInt(35, 53),
    adelantamientos: randInt(33, 52),
    mental: randInt(28, 45),
    adaptabilidad: randInt(26, 44),
    fisico: randInt(42, 58),
    seasonPoints: 0,
  };
  const withPotential = { id: nextId(), ...base, ...initRiderPotentialFields(base), isNewTeamThisSeason: true };
  return finalizeRiderEconomics(withPotential, scale, 1);
}


export function makeLegend(base) {
  const withId = { ...base, id: nextId(), seasonPoints: 0 };
  const withPotential = { ...withId, ...initRiderPotentialFields(withId) };
  return finalizeRiderEconomics(withPotential, 1, 0);
}


export function seedLegendFreeAgents() {
  return FREE_AGENT_LEGENDS_DATA.map(makeLegend);
}

/* One-off signing fee for bringing in a substitute — a team with no
   budget or no eligible free agent simply races short a rider instead of
   magically affording (or being allowed) one. */

