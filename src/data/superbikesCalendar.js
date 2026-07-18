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
export const SUPERBIKES_RACE_MAIN_ROUNDS = [0, 2, 4, 6, 8, 10, 11, 13, 15, 17, 19, 21];

export const SUPERBIKES_ROUND_MAP = Array.from({ length: 22 }, (_, mainRound) => {
  const idx = SUPERBIKES_RACE_MAIN_ROUNDS.indexOf(mainRound);
  return idx === -1 ? null : idx;
});

/** True if Superbikes has a scheduled round on this main-calendar round. */
export function isSuperbikesRaceWeek(mainRound) {
  return SUPERBIKES_ROUND_MAP[mainRound] != null;
}
