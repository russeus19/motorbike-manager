/**
 * The specific bike model each manufacturer races, per category — the
 * base name is the same across every team riding that manufacturer
 * within a category (all Ducati MotoGP teams ride some vintage of the
 * Desmosedici, for instance), so this is keyed by manufacturer, not
 * by team. The trailing space (or lack of one, for Ducati's own
 * "GP26" styling) in each string is intentional — the year gets
 * appended directly onto it, no separator added in code.
 *
 * Only MotoGP is filled in so far. A category with no entry here (or a
 * manufacturer missing from an existing category) simply shows the
 * manufacturer alone in the "Mi moto" panel, exactly as it did before
 * any model was known — add the missing categories/manufacturers here
 * as they're provided, no other code needs to change.
 *
 * The year itself now advances with the season (see bikeModelFor) —
 * season 1 is "26" for every manufacturer's works/customerTop bike,
 * season 2 is "27", and so on. A "previous"-tier seat (see
 * data/motogpBikeTiers.js) always shows the year just BEFORE that —
 * "25" in season 1, "26" in season 2 — matching that it's genuinely
 * last year's factory spec, frozen.
 */
export const BIKE_MODEL_NAMES = {
  motogp: {
    Ducati: "Desmosedici GP",
    Aprilia: "RS-GP ",
    Honda: "RC213V ",
    KTM: "RC16 ",
    Yamaha: "YZR-M1 ",
  },
};

/** The model year (as shown in-game, e.g. 26) a "factory"/"customerTop"
 * seat displays in season 1 — every season after that adds 1. */
const BASE_MODEL_YEAR = 26;

/** The model name for a given category+manufacturer+season+tier, or
 * null if it isn't known yet. `tier` defaults to "factory" (the
 * common case, and the only one that existed before this — every
 * pre-existing call site that doesn't pass a tier keeps working
 * unchanged). Only "previous" shifts the year back by one; both
 * "factory" and "customerTop" show the same current-year model, since
 * customerTop is the same bike as factory, just receiving its
 * packages a couple of GPs later rather than being an older model. */
export function bikeModelFor(categoryKey, manufacturer, seasonNumber = 1, tier = "factory") {
  const base = BIKE_MODEL_NAMES[categoryKey]?.[manufacturer];
  if (!base) return null;
  const year = BASE_MODEL_YEAR + (seasonNumber - 1) - (tier === "previous" ? 1 : 0);
  return `${base}${year}`;
}
