import { clamp, randInt, pick } from "./random.js";
import { overallRating } from "./riders.js";

/**
 * The Sporting Director system: hides a rider's potential, morale, and
 * attribute spread from the player until scouted, exactly like a real
 * team wouldn't know a prospect's true ceiling without doing the work.
 * Mirrors Factory/Staff in every mechanical way (a 0-99 level the
 * player upgrades with money and time) so it costs nothing new to
 * learn — the only real addition is what the level actually unlocks:
 * scout slots, report speed, and how tightly a report narrows down
 * the truth.
 *
 * team.sportingDirector = { level, upgrading }             — same shape as factory/staff
 * team.scoutingMissions = [{ riderId, categoryKey, weeksRemaining, totalWeeks }]
 * team.scoutReports = { [riderId]: { potentialRange: [lo, hi], reportsCount,
 *                                     moraleValue, moraleSeason, attributeHints: [text] } }
 */

export const SPORTING_DIRECTOR_TIERS = [
  { name: "Muy bajo", min: 0, max: 19, slots: 1, weeksPerReport: 6, initialHalfWidth: 20 },
  { name: "Bajo", min: 20, max: 39, slots: 2, weeksPerReport: 5, initialHalfWidth: 15 },
  { name: "Normal", min: 40, max: 59, slots: 3, weeksPerReport: 4, initialHalfWidth: 11 },
  { name: "Alto", min: 60, max: 79, slots: 4, weeksPerReport: 3, initialHalfWidth: 7 },
  { name: "Muy alto", min: 80, max: 99, slots: 5, weeksPerReport: 2, initialHalfWidth: 4 },
];

export function sportingDirectorTierFor(level) {
  const lvl = clamp(level ?? 0, 0, 99);
  return SPORTING_DIRECTOR_TIERS.find((t) => lvl >= t.min && lvl <= t.max) || SPORTING_DIRECTOR_TIERS[0];
}

export function ensureSportingDirector(team) {
  if (team.sportingDirector) return team.sportingDirector;
  const isBig = team.tier === "Fábrica" || team.tier === "Puntero";
  return { level: initialSportingDirectorLevel(team.categoryKey, isBig), upgrading: null };
}

/** Category sets the baseline (a MotoGP scouting department has
 * nothing in common with a WorldWCR privateer's), and a big team
 * within that category steps one full tier above its category's own
 * baseline — the Ducati Lenovo Team ends up Muy alto, a small MotoGP
 * team lands on Alto, a big WorldWCR team reaches Bajo, and a small
 * Sportbike/WorldWCR team stays at Muy bajo, exactly matching how
 * these things actually shake out in the real sport. No ceiling by
 * category, though — upgrade cost is what keeps a small team's
 * department realistically expensive to grow, not a hard cap. */
export function initialSportingDirectorLevel(categoryKey, isBig) {
  const baseByCategory = {
    motogp: 70,
    superbikes: 50, moto2: 50,
    supersport: 30, moto3: 30,
    sportbike: 10, worldwcr: 10,
  };
  const base = baseByCategory[categoryKey] ?? 30;
  return clamp(base + (isBig ? 20 : 0), 0, 99);
}

function sportingDirectorUpgradeSpec(level, scale) {
  const t = clamp(level, 0, 99) / 99;
  const difficulty = Math.pow(t, 2.3); // steeper than factory/staff — each step should bite hard
  const money = Math.round(190000 * (1 + difficulty * 11) * (scale || 1));
  const gp = clamp(Math.round(4 + difficulty * 10), 4, 16);
  const gain = clamp(Math.round(9 * (1 - difficulty)) + 3, 4, 12);
  return { money, gp, gain };
}

export function sportingDirectorUpgradeSpecFor(team, scale) {
  const { level } = ensureSportingDirector(team);
  return sportingDirectorUpgradeSpec(level, scale);
}

export function canStartSportingDirectorUpgrade(team, budgetAvailable, scale) {
  const sd = ensureSportingDirector(team);
  if (sd.upgrading) return null;
  if (sd.level >= 99) return null;
  const spec = sportingDirectorUpgradeSpec(sd.level, scale);
  if (spec.money > budgetAvailable) return null;
  return spec;
}

export function startSportingDirectorUpgrade(team, spec) {
  const sd = ensureSportingDirector(team);
  return { ...team, sportingDirector: { ...sd, upgrading: { remaining: spec.gp, totalGp: spec.gp, gain: spec.gain } } };
}

/* Same weekly cadence as facility upgrades — ticks down by one, and any
   in-progress scouting missions immediately benefit from the new level
   the moment it completes (more slots, faster/tighter reports from then
   on), never retroactively changing a report already delivered. */
export function advanceSportingDirectorUpgrade(team) {
  const sd = ensureSportingDirector(team);
  if (!sd.upgrading) return { team: { ...team, sportingDirector: sd }, arrival: null };
  const rem = sd.upgrading.remaining - 1;
  if (rem > 0) return { team: { ...team, sportingDirector: { ...sd, upgrading: { ...sd.upgrading, remaining: rem } } }, arrival: null };
  const newLevel = clamp(sd.level + sd.upgrading.gain, 0, 99);
  return { team: { ...team, sportingDirector: { level: newLevel, upgrading: null } }, arrival: { newLevel } };
}

export const SCOUT_OUT_OF_CATEGORY_COST = 10000;

export function canAffordScoutMission(team, riderCategoryKey) {
  if (riderCategoryKey === team.categoryKey) return true;
  return (team.budget ?? 0) >= SCOUT_OUT_OF_CATEGORY_COST;
}

export function activeScoutSlotsUsed(team) {
  return (team.scoutingMissions || []).length;
}

export function canStartScoutMission(team, riderId, riderCategoryKey) {
  const tier = sportingDirectorTierFor(ensureSportingDirector(team).level);
  if (activeScoutSlotsUsed(team) >= tier.slots) return false;
  if ((team.scoutingMissions || []).some((m) => m.riderId === riderId)) return false;
  return canAffordScoutMission(team, riderCategoryKey);
}

export function startScoutMission(team, rider, riderCategoryKey) {
  const tier = sportingDirectorTierFor(ensureSportingDirector(team).level);
  const cost = riderCategoryKey === team.categoryKey ? 0 : SCOUT_OUT_OF_CATEGORY_COST;
  const mission = { riderId: rider.id, riderName: rider.name, categoryKey: riderCategoryKey, weeksRemaining: tier.weeksPerReport, totalWeeks: tier.weeksPerReport };
  return {
    ...team,
    budget: (team.budget ?? 0) - cost,
    scoutingMissions: [...(team.scoutingMissions || []), mission],
  };
}

export function cancelScoutMission(team, riderId) {
  return { ...team, scoutingMissions: (team.scoutingMissions || []).filter((m) => m.riderId !== riderId) };
}

/** Called once a week (race week or rest week alike — scouting doesn't
 * pause any more than the market does). Missions that reach zero
 * weeks remaining produce a finished report and drop off the active
 * list; everything else just ticks down. If the Sporting Director
 * levelled up mid-mission, weeksPerReport already reflects the new,
 * faster tier by the time this runs, since the tier is read fresh off
 * the team's CURRENT level every time a mission is started or
 * advances, never frozen at whatever it was when the mission began. */
export function advanceScoutMissions(team, findRiderByIdAndCategory) {
  const missions = team.scoutingMissions || [];
  if (!missions.length) return { team, completed: [] };
  const completed = [];
  const remaining = [];
  missions.forEach((m) => {
    const rem = m.weeksRemaining - 1;
    if (rem > 0) { remaining.push({ ...m, weeksRemaining: rem }); return; }
    const rider = findRiderByIdAndCategory(m.riderId, m.categoryKey);
    if (rider) completed.push({ mission: m, rider });
  });
  let scoutReports = { ...(team.scoutReports || {}) };
  completed.forEach(({ mission, rider }) => {
    scoutReports[rider.id] = generateScoutReport(rider, team, scoutReports[rider.id], mission.categoryKey);
  });
  return { team: { ...team, scoutingMissions: remaining, scoutReports }, completed };
}

/** A repeat report on the same rider tightens the existing range
 * instead of starting fresh — narrower each time, floor of ±2 so
 * there's always a sliver of doubt even at max investment, matching
 * "you basically know the number" rather than "you know it outright". */
export function generateScoutReport(rider, team, priorReport, categoryKey = null) {
  const tier = sportingDirectorTierFor(ensureSportingDirector(team).level);
  const truePotential = rider.pa ?? rider.potential ?? overallRating(rider);
  const priorReportsCount = priorReport?.reportsCount ?? 0;
  const halfWidth = Math.max(2, Math.round(tier.initialHalfWidth * Math.pow(0.62, priorReportsCount)));
  const lo = clamp(Math.round(truePotential - halfWidth), 1, 100);
  const hi = clamp(Math.round(truePotential + halfWidth), 1, 100);
  return {
    riderName: rider.name,
    categoryKey: categoryKey ?? priorReport?.categoryKey ?? null,
    potentialRange: [lo, hi],
    reportsCount: priorReportsCount + 1,
    moraleValue: rider.morale ?? 60,
    moraleSeason: team.seasonNumberForScouting ?? null,
    attributeHints: buildAttributeHints(rider, tier),
  };
}

const ATTRIBUTE_LABELS = {
  tecnica: "su técnica", ritmo: "su ritmo", adelantamientos: "los adelantamientos",
  mental: "la cabeza", adaptabilidad: "la adaptabilidad", fisico: "el físico",
};
const ATTRIBUTE_KEYS = Object.keys(ATTRIBUTE_LABELS);

const STRONG_PHRASES = {
  precise: (label) => `${cap(label)} es su punto fuerte, muy por encima de la media.`,
  vague: (label) => `Dicen que destaca en algo relacionado con ${label}.`,
};
const WEAK_PHRASES = {
  precise: (label) => `${cap(label)} es claramente su punto débil.`,
  vague: (label) => `Parece flojear en algo, quizá relacionado con ${label}.`,
};
const GENERIC_PHRASES = ["Parece tener margen de mejora.", "Un piloto correcto, sin nada que destaque especialmente.", "Cuesta sacar conclusiones claras todavía."];

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** Precision (how likely the hint is to be TRUE, not just how it's
 * worded) scales with tier — Muy bajo can occasionally point at the
 * wrong attribute entirely, Muy alto essentially never does. Wording
 * also gets vaguer at low tiers, on top of sometimes being wrong. */
function buildAttributeHints(rider, tier) {
  const values = ATTRIBUTE_KEYS.map((k) => ({ key: k, value: rider[k] ?? 50 }));
  const sorted = [...values].sort((a, b) => b.value - a.value);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const tierIndex = SPORTING_DIRECTOR_TIERS.indexOf(tier);
  const accuracy = 0.55 + tierIndex * 0.11; // Muy bajo ~0.55, Muy alto ~0.99
  const isPrecise = tierIndex >= 3; // Alto/Muy alto word it plainly; below that, vague wording
  const hints = [];
  [{ pick: strongest, phrases: STRONG_PHRASES }, { pick: weakest, phrases: WEAK_PHRASES }].forEach(({ pick: p, phrases }) => {
    const correct = Math.random() < accuracy;
    const attr = correct ? p.key : pick(ATTRIBUTE_KEYS.filter((k) => k !== p.key));
    hints.push(isPrecise ? phrases.precise(ATTRIBUTE_LABELS[attr]) : phrases.vague(ATTRIBUTE_LABELS[attr]));
  });
  if (tierIndex === 0 && Math.random() < 0.3) hints.push(pick(GENERIC_PHRASES));
  return hints;
}

/** What the AI sees instead of a rider's real potential when
 * evaluating someone outside its own roster — never the true number,
 * always the same kind of noisy estimate the player would get with an
 * equivalent Sporting Director tier, so the AI can misjudge a
 * prospect exactly as easily as the player can. Deliberately NOT
 * persisted anywhere (no scouting missions, no reports to manage) —
 * recomputed fresh, cheaply, every time it's needed. */
export function aiPerceivedPotential(rider, scoutingTeam) {
  const truePotential = rider.pa ?? rider.potential ?? overallRating(rider);
  const tier = sportingDirectorTierFor(ensureSportingDirector(scoutingTeam).level);
  const noise = (Math.random() * 2 - 1) * tier.initialHalfWidth * 0.6;
  return clamp(Math.round(truePotential + noise), 1, 100);
}

/** Same idea as aiPerceivedPotential, for morale — a team sizing up
 * someone else's rider doesn't have a locker-room read on their mood
 * either, unless they've actually gone to the trouble of scouting
 * them (see generateScoutReport's own moraleValue, which — for the
 * player specifically — is exact once scouted). The AI never keeps
 * its own scout reports around, so this noisy estimate is all it ever
 * gets, every time, exactly like the player would see with an
 * equivalent tier and no completed report yet. */
export function aiPerceivedMorale(rider, scoutingTeam) {
  const trueMorale = rider.morale ?? 60;
  const tier = sportingDirectorTierFor(ensureSportingDirector(scoutingTeam).level);
  const noise = (Math.random() * 2 - 1) * tier.initialHalfWidth * 0.8;
  return clamp(Math.round(trueMorale + noise), 1, 100);
}

/** The single point every AI-vs-outside-candidate evaluation should go
 * through before scoring/gating a rider who ISN'T currently on the
 * evaluating team's own roster — scoreCandidateForTeam/wouldRiderJoin/
 * passesCrossoverGate all read rider.pa/rider.potential/rider.morale
 * directly with no idea whose team is asking, so the noise has to be
 * baked into the rider object itself beforehand. A rider already on
 * the evaluating team is passed through untouched — a team knows its
 * own riders completely, no scouting needed. */
export function perceivedRiderForAI(rider, evaluatingTeam) {
  if ((evaluatingTeam.riders || []).some((r) => r.id === rider.id)) return rider;
  const perceivedPotential = aiPerceivedPotential(rider, evaluatingTeam);
  return { ...rider, pa: perceivedPotential, potential: perceivedPotential, morale: aiPerceivedMorale(rider, evaluatingTeam) };
}

/** Called once per season transition, for every team: a morale reading
 * is only trustworthy for the season it was taken in — carrying it
 * forward would mean "she was happy 10 seasons ago" still showing up
 * as if it meant something today. The potential range and attribute
 * hints are NOT touched here; those don't go stale the way a mood
 * does. */
export function expireStaleScoutMorale(team) {
  const reports = team.scoutReports;
  if (!reports || !Object.keys(reports).length) return team;
  const next = {};
  Object.entries(reports).forEach(([riderId, report]) => {
    next[riderId] = { ...report, moraleValue: null };
  });
  return { ...team, scoutReports: next };
}
