/**
 * The specific bike model each manufacturer races, per category — the
 * model is the same across every team riding that manufacturer within
 * a category (all Ducati MotoGP teams ride the same Desmosedici, for
 * instance), so this is keyed by manufacturer, not by team.
 *
 * Only MotoGP is filled in so far. A category with no entry here (or a
 * manufacturer missing from an existing category) simply shows the
 * manufacturer alone in the "Mi moto" panel, exactly as it did before
 * any model was known — add the missing categories/manufacturers here
 * as they're provided, no other code needs to change.
 */
export const BIKE_MODELS = {
  motogp: {
    Ducati: "Desmosedici GP26",
    Aprilia: "RS-GP 26",
    Honda: "RC213V 26",
    KTM: "RC16 26",
    Yamaha: "YZR-M1 26",
  },
};

/** The model for a given category+manufacturer, or null if it isn't
 * known yet. */
export function bikeModelFor(categoryKey, manufacturer) {
  return BIKE_MODELS[categoryKey]?.[manufacturer] ?? null;
}
