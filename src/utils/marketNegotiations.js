import { CATEGORY_ORDER } from "../data/categories.js";
import { clamp, pick } from "./random.js";
import { computeMarketValue, computeSalary, isFreeAgentEligibleForCategory } from "./riders.js";
import { moraleTierInfo } from "./riderMorale.js";

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
export function scoreTeamOfferAcceptance(rider, fromTeam, offerAmount, scale, riderStandings) {
  const marketValue = computeMarketValue(rider, scale);
  const importance = riderImportanceToTeam(rider, fromTeam, riderStandings);
  const contractLeft = rider.contractYears ?? 0;
  const expectationAmbition = fromTeam.expectation ? clamp((15 - fromTeam.expectation.min) / 15, 0, 1) : 0.4;
  const budgetPressure = fromTeam.budget < 0 ? 0.25 : clamp(fromTeam.budget / Math.max(1, marketValue * 4), 0, 0.3);

  // How far the offer clears fair value, adjusted for how much the team
  // actually needs to sell (budget pressure) versus how much it needs to
  // keep winning (ambition + how important this rider already is).
  const askingPrice = marketValue * (1 + importance * 0.6 + expectationAmbition * 0.4 + contractLeft * 0.08);
  const ratio = askingPrice > 0 ? offerAmount / askingPrice : 1;

  if (ratio >= 1 || budgetPressure >= 0.28) {
    return { accept: true, counterAmount: null };
  }
  if (ratio >= 0.75) {
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
  const { scale, isPromotion, currentTeamBikeAvg } = ctx;
  const fairSalary = computeSalary(rider, scale);
  const salaryScore = fairSalary > 0 ? clamp((terms.salary / fairSalary - 1) * 1.2, -1, 1) : 0;
  const durationScore = clamp((terms.years - 1) / 2, -0.3, 0.4);

  const bikeAvgOffered = toTeam?.bike
    ? Object.values(toTeam.bike).reduce((s, v) => s + v, 0) / Object.values(toTeam.bike).length
    : 60;
  const bikeDelta = currentTeamBikeAvg != null ? (bikeAvgOffered - currentTeamBikeAvg) / 40 : 0;
  const prestigeScore = clamp(bikeDelta, -0.5, 0.5);

  const moraleBonus = (moraleTierInfo(rider.moraleState?.tier).modifier - 1) * 4; // roughly -0.24..+0.24
  const ageFactor = rider.age <= 23 ? 0.15 : rider.age >= 33 ? -0.1 : 0;
  const promotionBonus = isPromotion ? 0.35 : 0;

  const total = clamp(salaryScore * 0.35 + durationScore * 0.15 + prestigeScore * 0.25 + moraleBonus * 0.1 + ageFactor + promotionBonus, -1, 1);

  if (total >= 0.15) return { accept: true, counterTerms: null };
  if (total >= -0.15) {
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
export function maybeGenerateAIInitiatedNegotiations(teamsByCategory, freeAgents, round, totalRounds, seasonNumber, scale, marketNegotiations) {
  const heat = marketHeat(round, totalRounds);
  const created = [];

  CATEGORY_ORDER.forEach((categoryKey) => {
    const teams = (teamsByCategory[categoryKey] || []).filter((t) => t.id !== "player");
    if (teams.length < 2 || Math.random() > heat * 0.5) return;

    const buyer = pick(teams);
    const seatsTaken = marketNegotiations.filter((n) => n.toTeamId === buyer.id && n.categoryKey === categoryKey && n.status !== "failed").length
      + created.filter((n) => n.toTeamId === buyer.id && n.categoryKey === categoryKey).length;
    if (buyer.riders.length + seatsTaken >= 2) return;

    const eligibleFreeAgents = freeAgents.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey));
    const useFreeAgent = eligibleFreeAgents.length > 0 && Math.random() < 0.4;

    let rider = null;
    let fromTeam = null;
    if (useFreeAgent) {
      rider = pick(eligibleFreeAgents);
    } else {
      const sellers = teams.filter((t) => t.id !== buyer.id && t.riders.length);
      if (!sellers.length) return;
      const seller = pick(sellers);
      const candidates = seller.riders.filter((r) => isFreeAgentEligibleForCategory(r, categoryKey));
      if (!candidates.length) return;
      rider = pick(candidates);
      fromTeam = seller;
    }
    if (!rider) return;

    const alreadyNegotiating = [...marketNegotiations, ...created].some((n) => n.riderId === rider.id && n.status !== "failed");
    if (alreadyNegotiating) return;

    const marketValue = computeMarketValue(rider, scale);
    const teamOfferAmount = fromTeam ? Math.round(marketValue * (0.85 + Math.random() * 0.35)) : null;
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
 * A rival team occasionally makes an unsolicited offer for one of the
 * player's own contracted riders (section 14 of the design). Reuses the
 * exact same negotiation object/lifecycle as a player-initiated offer —
 * the only difference is who's on which side — so it shows up in the
 * same "Ofertas" panel and gets resolved by the same scoring functions.
 * Rarer than a plain rumor: this is a real, actionable offer, not just
 * gossip.
 */
export function maybeGenerateIncomingOffer(playerTeam, rivalTeams, category, round, totalRounds, seasonNumber, scale) {
  const heat = marketHeat(round, totalRounds);
  if (!rivalTeams.length || Math.random() > heat * 0.35) return null;
  const candidates = playerTeam.riders.filter((r) => (r.contractYears ?? 0) > 0 && !(r.injury && r.injury.sidelined));
  if (!candidates.length) return null;
  const rider = pick(candidates);
  const suitor = pick(rivalTeams);
  const marketValue = computeMarketValue(rider, scale);
  const teamOfferAmount = Math.round(marketValue * (0.9 + Math.random() * 0.4));
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
export function applyConfirmedNegotiations({ playerTeam, rivalTeams, otherCategories, category, marketNegotiations }) {
  const confirmed = (marketNegotiations || []).filter((n) => n.status === "confirmed");
  if (!confirmed.length) return { playerTeam, rivalTeams, otherCategories, appliedIds: [] };

  const nextPlayerRiders = [...playerTeam.riders];
  const nextRivals = rivalTeams.map((t) => ({ ...t, riders: [...t.riders] }));
  const nextOther = {};
  Object.entries(otherCategories || {}).forEach(([k, v]) => {
    nextOther[k] = { ...v, teams: v.teams.map((t) => ({ ...t, riders: [...t.riders] })) };
  });
  const appliedIds = [];

  function removeFromEverywhere(riderId, categoryKey) {
    if (categoryKey === category) {
      const ownIdx = nextPlayerRiders.findIndex((r) => r.id === riderId);
      if (ownIdx >= 0) return nextPlayerRiders.splice(ownIdx, 1)[0];
      for (const t of nextRivals) {
        const idx = t.riders.findIndex((r) => r.id === riderId);
        if (idx >= 0) return t.riders.splice(idx, 1)[0];
      }
      return null;
    }
    const catState = nextOther[categoryKey];
    if (!catState) return null;
    for (const t of catState.teams) {
      const idx = t.riders.findIndex((r) => r.id === riderId);
      if (idx >= 0) return t.riders.splice(idx, 1)[0];
    }
    return null;
  }

  function findTeamInCategory(teamId, categoryKey) {
    if (categoryKey === category) return nextRivals.find((t) => t.id === teamId) || null;
    return (nextOther[categoryKey]?.teams || []).find((t) => t.id === teamId) || null;
  }

  confirmed.forEach((neg) => {
    const rider = removeFromEverywhere(neg.riderId, neg.categoryKey);
    if (!rider) return;
    const signedRider = {
      ...rider,
      contractYears: neg.riderTerms?.years ?? 2,
      salary: neg.riderTerms?.salary ?? rider.salary,
      isNewTeamThisSeason: true,
    };
    if (neg.toTeamId === "player") {
      // Hard safety net: never let the player's roster exceed 2 riders
      // here, even in an edge case where releases were undone after
      // offers were already lined up (see App.jsx's nextSeasonPlayerRiderCount
      // guard, which prevents this in the normal flow).
      if (nextPlayerRiders.length < 2) nextPlayerRiders.push(signedRider);
    } else {
      // AI-vs-AI deals always happen within a single category (see
      // maybeGenerateAIInitiatedNegotiations), so the destination lives
      // in that same category — rivals for the played one, or the
      // matching background category's own teams otherwise.
      const destTeam = findTeamInCategory(neg.toTeamId, neg.categoryKey);
      if (destTeam && destTeam.riders.length < 2) destTeam.riders.push(signedRider);
    }
    appliedIds.push(neg.id);
  });

  return {
    playerTeam: { ...playerTeam, riders: nextPlayerRiders },
    rivalTeams: nextRivals,
    otherCategories: nextOther,
    appliedIds,
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
 * Builds the season-end summary shown in the "Resumen del mercado"
 * screen (pages/TransferSummary.jsx) — one chronological list per
 * category, combining two sources that happen at genuinely different
 * points in time: confirmed live-market negotiations (each tagged with
 * the real round it was agreed in, since they were negotiated
 * throughout the season) followed by the classic end-of-season batch
 * (retirements, renewals, releases, promotions, rookie debuts — see
 * utils/transferMarket.js), which conceptually all happen at the
 * season's close. Both sources are merged and sorted by round so the
 * whole thing reads as one real transfer-window timeline rather than
 * a pile of things that "just happened" with no sense of when.
 */
export function buildChronologicalMarketSummary(marketLog, marketNegotiations, totalRounds) {
  const summary = {};
  CATEGORY_ORDER.forEach((ck) => {
    const negotiationEntries = (marketNegotiations || [])
      .filter((n) => n.categoryKey === ck && n.status === "confirmed")
      .map((n) => ({
        type: "fichaje",
        text: n.fromTeamName
          ? `${n.riderName} ficha por ${n.toTeamName} tras una negociación con ${n.fromTeamName}.`
          : `${n.riderName} firma por ${n.toTeamName}.`,
        riderId: n.riderId,
        round: n.resolveAtRound,
      }));
    const classicEntries = (marketLog[ck] || []).map((e) => ({ ...e, round: totalRounds }));
    summary[ck] = [...negotiationEntries, ...classicEntries].sort((a, b) => a.round - b.round);
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
export function resolvePendingNegotiations(negotiations, round, resolveCtx) {
  const notifications = [];
  const updated = (negotiations || []).map((neg) => {
    if (neg.resolveAtRound > round) return neg;
    if (["confirmed", "failed"].includes(neg.status)) return neg;

    const { findTeam, findRider, riderStandings, scale } = resolveCtx;
    const rider = findRider(neg.riderId, neg.categoryKey);
    if (!rider) return { ...neg, status: "failed", log: [...neg.log, { round, text: "El piloto ya no está disponible." }] };

    let status = neg.status;
    let teamOfferAmount = neg.teamOfferAmount;
    let riderTerms = neg.riderTerms;
    const logAdd = [];

    const involvesPlayer = neg.toTeamId === "player" || neg.fromTeamId === "player";

    if (status === "pending_team" && teamOfferAmount != null && neg.fromTeamId !== "player") {
      const fromTeam = findTeam(neg.fromTeamId, neg.categoryKey);
      const result = fromTeam ? scoreTeamOfferAcceptance(rider, fromTeam, teamOfferAmount, scale, riderStandings) : { accept: true, counterAmount: null };
      if (result.accept) {
        status = "pending_rider";
        logAdd.push({ round, text: `${neg.fromTeamName} acepta la compensación por ${neg.riderName}.` });
        if (involvesPlayer) notifications.push(`${neg.fromTeamName} ha aceptado vuestra oferta por ${neg.riderName}.`);
      } else if (result.counterAmount) {
        teamOfferAmount = result.counterAmount;
        status = "team_countered";
        logAdd.push({ round, text: `${neg.fromTeamName} presenta una contraoferta.` });
        if (involvesPlayer) notifications.push(`${neg.fromTeamName} presenta una contraoferta por ${neg.riderName}.`);
      } else {
        status = "failed";
        logAdd.push({ round, text: `${neg.fromTeamName} rechaza la oferta.` });
        if (involvesPlayer) notifications.push(`${neg.fromTeamName} rechaza vuestra oferta por ${neg.riderName}.`);
      }
    }

    if (status === "pending_rider") {
      const toTeam = findTeam(neg.toTeamId, neg.categoryKey);
      const currentTeam = findTeam(neg.fromTeamId, neg.categoryKey);
      const currentTeamBikeAvg = currentTeam?.bike
        ? Object.values(currentTeam.bike).reduce((s, v) => s + v, 0) / Object.values(currentTeam.bike).length
        : null;
      const result = scoreRiderOfferAcceptance(rider, toTeam, riderTerms, { scale, isPromotion: false, currentTeamBikeAvg });
      if (result.accept) {
        status = "confirmed";
        logAdd.push({ round, text: `${neg.riderName} acepta el contrato.` });
        notifications.push(involvesPlayer
          ? `Acuerdo completo alcanzado: ${neg.riderName} firma por ${neg.toTeamName} para la próxima temporada.`
          : `${neg.riderName} firmará por ${neg.toTeamName} la próxima temporada.`);
      } else if (result.counterTerms) {
        riderTerms = result.counterTerms;
        status = "rider_countered";
        logAdd.push({ round, text: `${neg.riderName} pide mejores condiciones.` });
        if (involvesPlayer) notifications.push(`${neg.riderName} presenta una contraoferta salarial.`);
      } else {
        status = "failed";
        logAdd.push({ round, text: `${neg.riderName} rechaza la propuesta.` });
        if (involvesPlayer) notifications.push(`${neg.riderName} rechaza vuestra propuesta.`);
      }
    }

    return { ...neg, status, teamOfferAmount, riderTerms, log: [...neg.log, ...logAdd] };
  });

  return { negotiations: updated, notifications };
}

/** Buckets negotiations into the four display groups the "Ofertas" panel
 * needs — pure presentation grouping, no state change. */
export function groupNegotiationsByStatus(negotiations) {
  const groups = { pendientes: [], aceptadas: [], rechazadas: [], finalizadas: [] };
  (negotiations || []).forEach((neg) => {
    if (neg.status === "confirmed") groups.finalizadas.push(neg);
    else if (neg.status === "failed") groups.rechazadas.push(neg);
    else if (["pending_team", "pending_rider", "team_countered", "rider_countered"].includes(neg.status)) groups.pendientes.push(neg);
    else groups.aceptadas.push(neg);
  });
  return groups;
}

/** How many riders are already lined up to join the player's team next
 * season via a confirmed negotiation — used to enforce the "máximo dos
 * pilotos con contrato para la siguiente temporada" rule when the player
 * tries to start a new offer. */
export function countConfirmedIncomingForTeam(marketNegotiations, teamId) {
  return (marketNegotiations || []).filter((n) => n.toTeamId === teamId && n.status === "confirmed").length;
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

  const { negotiations, notifications } = resolvePendingNegotiations(marketNegotiations, round, { findTeam, findRider, riderStandings, scale });

  const incomingOffer = maybeGenerateIncomingOffer(playerTeam, rivalTeams, category, round, totalRounds, seasonNumber, scale);
  let withIncoming = incomingOffer ? [...negotiations, incomingOffer] : negotiations;
  if (incomingOffer) notifications.push(`${incomingOffer.toTeamName} presenta una oferta por ${incomingOffer.riderName}.`);

  // AI-vs-AI dealing: every category, including the two the player isn't
  // currently playing in, using the exact same negotiation lifecycle.
  const teamsByCategory = {
    [category]: allTeamsThisCategory,
    ...Object.fromEntries(CATEGORY_ORDER.filter((k) => k !== category).map((k) => [k, otherCategories[k]?.teams || []])),
  };
  const aiNegotiations = maybeGenerateAIInitiatedNegotiations(teamsByCategory, freeAgents, round, totalRounds, seasonNumber, scale, withIncoming);
  withIncoming = [...withIncoming, ...aiNegotiations];

  return {
    marketRumors: appendRumors(marketRumors, newRumors),
    marketNegotiations: withIncoming,
    notifications,
  };
}
