import { AREA_BASE, BIKE_AREA_KEYS } from "../data/bikeAreas.js";
import { clamp, randInt } from "./random.js";

export function bikeAvg(bike) {
  return BIKE_AREA_KEYS.reduce((s, k) => s + bike[k], 0) / BIKE_AREA_KEYS.length;
}

/* ======================================================================
   TEAM R&D STATE — techBase (hidden), factory level, staff level.
   ======================================================================
   Every team has a hidden Base Tecnológica per area — the accumulated
   engineering knowledge behind the visible bike. The bike itself is just
   this season's expression of that knowledge (see rolloverBike). Older
   save files won't have techBase/factory/staff yet, so `ensureRD` fills
   in sensible defaults from what IS on the team without ever mutating
   the team in place — callers persist the result themselves. */
export function ensureRD(team) {
  const rawTechBase = team.techBase || {};
  const techBase = {};
  BIKE_AREA_KEYS.forEach((k) => {
    techBase[k] = rawTechBase[k] != null
      ? clamp(rawTechBase[k], 0, 99)
      : clamp(Math.round((team.bike?.[k] ?? 60) * 0.85), 1, 99);
  });
  const isBig = team.tier === "Fábrica" || team.tier === "Puntero";
  const factory = team.factory || { level: isBig ? 55 : 35, upgrading: null };
  const staff = team.staff || { level: isBig ? 50 : 35, upgrading: null };
  return { techBase, factory, staff };
}

/* Technical capacity: how much R&D a team can run at once. Now driven
   entirely by Factory level, Staff level and sporting prestige (the old
   "budget ratio" bonus is gone — capacity is an infrastructure property,
   not a cashflow one). `liveBudget` is accepted for call-site
   compatibility but no longer used in the formula. */
export function computeTechCapacity(team, liveBudget) {
  const { factory, staff } = ensureRD(team);
  const tierBase = (team.tier === "Fábrica" || team.tier === "Puntero") ? 60 : 45;
  const factoryBonus = Math.round(factory.level * 0.55);
  const staffBonus = Math.round(staff.level * 0.35);
  const prestigeBonus = Math.round(((team.facilitiesRating ?? 60) - 60) * 0.3);
  return clamp(tierBase + factoryBonus + staffBonus + prestigeBonus, 40, 220);
}

export function usedCapacity(team) {
  return (team.activeProjects || []).reduce((s, p) => s + p.capacity, 0);
}

/* Non-linear R&D cost curve: cheap/fast/high-yield near the bottom,
   brutally expensive/slow/marginal near the cap (99). `currentLevel` is
   the bike's current value for development projects, or the team's
   hidden Base Tecnológica for research projects. Staff speeds projects
   up and improves their yield; Staff + Factory + sporting prestige all
   reduce risk — the best-run teams can attempt more ambitious projects
   more safely than a small team chasing the same gain. */
export function projectSpec(area, currentLevel, kind, scale, team) {
  const cfg = AREA_BASE[area];
  const t = clamp(currentLevel, 0, 99) / 99;
  const difficulty = Math.pow(t, 2.3);
  const { factory, staff } = team ? ensureRD(team) : { factory: { level: 40 }, staff: { level: 40 } };

  const moneyMult = 1 + difficulty * 11;
  const money = Math.round(cfg.money * moneyMult * scale);

  const gpBase = clamp(Math.round(2 + difficulty * 7), 2, 9);
  const gp = clamp(gpBase - Math.round(staff.level / 35), 1, 9);

  const capacity = kind === "dev" ? cfg.devCap : cfg.resCap;

  const gainBase = kind === "dev"
    ? clamp(Math.round(7 * (1 - difficulty)) + 1, 1, 8)
    : clamp(Math.round(9 * (1 - difficulty)) + 1, 1, 10);
  const gain = Math.round(gainBase * (1 + staff.level * 0.0025));

  const prestige = team?.facilitiesRating ?? 60;
  const failChance = clamp(
    0.05 + difficulty * 0.35 - staff.level * 0.0022 - factory.level * 0.0012 - clamp((prestige - 60) * 0.001, -0.05, 0.05),
    0.03, 0.5
  );

  return { money, gp, capacity, gain, failChance };
}

/* A project's risk never produces a negative result — only how much of
   the expected gain actually lands: completo (100%), parcial (~80%),
   limitado (~50%), or fallo técnico (~12%, but never 0). */
function resolveProjectOutcome(expectedGain, riskChance) {
  if (Math.random() >= riskChance) return { gain: expectedGain, tier: "completo" };
  const roll = Math.random();
  if (roll < 0.5) return { gain: Math.max(1, Math.round(expectedGain * 0.8)), tier: "parcial" };
  if (roll < 0.85) return { gain: Math.max(1, Math.round(expectedGain * 0.5)), tier: "limitado" };
  return { gain: Math.max(1, Math.round(expectedGain * 0.12)), tier: "fallo técnico" };
}

/* Can `team` afford and fit a new project of `kind` in `area` right now?
   Returns the project spec if so, or null if blocked by capacity, budget,
   or an already-running project of the same kind+area. */
export function canStartProject(team, area, kind, budgetAvailable, scale) {
  const alreadyActive = (team.activeProjects || []).some((p) => p.area === area && p.kind === kind);
  if (alreadyActive) return null;
  const { techBase } = ensureRD(team);
  const currentLevel = kind === "dev" ? team.bike[area] : techBase[area];
  const spec = projectSpec(area, currentLevel, kind, scale, team);
  const cap = computeTechCapacity(team, budgetAvailable);
  const free = cap - usedCapacity(team);
  if (spec.capacity > free) return null;
  if (spec.money > budgetAvailable) return null;
  return spec;
}

export function startProjectOnTeam(team, area, kind, spec) {
  const project = { area, kind, remaining: spec.gp, totalGp: spec.gp, capacity: spec.capacity, gain: spec.gain, failChance: spec.failChance };
  return { ...team, activeProjects: [...(team.activeProjects || []), project] };
}

/* Ticks every active project on `team` down by one race. Finished
   projects resolve success/partial/limited/failed and apply their
   effect:
     - Development raises the current bike value in that area AND banks
       ~20-25% of the gain permanently into the hidden Base Tecnológica —
       developing is never wasted effort, it always leaves some lasting
       knowledge behind.
     - Research never touches the current bike; it goes straight into the
       Base Tecnológica, preparing next season's bike. */
export function advanceTeamProjects(team) {
  const { techBase: baseTechBase } = ensureRD(team);
  const arrivals = [];
  const remaining = [];
  const bike = { ...team.bike };
  const techBase = { ...baseTechBase };
  (team.activeProjects || []).forEach((p) => {
    const rem = p.remaining - 1;
    if (rem > 0) { remaining.push({ ...p, remaining: rem }); return; }
    const { gain: actualGain, tier } = resolveProjectOutcome(p.gain, p.failChance);
    if (p.kind === "dev") {
      bike[p.area] = clamp(bike[p.area] + actualGain, 1, 99);
      const permanentGain = Math.round(actualGain * (0.20 + Math.random() * 0.05));
      techBase[p.area] = clamp(techBase[p.area] + permanentGain, 0, 99);
    } else {
      techBase[p.area] = clamp(techBase[p.area] + actualGain, 0, 99);
    }
    arrivals.push({ area: p.area, kind: p.kind, success: tier === "completo", tier, gain: actualGain });
  });
  return { team: { ...team, bike, techBase, activeProjects: remaining }, arrivals };
}

/* AI R&D strategy: title contenders push development early, then pivot hard
   to research once the title looks safe; teams with no realistic chance
   gradually give up on this season and invest in next year instead; small
   teams without a shot at contention keep chasing short-term development. */
export function aiConsiderProject(team, ctx) {
  const { techBase } = ensureRD(team);
  const cap = computeTechCapacity(team, team.budget);
  const free = cap - usedCapacity(team);
  if (free < 8) return { ...team, techBase };
  if (Math.random() > 0.35) return { ...team, techBase }; // don't act every single race

  const contending = ctx.position <= Math.max(2, Math.ceil(ctx.totalTeams / 3));
  const secondHalf = ctx.roundIndex >= ctx.totalRounds / 2;
  let researchChance;
  if (contending && !secondHalf) researchChance = 0.15;
  else if (contending && secondHalf) researchChance = 0.7;
  else if (!contending && secondHalf) researchChance = 0.55;
  else researchChance = 0.25;
  const kind = Math.random() < researchChance ? "research" : "dev";

  const areas = BIKE_AREA_KEYS
    .filter((a) => !(team.activeProjects || []).some((p) => p.area === a && p.kind === kind))
    .sort((a, b) => (kind === "dev" ? team.bike[a] - team.bike[b] : techBase[a] - techBase[b]));

  for (const area of areas) {
    const currentLevel = kind === "dev" ? team.bike[area] : techBase[area];
    const spec = projectSpec(area, currentLevel, kind, ctx.scale, team);
    if (spec.capacity <= free && spec.money <= (team.budget || 0)) {
      const started = startProjectOnTeam({ ...team, techBase }, area, kind, spec);
      return { ...started, budget: (team.budget || 0) - spec.money };
    }
  }
  return { ...team, techBase };
}

/* ======================================================================
   FACTORY & STAFF — single overall level each (0-99), upgraded by
   spending money and waiting several races, with escalating cost so
   reaching the top is a genuine long-term investment. Both are gated
   only by budget + time (NOT by the shared technical capacity, which
   stays exclusively a Desarrollo/Investigación resource).
   ====================================================================== */
function facilityUpgradeSpec(level, kind, scale) {
  const t = clamp(level, 0, 99) / 99;
  const difficulty = Math.pow(t, 2.1);
  const baseMoney = kind === "factory" ? 220000 : 170000;
  const money = Math.round(baseMoney * (1 + difficulty * 9) * (scale || 1));
  const gp = clamp(Math.round(3 + difficulty * 9), 3, 14);
  const gain = clamp(Math.round(9 * (1 - difficulty)) + 3, 4, 12);
  return { money, gp, gain };
}

export function factoryUpgradeSpec(team, scale) {
  const { factory } = ensureRD(team);
  return facilityUpgradeSpec(factory.level, "factory", scale);
}

export function staffUpgradeSpec(team, scale) {
  const { staff } = ensureRD(team);
  return facilityUpgradeSpec(staff.level, "staff", scale);
}

export function canStartFacilityUpgrade(team, kind, budgetAvailable, scale) {
  const { factory, staff } = ensureRD(team);
  const facility = kind === "factory" ? factory : staff;
  if (facility.upgrading) return null;
  if (facility.level >= 99) return null;
  const spec = facilityUpgradeSpec(facility.level, kind, scale);
  if (spec.money > budgetAvailable) return null;
  return spec;
}

export function startFacilityUpgrade(team, kind, spec) {
  const { factory, staff } = ensureRD(team);
  const upgrading = { remaining: spec.gp, totalGp: spec.gp, gain: spec.gain };
  return {
    ...team,
    factory: kind === "factory" ? { ...factory, upgrading } : factory,
    staff: kind === "staff" ? { ...staff, upgrading } : staff,
  };
}

/* Ticks factory/staff upgrades down by one race, same cadence as R&D
   projects. Returns the updated team plus a list of {kind, gain,
   newLevel} for anything that just completed. */
export function advanceFacilityUpgrades(team) {
  const { factory, staff } = ensureRD(team);
  const arrivals = [];
  function tick(facility, kind) {
    if (!facility.upgrading) return facility;
    const rem = facility.upgrading.remaining - 1;
    if (rem > 0) return { ...facility, upgrading: { ...facility.upgrading, remaining: rem } };
    const newLevel = clamp(facility.level + facility.upgrading.gain, 0, 99);
    arrivals.push({ kind, gain: facility.upgrading.gain, newLevel });
    return { level: newLevel, upgrading: null };
  }
  const nextFactory = tick(factory, "factory");
  const nextStaff = tick(staff, "staff");
  return { team: { ...team, factory: nextFactory, staff: nextStaff }, arrivals };
}

/* AI investment in its own infrastructure: rare (this is a long-term,
   deliberate decision, not a weekly one) and always tops up whichever of
   Factory/Staff is currently behind the other, keeping AI teams
   reasonably balanced instead of maxing one stat arbitrarily. */
export function aiConsiderFacilityUpgrade(team, scale) {
  const { factory, staff } = ensureRD(team);
  const normalized = { ...team, factory, staff };
  if (Math.random() > 0.05) return normalized;
  const kind = factory.level <= staff.level ? "factory" : "staff";
  const spec = canStartFacilityUpgrade(normalized, kind, normalized.budget, scale);
  if (!spec) return normalized;
  const started = startFacilityUpgrade(normalized, kind, spec);
  return { ...started, budget: (normalized.budget || 0) - spec.money };
}

/* ======================================================================
   NEW SEASON — the bike is rebuilt from the hidden Base Tecnológica plus
   Factory/Staff quality and a small random variation (±1). The old
   "55% current bike + 45% research" formula is gone entirely. Evolution
   is smoothed so a team never swings wildly in one season: normally
   -3 to +4 per area, with bigger jumps only when the Base Tecnológica has
   pulled far enough ahead to justify it (i.e. an extraordinary season of
   research). */
export function rolloverBike(team) {
  const { techBase, factory, staff } = ensureRD(team);
  const newBike = {};
  BIKE_AREA_KEYS.forEach((k) => {
    const factoryBonus = Math.round(factory.level * 0.12);
    const staffBonus = Math.round(staff.level * 0.08);
    const noise = randInt(-1, 1);
    const target = clamp(techBase[k] + factoryBonus + staffBonus + noise, 1, 99);
    const rawDelta = target - team.bike[k];
    const maxGain = rawDelta > 4 ? Math.min(rawDelta, 9) : 4;
    const delta = clamp(rawDelta, -3, maxGain);
    newBike[k] = clamp(team.bike[k] + delta, 1, 99);
  });
  return {
    ...team,
    bike: newBike,
    techBase,
    factory,
    staff,
    activeProjects: [],
  };
}
