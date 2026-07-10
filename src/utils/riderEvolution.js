import { ATTRS, PHYSICAL_ATTRS } from "../data/attributes.js";
import { clamp, randInt } from "./random.js";
import { computeMarketValue, computeSalary } from "./riders.js";

export function ageBandRate(age, kind) {
  if (age <= 20) return kind === "physical" ? 4 : 3.5;
  if (age <= 25) return kind === "physical" ? 3 : 3;
  if (age <= 29) return kind === "physical" ? 1.5 : 1.8;
  if (age <= 33) return kind === "physical" ? 0 : 0.6;
  return kind === "physical" ? -1.5 : -0.5;
}


export function profileMultiplier(profile, age) {
  switch (profile) {
    case "explosivo": return age <= 23 ? 1.6 : age <= 27 ? 0.6 : 0.3;
    case "precoz": return age <= 21 ? 1.8 : age <= 25 ? 0.4 : 0.2;
    case "tardio": return age <= 24 ? 0.5 : age <= 30 ? 1.7 : 0.8;
    case "irregular": return 0.4 + Math.random() * 1.4;
    case "constante":
    default: return 1.0;
  }
}

/* Evolves one rider by a season: updates PA via small normal drift plus
   rare exceptional events, then grows/declines each attribute toward a
   ceiling derived from PA, age band, hidden growth profile, morale and
   team environment. Returns { rider, events } where events is a list of
   human-readable notable happenings (for narrative flavor). */


export function evolveRider(r, ctx) {
  const { seasonPoints = 0, wins = 0, fieldAvg = 0, teamBikeAvgVal = 70, idleMultiplier = 1 } = ctx;
  const events = [];

  let perf = 0;
  if (fieldAvg > 0) {
    if (seasonPoints > fieldAvg * 1.6) perf += 2;
    else if (seasonPoints > fieldAvg * 1.1) perf += 1;
    else if (seasonPoints < fieldAvg * 0.4) perf -= 1;
  }
  if (wins >= 3) perf += 1;
  else if (wins >= 1) perf += 0.5;

  const env = teamBikeAvgVal >= 82 ? 1 : teamBikeAvgVal <= 62 ? -1 : 0;
  const moraleFactor = r.morale >= 75 ? 1 : r.morale <= 30 ? -1 : 0;
  const stagnation = r.seasonsStagnant >= 3 ? -2 : r.seasonsStagnant >= 2 ? -1 : 0;
  const noiseSpan = r.growthProfile === "irregular" ? 2 : 1;
  const noise = randInt(-noiseSpan, noiseSpan);

  let normalDelta = clamp(Math.round((perf + env + moraleFactor + stagnation + noise) * idleMultiplier), -3, 3);
  let eventDelta = 0;
  let moraleDelta = Math.round(perf * 4) + Math.round((60 - r.morale) * 0.1);
  let fisicoHit = 0;
  let ritmoHit = 0;

  const isYoungExplosive = (r.growthProfile === "explosivo" || r.growthProfile === "precoz") && r.age <= 23;
  if (Math.random() < (isYoungExplosive ? 0.06 : 0.03) * idleMultiplier) {
    const d = randInt(4, 8);
    eventDelta += d;
    events.push(`Explosión de talento (+${d} potencial)`);
  } else if (Math.random() < (r.seasonsStagnant >= 2 ? 0.08 : 0.03)) {
    const d = randInt(3, 6);
    eventDelta -= d;
    events.push(`Estancamiento (-${d} potencial)`);
  }
  if (Math.random() < (r.morale <= 35 ? 0.10 : 0.04) * idleMultiplier) {
    const d = randInt(1, 2);
    eventDelta -= d;
    moraleDelta -= randInt(20, 30);
    events.push("Crisis de confianza");
  }
  if (r.isNewTeamThisSeason && Math.random() < 0.30) {
    if (Math.random() < 0.6) {
      const d = randInt(2, 5);
      eventDelta += d;
      events.push(`Adaptación inmediata a la nueva moto (+${d} potencial)`);
    } else {
      const d = randInt(2, 4);
      eventDelta -= d;
      events.push(`Problemas de adaptación al nuevo equipo (-${d} potencial)`);
    }
  }
  const injuryChance = (0.02 + (r.fisico < 60 ? 0.02 : 0) + (r.adelantamientos > 85 ? 0.01 : 0)) * idleMultiplier;
  if (Math.random() < injuryChance) {
    const d = randInt(3, 7);
    eventDelta -= d;
    fisicoHit = randInt(5, 15);
    ritmoHit = randInt(3, 10);
    events.push(`Lesión grave (-${d} potencial)`);
  }

  const newPA = clamp(r.pa + normalDelta + eventDelta, 1, 100);
  const newMorale = clamp(r.morale + moraleDelta, 0, 100);
  const profMult = profileMultiplier(r.growthProfile, r.age);
  const envMult = 0.85 + (teamBikeAvgVal / 100) * 0.3;
  const moraleMult = 0.7 + (newMorale / 100) * 0.6;

  const before = {};
  const next = { ...r, age: r.age + 1, seasonPoints: 0, pa: newPA, morale: newMorale };
  ATTRS.forEach((attr) => {
    before[attr.key] = r[attr.key];
    const kind = PHYSICAL_ATTRS.includes(attr.key) ? "physical" : "experience";
    const baseRate = ageBandRate(next.age, kind);
    const ceiling = clamp(newPA + (r.affinity?.[attr.key] ?? 0), 1, 100);
    const gap = ceiling - r[attr.key];
    const gapFactor = clamp(gap / 15, -1, 1);
    // Idle riders (free agents) still drift toward/away from their ceiling,
    // just much more slowly — never fully frozen, never at full pace either.
    let delta = Math.round(baseRate * profMult * gapFactor * moraleMult * envMult * idleMultiplier) + randInt(-1, 1);
    if (idleMultiplier < 1 && next.age >= 32 && delta >= 0 && gapFactor <= 0) delta = -randInt(0, 1);
    if (attr.key === "fisico") delta -= fisicoHit;
    if (attr.key === "ritmo") delta -= ritmoHit;
    next[attr.key] = clamp(r[attr.key] + delta, 20, 99);
  });

  const caBefore = ATTRS.reduce((s, a) => s + before[a.key], 0) / ATTRS.length;
  const caAfter = ATTRS.reduce((s, a) => s + next[a.key], 0) / ATTRS.length;
  next.seasonsStagnant = (caAfter - caBefore) <= 0.3 ? r.seasonsStagnant + 1 : 0;
  next.isNewTeamThisSeason = false;
  next.crashesThisSeason = 0;
  next.contractYears = Math.max(0, (r.contractYears ?? 1) - 1);
  next.marketValue = computeMarketValue(next, ctx.scale ?? 1);
  next.salary = computeSalary(next.marketValue);

  return { rider: next, events };
}


export function evolveRoster(riders, ctxById) {
  const notable = [];
  const out = riders.map((r) => {
    const { rider, events } = evolveRider(r, ctxById[r.id] || {});
    if (events.length) notable.push({ name: r.name, events });
    return rider;
  });
  return { riders: out, notable };
}

/* Build the end-of-season transfer market: same-category rivals (capped
   by finishing position), promotion candidates from the category below
   (if any, pulled from its live simulated grid), and frozen free agents
   (always available, any position). */

