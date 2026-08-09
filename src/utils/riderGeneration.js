import { CATEGORY_DATA } from "../data/categories.js";
import { BIKE_AREA_KEYS } from "../data/bikeAreas.js";
import { FREE_AGENT_LEGENDS_DATA } from "../data/freeAgentLegends.js";
import { pickRookieNat, pickRookieName } from "../data/rookieNames.js";
import { pickFemaleRookieNat, pickFemaleRookieName } from "../data/rookieNamesFemale.js";
import { getRegenFaceRegion, REGEN_FACES_PER_REGION, REGEN_FEMALE_FACES_PER_REGION } from "../data/regenFaceRegions.js";
import { bikeAvg } from "./bikeDevelopment.js";
import { nextId, nextRegenId } from "./idGenerator.js";
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

export function makeRookie(scale, categoryKey, gender = "M") {
  const resolvedScale = scale ?? 0.32;
  const resolvedCategoryKey = categoryKey || categoryKeyFromScale(resolvedScale);
  const isFemale = gender === "F";
  const nat = isFemale ? pickFemaleRookieNat() : pickRookieNat();
  const base = {
    name: isFemale ? pickFemaleRookieName(nat) : pickRookieName(nat),
    nat,
    gender,
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
    // Rolled once, right here, and never touched again — from this
    // point on it's just a normal field on the rider object, saved and
    // loaded with everything else about them, so the same face sticks
    // with this specific regen for their entire career in this save.
    // The region keeps the face's ethnicity honest for their flag
    // instead of, say, a Japanese rookie ending up with a clearly
    // European face — see data/regenFaceRegions.js for the mapping.
    // Female regens draw from their own separate folder
    // (public/assets/riders/regen/female/<region>/) rather than the
    // male one — different photo set entirely, not just a different
    // pick within the same one.
    photoId: isFemale
      ? `regen/female/${getRegenFaceRegion(nat)}/${randInt(1, REGEN_FEMALE_FACES_PER_REGION)}`
      : `regen/${getRegenFaceRegion(nat)}/${randInt(1, REGEN_FACES_PER_REGION)}`,
  };
  const withPotential = { id: nextRegenId(), ...base, ...initRiderPotentialFields(base), isNewTeamThisSeason: true };
  const finalized = finalizeRiderEconomics(withPotential, resolvedScale);
  return { ...finalized, prestige: initialRiderPrestige(finalized, resolvedCategoryKey) };
}

/** The season's fresh rookie class — genuinely new prospects, free to
 * sign for any team in the four entry categories (Moto3/WorldWCR/
 * WorldSSP/WorldSPB), not tied to any one team's vacancy. Generated
 * once per season transition and dropped straight into the free-agent
 * pool alongside everyone else — the Sporting Director panel is just
 * a curated, partially-revealed VIEW onto this same group (see
 * rookieClassVisibleSlice in utils/scouting.js), not a separate pool.
 * A member nobody signs before the season starts simply keeps
 * existing as an ordinary free agent from then on — _rookieClassSeason
 * just stops matching the CURRENT season, so the panel naturally stops
 * treating them as "this year's class" without anything needing to
 * actively clear the tag.
 *
 * ~15 male prospects split evenly across Moto3/Supersport/Sportbike
 * (the three categories a male rookie can debut in), ~5 female
 * prospects for WorldWCR (the one category where being female isn't
 * just allowed but required). This is deliberately separate from (and
 * on top of) the older single-vacancy rookie fallback further down
 * this file's caller in transferMarket.js, which stays exactly as it
 * was — a genuine last resort for whatever the market (now including
 * this fresh class) still doesn't manage to place. */
export function generateRookieClass(seasonNumber) {
  const maleCategories = ["moto3", "supersport", "sportbike"];
  const rookies = [];
  maleCategories.forEach((categoryKey) => {
    for (let i = 0; i < 5; i++) {
      const rookie = makeRookie(CATEGORY_DATA[categoryKey].scale, categoryKey, "M");
      rookies.push({ ...rookie, _rookieClassSeason: seasonNumber, _rookieClassCategory: categoryKey });
    }
  });
  for (let i = 0; i < 5; i++) {
    const rookie = makeRookie(CATEGORY_DATA.worldwcr.scale, "worldwcr", "F");
    rookies.push({ ...rookie, _rookieClassSeason: seasonNumber, _rookieClassCategory: "worldwcr" });
  }
  return rookies;
}


export function makeLegend(base) {
  const withId = { ...base, id: nextId(), seasonPoints: 0, number: Number.isFinite(base.number) ? base.number : assignUniqueNumber([]) };
  const withPotential = { ...withId, ...initRiderPotentialFields(withId) };
  // Bug fixed: this always used MotoGP's own scale (1) for every
  // entry's market value and salary — fine back when this pool only
  // ever held actual MotoGP-tier veterans, but this same pool now also
  // holds much more modest prospects (the WorldWCR-eligible free
  // agents added alongside the category). Scale is the single biggest
  // multiplier in computeMarketValue/computeSalary, so a 24-37 average
  // rider still priced at MotoGP's scale came out worth millions.
  // Auto-detecting scale from current stats alone was tried and
  // reverted — it demoted young, high-potential-but-still-raw MotoGP
  // prospects (like Noah Dettwiler) below WorldWCR-tier riders, since a
  // rookie's current level doesn't reflect which category they're
  // actually destined for. So this follows the exact same pattern
  // prestige already uses on this same pool: an explicit value per
  // entry (only ever needed for the WorldWCR-tier additions so far),
  // falling back to MotoGP's scale for anyone who doesn't specify one
  // — every pre-existing entry keeps working exactly as before.
  const scale = base.scale ?? 1;
  const finalized = finalizeRiderEconomics(withPotential, scale, 0);
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

