/**
 * Superbikes runs its own 12-round calendar, but ticks alongside the
 * main 22-round MotoGP/Moto2/Moto3 calendar rather than on its own
 * independent clock — its 12 rounds are spread evenly across the main
 * 22, so both seasons progress in lockstep and finish at the same time
 * (Option B). On a main round NOT listed here, Superbikes simply
 * doesn't race that week — its teams/riders stay exactly as they were.
 *
 * SUPERBIKES_ROUND_MAP[mainRoundIndex] = superbikesRoundIndex | null
 */
import { dateForRound } from "./circuits.js";

export const SUPERBIKES_RACE_MAIN_ROUNDS = [0, 2, 4, 6, 8, 10, 11, 13, 15, 17, 19, 21];

export const SUPERBIKES_ROUND_MAP = Array.from({ length: 22 }, (_, mainRound) => {
  const idx = SUPERBIKES_RACE_MAIN_ROUNDS.indexOf(mainRound);
  return idx === -1 ? null : idx;
});

/** True if Superbikes has a scheduled round on this main-calendar round. */
export function isSuperbikesRaceWeek(mainRound) {
  return SUPERBIKES_ROUND_MAP[mainRound] != null;
}

/** The real calendar date for Superbikes' own Nth round — since
 * Superbikes runs on the exact same physical weekend as whichever main
 * round it's paired with (see SUPERBIKES_RACE_MAIN_ROUNDS above), this
 * is just dateForRound looked up through that same mapping, not a
 * separate date table to keep in sync by hand. Supersport and
 * Sportbike share this identical calendar too (see
 * supersportCalendar.js / sportbikeCalendar.js, which just re-export
 * everything above), so this same function covers all three. */
export function dateForSuperbikesRound(superbikesRoundIndex, seasonNumber = 1) {
  const mainRound = SUPERBIKES_RACE_MAIN_ROUNDS[superbikesRoundIndex];
  return dateForRound(mainRound, seasonNumber);
}
