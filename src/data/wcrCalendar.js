/**
 * WorldWCR runs alongside the main Superbikes/Supersport/Sportbike
 * calendar, but only at 6 of their 12 rounds — the real 2026 calendar
 * (Portugal, Países Bajos, Hungría, Emilia-Romaña, Reino Unido,
 * España), all races Superbikes already visits, never a circuit of
 * its own. So this maps onto Superbikes' OWN round space (0-11, see
 * data/superbikesCalendar.js's SUPERBIKES_ROUND_MAP), one level
 * further in than that file maps onto the main 22-round calendar —
 * exactly the same "shared calendar, skip the weeks you don't race"
 * pattern, just nested one level deeper.
 *
 * WCR_RACE_SBK_ROUNDS values are indices into SUPERBIKES_CIRCUITS
 * (data/circuitsSuperbikes.js): 1=Algarve, 2=Assen, 3=Balaton Park,
 * 6=Misano, 7=Donington Park, 11=Jerez.
 */
import { dateForSuperbikesRound, SUPERBIKES_ROUND_MAP, SUPERBIKES_RACE_MAIN_ROUNDS } from "./superbikesCalendar.js";

export const WCR_RACE_SBK_ROUNDS = [1, 2, 3, 6, 7, 11];

export const WCR_ROUND_MAP = Array.from({ length: 12 }, (_, sbkRound) => {
  const idx = WCR_RACE_SBK_ROUNDS.indexOf(sbkRound);
  return idx === -1 ? null : idx;
});

/** True if WorldWCR has a scheduled round on this Superbikes-calendar round. */
export function isWcrRaceWeek(sbkRound) {
  return WCR_ROUND_MAP[sbkRound] != null;
}

/** WorldWCR races the exact same physical weekend as its paired
 * Superbikes round (they're literally at the same circuit, same
 * dates) — so its date is just dateForSuperbikesRound, looked up
 * through WCR_RACE_SBK_ROUNDS, not a separate date table. */
export function dateForWcrRound(wcrRoundIndex, seasonNumber = 1) {
  const sbkRound = WCR_RACE_SBK_ROUNDS[wcrRoundIndex];
  return dateForSuperbikesRound(sbkRound, seasonNumber);
}

/** Convenience wrapper matching the exact same signature as
 * isSuperbikesRaceWeek/isSupersportRaceWeek/isSportbikeRaceWeek (takes
 * the MAIN 22-round calendar's round directly, not an already-resolved
 * Superbikes round) — so every place that already branches on those
 * three can add WorldWCR as a fourth branch with the same pattern,
 * rather than needing to know about the extra nesting itself. Chains
 * main round → Superbikes' own round → WorldWCR's own round space
 * internally. */
export function isWorldWcrRaceWeek(mainRound) {
  const sbkRound = SUPERBIKES_ROUND_MAP[mainRound];
  return sbkRound != null && isWcrRaceWeek(sbkRound);
}

/** Every main-calendar round WorldWCR actually races on — the WCR
 * equivalent of SUPERBIKES_RACE_MAIN_ROUNDS, a subset of it (only 6 of
 * Superbikes' own 12). Lets any screen that already knows how to find
 * "the next/previous round this category races" for Superbikes reuse
 * the exact same logic for WorldWCR, just swapping which array it
 * searches — see pages/SeasonHub.jsx. */
export const WCR_RACE_MAIN_ROUNDS = SUPERBIKES_RACE_MAIN_ROUNDS.filter((mainRound) => isWorldWcrRaceWeek(mainRound));

/** Rounds remaining in WorldWCR's OWN 6-round season (not Superbikes'
 * 12), given the main calendar's round — matters anywhere something
 * scales by "how much season is left" (injury severity ceilings,
 * end-of-season market timing...). Only ever call this when
 * isWorldWcrRaceWeek(mainRound) is true; the caller should already
 * know that from the same check used to decide whether to process
 * this category at all this week. */
export function wcrRoundsLeftInSeason(mainRound) {
  const sbkRound = SUPERBIKES_ROUND_MAP[mainRound];
  const wcrRound = WCR_ROUND_MAP[sbkRound];
  return WCR_RACE_SBK_ROUNDS.length - (wcrRound + 1);
}
