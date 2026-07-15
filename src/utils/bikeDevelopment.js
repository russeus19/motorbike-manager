import { AREA_BASE, AREA_PRIMARY_PAIR, AREA_SECONDARY_PAIR, BIKE_AREA_KEYS } from "../data/bikeAreas.js";
import { WAREHOUSE_BASE_COST } from "../data/warehouseParts.js";
import { clamp, pick, randInt } from "./random.js";
import { urgentWarehouseProduction, warehouseCost } from "./warehouseEngine.js";

// One warehouse part per development area — reused everywhere a package
// needs to know which physical stock it draws from.
export const AREA_TO_WAREHOUSE_PART = { motor: "motor", chasis: "chasis", aero: "carenado", electronica: "electronica", freno: "freno" };

/** A save created before "suspensión" was renamed to "freno" still has
 * `bike.suspension` instead of `bike.freno` — this silently migrates it
 * wherever a bike object is read, so an old save never produces NaN
 * instead of a real average/capacity. */
function migrateBike(bike) {
  if (!bike) return bike;
  if (bike.freno != null) return bike;
  if (bike.suspension == null) return bike;
  const { suspension, ...rest } = bike;
  return { ...rest, freno: suspension };
}

export function bikeAvg(bike) {
  const b = migrateBike(bike);
  return BIKE_AREA_KEYS.reduce((s, k) => s + (b[k] ?? 60), 0) / BIKE_AREA_KEYS.length;
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
  const project = { area, kind, remaining: spec.gp, totalGp: spec.gp, capacity: spec.capacity, gain: spec.gain, failChance: spec.failChance, money: spec.money };
  return { ...team, activeProjects: [...(team.activeProjects || []), project] };
}

/**
 * Whether a completed DEVELOPMENT package also hurts a related area, and
 * by how much — never guaranteed (a clean package with no downside at
 * all is a real possible outcome), rolled independently every time.
 * Both the chance of a downside happening AND how big it is shrink the
 * more thoroughly the project was run — better factory, better staff,
 * more money, more time — but nothing ever makes it literally
 * impossible; a rushed, cut-price project into an already-mature area
 * is the riskiest combination of all.
 *
 * Which area gets hit: 90% of the time it's the area's real engineering
 * pairing (data/bikeAreas.js's AREA_PRIMARY_PAIR — more power upsets
 * chassis balance, a new aero package changes braking stability...),
 * 10% of the time it's genuinely any other area at random, because nothing
 * on a bike is ever completely isolated from the rest.
 */
export function rollPackageDownside(area, gain, project, team) {
  const { factory, staff } = ensureRD(team);
  const infra = (factory.level + staff.level) / 2;
  const moneyFactor = clamp((project.money || 0) / (AREA_BASE[area].money * 3), 0, 1);
  const timeFactor = clamp((project.totalGp || 1) / 9, 0, 1);
  const investFactor = (moneyFactor + timeFactor) / 2;

  const downsideChance = clamp(0.55 - infra * 0.0035 - investFactor * 0.28, 0.05, 0.55);
  if (Math.random() > downsideChance) return null;

  const primary = AREA_PRIMARY_PAIR[area];
  const secondary = AREA_SECONDARY_PAIR[area];
  let downsideArea;
  if (Math.random() < 0.9) {
    downsideArea = primary;
  } else if (secondary && Math.random() < 0.5) {
    downsideArea = secondary;
  } else {
    const others = BIKE_AREA_KEYS.filter((a) => a !== area && a !== primary && a !== secondary);
    downsideArea = pick(others.length ? others : BIKE_AREA_KEYS.filter((a) => a !== area));
  }

  const magnitudeFraction = clamp(0.35 - infra * 0.0026 - investFactor * 0.2, 0.04, 0.35);
  const amount = Math.max(1, Math.round(gain * magnitudeFraction));
  return { area: downsideArea, amount };
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
  const techBase = { ...baseTechBase };
  const pendingPackages = [...(team.pendingPackages || [])];
  (team.activeProjects || []).forEach((p) => {
    const rem = p.remaining - 1;
    if (rem > 0) { remaining.push({ ...p, remaining: rem }); return; }
    const { gain: actualGain, tier } = resolveProjectOutcome(p.gain, p.failChance);
    if (p.kind === "dev") {
      // Permanent knowledge is always banked, whether this specific
      // package ends up installed or discarded later — developing is
      // never wasted effort.
      const permanentGain = Math.round(actualGain * (0.20 + Math.random() * 0.05));
      techBase[p.area] = clamp(techBase[p.area] + permanentGain, 0, 99);
      const downside = rollPackageDownside(p.area, actualGain, p, team);
      pendingPackages.push({
        id: `pkg-${p.area}-${Date.now()}-${Math.round(Math.random() * 100000)}`,
        area: p.area, gain: actualGain, tier,
        downsideArea: downside?.area ?? null, downsideAmount: downside?.amount ?? 0,
      });
      arrivals.push({ area: p.area, kind: "dev", success: tier === "completo", tier, gain: actualGain, pending: true });
    } else {
      techBase[p.area] = clamp(techBase[p.area] + actualGain, 0, 99);
      arrivals.push({ area: p.area, kind: "research", success: tier === "completo", tier, gain: actualGain });
    }
  });
  return { team: { ...team, techBase, activeProjects: remaining, pendingPackages }, arrivals };
}

/**
 * Installs an accepted pending package — applies its gain (and downside,
 * if any) to the current bike, retires whatever was in that slot before
 * with a partial refund, and consumes the two manufactured parts (one
 * per bike) it needed. Returns the team unchanged if there still aren't
 * enough parts in stock — the caller is expected to queue production
 * first (see App.jsx's installPackage / aiDecidePendingPackages below).
 */
export function installPendingPackage(team, packageId) {
  const pkg = (team.pendingPackages || []).find((p) => p.id === packageId);
  if (!pkg) return team;
  const part = AREA_TO_WAREHOUSE_PART[pkg.area];
  const wh = team.warehouse;
  if (!wh || (wh[part]?.stock ?? 0) < 2) return team;

  const refund = Math.round((WAREHOUSE_BASE_COST[part] || 0) * 0.32 * 2);
  const newWarehouse = { ...wh, [part]: { ...wh[part], stock: wh[part].stock - 2 } };
  const bike = { ...team.bike };
  bike[pkg.area] = clamp(bike[pkg.area] + pkg.gain, 1, 99);
  if (pkg.downsideArea) bike[pkg.downsideArea] = clamp(bike[pkg.downsideArea] - pkg.downsideAmount, 1, 99);
  const pendingPackages = (team.pendingPackages || []).filter((p) => p.id !== packageId);
  return { ...team, bike, warehouse: newWarehouse, budget: (team.budget || 0) + refund, pendingPackages };
}

/** Discards a pending package with no changes to the bike at all — the
 * money and time already spent on the R&D project itself are a sunk
 * cost either way (the permanent knowledge gain already happened in
 * advanceTeamProjects above), but nothing forces a team to actually
 * field a package that would hurt more than it helps. */
export function discardPendingPackage(team, packageId) {
  return { ...team, pendingPackages: (team.pendingPackages || []).filter((p) => p.id !== packageId) };
}

/**
 * The player approves a pending package. If both parts are already in
 * stock it installs immediately; otherwise it queues the production
 * needed (reusing the normal, non-urgent warehouse queue) and marks the
 * package as approved-and-waiting — see processApprovedPackages, which
 * finishes the job automatically the moment enough stock is ready.
 */
export function acceptPendingPackage(team, packageId, queueWarehouseProductionFn) {
  const pkg = (team.pendingPackages || []).find((p) => p.id === packageId);
  if (!pkg) return team;
  const part = AREA_TO_WAREHOUSE_PART[pkg.area];
  const stock = team.warehouse?.[part]?.stock ?? 0;
  if (stock >= 2) return installPendingPackage(team, packageId);

  const needed = 2 - stock;
  let warehouse = team.warehouse;
  for (let i = 0; i < needed; i++) warehouse = queueWarehouseProductionFn(warehouse, part);
  const pendingPackages = team.pendingPackages.map((p) => (p.id === packageId ? { ...p, approved: true } : p));
  return { ...team, warehouse, pendingPackages };
}

/** Checked once per race for the player: any package already approved
 * and waiting on production installs itself the instant both parts are
 * ready in the warehouse — no need to come back and click anything a
 * second time. */
export function processApprovedPackages(team) {
  let current = team;
  (current.pendingPackages || []).filter((p) => p.approved).forEach((pkg) => {
    const part = AREA_TO_WAREHOUSE_PART[pkg.area];
    if ((current.warehouse?.[part]?.stock ?? 0) >= 2) current = installPendingPackage(current, pkg.id);
  });
  return current;
}

/**
 * AI teams don't get a review screen — they decide immediately: accept
 * a package whose net effect (gain minus a slightly risk-averse view of
 * the downside) is positive, queuing urgent production if the parts
 * aren't in stock yet rather than leaving it to linger forever; discard
 * anything that would do more harm than good.
 */
export function aiDecidePendingPackages(team, notifQueue, categoryKey, scale) {
  let current = team;
  (current.pendingPackages || []).slice().forEach((pkg) => {
    const netValue = pkg.gain - (pkg.downsideAmount || 0) * 1.15;
    if (netValue <= 0) {
      current = discardPendingPackage(current, pkg.id);
      return;
    }
    const part = AREA_TO_WAREHOUSE_PART[pkg.area];
    const stock = current.warehouse?.[part]?.stock ?? 0;
    if (stock < 2) {
      const needed = 2 - stock;
      let wh = current.warehouse;
      let budget = current.budget || 0;
      for (let i = 0; i < needed; i++) {
        const cost = warehouseCost(part, scale, true, current.factory?.level ?? 0);
        if (budget >= cost) { wh = urgentWarehouseProduction(wh, part); budget -= cost; }
      }
      current = { ...current, warehouse: wh, budget };
      return;
    }
    current = installPendingPackage(current, pkg.id);
  });
  return current;
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
