import { computeJoinScore, computeTeamAcceptScore, riderPersonality } from "./marketAI.js";
import { NEGOTIATION_DIALOGUE, TEAM_NEGOTIATION_DIALOGUE } from "../data/negotiationDialogue.js";

/** How many Grands Prix must pass before the player can reopen a
 * conversation with a rider who flat-out rejected (or whose patience
 * ran out with nothing pending). Cooldown lives on the OFFERING
 * team, keyed by rider id — "se cansó de negociar contigo" specifically,
 * not some global rule about the rider in general. */
export const NEGOTIATION_COOLDOWN_ROUNDS = 3;

/** Temperamental riders lose patience after 2 offers in the same
 * sitting; everyone else tolerates 3 before the conversation closes
 * on its own. */
export function negotiationPatience(rider) {
  return riderPersonality(rider) === "Temperamental" ? 2 : 3;
}

/** Same score computeJoinScore already produces (0.03-0.95), split
 * into the three zones the negotiation screen actually acts on.
 * Thresholds picked so a merely "acceptable" offer doesn't win
 * outright — favorable needs to be a genuinely strong offer, frío
 * needs to be a genuinely weak one, and everything in the wide middle
 * earns a "lo pensaré" instead of an instant answer either way. */
export function thermometerZone(score) {
  // Bug fixed: computeJoinScore was originally built for a single
  // probabilistic roll (Math.random() < score) — under that lens, a
  // score around 0.5 was already a genuine coin flip, not a rejection.
  // These thresholds were calibrated far too high relative to that
  // scale: a rider from a much smaller team, offered exactly their
  // current salary by a genuine top team like Ducati (a real prestige
  // gap most riders would jump at), scored around 0.35-0.40 — landing
  // as an outright "frío" rejection, and needed DOUBLE their salary
  // just to reach "favorable". Lowered to match what the score was
  // actually ever meant to represent.
  if (score >= 0.58) return "favorable";
  if (score >= 0.28) return "dudoso";
  return "frio";
}

export function negotiationThermometer(rider, team, categoryKey, offeredSalary, ctx = {}) {
  const score = computeJoinScore(rider, team, categoryKey, offeredSalary, ctx);
  return { score, zone: thermometerZone(score) };
}

/** Picks a line for this personality/zone that wasn't just used,
 * cycling through all 5 before any of them can repeat — usedLines is
 * the ordered list of lines already shown THIS conversation (any
 * zone, any personality is irrelevant here since each personality has
 * its own bank), so a player who bounces between zones on successive
 * offers still won't hear the exact same line twice in a row. */
export function pickNegotiationLine(personality, zone, usedLines = []) {
  const bank = NEGOTIATION_DIALOGUE[personality]?.[zone] || NEGOTIATION_DIALOGUE.Profesional[zone];
  const fresh = bank.filter((line) => !usedLines.includes(line));
  const pool = fresh.length ? fresh : bank; // every line already used once — start the cycle over
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Whether the player can even open a conversation with this rider
 * right now — false while a prior rejection's cooldown is still
 * ticking. cooldowns is team.negotiationCooldowns, { [riderId]: untilRound }. */
export function isNegotiationOnCooldown(cooldowns, riderId, currentRound) {
  const until = (cooldowns || {})[riderId];
  return Number.isFinite(until) && currentRound < until;
}

/** Same three zones as the rider's own thermometer, applied to the
 * SELLING TEAM's side of a release-fee negotiation instead — same
 * threshold values too, since computeTeamAcceptScore was deliberately
 * built on the exact same 0.15-baseline, ratio-driven shape as
 * computeJoinScore, for exactly this reason: one shared sense of
 * "what a given score actually means" across both sides of a deal. */
export function teamNegotiationThermometer(rider, team, offerAmount, scale) {
  const score = computeTeamAcceptScore(rider, team, offerAmount, scale);
  return { score, zone: thermometerZone(score) };
}

export function pickTeamNegotiationLine(zone, usedLines = []) {
  const bank = TEAM_NEGOTIATION_DIALOGUE[zone];
  const fresh = bank.filter((line) => !usedLines.includes(line));
  const pool = fresh.length ? fresh : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}
