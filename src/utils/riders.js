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
   MotoGP, Superbikes and Supersport have no limit at all. Moto3 keeps
   the original 27-or-under restriction. Moto2 is more permissive: up
   to and including 30. Sportbike (WorldSPB) isn't listed explicitly —
   it falls through to the same <=25 default as Moto3, which matches
   its real newcomer age cap closely enough without modeling the
   real-world "28 if already experienced" exception separately. */
export function isFreeAgentEligibleForCategory(rider, categoryKey) {
  // WorldWCR is the only competition in the game with a gender
  // requirement — every rider in the game carries a `gender` field
  // (defaulting to "M" for the huge majority never explicitly set),
  // but this is the one and only place that field gates a signing.
  // No age cap here either: real WorldWCR grids include riders into
  // their late 20s (María Herrera, the reigning champion, is 27), so
  // this behaves like the age-unrestricted top tier below, not like
  // Moto3's youth cutoff.
  if (categoryKey === "worldwcr") return (rider.gender || "M") === "F";
  if (categoryKey === "motogp" || categoryKey === "superbikes" || categoryKey === "supersport") return true;
  if (categoryKey === "moto2") return rider.age <= 30;
  return rider.age <= 25;
}

/** How much of a chance any female rider has of being seriously
 * considered for a seat OUTSIDE WorldWCR — used by every place a woman
 * could end up signing for a different category (the season-end
 * market's promotion pairs and vacancy fill in transferMarket.js, and
 * live in-season AI-initiated signings in marketNegotiations.js), so
 * all three enforce the exact same standard rather than three separate
 * copies that could drift apart. Deliberately strict in the early
 * seasons — real crossover is rare today — and eases gradually over a
 * long career, as a nod to women's motorcycle racing's quality and
 * depth genuinely growing over time rather than staying frozen at
 * whatever it looked like in season 1. Floors are capped so it never
 * becomes trivial even after many seasons — the goal is "rare" easing
 * toward "uncommon but real", never "same as any other rider". */
/** How many of WorldWCR's own top finishers are even considered as
 * crossover candidates at all (see PROMOTION_PAIRS in
 * transferMarket.js) — deliberately tiny at the start (a real elite
 * handful out of WorldWCR's 34-rider grid, not the Top-10 slice every
 * other, much bigger category uses), widening slowly over the seasons
 * to reflect the category's growing depth of talent, not just the
 * quality of any one standout. */
export function crossoverCandidatePoolSize(seasonNumber = 1) {
  const bySeason = Math.max(0, (seasonNumber ?? 1) - 1);
  return Math.min(6, 3 + Math.floor(bySeason / 4));
}

export function crossoverPotentialFloor(targetCategoryKey, seasonNumber = 1) {
  const bySeason = Math.max(0, (seasonNumber ?? 1) - 1); // no easing at all in season 1
  // Base values (season 1) were originally set even higher than this,
  // but turned out to badly overshoot: almost every female rider in the
  // game — the WorldWCR roster included — has a potential well under
  // 60, so a Sportbike floor of 68 meant essentially nobody could ever
  // qualify, no matter how good a season they had. The result wasn't
  // "rare crossovers", it was "no crossovers at all" — women only ever
  // showing up elsewhere as short-notice substitutes (which never
  // checked this gate to begin with), never as a real signing. These
  // values instead sit just above the genuine standouts already in the
  // game (WorldWCR's best hover in the high 60s/low 70s), so a truly
  // exceptional season has a real shot from season 1, while merely
  // decent riders still don't qualify. Easing down a little each season
  // tells the story of women's racing quietly growing in both quality
  // and depth over time, without ever making crossovers routine.
  if (targetCategoryKey === "moto3") return Math.max(65, 75 - bySeason * 0.5);
  if (targetCategoryKey === "supersport") return Math.max(55, 68 - bySeason * 0.7);
  return Math.max(45, 58 - bySeason * 0.8); // sportbike and anything else
}

/** True if this rider passes the crossover bar above — a small
 * convenience so callers don't need to remember the "only applies to
 * women, and never to WorldWCR itself" condition every time. */
/** Shared by wouldRiderJoin (marketAI.js, AI-vs-AI) and
 * scoreRiderOfferAcceptance (marketNegotiations.js, the player's own
 * offers) — a single definition of "how prestigious is this category
 * relative to the others" so the two can never drift out of sync with
 * each other again. They used to each keep their own separate copy;
 * Sportbike went missing from one of them once already (silently
 * treating a well-earned Sportbike→Supersport promotion as a
 * downgrade), and worse, scoreRiderOfferAcceptance never had ANY
 * category-awareness at all — a rider having a great season in
 * Superbikes would accept an offer from a WorldWCR team exactly as
 * readily as one from Superbikes itself, since nothing there ever
 * checked how far down that actually is. */
export const CATEGORY_RANK = { motogp: 3, moto2: 2, superbikes: 2, supersport: 1.5, moto3: 1, sportbike: 0.5, worldwcr: 0.2 };

export function categoryRankDelta(toCategoryKey, fromCategoryKey) {
  return (CATEGORY_RANK[toCategoryKey] ?? 2) - (CATEGORY_RANK[fromCategoryKey ?? toCategoryKey] ?? 2);
}

// The natural feeder for each of the three "elite" categories — the
// only origin a rider can come from without needing to clear an
// exceptionally high bar first. MotoGP only really recruits from
// Moto2, Moto2 only really recruits from Moto3, Superbikes only really
// recruits from Supersport — a rider from any OTHER category (a
// completely different ladder, like Supersport turning up in MotoGP)
// has no real pathway there at all in reality, no matter how modest a
// jump it might look like on paper.
const NATURAL_FEEDER = { motogp: "moto2", moto2: "moto3", superbikes: "supersport" };

/** How good a rider from a NON-feeder ladder would have to be to even
 * be considered for MotoGP/Moto2/Superbikes — deliberately far higher
 * than crossoverPotentialFloor's own values, since jumping ladders
 * entirely (not just up one step within the same one) should be
 * exceedingly rare, reserved for a genuinely transcendent talent. */
function offLadderPotentialFloor(targetCategoryKey, seasonNumber = 1) {
  const bySeason = Math.max(0, (seasonNumber ?? 1) - 1);
  if (targetCategoryKey === "motogp") return Math.max(82, 92 - bySeason * 0.3);
  if (targetCategoryKey === "moto2") return Math.max(75, 84 - bySeason * 0.3);
  if (targetCategoryKey === "superbikes") return Math.max(72, 80 - bySeason * 0.3);
  return 0;
}

/** Even coming from the right feeder, MotoGP/Moto2/Superbikes shouldn't
 * take just "whoever's best of what's left" — a rider who finished
 * deep in the midfield of Moto2 (say, 30th) has no real business in
 * MotoGP regardless of how thin the rest of the pool happens to be
 * that transition. Lower than offLadderPotentialFloor, since this IS
 * the normal, expected pathway — but still a real bar, not zero. */
function naturalFeederPotentialFloor(targetCategoryKey, seasonNumber = 1) {
  const bySeason = Math.max(0, (seasonNumber ?? 1) - 1);
  if (targetCategoryKey === "motogp") return Math.max(58, 68 - bySeason * 0.4);
  if (targetCategoryKey === "moto2") return Math.max(48, 58 - bySeason * 0.4);
  if (targetCategoryKey === "superbikes") return Math.max(45, 55 - bySeason * 0.4);
  return 0;
}

export function passesCrossoverGate(rider, targetCategoryKey, seasonNumber = 1) {
  if (rider.gender === "F" && targetCategoryKey !== "worldwcr" && (rider.potential ?? 0) < crossoverPotentialFloor(targetCategoryKey, seasonNumber)) return false;
  // Bug fixed: this only ever gated the WorldWCR gender-crossover case
  // — a male rider from any category, however mismatched, always
  // passed. That's how a mid-50s-average Supersport rider (and a
  // freshly generated regen right alongside them) ended up signed by
  // a MotoGP team: nothing here ever asked whether their own ladder
  // even connects to MotoGP at all, only whether the rider happened to
  // be female. Bug fixed: this generalizes the same idea to every
  // rider, gender aside — MotoGP/Moto2/Superbikes only take their
  // natural feeder for granted; anyone from a different ladder needs
  // to clear a genuinely elite bar first.
  const naturalFeeder = NATURAL_FEEDER[targetCategoryKey];
  if (naturalFeeder) {
    const fromCat = rider._fromCategoryKey;
    if (fromCat && fromCat !== targetCategoryKey && fromCat !== naturalFeeder) {
      return (rider.potential ?? 0) >= offLadderPotentialFloor(targetCategoryKey, seasonNumber);
    }
    // Bug fixed: even THROUGH the natural feeder, there was no quality
    // floor at all — just "best of whoever happens to still be
    // available" with no minimum. That's how a rider who finished 30th
    // in Moto2 (Luca Lunetta) could still get force-signed by a MotoGP
    // team: his POTENTIAL (74) is actually decent on paper, so a
    // potential-only floor doesn't catch him — potential is what he
    // might become, not what he is right now, and a team calling
    // someone up cares about CURRENT form (his overall rating, 63) at
    // least as much as future promise. Both need to clear the bar.
    if (fromCat === naturalFeeder) {
      const floor = naturalFeederPotentialFloor(targetCategoryKey, seasonNumber);
      if ((rider.potential ?? 0) < floor || overallRating(rider) < floor) return false;
    }
  }
  return true;
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
   number — each active tag adds its own 4%, so a rider with several
   tags active at once (a sprint held in the rain at their favorite
   circuit, say) stacks additively, not as a compounded multiplier.
   Four tag types exist: favoriteCircuit (needs `circuit` and matches
   its own `round`), wetSpecialist (needs `isWet`), sprintSpecialist
   (needs `isSprint` — also true for WorldSBK's Superpole Race, which
   is simulated the same way a sprint is), and qualifyingSpecialist
   (needs `isQualifying`). Every context flag is optional — a caller
   that can't supply one simply can't trigger that tag, but nothing
   breaks either way. */
function tagBonusMultiplier(rider, circuit, isWet, isSprint, isQualifying) {
  let mult = 1;
  (rider.tags || []).forEach((tag) => {
    if (tag.type === "favoriteCircuit" && circuit && circuit.round === tag.round) mult += 0.04;
    if (tag.type === "wetSpecialist" && isWet) mult += 0.04;
    if (tag.type === "sprintSpecialist" && isSprint) mult += 0.04;
    if (tag.type === "qualifyingSpecialist" && isQualifying) mult += 0.04;
  });
  return mult;
}

export function riderSkill(r, circuit = null, isSprint = false, isQualifying = false) {
  const base = (
    r.tecnica * 0.20 +
    r.ritmo * 0.30 +
    r.adelantamientos * 0.15 +
    r.mental * 0.15 +
    r.adaptabilidad * 0.12 +
    r.fisico * 0.08
  );
  return base * tagBonusMultiplier(r, circuit, false, isSprint, isQualifying);
}

/* In the rain, adaptability and mental composure matter far more than raw
   pace or overtaking bravado. */


export function wetRiderSkill(r, circuit = null, isSprint = false, isQualifying = false) {
  const base = (
    r.tecnica * 0.15 +
    r.ritmo * 0.18 +
    r.adelantamientos * 0.08 +
    r.mental * 0.20 +
    r.adaptabilidad * 0.30 +
    r.fisico * 0.09
  );
  return base * tagBonusMultiplier(r, circuit, true, isSprint, isQualifying);
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
/** Bug fixed: a free agent's own injury never counted down at all —
 * the normal per-race injury countdown only ever runs inside
 * processTeamAfterRace, which only looks at riders who are actually on
 * SOME team's roster (or in team.substitutes) that exact race weekend.
 * Anyone sitting in the free-agent pool — released while hurt, or a
 * substitute sent back after recovering their OWN separate injury —
 * was invisible to that loop and could stay "injured" forever, no
 * matter how many races went by, since nothing ever touched their
 * gpRemaining. Called once per race weekend against the whole pool. */
export function decrementFreeAgentInjury(rider) {
  if (!rider.injury || !(rider.injury.gpRemaining > 0)) return rider;
  const gpRemaining = rider.injury.gpRemaining - 1;
  return { ...rider, injury: gpRemaining <= 0 ? null : { ...rider.injury, gpRemaining } };
}

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

