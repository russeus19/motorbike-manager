import { ATTRS } from "../data/attributes.js";
import { PERSONALITIES } from "../data/personalities.js";
import { clamp, pick, randInt, weightedPick } from "./random.js";

export function overallRating(r) {
  const sum = ATTRS.reduce((s, a) => s + r[a.key], 0);
  return Math.round(sum / ATTRS.length);
}

/* ------------------------------------------------------------------ */
/* Potential system: CA (current ability, = overallRating) vs PA      */
/* (potential ability). PA is dynamic and hidden growth profiles make */
/* riders with the same PA develop in very different ways.            */
/* ------------------------------------------------------------------ */


export function assignGrowthProfile(age) {
  let weights;
  if (age <= 19) weights = { explosivo: 0.3, precoz: 0.3, constante: 0.15, tardio: 0.1, irregular: 0.15 };
  else if (age <= 23) weights = { explosivo: 0.25, constante: 0.25, tardio: 0.2, precoz: 0.1, irregular: 0.2 };
  else if (age <= 27) weights = { constante: 0.35, tardio: 0.25, explosivo: 0.1, precoz: 0.05, irregular: 0.25 };
  else weights = { constante: 0.4, irregular: 0.25, tardio: 0.15, explosivo: 0.1, precoz: 0.1 };
  return weightedPick(weights);
}


export function makeAffinity() {
  const a = {};
  ATTRS.forEach((attr) => { a[attr.key] = randInt(-6, 6); });
  return a;
}


export function isFreeAgentEligibleForCategory(rider, categoryKey) {
  if (categoryKey === "motogp") return true;
  return rider.age <= 26;
}


export function computeMarketValue(rider, scale) {
  const ca = overallRating(rider);
  const upside = Math.max(0, rider.pa - ca) * 1.3;
  const ageFactor = rider.age <= 21 ? 1.35 : rider.age <= 24 ? 1.25 : rider.age <= 27 ? 1.1
    : rider.age <= 30 ? 0.95 : rider.age <= 33 ? 0.75 : rider.age <= 36 ? 0.5 : 0.3;
  const wins = Object.values(rider.careerWins || {}).reduce((s, v) => s + v, 0);
  const podiums = Object.values(rider.careerPodiums || {}).reduce((s, v) => s + v, 0);
  const resultsFactor = 1 + wins * 0.035 + podiums * 0.015;
  const moraleFactor = 0.85 + (rider.morale / 100) * 0.3;
  const base = (ca * 2.2 + upside) * ageFactor * resultsFactor * moraleFactor;
  return Math.max(15000, Math.round(base * 9000 * scale));
}


export function computeSalary(marketValue) {
  return Math.round(marketValue * 0.14);
}

/* Firing someone is never cheap: it scales with how good/valuable they
   are and how much contract time is left on the books, so it's always a
   real decision rather than a free way to dodge a bad renewal. */


export function fireRiderCost(rider) {
  const base = (rider.marketValue || 0) * 0.35 + (rider.salary || 0) * 1.5;
  const contractFactor = 1 + (rider.contractYears || 0) * 0.4;
  return Math.round(Math.max(30000, base * contractFactor));
}


export function finalizeRiderEconomics(rider, scale) {
  const marketValue = computeMarketValue(rider, scale);
  return {
    ...rider,
    contractYears: 1,
    marketValue,
    salary: computeSalary(marketValue),
    personality: pick(PERSONALITIES),
    crashesThisSeason: 0,
    seasonsUnsigned: 0,
  };
}


export function initRiderPotentialFields(r) {
  return {
    pa: clamp(r.potential ?? 60, 1, 100),
    growthProfile: assignGrowthProfile(r.age),
    morale: randInt(55, 75),
    professionalism: clamp(r.mental + randInt(-10, 10), 25, 95),
    affinity: makeAffinity(),
    seasonsStagnant: 0,
    isNewTeamThisSeason: false,
    careerWins: { motogp: 0, moto2: 0, moto3: 0 },
    careerPodiums: { motogp: 0, moto2: 0, moto3: 0 },
    history: [],
  };
}

/* ======================================================================
   ALMACÉN — component inventory management. Development improves the
   bike; the warehouse keeps it able to race at all. Two independent
   systems that both draw on the same budget.
   ====================================================================== */


export function riderSkill(r) {
  return (
    r.tecnica * 0.20 +
    r.ritmo * 0.30 +
    r.adelantamientos * 0.15 +
    r.mental * 0.15 +
    r.adaptabilidad * 0.12 +
    r.fisico * 0.08
  );
}

/* In the rain, adaptability and mental composure matter far more than raw
   pace or overtaking bravado. */


export function wetRiderSkill(r) {
  return (
    r.tecnica * 0.15 +
    r.ritmo * 0.18 +
    r.adelantamientos * 0.08 +
    r.mental * 0.20 +
    r.adaptabilidad * 0.30 +
    r.fisico * 0.09
  );
}

/* How well a bike's 5 categories match what this circuit rewards, versus
   just being a generically good/bad bike. A bike that's strong exactly
   where the circuit demands scores positive; a bike that's strong where
   the circuit doesn't care scores negative. Small, bounded swing. */


export function badgeEmoji(badge) {
  if (badge === "campeon") return "🥇";
  if (badge === "subcampeon") return "🥈";
  if (badge === "tercero") return "🥉";
  return null;
}

/* ---------------------------------------------------------------------- */
/* Rider Profile Modal                                                     */
/* ---------------------------------------------------------------------- */


export function lastTeamName(rider) {
  const h = rider.history || [];
  if (!h.length) return "Debutante";
  return h[h.length - 1].teamName;
}


export function substituteHireCost(rider, scale) {
  return Math.round((rider.salary || 20000) * 0.5 * (scale || 1));
}

/* The key used to look up a rider's photo: prefer the stable, hand-assigned
   `photoId` (present on the original 2026 grid riders) and fall back to the
   dynamic runtime `id` for anyone generated during play (rookies, legends)
   who doesn't have one. Used wherever a notification records "this is the
   rider this news item is about" so the Notification Center's photo always
   matches the same file a screen showing the rider directly would use. */
export function photoIdFor(rider) {
  return rider?.photoId ?? rider?.id ?? null;
}

/* AI pick of who substitutes for an injured rider: favors experience and
   overall level, tempered a little by wage so a small team doesn't
   reflexively grab the most expensive legend on the list. Only considers
   riders who are actually eligible (age rule in Moto2/Moto3) and
   affordable — otherwise returns null and the team just races a rider
   short. */

