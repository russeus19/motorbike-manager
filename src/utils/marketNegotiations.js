import { CATEGORY_ORDER } from "../data/categories.js";
import { clamp, pick } from "./random.js";
import { computeMarketValue, computeSalary, isFreeAgentEligibleForCategory, overallRating } from "./riders.js";
import { moraleTierInfo } from "./riderMorale.js";
import { riderPrestigeInterest, teamPrestigeAppeal } from "./prestige.js";
import { computeContinuityScore, continuityToRenewalProbability, proposedContractYears } from "./marketAI.js";
import { buildSeasonHistoryEntry, teamExpectationTier } from "./seasonHistory.js";
import { evaluateSeasonVsExpectation } from "./teamExpectations.js";

/**
 * Live transfer market — foundation layer (rumors + player negotiation
 * lifecycle). This is intentionally the first slice of a much larger
 * system (see the "Reestructuración completa del mercado de fichajes"
 * request): everything here is built so the rest — the two-sided offer
 * screens, AI teams making unsolicited offers on the player's own
 * riders, the season-end summary rewrite, and eventually agents,
 * release clauses, loans, scouting — can be layered on top without
 * reworking this module. Nothing here replaces the existing end-of-
 * season market resolution (utils/transferMarket.js) yet; a confirmed
 * negotiation is recorded here and only takes effect on the roster at
 * the next season transition, exactly like the design calls for
 * ("el piloto continúa en su equipo... únicamente cambiará al pasar de
 * temporada").
 *
 * Data shapes:
 *   Rumor:        { id, text, categoryKey, round, season }
 *   Negotiation:  { id, kind: "signing"|"renewal", riderId, riderName,
 *                    categoryKey, fromTeamId, fromTeamName, toTeamId,
 *                    toTeamName, teamOfferAmount, riderTerms: { salary,
 *                    years, winBonus, titleBonus }, status,
 *                    createdRound, createdSeason, resolveAtRound,
 *                    log: [{ round, text }] }
 *
 * Both are plain, serializable objects — they persist in the save file
 * as-is inside `game.marketRumors` / `game.marketNegotiations`.
 */

let idCounter = 0;
function nextMarketId(prefix) {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter}`;
}

/** Whether a negotiation for this rider needs a team-compensation step
 * at all. Three cases never need one: the rider is already a free agent
 * (no `fromTeamId`), it's a renewal (the same team on both sides — there's
 * no one to compensate), or the rider only has one year left on their
 * contract, in which case they behave exactly like a free agent for
 * negotiation purposes — any interested team negotiates directly with
 * them, never with their current team. */
export function needsTeamCompensation(rider, fromTeamId, toTeamId) {
  if (!fromTeamId) return false;
  if (fromTeamId === toTeamId) return false;
  return (rider.contractYears ?? 0) > 1;
}

/* How "hot" the market is at this point in the season — the single
   number every rumor/negotiation probability in this module scales off
   of, per the design's explicit progressive-intensity requirement
   (few movements early, building toward a flurry in the last GPs). */
export function marketHeat(round, totalRounds) {
  const progress = clamp(round / Math.max(1, totalRounds - 1), 0, 1);
  return clamp(0.08 + progress * progress * 0.85, 0.08, 0.95);
}

/* ----------------------------------------------------------------------
   RUMORS
   ------------------------------------------------------------------- */

const RUMOR_TEMPLATES = [
  (rider, team) => `${team.name} está interesado en ${rider.name}.`,
  (rider, team) => `${team.name} estudia renovar a ${rider.name}.`,
  (rider, team) => `${rider.name} podría abandonar ${team.name} a final de temporada.`,
  (rider) => `${rider.name} recibe varias muestras de interés de otros equipos.`,
  (_rider, team) => `${team.name} prepara cambios en su alineación para la próxima temporada.`,
  (rider) => `Se habla de un posible cambio de aires para ${rider.name}.`,
  (rider) => `El entorno de ${rider.name} negocia su futuro.`,
];

const FREE_AGENT_RUMOR_TEMPLATES = [
  (rider, team) => `${team.name} sondea a ${rider.name}, agente libre.`,
  (rider) => `${rider.name} sigue sin equipo y varios boxes lo vigilan.`,
];

function pickRandomEntry(team) {
  const pool = [...team.riders, ...Object.values(team.substitutes || {})];
  return pool.length ? pick(pool) : null;
}

/** Generates a handful of plausible rumor sentences for one category,
 * with probability (both of generating anything at all, and of how many)
 * scaled by how deep into the season we are. Never claims anything is
 * confirmed — rumors are explicitly "some are true, some are just
 * gossip", matching the design's own framing. */
export function generateRumorsForCategory(teams, freeAgents, categoryKey, round, totalRounds, seasonNumber) {
  const heat = marketHeat(round, totalRounds);
  const rumors = [];
  const attempts = Math.round(1 + heat * 3);
  for (let i = 0; i < attempts; i++) {
    if (Math.random() > heat) continue;
    const useFreeAgent = freeAgents.length && Math.random() < 0.25;
    let text = null;
    if (useFreeAgent) {
      const rider = pick(freeAgents);
      const team = teams.length ? pick(teams) : null;
      const template = pick(FREE_AGENT_RUMOR_TEMPLATES);
      text = team ? template(rider, team) : template(rider);
    } else if (teams.length) {
      const team = pick(teams);
      const rider = pickRandomEntry(team);
      if (rider) {
        const template = pick(RUMOR_TEMPLATES);
        text = template(rider, team);
      }
    }
    if (text) rumors.push({ id: nextMarketId("rumor"), text, categoryKey, round, season: seasonNumber });
  }
  return rumors;
}

/** Caps the rolling rumor feed so it never grows unbounded across a long
 * career — keeps only the most recent N, newest first. */
export function appendRumors(existingRumors, newRumors, cap = 60) {
  return [...newRumors, ...(existingRumors || [])].slice(0, cap);
}

/* ----------------------------------------------------------------------
   NEGOTIATION SCORING — reuses the existing market-value / salary /
   expectation / morale engines rather than inventing parallel logic.
   ------------------------------------------------------------------- */

/**
 * Reads the negotiation's own history of player offers to gauge
 * momentum, so the AI's response feels like it's actually tracking the
 * conversation instead of re-evaluating from scratch every round.
 * Compares the two most recent player-side proposals on whichever side
 * is currently live: a meaningful raise reads as growing intent (a small
 * bonus toward accepting), while repeating near-identical small tweaks
 * reads as the player stalling — the AI's position hardens a little more
 * each time that happens. Returns a bonus in roughly -0.35..+0.35, meant
 * to be added directly into the ratio/total the scoring functions
 * already compute.
 */
function negotiationLeverage(negotiation, side) {
  const key = side === "team" ? "teamOfferAmount" : "riderSalary";
  const values = (negotiation.history || [])
    .filter((h) => h.actor === "player" && h[key] != null)
    .map((h) => h[key]);
  if (values.length < 2) return 0;
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  if (prev <= 0) return 0;
  const delta = (last - prev) / prev;
  if (delta >= 0.08) return clamp(delta * 1.5, 0.05, 0.35); // a real raise -> more willing to close
  if (delta > 0 && delta < 0.03) {
    // Tiny repeated tweaks harden the position further with each round.
    const stallRounds = values.length - 1;
    return clamp(-0.1 * stallRounds, -0.35, -0.1);
  }
  return 0;
}

/** How hard a team should fight to keep this rider: their share of the
 * team's season points (a rough, already-available proxy for "cuánto
 * pesa dentro del equipo" and "dificultad para sustituirlo" — no new
 * data needed). */
function riderImportanceToTeam(rider, team, riderStandings) {
  const teamTotal = team.riders.reduce((s, r) => s + (riderStandings?.[r.id]?.points || 0), 0);
  if (teamTotal <= 0) return 0.3;
  const mine = riderStandings?.[rider.id]?.points || 0;
  return clamp(mine / teamTotal, 0, 1);
}

/**
 * The current team's response to a compensation offer for one of their
 * contracted riders. Considers market value, remaining contract, the
 * team's own sporting ambition, its budget situation, and how important
 * the rider is to the team right now (points share, a proxy for how
 * hard they'd be to replace). Never random: every accept/reject/counter
 * is the direct result of this score. `riderStandings` is the current
 * category's season standings map, needed to gauge that importance.
 */
export function scoreTeamOfferAcceptance(rider, fromTeam, offerAmount, scale, riderStandings, negotiation) {
  const marketValue = computeMarketValue(rider, scale);
  const importance = riderImportanceToTeam(rider, fromTeam, riderStandings);
  const contractLeft = rider.contractYears ?? 0;
  const expectationAmbition = fromTeam.expectation ? clamp((15 - fromTeam.expectation.min) / 15, 0, 1) : 0.4;
  const budgetPressure = fromTeam.budget < 0 ? 0.25 : clamp(fromTeam.budget / Math.max(1, marketValue * 4), 0, 0.3);
  const leverage = negotiation ? negotiationLeverage(negotiation, "team") : 0;

  // How far the offer clears fair value, adjusted for how much the team
  // actually needs to sell (budget pressure) versus how much it needs to
  // keep winning (ambition + how important this rider already is), plus
  // whatever momentum this specific back-and-forth has built up.
  const askingPrice = marketValue * (1 + importance * 0.6 + expectationAmbition * 0.4 + contractLeft * 0.08);
  const ratio = (askingPrice > 0 ? offerAmount / askingPrice : 1) + leverage;

  if (ratio >= 1 || budgetPressure >= 0.28) {
    return { accept: true, counterAmount: null };
  }
  if (ratio >= 0.7) {
    return { accept: false, counterAmount: Math.round(askingPrice) };
  }
  return { accept: false, counterAmount: null }; // flat rejection, too far off
}

/**
 * A rider's response to a personal contract offer from a prospective
 * team. Weighs salary and duration against the offering team's bike
 * quality, the rider's own morale, their career stage (age), and — per
 * the design's "ascensos naturales" — a real bonus for a genuine
 * category promotion (Moto3→Moto2, Moto2→MotoGP).
 */
export function scoreRiderOfferAcceptance(rider, toTeam, terms, ctx) {
  const { scale, isPromotion, currentTeamBikeAvg, negotiation } = ctx;
  const fairSalary = computeSalary(rider, scale);
  const salaryScore = fairSalary > 0 ? clamp((terms.salary / fairSalary - 1) * 1.2, -1, 1) : 0;
  const durationScore = clamp((terms.years - 1) / 2, -0.3, 0.4);
  const bonusScore = clamp(((terms.winBonus || 0) + (terms.titleBonus || 0)) / Math.max(1, fairSalary) * 0.5, 0, 0.2);

  const bikeAvgOffered = toTeam?.bike
    ? Object.values(toTeam.bike).reduce((s, v) => s + v, 0) / Object.values(toTeam.bike).length
    : 60;
  const bikeDelta = currentTeamBikeAvg != null ? (bikeAvgOffered - currentTeamBikeAvg) / 40 : 0;
  const bikeQualityScore = clamp(bikeDelta, -0.5, 0.5);
  // A team's own paddock reputation matters to a rider independently of
  // how good the bike itself is — a prestigious team can win over a
  // rider even offering slightly less (section "Ejemplo 4"), one factor
  // among several here, never decisive by itself.
  const prestigeAppealScore = clamp(teamPrestigeAppeal(toTeam?.prestige, rider.prestige) / 12, -1, 1);

  const moraleBonus = (moraleTierInfo(rider.moraleState?.tier).modifier - 1) * 4; // roughly -0.24..+0.24
  const ageFactor = rider.age <= 23 ? 0.15 : rider.age >= 33 ? -0.1 : 0;
  const promotionBonus = isPromotion ? 0.35 : 0;
  const leverage = negotiation ? negotiationLeverage(negotiation, "rider") : 0;

  const total = clamp(salaryScore * 0.35 + durationScore * 0.15 + bonusScore + bikeQualityScore * 0.25 + prestigeAppealScore * 0.2 + moraleBonus * 0.1 + ageFactor + promotionBonus + leverage, -1, 1);

  if (total >= 0.15) return { accept: true, counterTerms: null };
  if (total >= -0.2) {
    return { accept: false, counterTerms: { ...terms, salary: Math.round(terms.salary * 1.2) } };
  }
  return { accept: false, counterTerms: null };
}

/**
 * AI-controlled teams negotiating with each other — the same live-market
 * mechanism the player uses (createNegotiation → pending → resolved
 * after the next Grand Prix via the exact same scoring functions), just
 * with neither side being the player. A rival can go after another
 * rival's rider, a rider in a different category's grid, or a free
 * agent. Deliberately excludes the player's own team on both sides:
 * "AI wants one of the player's riders" is its own separate, explicit
 * flow (maybeGenerateIncomingOffer) so it isn't silently duplicated
 * here. Each category gets at most one attempt per tick, scaled by the
 * same progressive market heat as everything else.
 */
/* How ambitious a team currently is, 0 (very modest) .. 1 (title-
   fighting) — reuses the team's own single-position expectation
   (teamExpectations.js) rather than inventing a second notion of
   "tier". */
function buyerAmbition(team) {
  if (!team.expectation) return 0.5;
  return clamp(1 - (team.expectation.min - 1) / 15, 0, 1);
}

/* A puntero aims for pace, youth-with-potential and proven winners; a
   modest team is realistically drawn to affordable, experienced, or
   still-developing riders instead — "no todos los equipos deberán
   perseguir exactamente los mismos pilotos". */
function candidateFitForBuyer(rider, ambition, categoryKey) {
  const ca = overallRating(rider);
  const isYoungPotential = rider.age <= 23 && (rider.pa - ca) >= 10;
  const isProvenWinner = ca >= 82;
  const isVeteran = rider.age >= 30;
  const isExpiringSoon = (rider.contractYears ?? 0) <= 1;
  let score = 1;
  if (ambition >= 0.55) {
    score += ca * ambition * 0.06;
    if (isYoungPotential) score += 2;
    if (isProvenWinner) score += 2.5;
  } else {
    score += (100 - ca) * (1 - ambition) * 0.04;
    if (isVeteran) score += 1.5;
    if (!isProvenWinner) score += 1;
  }
  if (isExpiringSoon) score += 1.5;
  // A well-known name draws real interest on its own reputation, on top
  // of whatever their raw rating already contributes above — an
  // ambitious team chasing a prestige signing weighs this more; a
  // modest team barely notices it.
  score += Math.max(0, riderPrestigeInterest(rider.prestige, categoryKey)) * (0.15 + ambition * 0.25);
  return Math.max(0.15, score);
}

function weightedPickFromArray(items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return pick(items);
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function maybeGenerateAIInitiatedNegotiations(teamsByCategory, freeAgents, round, totalRounds, seasonNumber, scale, marketNegotiations) {
  const heat = marketHeat(round, totalRounds);
  const created = [];

  CATEGORY_ORDER.forEach((categoryKey) => {
    const teams = (teamsByCategory[categoryKey] || []).filter((t) => t.id !== "player");
    if (teams.length < 2 || Math.random() > heat * 0.9) return;

    const buyer = pick(teams);
    const seatsTaken = marketNegotiations.filter((n) => n.toTeamId === buyer.id && n.categoryKey === categoryKey && n.status !== "failed").length
      + created.filter((n) => n.toTeamId === buyer.id && n.categoryKey === categoryKey).length;
    if (buyer.riders.length + seatsTaken >= 2) return;

    const ambition = buyerAmbition(buyer);
    const eligibleFreeAgents = freeAgents.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey));
    const useFreeAgent = eligibleFreeAgents.length > 0 && Math.random() < 0.4;

    let rider = null;
    let fromTeam = null;
    if (useFreeAgent) {
      rider = weightedPickFromArray(eligibleFreeAgents, (r) => candidateFitForBuyer(r, ambition, categoryKey));
    } else {
      const sellers = teams.filter((t) => t.id !== buyer.id && t.riders.length);
      if (!sellers.length) return;
      const seller = pick(sellers);
      const candidates = seller.riders.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey));
      if (!candidates.length) return;
      rider = weightedPickFromArray(candidates, (r) => candidateFitForBuyer(r, ambition, categoryKey));
      fromTeam = seller;
    }
    if (!rider) return;

    const alreadyNegotiating = [...marketNegotiations, ...created].some((n) => n.riderId === rider.id && n.kind !== "renewal" && !["failed", "withdrawn"].includes(n.status));
    if (alreadyNegotiating) return;

    const marketValue = computeMarketValue(rider, scale);
    const needsComp = needsTeamCompensation(rider, fromTeam?.id ?? null, buyer.id);
    const teamOfferAmount = needsComp ? Math.round(marketValue * (0.85 + Math.random() * 0.35)) : null;
    const fairSalary = computeSalary(rider, scale);
    const riderTerms = {
      salary: Math.round(fairSalary * (0.95 + Math.random() * 0.25)),
      years: 1 + Math.round(Math.random() * 2),
      winBonus: 0,
      titleBonus: 0,
    };

    created.push(createNegotiation({
      kind: "signing", rider, categoryKey, fromTeam,
      toTeamId: buyer.id, toTeamName: buyer.name,
      teamOfferAmount, riderTerms, round, seasonNumber,
    }));
  });

  return created;
}

/**
 * Proactive renewals for AI-controlled teams (sections 2, 3, 5 and 9,
 * plus the "ventana de decisión" idea) — a team judging a rider on the
 * first couple of races isn't realistic, so this only starts acting
 * once the season is at least half-run, then keeps checking every race
 * after that. Any AI rider down to their last contracted year, not
 * already the subject of some other active negotiation, gets evaluated
 * using aiRenewalDecision's existing scoring (expectations, form,
 * age/potential, budget) — the exact same function the old end-of-
 * season pass used, just called earlier and producing a real
 * negotiation instead of an instant decision.
 *
 * A declined renewal doesn't create anything — the rider's contract
 * just keeps ticking down, which is precisely the signal the rest of
 * the market (maybeGenerateAIInitiatedNegotiations) reads as "this
 * rider is about to be available", starting the hunt for a replacement
 * immediately rather than waiting for the season to end.
 */
export function maybeGenerateAIRenewalNegotiations(teams, categoryKey, riderStandings, round, totalRounds, seasonNumber, scale, marketNegotiations) {
  if (round / Math.max(1, totalRounds - 1) < 0.5) return [];

  const riderRows = Object.entries(riderStandings || {}).sort((a, b) => b[1].points - a[1].points);
  const riderPosById = {};
  riderRows.forEach(([id], i) => { riderPosById[id] = i + 1; });

  const created = [];
  teams.forEach((t) => {
    if (t.id === "player") return; // the player renews their own riders manually
    const tier = teamExpectationTier(t);
    const [r1, r2] = t.riders;
    t.riders.forEach((r) => {
      if ((r.contractYears ?? 0) !== 1) return;
      const alreadyNegotiating = [...marketNegotiations, ...created].some((n) => n.riderId === r.id && !["failed", "withdrawn"].includes(n.status));
      if (alreadyNegotiating) return;

      const teammatePts = r.id === r1?.id ? (riderStandings?.[r2?.id]?.points || 0) : (riderStandings?.[r1?.id]?.points || 0);
      const points = riderStandings?.[r.id]?.points || 0;
      const riderExpectationVerdict = t.expectation
        ? evaluateSeasonVsExpectation(riderPosById[r.id], { min: Math.max(1, t.expectation.min * 2 - 1), max: t.expectation.max * 2 })
        : null;
      const continuity = computeContinuityScore(r, t, {
        points, teammatePoints: teammatePts, tier, riderExpectationVerdict, teamExpectationVerdict: null,
        crashes: r.crashesThisSeason || 0, injuriesThisSeason: r.injuriesThisSeason || 0,
      });
      if (Math.random() > continuityToRenewalProbability(continuity)) return;

      const fairSalary = computeSalary(r, scale);
      const riderTerms = {
        salary: Math.round(fairSalary * (1 + Math.random() * 0.15)),
        years: proposedContractYears(r),
        winBonus: 0,
        titleBonus: 0,
      };
      created.push(createNegotiation({
        kind: "renewal", rider: r, categoryKey, fromTeam: t,
        toTeamId: t.id, toTeamName: t.name,
        teamOfferAmount: null, riderTerms, round, seasonNumber,
      }));
    });
  });
  return created;
}

/**
 * A rival team occasionally makes an unsolicited offer for one of the
 * player's own contracted riders (section 14 of the design). Reuses the
 * exact same negotiation object/lifecycle as a player-initiated offer —
 * the only difference is who's on which side — so it shows up in the
 * same "Ofertas" panel and gets resolved by the same scoring functions.
 * Rarer than a plain rumor: this is a real, actionable offer, not just
 * gossip.
 */
export function maybeGenerateIncomingOffer(playerTeam, rivalTeams, category, round, totalRounds, seasonNumber, scale, marketNegotiations) {
  const heat = marketHeat(round, totalRounds);
  if (!rivalTeams.length || Math.random() > heat * 0.85) return null;
  const candidates = playerTeam.riders.filter((r) => (r.contractYears ?? 0) > 0 && !(r.injury && r.injury.sidelined)
    && !(marketNegotiations || []).some((n) => n.riderId === r.id && n.kind !== "renewal" && !["failed", "withdrawn"].includes(n.status)));
  if (!candidates.length) return null;
  const rider = pick(candidates);
  const suitor = pick(rivalTeams);
  const marketValue = computeMarketValue(rider, scale);
  const needsComp = needsTeamCompensation(rider, playerTeam.id, suitor.id);
  const teamOfferAmount = needsComp ? Math.round(marketValue * (0.9 + Math.random() * 0.4)) : null;
  const fairSalary = computeSalary(rider, scale);
  const riderTerms = {
    salary: Math.round(fairSalary * (1 + Math.random() * 0.3)),
    years: 1 + Math.round(Math.random() * 2),
    winBonus: 0,
    titleBonus: 0,
  };
  return createNegotiation({
    kind: "signing", rider, categoryKey: category, fromTeam: playerTeam,
    toTeamId: suitor.id, toTeamName: suitor.name,
    teamOfferAmount, riderTerms, round, seasonNumber,
  });
}

/**
 * Actually moves riders between teams — called exactly once, at the
 * season transition, never mid-season (see section 9: a rider stays put
 * all season no matter what's been agreed). Every `confirmed`
 * negotiation is applied: the rider is pulled out of wherever they
 * currently are and placed on the team that signed them, with the
 * agreed contract terms. An outgoing sale to a specific rival in the
 * played category is placed on that exact team when there's room;
 * otherwise (a background category, or no room left) the rider simply
 * becomes a free agent for the normal end-of-season market to pick up —
 * a reasonable outcome, not a broken one.
 */
/**
 * A stranded rider (their negotiation reached "confirmed" but couldn't
 * actually be placed — the destination was already full) goes straight
 * to the free-agent pool without ever appearing on any team's roster,
 * which means utils/seasonHistory.js's normal per-category sweep would
 * never see them either. Their just-finished season has to be finalized
 * right here instead, using whatever context is already on hand:
 * _pendingHistoryEntry if this was a cross-category attempt, or a fresh
 * entry built from _racedForTeamName otherwise.
 */
function finalizeStrandedHistory(rider, standingsByCategory, categoryKey, seasonNum) {
  const { _pendingHistoryEntry, _racedForTeamName, ...clean } = rider;
  const entry = _pendingHistoryEntry || buildSeasonHistoryEntry(clean.id, _racedForTeamName || "—", standingsByCategory[categoryKey] || {}, categoryKey, seasonNum);
  if (!entry) return clean;
  return { ...clean, history: [...(clean.history || []), entry] };
}

export function applyConfirmedNegotiations({ playerTeam, rivalTeams, otherCategories, category, marketNegotiations, standingsByCategory = {} }) {
  const confirmed = (marketNegotiations || []).filter((n) => n.status === "confirmed");
  if (!confirmed.length) return { playerTeam, rivalTeams, otherCategories, appliedIds: [], strandedRiders: [], strandedNegotiationIds: [] };

  const nextPlayerRiders = [...playerTeam.riders];
  const nextRivals = rivalTeams.map((t) => ({ ...t, riders: [...t.riders] }));
  const nextOther = {};
  Object.entries(otherCategories || {}).forEach(([k, v]) => {
    nextOther[k] = { ...v, teams: v.teams.map((t) => ({ ...t, riders: [...t.riders] })) };
  });
  const appliedIds = [];
  // Nobody should ever have two confirmed negotiations to begin with —
  // maybeGenerateIncomingOffer and every AI-initiated path now check for
  // an already-active negotiation before creating a new one. This set is
  // a second, independent guard directly at the point riders actually
  // change hands: even if a duplicate somehow slipped through upstream,
  // only the first confirmed negotiation for a given rider is ever
  // applied here.
  const processedRiderIds = new Set();
  // Anyone who gets removed from their old team but can't be placed on
  // their new one (e.g. it unexpectedly already has 2 riders from
  // another deal processed earlier in this same pass) must never just
  // disappear — they go back into the free-agent pool instead. Their
  // negotiation's id is tracked separately (strandedNegotiationIds) so
  // the season summary can tell it apart from a deal that actually went
  // through.
  const strandedRiders = [];
  const strandedNegotiationIds = [];

  function removeFromEverywhere(riderId, categoryKey) {
    if (categoryKey === category) {
      const ownIdx = nextPlayerRiders.findIndex((r) => r.id === riderId);
      if (ownIdx >= 0) return { rider: nextPlayerRiders.splice(ownIdx, 1)[0], fromTeamName: playerTeam.name };
      for (const t of nextRivals) {
        const idx = t.riders.findIndex((r) => r.id === riderId);
        if (idx >= 0) return { rider: t.riders.splice(idx, 1)[0], fromTeamName: t.name };
      }
      return { rider: null, fromTeamName: null };
    }
    const catState = nextOther[categoryKey];
    if (!catState) return { rider: null, fromTeamName: null };
    for (const t of catState.teams) {
      const idx = t.riders.findIndex((r) => r.id === riderId);
      if (idx >= 0) return { rider: t.riders.splice(idx, 1)[0], fromTeamName: t.name };
    }
    return { rider: null, fromTeamName: null };
  }

  function findTeamInCategory(teamId, categoryKey) {
    if (categoryKey === category) return nextRivals.find((t) => t.id === teamId) || null;
    return (nextOther[categoryKey]?.teams || []).find((t) => t.id === teamId) || null;
  }

  confirmed.forEach((neg) => {
    if (processedRiderIds.has(neg.riderId)) {
      // A duplicate confirmed negotiation for a rider already placed by
      // an earlier one in this pass — this one never took effect
      // either, exactly like a stranded one.
      strandedNegotiationIds.push(neg.id);
      return;
    }
    const { rider, fromTeamName } = removeFromEverywhere(neg.riderId, neg.categoryKey);
    if (!rider) {
      strandedNegotiationIds.push(neg.id);
      return;
    }
    processedRiderIds.add(neg.riderId);
    const signedRider = {
      ...rider,
      contractYears: neg.riderTerms?.years ?? 2,
      salary: neg.riderTerms?.salary ?? rider.salary,
      isNewTeamThisSeason: true,
      // The season-history entry recorded right after this (see
      // utils/seasonHistory.js's recordSeasonHistory) must credit the
      // team this rider actually raced for all season, not the new one
      // they're only joining now — without this, a rider signed mid-
      // season away from another team would get their just-finished
      // season attributed to (or entirely missed by) whichever team
      // ends up holding their roster slot by the time history gets
      // recorded, several steps later in this same transition.
      _racedForTeamName: fromTeamName,
      // Distinct from isNewTeamThisSeason on purpose: this rider is
      // being placed on their new team in this exact transition, before
      // evolveRoster runs later in the same pass — they haven't raced a
      // single race for this team yet, so evolveRoster must skip them
      // entirely this time (see utils/riderEvolution.js) instead of
      // aging them up and burning a year off the contract they just
      // signed before their first season even starts.
      justSignedThisTransition: true,
      // A player signing that crosses categories (promoting/relegating
      // a rider straight into their own team) needs its history entry
      // computed right here, against the rider's ACTUAL category's
      // standings — utils/seasonHistory.js's per-category sweep only
      // ever checks the DESTINATION team's own category standings, which
      // would never contain a rider who raced somewhere else entirely,
      // and would otherwise silently skip their whole season.
      ...(neg.toTeamId === "player" && neg.categoryKey !== category
        ? { _pendingHistoryEntry: buildSeasonHistoryEntry(neg.riderId, fromTeamName, standingsByCategory[neg.categoryKey] || {}, neg.categoryKey, neg.createdSeason) }
        : {}),
    };
    let placed = false;
    if (neg.toTeamId === "player") {
      // Hard safety net: never let the player's roster exceed 2 riders
      // here, even in an edge case where releases were undone after
      // offers were already lined up (see App.jsx's nextSeasonPlayerRiderCount
      // guard, which prevents this in the normal flow).
      if (nextPlayerRiders.length < 2) { nextPlayerRiders.push(signedRider); placed = true; }
      else strandedRiders.push(finalizeStrandedHistory(signedRider, standingsByCategory, neg.categoryKey, neg.createdSeason));
    } else {
      // AI-vs-AI deals always happen within a single category (see
      // maybeGenerateAIInitiatedNegotiations), so the destination lives
      // in that same category — rivals for the played one, or the
      // matching background category's own teams otherwise.
      const destTeam = findTeamInCategory(neg.toTeamId, neg.categoryKey);
      if (destTeam && destTeam.riders.length < 2) { destTeam.riders.push(signedRider); placed = true; }
      else strandedRiders.push(finalizeStrandedHistory(signedRider, standingsByCategory, neg.categoryKey, neg.createdSeason));
    }
    // Only a negotiation that actually placed its rider on the
    // destination team counts as "applied" — this is what the season
    // summary (buildMarketSummaryByCategory) uses to decide whether a
    // "ficha por X" entry is real. A negotiation that reached
    // "confirmed" but got stranded here never really moved anyone; the
    // rider's actual fate is the free-agent pool, already documented
    // through the normal path once someone signs them.
    if (placed) appliedIds.push(neg.id);
    else strandedNegotiationIds.push(neg.id);
  });

  return {
    playerTeam: { ...playerTeam, riders: nextPlayerRiders },
    rivalTeams: nextRivals,
    otherCategories: nextOther,
    appliedIds,
    strandedRiders,
    strandedNegotiationIds,
  };
}

/** Splits off any rider marked "despedir al finalizar la temporada"
 * (section 12) — they raced the whole season normally, and only now, at
 * the transition, actually leave the roster and become a free agent. */
export function applyReleasedAtSeasonEnd(playerTeam) {
  const staying = playerTeam.riders.filter((r) => !r.releasedAtSeasonEnd);
  const released = playerTeam.riders.filter((r) => r.releasedAtSeasonEnd);
  return { playerTeam: { ...playerTeam, riders: staying }, released };
}

/**
 * Applies renewals the instant both sides agree (section 1: "una
 * renovación no es un fichaje... no debe esperar al final de
 * temporada"). Unlike a signing, there's no roster reshuffling to do —
 * the rider already races for this team, so this just adds the newly
 * negotiated years onto whatever they had left and updates their
 * salary, right on the team object that's about to be committed to
 * state. Also clears `releasedAtSeasonEnd`: a rider who just signed a
 * fresh renewal obviously isn't leaving anymore, even if they'd
 * earlier been marked to.
 */
export function applyRenewalsToTeam(team, renewals) {
  if (!renewals.length) return team;
  const riders = team.riders.map((r) => {
    const renewal = renewals.find((rn) => rn.riderId === r.id && rn.teamId === team.id);
    if (!renewal) return r;
    return { ...r, contractYears: (r.contractYears ?? 0) + renewal.years, salary: renewal.salary, releasedAtSeasonEnd: false };
  });
  return { ...team, riders };
}

/**
 * Builds the season-end summary shown in the "Resumen del mercado"
 * screen (pages/TransferSummary.jsx) — grouped by what actually
 * happened, not by which Grand Prix it happened in: Ascensos,
 * Descensos, Fichajes, Renovaciones, Retiradas and Salidas, each kept
 * clearly separate so it reads like an official transfer-window report.
 * Combines the classic end-of-season batch (retirements, releases,
 * promotions — see utils/transferMarket.js; rookie debuts fold into
 * Fichajes, since a debut is just a rider joining a team's lineup) with
 * every confirmed live-market negotiation from throughout the season —
 * signings land in Fichajes, renewals (which apply immediately and
 * reach `status: "applied"`, never "confirmed" — see
 * resolvePendingNegotiations) land in Renovaciones.
 */
export function buildMarketSummaryByCategory(marketLog, marketNegotiations, strandedNegotiationIds) {
  const summary = {};
  const seenConfirmedRiderIds = new Set();
  const stranded = new Set(strandedNegotiationIds || []);
  CATEGORY_ORDER.forEach((ck) => {
    const groups = { ascenso: [], descenso: [], fichaje: [], renovacion: [], retiro: [], salida: [] };

    (marketLog[ck] || []).forEach((e) => {
      const bucket = e.type === "debut" ? "fichaje" : e.type;
      if (groups[bucket]) groups[bucket].push({ text: e.text, riderId: e.riderId });
    });

    (marketNegotiations || []).filter((n) => n.categoryKey === ck).forEach((n) => {
      if (n.status === "confirmed") {
        // A negotiation that reached "confirmed" but got stranded by
        // applyConfirmedNegotiations (its destination team was already
        // full from another deal processed first) never actually moved
        // anyone — the rider really became a free agent instead, which
        // gets reported through the normal path once someone signs
        // them. Showing this one too would be reporting a move that
        // never happened.
        if (stranded.has(n.id)) return;
        // Same rule as applyConfirmedNegotiations: only the first
        // confirmed negotiation for a given rider is real. A rider can
        // never have actually signed for two teams — if two
        // negotiations both reached "confirmed", only the one that
        // actually moved them belongs in the report.
        if (seenConfirmedRiderIds.has(n.riderId)) return;
        seenConfirmedRiderIds.add(n.riderId);
        groups.fichaje.push({
          riderId: n.riderId,
          text: n.fromTeamName
            ? `${n.riderName} ficha por ${n.toTeamName} tras una negociación con ${n.fromTeamName}.`
            : `${n.riderName} firma por ${n.toTeamName}.`,
        });
      } else if (n.status === "applied" && n.kind === "renewal") {
        const years = n.riderTerms?.years;
        groups.renovacion.push({
          riderId: n.riderId,
          text: `${n.riderName} renueva con ${n.toTeamName}${years ? ` (${years} temporada${years === 1 ? "" : "s"} más)` : ""}.`,
        });
      }
    });

    summary[ck] = groups;
  });
  return summary;
}

/* ----------------------------------------------------------------------
   NEGOTIATION LIFECYCLE
   ------------------------------------------------------------------- */

/** Starts a new negotiation initiated by the player. `teamOfferAmount`
 * is null for a rider with one year left or a free agent (per the
 * design, "Intentar contratar" never negotiates with a team). Always
 * resolves after the next Grand Prix — never instantly. */
export function createNegotiation({ kind, rider, categoryKey, fromTeam, toTeamId, toTeamName, teamOfferAmount, riderTerms, round, seasonNumber }) {
  return {
    id: nextMarketId("neg"),
    kind,
    riderId: rider.id,
    riderName: rider.name,
    categoryKey,
    fromTeamId: fromTeam?.id ?? null,
    fromTeamName: fromTeam?.name ?? null,
    toTeamId,
    toTeamName,
    teamOfferAmount: teamOfferAmount ?? null,
    riderTerms,
    status: teamOfferAmount != null ? "pending_team" : "pending_rider",
    createdRound: round,
    createdSeason: seasonNumber,
    resolveAtRound: round + 1,
    log: [],
    // Structured trail (distinct from the free-text `log` above) used to
    // render "Oferta inicial → Contraoferta del equipo → ..." in the
    // negotiation screen, and to read momentum (negotiationLeverage)
    // across rounds — every actor's proposal at every step.
    history: [{ round, actor: "player", type: "offer", teamOfferAmount: teamOfferAmount ?? null, riderSalary: riderTerms?.salary ?? null, riderTerms }],
  };
}

/**
 * Advances every pending negotiation whose resolution point has been
 * reached (i.e. the next Grand Prix has now been run). Returns the
 * updated negotiation list plus any notification texts generated along
 * the way, meant to surface "encima del panel del circuito" per the
 * design. A negotiation only ever becomes `confirmed` once BOTH sides
 * have said yes — either side rejecting ends it as `failed`.
 */
/* Hard cap on how many rounds a single negotiation can go back and forth
   before whichever AI side is involved has to make a final call (accept
   or withdraw) instead of countering again — "un límite razonable...
   entre 3 y 6 intercambios". Counted directly off the structured
   history, so it's the same number whether the player or the AI reads
   it. */
const MAX_NEGOTIATION_ROUNDS = 6;

function negotiationLog(...args) {
  // No formal internal dev-logger exists yet for this module, and this
  // exact state machine has already caused one stuck-negotiation bug —
  // a few tagged, low-noise lines are worth keeping permanently so the
  // full flow of any negotiation can be traced from the browser console
  // if something like this happens again.
  console.log("[market]", ...args);
}

/** The AI's own response when it's the one BUYING and the selling team
 * has just countered the compensation offer — the exact counterpart to
 * the player's own acceptCounterOffer/modifyOffer/withdrawOffer, just
 * automated. Never leaves the negotiation hanging: past the round
 * limit, it's a final accept-or-withdraw, no more countering. */
function aiEvaluateTeamCounter(rider, buyerTeam, counterAmount, scale, roundsUsed) {
  const marketValue = computeMarketValue(rider, scale);
  const ratio = marketValue > 0 ? counterAmount / marketValue : 1;
  const budgetOk = !buyerTeam.budget || counterAmount <= buyerTeam.budget * 0.5;
  const forced = roundsUsed >= MAX_NEGOTIATION_ROUNDS;
  if (budgetOk && (ratio <= 1.3 || (forced && ratio <= 1.6))) return { decision: "accept" };
  if (!forced && budgetOk && ratio <= 1.7) {
    return { decision: "counter", newAmount: Math.round(marketValue * clamp(1 + (ratio - 1) * 0.5, 1, 1.6)) };
  }
  return { decision: "withdraw" };
}

/** Same idea for when the rider has countered the AI-buyer's contract
 * terms — the AI's counterpart to the player deciding whether to
 * accept, sweeten, or walk away from a rider's salary demand. */
function aiEvaluateRiderCounter(rider, buyerTeam, counterTerms, scale, roundsUsed) {
  const fairSalary = computeSalary(rider, scale);
  const ratio = fairSalary > 0 ? counterTerms.salary / fairSalary : 1;
  const budgetOk = !buyerTeam.budget || counterTerms.salary <= buyerTeam.budget * 0.35;
  const forced = roundsUsed >= MAX_NEGOTIATION_ROUNDS;
  if (budgetOk && (ratio <= 1.3 || (forced && ratio <= 1.6))) return { decision: "accept" };
  if (!forced && budgetOk && ratio <= 1.7) {
    return { decision: "counter", newTerms: { ...counterTerms, salary: Math.round(fairSalary * clamp(1 + (ratio - 1) * 0.5, 1, 1.6)) } };
  }
  return { decision: "withdraw" };
}

export function resolvePendingNegotiations(negotiations, round, resolveCtx) {
  const notifications = [];
  const justConfirmedRenewals = [];
  const updated = (negotiations || []).map((neg) => {
    if (neg.resolveAtRound > round) return neg;
    if (["confirmed", "failed", "withdrawn", "applied"].includes(neg.status)) return neg;

    const { findTeam, findRider, riderStandings, scale } = resolveCtx;
    const rider = findRider(neg.riderId, neg.categoryKey);
    if (!rider) return { ...neg, status: "failed", log: [...neg.log, { round, text: "El piloto ya no está disponible." }] };

    let status = neg.status;
    let teamOfferAmount = neg.teamOfferAmount;
    let riderTerms = neg.riderTerms;
    let resolveAtRound = neg.resolveAtRound;
    const logAdd = [];
    const historyAdd = [];
    const roundsUsed = (neg.history || []).length;

    const involvesPlayer = neg.toTeamId === "player" || neg.fromTeamId === "player";

    negotiationLog(`(${neg.id}) tick — status=${status}, rider=${neg.riderName}, buyer=${neg.toTeamName}, rounds=${roundsUsed}`);

    if (status === "pending_team" && teamOfferAmount != null && neg.fromTeamId !== "player") {
      const fromTeam = findTeam(neg.fromTeamId, neg.categoryKey);
      const result = fromTeam ? scoreTeamOfferAcceptance(rider, fromTeam, teamOfferAmount, scale, riderStandings, neg) : { accept: true, counterAmount: null };
      if (result.accept) {
        status = "pending_rider";
        logAdd.push({ round, text: `${neg.fromTeamName} acepta la compensación por ${neg.riderName}.` });
        historyAdd.push({ round, actor: "team", type: "accept", teamOfferAmount });
        negotiationLog(`(${neg.id}) equipo acepta la compensación`);
        if (involvesPlayer) notifications.push(`${neg.fromTeamName} ha aceptado vuestra oferta por ${neg.riderName}.`);
      } else if (result.counterAmount) {
        teamOfferAmount = result.counterAmount;
        status = "team_countered";
        logAdd.push({ round, text: `${neg.fromTeamName} presenta una contraoferta.` });
        historyAdd.push({ round, actor: "team", type: "counter", teamOfferAmount: result.counterAmount });
        negotiationLog(`(${neg.id}) equipo contraoferta compensación: €${result.counterAmount}`);
        if (involvesPlayer) notifications.push(`${neg.fromTeamName} presenta una contraoferta por ${neg.riderName}.`);
      } else {
        status = "failed";
        logAdd.push({ round, text: `${neg.fromTeamName} rechaza la oferta.` });
        historyAdd.push({ round, actor: "team", type: "reject" });
        negotiationLog(`(${neg.id}) equipo rechaza la oferta`);
        if (involvesPlayer) notifications.push(`${neg.fromTeamName} rechaza vuestra oferta por ${neg.riderName}.`);
      }
    } else if (status === "team_countered" && neg.toTeamId !== "player") {
      // The missing transition: the AI is the one buying, and the
      // selling team just countered — it must respond exactly like the
      // player would (accept / counter again / withdraw), never just
      // sit on it.
      const buyerTeam = findTeam(neg.toTeamId, neg.categoryKey);
      const result = buyerTeam ? aiEvaluateTeamCounter(rider, buyerTeam, teamOfferAmount, scale, roundsUsed) : { decision: "accept" };
      negotiationLog(`(${neg.id}) IA compradora evalúa contraoferta del equipo (€${teamOfferAmount}) -> ${result.decision}`);
      if (result.decision === "accept") {
        status = "pending_rider";
        logAdd.push({ round, text: `${neg.toTeamName} acepta la compensación pedida por ${neg.fromTeamName}.` });
        historyAdd.push({ round, actor: "buyer", type: "accept", teamOfferAmount });
        if (involvesPlayer) notifications.push(`${neg.toTeamName} acepta vuestra contraoferta por ${neg.riderName}.`);
      } else if (result.decision === "counter") {
        teamOfferAmount = result.newAmount;
        status = "pending_team";
        resolveAtRound = round + 1;
        logAdd.push({ round, text: `${neg.toTeamName} presenta una nueva oferta de compensación.` });
        historyAdd.push({ round, actor: "buyer", type: "offer", teamOfferAmount: result.newAmount });
        if (involvesPlayer) notifications.push(`${neg.toTeamName} mejora su oferta por ${neg.riderName}: €${result.newAmount.toLocaleString()}.`);
      } else {
        status = "failed";
        logAdd.push({ round, text: `${neg.toTeamName} se retira de la negociación.` });
        historyAdd.push({ round, actor: "buyer", type: "withdraw" });
        if (involvesPlayer) notifications.push(`${neg.toTeamName} se retira de la negociación por ${neg.riderName}.`);
      }
    }

    if (status === "pending_rider") {
      const toTeam = findTeam(neg.toTeamId, neg.categoryKey);
      const currentTeam = findTeam(neg.fromTeamId, neg.categoryKey);
      const currentTeamBikeAvg = currentTeam?.bike
        ? Object.values(currentTeam.bike).reduce((s, v) => s + v, 0) / Object.values(currentTeam.bike).length
        : null;
      const result = scoreRiderOfferAcceptance(rider, toTeam, riderTerms, { scale, isPromotion: false, currentTeamBikeAvg, negotiation: neg });
      if (result.accept) {
        if (neg.kind === "renewal") {
          status = "applied";
          justConfirmedRenewals.push({ riderId: neg.riderId, categoryKey: neg.categoryKey, teamId: neg.toTeamId, years: riderTerms.years, salary: riderTerms.salary });
          negotiationLog(`(${neg.id}) renovación aceptada — aplicada de inmediato al contrato`);
        } else {
          status = "confirmed";
        }
        logAdd.push({ round, text: `${neg.riderName} acepta el contrato.` });
        historyAdd.push({ round, actor: "rider", type: "accept", riderTerms });
        negotiationLog(`(${neg.id}) piloto acepta — fichaje completado`);
        notifications.push(involvesPlayer
          ? (neg.kind === "renewal" ? `${neg.riderName} renueva su contrato con ${neg.toTeamName}.` : `Acuerdo completo alcanzado: ${neg.riderName} firma por ${neg.toTeamName} para la próxima temporada.`)
          : `${neg.riderName} firmará por ${neg.toTeamName} la próxima temporada.`);
      } else if (result.counterTerms) {
        riderTerms = result.counterTerms;
        status = "rider_countered";
        logAdd.push({ round, text: `${neg.riderName} pide mejores condiciones.` });
        historyAdd.push({ round, actor: "rider", type: "counter", riderSalary: result.counterTerms.salary, riderTerms: result.counterTerms });
        negotiationLog(`(${neg.id}) piloto pide mejores condiciones: €${result.counterTerms.salary}/año`);
        if (involvesPlayer) notifications.push(`${neg.riderName} presenta una contraoferta salarial.`);
      } else {
        status = "failed";
        logAdd.push({ round, text: `${neg.riderName} rechaza la propuesta.` });
        historyAdd.push({ round, actor: "rider", type: "reject" });
        negotiationLog(`(${neg.id}) piloto rechaza la propuesta`);
        if (involvesPlayer) notifications.push(`${neg.riderName} rechaza vuestra propuesta.`);
      }
    } else if (status === "rider_countered" && neg.toTeamId !== "player") {
      // The other missing transition: the AI is buying and the RIDER
      // countered — same idea, automated equivalent of the player's own
      // accept/modify/withdraw.
      const buyerTeam = findTeam(neg.toTeamId, neg.categoryKey);
      const result = buyerTeam ? aiEvaluateRiderCounter(rider, buyerTeam, riderTerms, scale, roundsUsed) : { decision: "accept" };
      negotiationLog(`(${neg.id}) IA compradora evalúa contraoferta del piloto (€${riderTerms?.salary}) -> ${result.decision}`);
      if (result.decision === "accept") {
        if (neg.kind === "renewal") {
          status = "applied";
          justConfirmedRenewals.push({ riderId: neg.riderId, categoryKey: neg.categoryKey, teamId: neg.toTeamId, years: riderTerms.years, salary: riderTerms.salary });
        } else {
          status = "confirmed";
        }
        logAdd.push({ round, text: `${neg.toTeamName} acepta las condiciones de ${neg.riderName}.` });
        historyAdd.push({ round, actor: "buyer", type: "accept", riderTerms });
        notifications.push(involvesPlayer
          ? (neg.kind === "renewal" ? `${neg.riderName} renueva su contrato con ${neg.toTeamName}.` : `Acuerdo completo alcanzado: ${neg.riderName} firma por ${neg.toTeamName} para la próxima temporada.`)
          : `${neg.riderName} firmará por ${neg.toTeamName} la próxima temporada.`);
      } else if (result.decision === "counter") {
        riderTerms = result.newTerms;
        status = "pending_rider";
        resolveAtRound = round + 1;
        logAdd.push({ round, text: `${neg.toTeamName} mejora su propuesta a ${neg.riderName}.` });
        historyAdd.push({ round, actor: "buyer", type: "offer", riderSalary: result.newTerms.salary, riderTerms: result.newTerms });
        if (involvesPlayer) notifications.push(`${neg.toTeamName} mejora su oferta a ${neg.riderName}: €${result.newTerms.salary.toLocaleString()}/año.`);
      } else {
        status = "failed";
        logAdd.push({ round, text: `${neg.toTeamName} se retira de la negociación.` });
        historyAdd.push({ round, actor: "buyer", type: "withdraw" });
        if (involvesPlayer) notifications.push(`${neg.toTeamName} se retira de la negociación por ${neg.riderName}.`);
      }
    }

    return { ...neg, status, teamOfferAmount, riderTerms, resolveAtRound, log: [...neg.log, ...logAdd], history: [...(neg.history || []), ...historyAdd] };
  });

  return { negotiations: updated, notifications, justConfirmedRenewals };
}

/** Buckets negotiations into the display groups the "Ofertas" panel
 * needs — pure presentation grouping, no state change. Contraofertas
 * (team_countered/rider_countered) get their own bucket since they need
 * an explicit player decision, distinct from merely pending ones. */
export function groupNegotiationsByStatus(negotiations) {
  const groups = { contraofertas: [], pendientes: [], aceptadas: [], rechazadas: [], retiradas: [], finalizadas: [] };
  (negotiations || []).forEach((neg) => {
    if (neg.status === "confirmed" || neg.status === "applied") groups.finalizadas.push(neg);
    else if (neg.status === "failed") groups.rechazadas.push(neg);
    else if (neg.status === "withdrawn") groups.retiradas.push(neg);
    else if (["team_countered", "rider_countered"].includes(neg.status)) groups.contraofertas.push(neg);
    else if (["pending_team", "pending_rider"].includes(neg.status)) groups.pendientes.push(neg);
    else groups.aceptadas.push(neg);
  });
  return groups;
}

/**
 * Player actions on a negotiation currently awaiting their decision
 * (section 1 of the design — "gestión completa de las contraofertas").
 * All three keep the exact same negotiation object and its history
 * intact, just move it forward:
 *
 *  - accept: takes the AI's own counter figure as the new agreed value
 *    and advances exactly one step (team's counter accepted -> now
 *    asking the rider; rider's counter accepted -> deal confirmed
 *    outright, since a rider's counter already means "I'll sign at this
 *    price").
 *  - modify: the player proposes new numbers instead; goes back to
 *    "pending" on whichever side is live and waits for the next Grand
 *    Prix again, same as any fresh offer. No round limit — the AI's own
 *    hardening position (see negotiationLeverage) is what naturally
 *    ends a negotiation that goes nowhere, not an artificial cap.
 *  - withdraw: ends it for good; never resolves again.
 */
export function acceptCounterOffer(negotiations, negotiationId, round) {
  return (negotiations || []).map((neg) => {
    if (neg.id !== negotiationId) return neg;
    const historyAdd = [{ round, actor: "player", type: "accept" }];
    if (neg.status === "team_countered") {
      return { ...neg, status: "pending_rider", resolveAtRound: round + 1, history: [...(neg.history || []), ...historyAdd] };
    }
    if (neg.status === "rider_countered") {
      return { ...neg, status: "confirmed", history: [...(neg.history || []), ...historyAdd] };
    }
    return neg;
  });
}

export function modifyOffer(negotiations, negotiationId, { teamOfferAmount, riderTerms }, round) {
  return (negotiations || []).map((neg) => {
    if (neg.id !== negotiationId) return neg;
    const onTeamSide = neg.status === "team_countered";
    const nextTeamOfferAmount = onTeamSide ? teamOfferAmount : neg.teamOfferAmount;
    const nextRiderTerms = onTeamSide ? neg.riderTerms : riderTerms;
    const historyAdd = [{
      round, actor: "player", type: "offer",
      teamOfferAmount: onTeamSide ? teamOfferAmount : null,
      riderSalary: onTeamSide ? null : riderTerms?.salary ?? null,
      riderTerms: onTeamSide ? null : riderTerms,
    }];
    return {
      ...neg,
      status: onTeamSide ? "pending_team" : "pending_rider",
      teamOfferAmount: nextTeamOfferAmount,
      riderTerms: nextRiderTerms,
      resolveAtRound: round + 1,
      history: [...(neg.history || []), ...historyAdd],
    };
  });
}

export function withdrawOffer(negotiations, negotiationId, round) {
  return (negotiations || []).map((neg) => {
    if (neg.id !== negotiationId) return neg;
    return { ...neg, status: "withdrawn", history: [...(neg.history || []), { round, actor: "player", type: "withdraw" }] };
  });
}

/** How many riders are already lined up to join the player's team next
 * season via a confirmed negotiation — used to enforce the "máximo dos
 * pilotos con contrato para la siguiente temporada" rule when the player
 * tries to start a new offer. */
export function countConfirmedIncomingForTeam(marketNegotiations, teamId) {
  return (marketNegotiations || []).filter((n) => n.toTeamId === teamId && n.status === "confirmed").length;
}

/**
 * How many distinct riders are already committed to a team for next
 * season — riders currently on the roster who aren't marked to leave,
 * plus anyone with a confirmed incoming signing, counted by rider ID so
 * the same person is never counted twice. That double-count was a real
 * bug: if a renewal or a stale negotiation ever left both a roster
 * entry AND a separate "confirmed" negotiation pointing at the exact
 * same rider, the naive staying+incoming sum could read "2 committed"
 * from a single actual rider, wrongly locking the roster-planning
 * screen (undo release / new offers) even though only one seat was
 * really taken.
 */
export function nextSeasonCommittedRiderCount(team, marketNegotiations, teamId = "player") {
  if (!team) return 0;
  // A rider who's already confirmed to sign elsewhere next season is
  // leaving regardless of whether the player also flipped "designar
  // para quedar libre" — the game already told them their contract is
  // decided, so the seat should be free to fill without that extra,
  // redundant step.
  const leavingIds = new Set(
    (marketNegotiations || [])
      .filter((n) => n.fromTeamId === teamId && n.status === "confirmed")
      .map((n) => n.riderId)
  );
  const committedIds = new Set(
    (team.riders || []).filter((r) => !r.releasedAtSeasonEnd && !leavingIds.has(r.id)).map((r) => r.id)
  );
  (marketNegotiations || [])
    .filter((n) => n.toTeamId === teamId && n.status === "confirmed")
    .forEach((n) => committedIds.add(n.riderId));
  return committedIds.size;
}

/**
 * One full market "tick" — called once per Grand Prix. Generates this
 * race's rumors for every category, resolves any negotiation whose time
 * has come, and occasionally has a rival team make an unsolicited offer
 * for one of the player's own riders. Doesn't yet drive AI-vs-AI dealing
 * on its own (that still happens at the season-end market,
 * utils/transferMarket.js) — this tick's job for now is rumors + every
 * negotiation touching the player, incoming or outgoing.
 */
export function tickMarket({ marketRumors, marketNegotiations }, { playerTeam, rivalTeams, otherCategories, freeAgents, category, round, totalRounds, seasonNumber, scale, riderStandings, findTeam, findRider }) {
  const allTeamsThisCategory = [playerTeam, ...rivalTeams];
  const newRumors = [
    ...generateRumorsForCategory(allTeamsThisCategory, freeAgents, category, round, totalRounds, seasonNumber),
    ...CATEGORY_ORDER.filter((k) => k !== category).flatMap((k) =>
      generateRumorsForCategory(otherCategories[k]?.teams || [], [], k, round, totalRounds, seasonNumber)
    ),
  ];

  const firstPass = resolvePendingNegotiations(marketNegotiations, round, { findTeam, findRider, riderStandings, scale });
  const notifications = firstPass.notifications;
  let justConfirmedRenewals = firstPass.justConfirmedRenewals;

  const incomingOffer = maybeGenerateIncomingOffer(playerTeam, rivalTeams, category, round, totalRounds, seasonNumber, scale, firstPass.negotiations);
  let withIncoming = incomingOffer ? [...firstPass.negotiations, incomingOffer] : firstPass.negotiations;
  if (incomingOffer) notifications.push(`${incomingOffer.toTeamName} presenta una oferta por ${incomingOffer.riderName}.`);

  // AI-vs-AI dealing: every category, including the two the player isn't
  // currently playing in, using the exact same negotiation lifecycle.
  const teamsByCategory = {
    [category]: allTeamsThisCategory,
    ...Object.fromEntries(CATEGORY_ORDER.filter((k) => k !== category).map((k) => [k, otherCategories[k]?.teams || []])),
  };
  const aiNegotiations = maybeGenerateAIInitiatedNegotiations(teamsByCategory, freeAgents, round, totalRounds, seasonNumber, scale, withIncoming);
  withIncoming = [...withIncoming, ...aiNegotiations];

  // Proactive AI renewals — every category, using that category's own
  // (mid-season, provisional) standings to judge each rider.
  const riderStandingsByCategory = {
    [category]: riderStandings,
    ...Object.fromEntries(CATEGORY_ORDER.filter((k) => k !== category).map((k) => [k, otherCategories[k]?.riderStandings || {}])),
  };
  CATEGORY_ORDER.forEach((ck) => {
    const renewals = maybeGenerateAIRenewalNegotiations(teamsByCategory[ck] || [], ck, riderStandingsByCategory[ck], round, totalRounds, seasonNumber, scale, withIncoming);
    withIncoming = [...withIncoming, ...renewals];
  });

  // Section 4: a negotiation started (or still open) during the season's
  // very last Grand Prix would otherwise wait for a "next race" that
  // never comes, and get silently discarded at the season transition.
  // Only for that last round, everything still open is forced through
  // as many resolution passes as it takes to reach a definitive state —
  // the exact same scoring and state machine, just without waiting
  // between rounds. A hard cap of iterations guards against anything
  // that could otherwise loop forever.
  const isLastRound = round >= totalRounds - 1;
  if (isLastRound) {
    const TERMINAL = ["confirmed", "failed", "withdrawn", "applied"];
    let iterations = 0;
    while (withIncoming.some((n) => !TERMINAL.includes(n.status)) && iterations < 12) {
      const forced = withIncoming.map((n) => (TERMINAL.includes(n.status) ? n : { ...n, resolveAtRound: round }));
      const pass = resolvePendingNegotiations(forced, round, { findTeam, findRider, riderStandings, scale });
      withIncoming = pass.negotiations;
      notifications.push(...pass.notifications);
      justConfirmedRenewals = [...justConfirmedRenewals, ...pass.justConfirmedRenewals];
      iterations += 1;
    }
    // Absolute safety net: anything that still couldn't reach a
    // definitive state (a malformed negotiation, or a side with no
    // valid team to evaluate it) is withdrawn rather than carried into
    // a new season in limbo.
    withIncoming = withIncoming.map((n) => (TERMINAL.includes(n.status) ? n : { ...n, status: "withdrawn" }));
  }

  return {
    marketRumors: appendRumors(marketRumors, newRumors),
    marketNegotiations: withIncoming,
    notifications,
    justConfirmedRenewals,
  };
}
