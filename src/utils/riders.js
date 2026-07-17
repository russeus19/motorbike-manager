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


/* Age limit for a free agent to sign or substitute in a given category.
   MotoGP has no limit at all. Moto3 keeps the original 27-or-under
   restriction. Moto2 is more permissive: up to and including 30. */
export function isFreeAgentEligibleForCategory(rider, categoryKey) {
  if (categoryKey === "motogp") return true;
  if (categoryKey === "moto2") return rider.age <= 30;
  return rider.age <= 27;
}


/* Shared by both formulas below: total wins/podiums across every
   category a rider has ever raced in — the game's existing stand-in for
   "palmarés"/sporting prestige, since there's no separate prestige field
   on a rider. */
function careerTotal(record) {
  return Object.values(record || {}).reduce((s, v) => s + v, 0);
}

/**
 * Market value — what it costs to sign this rider. Potential carries
 * real weight here (on top of, not instead of, current ability): the
 * gap between PA and CA is squared and then scaled by how much time a
 * rider realistically has left to cash it in, so a young rider with a
 * huge gap is worth dramatically more than a similar-CA rider close to
 * their ceiling, while an old rider with the same gap barely benefits
 * from it at all. Age also gently discounts the current-ability side on
 * its own (a veteran's quality has less future to sell than a rising
 * rider's does), separately from — and more sharply than — how it
 * affects potential.
 */
export function computeMarketValue(rider, scale) {
  const ca = clamp(overallRating(rider), 1, 99);
  const pa = clamp(rider.pa ?? ca, ca, 100);
  const potentialGap = pa - ca;

  const ageMultiplierForPotential = rider.age <= 21 ? 1.5 : rider.age <= 24 ? 1.2 : rider.age <= 27 ? 0.85
    : rider.age <= 30 ? 0.5 : rider.age <= 33 ? 0.25 : 0.1;
  const potentialValue = potentialGap * potentialGap * 0.55 * ageMultiplierForPotential;

  const ageFactorForCA = rider.age <= 24 ? 1.15 : rider.age <= 28 ? 1.0 : rider.age <= 31 ? 0.85
    : rider.age <= 34 ? 0.65 : rider.age <= 37 ? 0.45 : 0.3;

  const wins = careerTotal(rider.careerWins);
  const podiums = careerTotal(rider.careerPodiums);
  const prestigeFactor = 1 + clamp(wins * 0.015 + podiums * 0.006, 0, 0.3);
  const experienceFactor = 1 + clamp((rider.history || []).length * 0.01, 0, 0.15);
  const moraleFactor = 0.85 + (rider.morale / 100) * 0.3;

  const caValue = Math.pow(ca / 100, 2.3) * 100 * 1.6;
  const base = (caValue + potentialValue) * ageFactorForCA;
  return Math.max(15000, Math.round(base * prestigeFactor * experienceFactor * moraleFactor * 9000 * scale));
}

/**
 * Salary — what this rider currently earns per season. Deliberately a
 * separate calculation from market value, not a percentage of it:
 * dominated by current ability (a steep curve, so elite riders clearly
 * separate from the midfield), with sporting prestige (wins/podiums) and
 * experience (seasons raced) adding a moderate premium, and only a mild,
 * mostly-flat age adjustment. Potential is never used here at all — a
 * highly-rated rookie doesn't get paid for a future that hasn't
 * happened yet, no matter how bright it looks.
 */
export function computeSalary(rider, scale) {
  const ca = clamp(overallRating(rider), 1, 99);
  const wins = careerTotal(rider.careerWins);
  const podiums = careerTotal(rider.careerPodiums);
  const seasons = (rider.history || []).length;

  const prestigeFactor = 1 + clamp(wins * 0.02 + podiums * 0.008, 0, 0.6);
  const experienceFactor = 1 + clamp(seasons * 0.015, 0, 0.25);
  const ageFactor = rider.age <= 20 ? 0.88 : rider.age <= 34 ? 1 : rider.age <= 38 ? 0.92 : 0.82;

  const caValue = Math.pow(ca / 100, 2.6) * 1_500_000;
  return Math.max(8000, Math.round(caValue * prestigeFactor * experienceFactor * ageFactor * scale));
}

/* Firing someone is never cheap: it scales with how good/valuable they
   are and how much contract time is left on the books, so it's always a
   real decision rather than a free way to dodge a bad renewal. */


export function fireRiderCost(rider) {
  const base = (rider.marketValue || 0) * 0.35 + (rider.salary || 0) * 1.5;
  const contractFactor = 1 + (rider.contractYears || 0) * 0.4;
  return Math.round(Math.max(30000, base * contractFactor));
}

/**
 * Cost of "designar para quedar libre al final de temporada" — the
 * deferred release that lets a rider finish out the current season
 * before actually leaving. Free when only one year (or less) is left on
 * the contract, since that year was ending anyway and no promise is
 * being broken. Otherwise scales with however many seasons would still
 * remain AFTER this one — releasing someone two years early costs more
 * than releasing them one year early, dynamically, never a flat fee.
 */
export function computeReleaseAtSeasonEndCost(rider, scale) {
  const yearsOwedAfterThisSeason = Math.max(0, (rider.contractYears ?? 0) - 1);
  if (yearsOwedAfterThisSeason <= 0) return 0;
  const fairSalary = computeSalary(rider, scale || 1);
  return Math.round(fairSalary * yearsOwedAfterThisSeason * 0.5);
}


export function finalizeRiderEconomics(rider, scale, contractYears = 1) {
  const marketValue = computeMarketValue(rider, scale);
  return {
    ...rider,
    contractYears,
    marketValue,
    salary: computeSalary(rider, scale),
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


/* Applies a rider's special-skill tags (see components/RiderProfileModal
   for how these display) as a flat additive bonus to their final skill
   number — each active tag adds its own 4%, so a rider with two tags
   active at once (rare: would need their favorite circuit AND rain at
   the same time) gets +8%, not a compounded multiplier. `circuit` and
   `isWet` are optional — a caller without circuit context simply can't
   trigger the favoriteCircuit bonus, and one without isWet can't trigger
   wetSpecialist, but neither breaks. */
function tagBonusMultiplier(rider, circuit, isWet) {
  let mult = 1;
  (rider.tags || []).forEach((tag) => {
    if (tag.type === "favoriteCircuit" && circuit && circuit.round === tag.round) mult += 0.04;
    if (tag.type === "wetSpecialist" && isWet) mult += 0.04;
  });
  return mult;
}

export function riderSkill(r, circuit = null) {
  const base = (
    r.tecnica * 0.20 +
    r.ritmo * 0.30 +
    r.adelantamientos * 0.15 +
    r.mental * 0.15 +
    r.adaptabilidad * 0.12 +
    r.fisico * 0.08
  );
  return base * tagBonusMultiplier(r, circuit, false);
}

/* In the rain, adaptability and mental composure matter far more than raw
   pace or overtaking bravado. */


export function wetRiderSkill(r, circuit = null) {
  const base = (
    r.tecnica * 0.15 +
    r.ritmo * 0.18 +
    r.adelantamientos * 0.08 +
    r.mental * 0.20 +
    r.adaptabilidad * 0.30 +
    r.fisico * 0.09
  );
  return base * tagBonusMultiplier(r, circuit, true);
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

/* Picks a fresh race number (2-99, since 1 is reserved in the real sport
   for the reigning champion and this game doesn't track that) that
   isn't already in `existingNumbers` — used both for a newly generated
   rider (rookie, legend without a preset number) and for resolving a
   collision when a rider's existing number turns out to already belong
   to someone else in their new category. Falls back to whatever's free
   if the whole 2-99 range is somehow taken (never happens with a real
   grid size, but avoids an infinite loop either way). */
export function assignUniqueNumber(existingNumbers) {
  const taken = new Set(existingNumbers || []);
  const candidates = [];
  for (let n = 2; n <= 99; n++) if (!taken.has(n)) candidates.push(n);
  if (!candidates.length) return randInt(2, 99);
  return pick(candidates);
}

/* Ensures every rider in this list has a number, and that no two share
   one — a rider keeps their existing number as long as nobody earlier
   in the list already has it; only a genuine collision (or a missing
   number) gets a fresh one assigned. Used whenever a full category
   roster is assembled or re-validated, so numbers stay unique without
   needing every individual creation site to know the whole roster. */
export function dedupeRiderNumbers(riders) {
  const seen = new Set();
  return riders.map((r) => {
    if (Number.isFinite(r.number) && !seen.has(r.number)) {
      seen.add(r.number);
      return r;
    }
    const number = assignUniqueNumber(seen);
    seen.add(number);
    return { ...r, number };
  });
}

/* AI pick of who substitutes for an injured rider: favors experience and
   overall level, tempered a little by wage so a small team doesn't
   reflexively grab the most expensive legend on the list. Only considers
   riders who are actually eligible (age rule in Moto2/Moto3) and
   affordable — otherwise returns null and the team just races a rider
   short. */

