import { clamp, randInt } from "./random.js";
import { overallRating } from "./riders.js";
import { evaluateRiderSeason } from "./seasonHistory.js";

/**
 * The market's decision-making brain — replaces the old "renew almost
 * everyone, then fill whatever's left with the best-rated candidate"
 * approach with something that actually weighs many factors together,
 * the way a real team's management would. Nothing here decides a
 * signing on a single number; every exported function returns a score
 * or probability meant to be combined with the others, never used
 * alone (see App.jsx's runSeasonTransition for how they're actually
 * chained together into one season-end market pass).
 */

/* ------------------------------------------------------------------ */
/* Personality — every team and every rider has a stable "type" that   */
/* never changes for them, derived deterministically from their own id */
/* (no new persisted field needed, and it survives save/load exactly   */
/* like everything else derived from an id). This is what makes two    */
/* teams value the exact same rider differently, and what makes the    */
/* exact same rider accept an offer in one game and reject it in       */
/* another — the personality itself differs game to game because ids   */
/* are generated fresh each time.                                      */
/* ------------------------------------------------------------------ */

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const TEAM_PERSONALITIES = ["juventud", "experiencia", "rendimiento", "potencial"];
const RIDER_PERSONALITIES = ["titulos", "salario", "estabilidad", "protagonismo"];

export function teamPersonality(team) {
  return TEAM_PERSONALITIES[hashString(String(team.id ?? team.name ?? "")) % TEAM_PERSONALITIES.length];
}

export function riderPersonality(rider) {
  return RIDER_PERSONALITIES[hashString(String(rider.id ?? rider.name ?? "")) % RIDER_PERSONALITIES.length];
}

/* ------------------------------------------------------------------ */
/* Fase 1 — Continuidad: cuánto quiere el EQUIPO mantener al piloto.    */
/* ------------------------------------------------------------------ */

/**
 * @param ctx { points, teammatePoints, tier, riderExpectationVerdict,
 *              teamExpectationVerdict, crashes, injuriesThisSeason }
 *   tier comes from teamExpectationTier(team); the two *Verdict values
 *   from evaluateSeasonVsExpectation (utils/teamExpectations.js) — one
 *   comparing the rider's own finish against their personal
 *   expectation tier, one comparing the team's constructor finish
 *   against its own.
 */
export function computeContinuityScore(rider, team, ctx) {
  const {
    points = 0, teammatePoints = null, tier = "midfield",
    riderExpectationVerdict = null, teamExpectationVerdict = null,
    crashes = 0, injuriesThisSeason = 0,
  } = ctx;

  let score = 52;

  // Resultados deportivos: el factor de mayor peso, tal como se pide.
  const evalLabel = evaluateRiderSeason(rider, points, teammatePoints ?? points, tier, crashes);
  score += { "Excelente": 26, "Buena": 13, "Aceptable": 0, "Mala": -17, "Desastrosa": -32 }[evalLabel] ?? 0;

  // Cumplimiento de la expectativa personal del piloto.
  if (riderExpectationVerdict === "extraordinaria") score += 9;
  else if (riderExpectationVerdict === "sobresaliente") score += 4;
  else if (riderExpectationVerdict === "por_debajo") score -= 6;
  else if (riderExpectationVerdict === "decepcionante") score -= 13;

  // Cumplimiento de la expectativa del propio equipo — un proyecto que
  // va claramente mal en su conjunto rota más su plantilla, incluso a
  // pilotos que individualmente no son el problema.
  if (teamExpectationVerdict === "decepcionante") score -= 6;
  else if (teamExpectationVerdict === "por_debajo") score -= 2;
  else if (teamExpectationVerdict === "extraordinaria") score += 3;

  // Prestigio: un piloto prestigioso aporta reputación al proyecto, así
  // que el equipo lucha más por retenerlo. Pero si el propio equipo ha
  // crecido en prestigio muy por encima del piloto, empieza a mirar
  // hacia arriba en vez de conformarse.
  const riderPrestige = rider.prestige ?? 60;
  const teamPrestige = team.prestige ?? 60;
  score += (riderPrestige - 80) * 0.07;
  if (teamPrestige - riderPrestige >= 44) score -= 7;

  // Edad y potencial — apostar por el futuro de un piloto joven con
  // recorrido, o empezar a dudar de uno que ya no tiene margen de mejora.
  const upside = (rider.pa ?? overallRating(rider)) - overallRating(rider);
  if (rider.age <= 23 && upside >= 12) score += 10;
  else if (upside >= 18) score += 5;
  if (rider.age >= 33) score -= 8;
  if (rider.age >= 37) score -= 10;

  // Evolución durante la temporada — aproximada por el margen de mejora
  // que todavía le queda (un piloto que ya toca su techo aporta menos
  // margen de sorpresa futura que uno que sigue creciendo).
  if (upside <= 3 && rider.age >= 28) score -= 3;

  // Moral.
  score += ((rider.morale ?? 60) - 55) * 0.18;

  // Salario y coste/rendimiento — caro y flojo pesa mucho más que caro
  // y brillante.
  if (team.budget && rider.salary) {
    const salaryShare = rider.salary / Math.max(1, team.budget);
    if (salaryShare > 0.35 && (evalLabel === "Mala" || evalLabel === "Desastrosa")) score -= 10;
    else if (salaryShare > 0.5) score -= 4;
  }

  // Caídas y lesiones.
  if (crashes >= 8) score -= 5;
  if (crashes >= 14) score -= 5;
  if (injuriesThisSeason >= 2) score -= 5;

  // Diferencia respecto al compañero — ya influye vía evaluateRiderSeason,
  // pero un dominio muy claro merece un empujón adicional propio.
  if (Number.isFinite(teammatePoints)) {
    if (points > teammatePoints * 1.6 && points > 20) score += 6;
    else if (points < teammatePoints * 0.4 && teammatePoints > 20) score -= 6;
  }

  return Math.round(clamp(score, 0, 100));
}

/** Fase 2 — probabilidad de renovación a partir de la puntuación de
 * continuidad, con las bandas indicadas y un pequeño componente
 * aleatorio para que dos temporadas idénticas nunca se resuelvan igual. */
export function continuityToRenewalProbability(score) {
  let base;
  if (score >= 90) base = 0.94;
  else if (score >= 80) base = 0.85;
  else if (score >= 70) base = 0.72;
  else if (score >= 60) base = 0.55;
  else if (score >= 50) base = 0.4;
  else if (score >= 40) base = 0.27;
  else if (score >= 30) base = 0.15;
  else base = 0.05;
  const noise = (Math.random() - 0.5) * 0.12;
  return clamp(base + noise, 0.02, 0.97);
}

/** Whether the RIDER's own side wants to stay, independent of what the
 * team decided — a good season doesn't guarantee loyalty (section
 * "Renovaciones automáticas"). Riders who chase titles or the number-1
 * seat are far more restless than ones who value stability. */
export function riderWantsToStay(rider, team, categoryKey) {
  const personality = riderPersonality(rider);
  let chance = 0.78;
  const riderPrestige = rider.prestige ?? 60;
  const teamPrestige = team.prestige ?? 60;
  const gap = riderPrestige - teamPrestige;
  if (gap >= 50) chance -= 0.35; // clearly outgrown the project
  else if (gap >= 24) chance -= 0.15;
  if (personality === "titulos" && gap >= 20) chance -= 0.15;
  if (personality === "estabilidad") chance += 0.15;
  if (personality === "protagonismo" && team.riders?.some((r) => r.id !== rider.id && (r.prestige ?? 0) > riderPrestige + 20)) chance -= 0.15;
  if ((rider.moraleState?.tier ?? "normal") === "muy_baja") chance -= 0.2;
  else if ((rider.moraleState?.tier ?? "normal") === "baja") chance -= 0.1;
  return Math.random() < clamp(chance, 0.15, 0.97);
}

/* ------------------------------------------------------------------ */
/* Fase 3 — Valoración de candidatos para cubrir una vacante.           */
/* ------------------------------------------------------------------ */

/** How pulling-power a team has when it goes shopping — used purely to
 * order which team gets first pick of the available pool this season,
 * the mechanism behind the "efecto dominó": the most attractive teams
 * see the deepest pool, and whatever's left cascades down to the rest. */
export function teamPullingPower(team, categoryKey) {
  const catWeight = { motogp: 3, moto2: 1.6, moto3: 1 }[categoryKey] ?? 1;
  return (team.prestige ?? 60) * catWeight + (team.expectation ? Math.max(0, 20 - team.expectation.min) : 0);
}

/**
 * @param ctx { categoryKey, teamBudget }
 * Scores a candidate purely from the buying team's point of view —
 * personality-weighted, so two teams genuinely disagree about the same
 * rider.
 */
export function scoreCandidateForTeam(rider, team, ctx) {
  const { teamBudget } = ctx;
  const ca = overallRating(rider);
  const personality = teamPersonality(team);
  // Prestigio y resultados recientes son el criterio dominante — un
  // piloto de gran potencial pero sin resultados nunca debe adelantar a
  // uno con un historial demostrado (campeón, Top 5...).
  let score = ca * 0.45;
  score += (rider.prestige ?? 60) * 0.325;

  const lastEntry = (rider.history || [])[(rider.history || []).length - 1];
  if (Number.isFinite(lastEntry?.position)) {
    if (lastEntry.position <= 3) score += 22;
    else if (lastEntry.position <= 5) score += 14;
    else if (lastEntry.position <= 10) score += 6;
  }

  score += ((rider.morale ?? 60) - 50) * 0.08;
  if (Number.isFinite(rider.salary) && teamBudget) {
    const share = rider.salary / Math.max(1, teamBudget);
    score -= clamp(share * 8, 0, 10);
  }
  // Historial acumulado de podios/títulos, más allá de solo esta temporada.
  const pastBadges = (rider.history || []).filter((h) => h.badge).length;
  score += Math.min(pastBadges, 4) * 3;

  // La personalidad del equipo matiza la elección entre candidatos ya
  // comparables, nunca decide por encima del rendimiento demostrado —
  // por eso estos empujones son deliberadamente más pequeños que los
  // factores de arriba.
  if (personality === "juventud") score += rider.age <= 23 ? 5 : rider.age >= 30 ? -4 : 0;
  else if (personality === "experiencia") score += rider.age >= 27 ? 4 : rider.age <= 21 ? -3 : 0;
  else if (personality === "rendimiento") score += ca >= 78 ? 4 : ca < 60 ? -4 : 0;
  else if (personality === "potencial") {
    const upside = (rider.pa ?? ca) - ca;
    score += upside >= 15 ? 5 : upside <= 3 ? -2 : 0;
  }

  return score;
}

/**
 * Fase de afinidad/realismo — ¿aceptaría este piloto en concreto una
 * oferta de este equipo en concreto? Nunca decidido por un único
 * factor: combina la brecha de prestigio, la categoría, el salario
 * ofrecido, la competitividad de la moto, la moral y las propias
 * expectativas del piloto, y solo entonces pregunta "¿tendría sentido
 * esto en el paddock real?"
 */
export function wouldRiderJoin(rider, team, categoryKey, offeredSalary, ctx = {}) {
  const { fromCategoryKey = categoryKey, bikeAvgOffered = 60, currentBikeAvg = 60 } = ctx;
  const personality = riderPersonality(rider);
  const riderPrestige = rider.prestige ?? 60;
  const teamPrestige = team.prestige ?? 60;

  let score = 0.15;

  // Brecha de prestigio: el factor más determinante, pero nunca el único.
  const gap = teamPrestige - riderPrestige;
  score += gap * 0.009;

  // Salario: puede compensar un proyecto menos atractivo.
  const fairSalary = rider.salary || 1;
  const salaryRatio = offeredSalary / fairSalary;
  score += clamp((salaryRatio - 1) * 0.5, -0.3, 0.4);

  // Competitividad de la moto ofrecida frente a la actual.
  score += clamp((bikeAvgOffered - currentBikeAvg) / 45, -0.25, 0.3);

  // Salto de categoría: subir siempre resulta atractivo salvo que la
  // diferencia de prestigio sea excesiva; bajar solo tiene sentido si el
  // proyecto o el salario lo justifican.
  const catRank = { motogp: 3, moto2: 2, moto3: 1 };
  const catDelta = (catRank[categoryKey] ?? 2) - (catRank[fromCategoryKey] ?? 2);
  if (catDelta > 0) score += 0.22;
  else if (catDelta < 0) score -= 0.28;

  // Moral y situación actual — una mala racha empuja a aceptar salidas
  // que en un buen momento se rechazarían.
  const moraleTier = rider.moraleState?.tier ?? "normal";
  if (moraleTier === "muy_baja") score += 0.18;
  else if (moraleTier === "baja") score += 0.08;
  else if (moraleTier === "muy_alta") score -= 0.05;

  // Personalidad del piloto.
  if (personality === "titulos") score += clamp(gap * 0.005, -0.15, 0.15);
  else if (personality === "salario") score += clamp((salaryRatio - 1) * 0.35, -0.15, 0.3);
  else if (personality === "estabilidad") score -= 0.1;
  else if (personality === "protagonismo") {
    const currentTopRating = (team.riders && team.riders.length) ? Math.max(...team.riders.map(overallRating)) : overallRating(rider);
    const wouldBeTopSeat = overallRating(rider) >= currentTopRating - 3;
    score += wouldBeTopSeat ? 0.12 : -0.12;
  }

  // Comprobación de realismo final: un campeón de prestigio muy alto no
  // debería fichar por un proyecto muy inferior salvo que algo
  // extraordinario lo justifique (ya recogido arriba en salario/moto/
  // moral) — aquí solo se pone un límite duro para el caso extremo.
  if (riderPrestige >= 170 && teamPrestige <= 90 && salaryRatio < 1.6 && catDelta <= 0) {
    score -= 0.4;
  }

  return Math.random() < clamp(score, 0.03, 0.95);
}

/** Contract length for a fresh signing — varies with age and how much
 * a team believes in the project, not a flat number for everyone. */
export function proposedContractYears(rider) {
  if (rider.age >= 32) return 1;
  if (rider.age <= 22 && (rider.pa ?? 0) - overallRating(rider) >= 12) return randInt(2, 3);
  return randInt(1, 2);
}
