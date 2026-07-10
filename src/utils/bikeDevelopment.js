import { AREA_BASE, BIKE_AREA_KEYS } from "../data/bikeAreas.js";
import { clamp, randInt } from "./random.js";

export function bikeAvg(bike) {
  return BIKE_AREA_KEYS.reduce((s, k) => s + bike[k], 0) / BIKE_AREA_KEYS.length;
}

/* Technical capacity: how much R&D a team can run at once. Driven by team
   tier (facilities/engineer headcount proxy), a facilities/prestige rating
   fixed at team creation (from their starting bike quality), and — for the
   player only, since AI teams' finances aren't individually simulated —
   how their budget has evolved versus where they started. */


export function computeTechCapacity(team, liveBudget) {
  const tierBase = (team.tier === "Fábrica" || team.tier === "Puntero") ? 75 : 58;
  const facilitiesBonus = Math.round(((team.facilitiesRating ?? 60) - 60) * 0.35);
  let budgetBonus = 0;
  if (liveBudget != null && team.baseBudget) {
    const ratio = liveBudget / team.baseBudget;
    budgetBonus = clamp(Math.round((ratio - 1) * 35), -18, 22);
  }
  return clamp(tierBase + facilitiesBonus + budgetBonus, 40, 130);
}


export function usedCapacity(team) {
  return (team.activeProjects || []).reduce((s, p) => s + p.capacity, 0);
}

/* Non-linear R&D cost curve: cheap/fast/high-yield near the bottom,
   brutally expensive/slow/marginal near the cap (99). `currentLevel` is
   the bike's current value for development projects, or the accumulated
   research value for research projects — each area gets harder to push
   further on its own curve. */


export function projectSpec(area, currentLevel, kind, scale) {
  const cfg = AREA_BASE[area];
  const t = clamp(currentLevel, 0, 99) / 99;
  const difficulty = Math.pow(t, 2.3);
  const moneyMult = 1 + difficulty * 11;
  const money = Math.round(cfg.money * moneyMult * scale);
  const gp = clamp(Math.round(2 + difficulty * 7), 2, 9);
  const capacity = kind === "dev" ? cfg.devCap : cfg.resCap;
  const gain = kind === "dev"
    ? clamp(Math.round(7 * (1 - difficulty)) + 1, 1, 8)
    : clamp(Math.round(9 * (1 - difficulty)) + 1, 1, 10);
  const failChance = clamp(0.03 + difficulty * 0.32, 0.03, 0.35);
  return { money, gp, capacity, gain, failChance };
}

/* Can `team` afford and fit a new project of `kind` in `area` right now?
   Returns the project spec if so, or null if blocked by capacity, budget,
   or an already-running project of the same kind+area. */


export function canStartProject(team, area, kind, budgetAvailable, scale) {
  const alreadyActive = (team.activeProjects || []).some((p) => p.area === area && p.kind === kind);
  if (alreadyActive) return null;
  const currentLevel = kind === "dev" ? team.bike[area] : team.research[area];
  const spec = projectSpec(area, currentLevel, kind, scale);
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

/* Ticks every active project on `team` down by one race. Finished projects
   resolve success/failure and apply their effect: development raises the
   current bike value in that area, research raises the banked research
   value used by next season's formula. Returns the updated team plus a
   list of {area, kind, success, gain} for anything that completed. */


export function advanceTeamProjects(team) {
  const arrivals = [];
  const remaining = [];
  const bike = { ...team.bike };
  const research = { ...team.research };
  (team.activeProjects || []).forEach((p) => {
    const rem = p.remaining - 1;
    if (rem > 0) { remaining.push({ ...p, remaining: rem }); return; }
    const failed = Math.random() < p.failChance;
    const actualGain = failed ? Math.max(0, Math.round(p.gain * (0.2 + Math.random() * 0.2))) : p.gain;
    if (p.kind === "dev") bike[p.area] = clamp(bike[p.area] + actualGain, 1, 99);
    else research[p.area] = clamp(research[p.area] + actualGain, 0, 99);
    arrivals.push({ area: p.area, kind: p.kind, success: !failed, gain: actualGain });
  });
  return { team: { ...team, bike, research, activeProjects: remaining }, arrivals };
}

/* AI R&D strategy: title contenders push development early, then pivot hard
   to research once the title looks safe; teams with no realistic chance
   gradually give up on this season and invest in next year instead; small
   teams without a shot at contention keep chasing short-term development. */


export function aiConsiderProject(team, ctx) {
  const cap = computeTechCapacity(team, team.budget);
  const free = cap - usedCapacity(team);
  if (free < 8) return team;
  if (Math.random() > 0.35) return team; // don't act every single race

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
    .sort((a, b) => (kind === "dev" ? team.bike[a] - team.bike[b] : team.research[a] - team.research[b]));

  for (const area of areas) {
    const currentLevel = kind === "dev" ? team.bike[area] : team.research[area];
    const spec = projectSpec(area, currentLevel, kind, ctx.scale);
    if (spec.capacity <= free && spec.money <= (team.budget || 0)) {
      const started = startProjectOnTeam(team, area, kind, spec);
      return { ...started, budget: (team.budget || 0) - spec.money };
    }
  }
  return team;
}

/* Runs one race for an AI-controlled team: banks simple race income,
   advances its projects, lets its R&D strategy consider starting something
   new, and updates rider career stats from the race result. */
/* Named real veteran test/wildcard riders who seed the permanent free-agent
   pool at the start of every game, alongside anyone who later loses their
   seat. Ages are set just under the forced retirement age so they're
   genuinely usable as substitutes for a few seasons before hanging up
   the leathers for good, same as in reality. */


export function rolloverBike(team) {
  const newBike = {};
  BIKE_AREA_KEYS.forEach((k) => {
    const val = Math.round(team.bike[k] * 0.55 + team.research[k] * 0.45 + randInt(-2, 2));
    newBike[k] = clamp(val, 1, 99);
  });
  return {
    ...team,
    bike: newBike,
    research: { aero: 0, chasis: 0, motor: 0, suspension: 0, electronica: 0 },
    activeProjects: [],
  };
}

