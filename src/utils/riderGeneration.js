import { CATEGORY_DATA } from "../data/categories.js";
import { BIKE_AREA_KEYS } from "../data/bikeAreas.js";
import { FREE_AGENT_LEGENDS_DATA } from "../data/freeAgentLegends.js";
import { pickRookieNat, pickRookieName } from "../data/rookieNames.js";
import { bikeAvg } from "./bikeDevelopment.js";
import { nextId } from "./idGenerator.js";
import { clamp, randInt } from "./random.js";
import { finalizeRiderEconomics, initRiderPotentialFields, assignUniqueNumber, dedupeRiderNumbers } from "./riders.js";
import { initialRiderPrestige, initialTeamPrestige } from "./prestige.js";
import { initWarehouse } from "./warehouseEngine.js";

export function instantiateTeams(categoryKey) {
  const data = CATEGORY_DATA[categoryKey].teams;
  const scale = CATEGORY_DATA[categoryKey].scale;
  const teams = data.map((t, i) => {
    const isBig = t.tier === "Fábrica" || t.tier === "Puntero";
    const techBase = {};
    BIKE_AREA_KEYS.forEach((k) => { techBase[k] = clamp(Math.round(t.bike[k] * 0.85), 1, 99); });
    return {
      id: `${categoryKey}-team-${i}`,
      logoId: t.logoId || null,
      name: t.name,
      nameTemplate: t.nameTemplate || null,
      tier: t.tier,
      manufacturer: t.manufacturer || null,
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
      prestige: initialTeamPrestige(t.tier, categoryKey),
      riders: t.riders.map((r) => {
        const base = { ...r, id: nextId(), seasonPoints: 0 };
        const withPotential = { ...base, ...initRiderPotentialFields(base) };
        const finalized = finalizeRiderEconomics(withPotential, scale);
        // Manually-assigned prestige (see data/teamsMotoGP.js) always
        // wins over the formula — "asignación manual inicial... no
        // recalcular automáticamente el prestigio inicial".
        const prestige = Number.isFinite(r.prestige) ? r.prestige : initialRiderPrestige(finalized, categoryKey);
        return { ...finalized, prestige };
      }),
    };
  });

  // Dedupe across the WHOLE category (not just within one team) — the
  // static data is curated to already be unique, but this keeps things
  // safe if that ever drifts, and gives every rider a number at all.
  const flatRiderCount = teams.map((t) => t.riders.length);
  const dedupedFlat = dedupeRiderNumbers(teams.flatMap((t) => t.riders));
  let cursor = 0;
  return teams.map((t, i) => {
    const riders = dedupedFlat.slice(cursor, cursor + flatRiderCount[i]);
    cursor += flatRiderCount[i];
    return { ...t, riders };
  });
}


export function rollRookiePotential() {
  const roll = Math.random();
  if (roll < 0.55) return randInt(38, 58); // most: perfectly average, may never make it far
  if (roll < 0.85) return randInt(58, 75); // some: promising, could climb a category or two
  return randInt(75, 94); // rare: genuine star potential
}


// Every category has its own fixed, unique scale value (see
// data/categories.js), so it can be reverse-looked-up from `scale`
// alone without needing every single caller of makeRookie (there are
// several, scattered across careerValidation.js and transferMarket.js)
// to also start threading a categoryKey through. Falls back to Moto3
// — the original, always-correct assumption for the one caller that
// really is Moto3-only — if a scale doesn't match anything, which
// should never actually happen in practice.
function categoryKeyFromScale(scale) {
  const match = Object.entries(CATEGORY_DATA).find(([, data]) => Math.abs(data.scale - scale) < 0.001);
  return match ? match[0] : "moto3";
}

// A rookie's raw attributes were always tuned against Moto3 rookies
// specifically — perfectly fine when the ONLY caller was a Moto3-only
// roster fill, but wrong now that this same fallback also covers a
// vacancy nobody wanted in MotoGP, Moto2, Superbikes or Supersport: a
// genuine emergency call-up into MotoGP is a far stronger prospect on
// raw talent than a genuine Moto3 debutant, even though both are still
// "a rookie", so the same fixed 40-62 (etc.) range can't be right for
// both. Each attribute's range shifts upward as `scale` climbs from
// Moto3's 0.32 toward MotoGP's 1 — Moto3 itself is completely
// unaffected (shift is 0 there), everything above it gets a
// proportionally bigger boost.
const ROOKIE_BASE_RANGES = {
  tecnica: [40, 62], ritmo: [38, 60], adelantamientos: [38, 60],
  mental: [35, 55], adaptabilidad: [35, 55], fisico: [45, 65],
};
const ROOKIE_MAX_SHIFT = 26; // how much higher a MotoGP-tier rookie's baseline sits versus a Moto3-tier one

function rookieAttrRoll(attr, scale) {
  const [lo, hi] = ROOKIE_BASE_RANGES[attr];
  const t = clamp((scale - 0.32) / (1 - 0.32), 0, 1); // 0 at Moto3's own scale, 1 at MotoGP's
  const shift = Math.round(t * ROOKIE_MAX_SHIFT);
  return randInt(lo + shift, hi + shift);
}

export function makeRookie(scale, categoryKey) {
  const resolvedScale = scale ?? 0.32;
  const resolvedCategoryKey = categoryKey || categoryKeyFromScale(resolvedScale);
  const nat = pickRookieNat();
  const base = {
    name: pickRookieName(nat),
    nat,
    age: randInt(16, 18),
    potential: rollRookiePotential(),
    tecnica: rookieAttrRoll("tecnica", resolvedScale),
    ritmo: rookieAttrRoll("ritmo", resolvedScale),
    adelantamientos: rookieAttrRoll("adelantamientos", resolvedScale),
    mental: rookieAttrRoll("mental", resolvedScale),
    adaptabilidad: rookieAttrRoll("adaptabilidad", resolvedScale),
    fisico: rookieAttrRoll("fisico", resolvedScale),
    seasonPoints: 0,
    number: assignUniqueNumber([]),
  };
  const withPotential = { id: nextId(), ...base, ...initRiderPotentialFields(base), isNewTeamThisSeason: true };
  const finalized = finalizeRiderEconomics(withPotential, resolvedScale);
  return { ...finalized, prestige: initialRiderPrestige(finalized, resolvedCategoryKey) };
}


export function makeLegend(base) {
  const withId = { ...base, id: nextId(), seasonPoints: 0, number: Number.isFinite(base.number) ? base.number : assignUniqueNumber([]) };
  const withPotential = { ...withId, ...initRiderPotentialFields(withId) };
  const finalized = finalizeRiderEconomics(withPotential, 1, 0);
  // Every current entry in data/freeAgentLegends.js carries an explicit
  // prestige value precisely because this pool mixes real MotoGP-level
  // veterans with much younger Moto3/Moto2-tier prospects — always
  // scoring against "motogp"'s 120-200 range regardless of who it was
  // would badly overrate the younger ones. Only a future legend added
  // without an explicit value falls back to the formula (still using
  // motogp's range, since that's this pool's typical case).
  const prestige = Number.isFinite(base.prestige) ? base.prestige : initialRiderPrestige(finalized, "motogp");
  return { ...finalized, prestige };
}


export function seedLegendFreeAgents() {
  return FREE_AGENT_LEGENDS_DATA.map(makeLegend);
}

/* One-off signing fee for bringing in a substitute — a team with no
   budget or no eligible free agent simply races short a rider instead of
   magically affording (or being allowed) one. */

