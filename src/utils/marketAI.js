import { clamp, randInt } from "./random.js";
import { PERSONALITIES } from "../data/personalities.js";
import { CATEGORY_RANK, categoryRankDelta, computeMarketValue, overallRating } from "./riders.js";
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

export function teamPersonality(team) {
  return TEAM_PERSONALITIES[hashString(String(team.id ?? team.name ?? "")) % TEAM_PERSONALITIES.length];
}

// Bug fixed: this used to hash into its own separate 4-trait set
// ("titulos"/"salario"/"estabilidad"/"protagonismo"), completely
// disconnected from rider.personality — the same
// Ambicioso/Profesional/Tranquilo/Temperamental/Trabajador tag already
// shown on every rider's profile. A rider could show as "Temperamental"
// on screen while scoring offers internally as "estabilidad" or
// whatever the hash landed on — two unrelated personalities, one
// visible, one actually driving the math. Now it's the same one both
// places: what the player sees is exactly what's deciding how the
// rider reacts. The hash fallback only matters for a rider somehow
// missing the field entirely (older data, hand-authored entries that
// slipped through) — every rider created through the normal pipeline
// already has one.
export function riderPersonality(rider) {
  if (rider.personality && PERSONALITIES.includes(rider.personality)) return rider.personality;
  return PERSONALITIES[hashString(String(rider.id ?? rider.name ?? "")) % PERSONALITIES.length];
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
  if (personality === "Ambicioso" && gap >= 20) chance -= 0.15;
  if (personality === "Tranquilo") chance += 0.15;
  if (personality === "Trabajador" && team.riders?.some((r) => r.id !== rider.id && (r.prestige ?? 0) > riderPrestige + 20)) chance -= 0.15;
  if (personality === "Temperamental") chance = 0.78 + (chance - 0.78) * 1.35;
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
  const catWeight = { motogp: 3, moto2: 1.6, superbikes: 1.4, supersport: 1.2, moto3: 1 }[categoryKey] ?? 1;
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
  const upside = (rider.pa ?? ca) - ca;

  // Equilibrio explícito entre los tres conceptos que deben valorarse
  // en conjunto — prestigio (reputación), calidad actual (nivel real
  // hoy) y potencial (margen de mejora futuro) — ninguno domina por
  // completo la decisión.
  let score = ca * 0.4;
  score += (rider.prestige ?? 60) * 0.28;
  score += clamp(upside, 0, 30) * 0.35;

  const lastEntry = (rider.history || [])[(rider.history || []).length - 1];
  if (Number.isFinite(lastEntry?.position)) {
    if (lastEntry.position <= 3) score += 18;
    else if (lastEntry.position <= 5) score += 11;
    else if (lastEntry.position <= 10) score += 5;
  }

  // Piloto veterano sin proyecto reciente: aunque conserve un prestigio
  // histórico razonable, su atractivo real para el mercado debe ser
  // claramente inferior — habitualmente ejerce de piloto probador o ya
  // está fuera de la parrilla, no es un candidato habitual para una
  // plaza oficial competitiva.
  const hasRecentResult = Number.isFinite(lastEntry?.position) && lastEntry.position <= 15;
  if (rider.age >= 33 && !hasRecentResult) score -= 24;
  else if (rider.age >= 36) score -= 10;

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
  else if (personality === "potencial") score += upside >= 15 ? 5 : upside <= 3 ? -2 : 0;

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
/** The deterministic score behind wouldRiderJoin, exposed on its own —
 * used by the negotiation screen's live thermometer, which needs the
 * actual number (to place a needle, to bucket into frío/dudoso/
 * favorable) rather than a single random yes/no roll. wouldRiderJoin
 * itself is untouched below: every existing caller throughout the
 * game keeps behaving exactly as before. */

/**
 * Bug fixed (feature): contract length used to be purely cosmetic —
 * proposedContractYears suggested a number, the player could set
 * whatever they wanted on the slider, and none of it ever fed back
 * into whether the rider actually said yes. Two real preferences now
 * apply, in opposite directions:
 *
 *   - A rider with real untapped potential (a big PA-over-CA gap),
 *     still young enough to act on it, in a category that isn't
 *     MotoGP yet (nowhere higher left to climb) genuinely doesn't
 *     want to be tied down — they're hoping to be pulled up to the
 *     next category soon, and a long deal with THIS team stands in
 *     the way of that. A 1-year offer costs them nothing here; a
 *     3-year one actively puts them off.
 *   - A rider who's Tranquilo by personality, or simply old enough
 *     that chasing the next big project matters less than not having
 *     to negotiate again next year, wants the opposite: real years on
 *     the table read as the team actually committing to them.
 *   - Everyone else still leans mildly toward SOME security over a
 *     bare one-year deal, just nowhere near as strongly as either
 *     case above.
 *
 * `years` is optional — omitted entirely (as every OTHER live-preview
 * or team-side score in this file already does when it doesn't apply)
 * this returns a neutral 0, so a caller that doesn't have contract
 * terms to weigh yet doesn't need special-casing.
 */
function contractYearsPreference(rider, categoryKey, years) {
  if (!Number.isFinite(years)) return 0;
  const overall = overallRating(rider);
  const risingStar = (rider.pa ?? 0) - overall >= 12 && (CATEGORY_RANK[categoryKey] ?? 3) < CATEGORY_RANK.motogp && (rider.age ?? 99) <= 24;
  if (risingStar) return clamp((1 - years) * 0.06, -0.18, 0.06);

  const wantsStability = riderPersonality(rider) === "Tranquilo" || (rider.age ?? 0) >= 29;
  if (wantsStability) return clamp((years - 1) * 0.05, -0.05, 0.15);

  return clamp((years - 1) * 0.02, 0, 0.06);
}

export function computeJoinScore(rider, team, categoryKey, offeredSalary, ctx = {}) {
  const { fromCategoryKey = categoryKey, bikeAvgOffered = 60, currentBikeAvg = 60, isUnemployed = false, seasonsUnsigned = 0, isRenewal = false, years = null } = ctx;
  const personality = riderPersonality(rider);
  const riderPrestige = rider.prestige ?? 60;
  const teamPrestige = team.prestige ?? 60;

  let score = 0.15;
  // Bug fixed (feature): a renewal was scored with the exact same math
  // as approaching a rider fresh — every gap/bike/category term still
  // applies (a rider who's outgrown their own team's prestige is
  // genuinely still less eager to just re-sign, same as it would be
  // for anyone luring them elsewhere), but staying somewhere familiar
  // carries none of the real uncertainty of switching teams: no new
  // garage to learn, no new teammate to adjust to, no risk the new
  // project turns out worse than promised. A flat bonus captures that
  // lower switching friction, on top of everything else already
  // driving the score — without this, "renovar con tu propio equipo,
  // sin cambiar nada" needed almost the same premium a rival team
  // would need to poach the same rider away, which never felt right.
  if (isRenewal) score += 0.16;

  // Brecha de prestigio: el factor más determinante, pero nunca el único.
  // Sin equipo, esa brecha pesa mucho menos — la alternativa real no es
  // "seguir en un proyecto mejor", es "no correr esta temporada".
  const gap = teamPrestige - riderPrestige;
  score += gap * (isUnemployed ? 0.003 : 0.009);

  // Salario: puede compensar un proyecto menos atractivo.
  const fairSalary = rider.salary || 1;
  const salaryRatio = offeredSalary / fairSalary;
  score += clamp((salaryRatio - 1) * 0.5, -0.3, 0.4);

  // Competitividad de la moto ofrecida frente a la actual — pero sin
  // equipo no hay "moto actual" con la que comparar de verdad, así que
  // esto nunca debe restar, solo sumar si la moto ofrecida es buena.
  const bikeDelta = (bikeAvgOffered - currentBikeAvg) / 45;
  score += isUnemployed ? clamp(bikeDelta, 0, 0.3) : clamp(bikeDelta, -0.25, 0.3);

  // Salto de categoría: subir siempre resulta atractivo salvo que la
  // diferencia de prestigio sea excesiva; bajar solo tiene sentido si el
  // proyecto o el salario lo justifican.
  // Bug fixed: sportbike was missing from this map entirely, so both
  // catRank lookups silently fell back to the generic `?? 2` default —
  // exactly the same rank as MotoGP/Moto2/Superbikes. That made a
  // Sportbike rider being chased by Supersport (a well-earned
  // promotion) score as catDelta = 1.5 - 2 = -0.5, a DOWNGRADE, which
  // triggered the drop-penalty branch below instead of the "moving up"
  // bonus. In practice this made Sportbike's promotion pipeline (and
  // its market in general) nearly frozen: its own best riders kept
  // rejecting offers a rider in their exact position should almost
  // always accept.
  const catDelta = categoryRankDelta(categoryKey, fromCategoryKey);
  if (catDelta > 0) score += clamp(catDelta * 0.15, 0, 0.35);
  else if (catDelta < 0) {
    // Bajar de categoría rara vez tiene sentido para alguien ya asentado
    // arriba — un veterano de MotoGP no vuelve a Moto2 a los 30 años,
    // esté sin equipo o no. Solo un piloto todavía joven, para quien
    // reconstruirse en una categoría inferior sigue siendo una decisión
    // de carrera razonable, se lo plantea con algo de apertura.
    // Bug fixed: every drop got the exact same flat penalty regardless
    // of how far it actually was — a Supersport rider being chased by
    // Sportbike (one small step down) was punished exactly as hard as
    // a Superbikes standout being offered a WorldWCR seat (an enormous
    // one). Scaling by the real size of the gap means a small step down
    // stays plausible while a genuine free-fall stays very rare.
    let dropPenalty;
    if (rider.age >= 30) dropPenalty = 0.35;
    else if (rider.age >= 27) dropPenalty = 0.22;
    else dropPenalty = 0.12;
    dropPenalty *= Math.abs(catDelta);
    if (!isUnemployed) dropPenalty += 0.15 * Math.abs(catDelta);
    score -= dropPenalty;
  }

  // Moral y situación actual — una mala racha empuja a aceptar salidas
  // que en un buen momento se rechazarían.
  const moraleTier = rider.moraleState?.tier ?? "normal";
  if (moraleTier === "muy_baja") score += 0.18;
  else if (moraleTier === "baja") score += 0.08;
  else if (moraleTier === "muy_alta") score -= 0.05;

  // Sin equipo: cuanto más tiempo lleva sin encontrar sitio, más
  // dispuesto está a aceptar cualquier oferta razonable — nadie se
  // queda de brazos cruzados esperando una oferta perfecta que nunca
  // llega.
  if (isUnemployed) score += clamp(0.25 + seasonsUnsigned * 0.15, 0.25, 0.7);

  // Personalidad del piloto — el mismo rasgo visible en su ficha
  // (Ambicioso/Profesional/Tranquilo/Temperamental/Trabajador), no un
  // sistema interno aparte. Ambicioso hereda el peso extra a la brecha
  // de prestigio que antes tenía "titulos"; Profesional, el peso extra
  // a que las condiciones económicas sean justas que antes tenía
  // "salario"; Tranquilo, la resistencia a moverse de "estabilidad".
  // Trabajador reutiliza la idea de "protagonismo" (sentirse el piloto
  // de referencia del equipo) pero reorientada hacia el reconocimiento
  // al esfuerzo, no solo el puesto en la parrilla interna. Temperamental
  // es el único genuinamente nuevo: en vez de un sesgo fijo, amplifica
  // lo que el resto de factores ya apuntaban — una oferta que ya pintaba
  // mal le repele más todavía, una que ya pintaba bien le entusiasma más.
  if (personality === "Ambicioso") score += clamp(gap * 0.005, -0.15, 0.15);
  else if (personality === "Profesional") score += clamp((salaryRatio - 1) * 0.35, -0.15, 0.3);
  else if (personality === "Tranquilo") score -= 0.1;
  else if (personality === "Trabajador") {
    const currentTopRating = (team.riders && team.riders.length) ? Math.max(...team.riders.map(overallRating)) : overallRating(rider);
    const wouldBeTopSeat = overallRating(rider) >= currentTopRating - 3;
    score += wouldBeTopSeat ? 0.12 : -0.12;
  } else if (personality === "Temperamental") {
    const neutral = 0.15; // the same value score starts from, above
    score = neutral + (score - neutral) * 1.35;
  }

  // Comprobación de realismo final: un campeón de prestigio muy alto no
  // debería fichar por un proyecto muy inferior salvo que algo
  // extraordinario lo justifique (ya recogido arriba en salario/moto/
  // moral) — aquí solo se pone un límite duro para el caso extremo. No
  // aplica si el piloto está actualmente sin equipo: ahí la pregunta ya
  // no es "¿merece la pena el cambio?" sino "¿corro esta temporada o no?".
  if (!isUnemployed && riderPrestige >= 170 && teamPrestige <= 90 && salaryRatio < 1.6 && catDelta <= 0) {
    score -= 0.4;
  }

  score += contractYearsPreference(rider, categoryKey, years);

  return clamp(score, 0.03, 0.95);
}

export function wouldRiderJoin(rider, team, categoryKey, offeredSalary, ctx = {}) {
  return Math.random() < computeJoinScore(rider, team, categoryKey, offeredSalary, ctx);
}

/** The selling team's own side of a release-fee negotiation — same
 * shape and philosophy as computeJoinScore (base 0.15, clamped to
 * 0.03-0.95), but scoring whether THIS team wants to let the rider go
 * for the money on the table, not whether the rider wants to join
 * somewhere new. The offer relative to the rider's real market value
 * is the main driver; a rider who's clearly their team's standout (not
 * just adequate, genuinely better than their teammate) is harder to
 * prise loose than a squad's weaker seat, even at a fair price. */
export function computeTeamAcceptScore(rider, team, offerAmount, scale) {
  const marketValue = computeMarketValue(rider, scale);
  const ratio = offerAmount / Math.max(1, marketValue);
  let score = 0.15;
  score += clamp((ratio - 1) * 0.6, -0.4, 0.55);

  const teammates = (team.riders || []).filter((r) => r.id !== rider.id);
  const teammateCA = teammates.length ? Math.max(...teammates.map(overallRating)) : overallRating(rider);
  if (overallRating(rider) > teammateCA + 5) score -= 0.15; // their own standout, harder to release regardless of price

  return clamp(score, 0.03, 0.95);
}

/** Contract length for a fresh signing — varies with age and how much
 * a team believes in the project, not a flat number for everyone. */
export function proposedContractYears(rider) {
  if (rider.age >= 32) return 1;
  if (rider.age <= 22 && (rider.pa ?? 0) - overallRating(rider) >= 12) return randInt(2, 3);
  return randInt(1, 2);
}
