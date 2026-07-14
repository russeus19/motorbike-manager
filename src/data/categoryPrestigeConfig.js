/**
 * Configurable prestige range per competition — the single source of
 * truth for how the 0-200 prestige scale is distributed across
 * categories. Adding a future competition (MotoE, JuniorGP, a Red Bull
 * Rookies Cup, FIM Talent Cup, or anything else) is meant to be exactly
 * this: one more entry here, never touching the prestige/market
 * algorithms themselves (utils/prestige.js, utils/marketAI.js).
 */
export const PRESTIGE_SCALE_MAX = 200;

export const CATEGORY_PRESTIGE_CONFIG = {
  motogp: { min: 120, max: 200 },
  moto2: { min: 80, max: 145 },
  moto3: { min: 40, max: 90 },
};

// Anything not explicitly configured above (a future feeder category
// below Moto3 that hasn't been given its own range yet) defaults into
// the reserved low band instead of crashing or silently reusing another
// category's range.
export const DEFAULT_PRESTIGE_RANGE = { min: 0, max: 40 };

export function categoryPrestigeRange(categoryKey) {
  return CATEGORY_PRESTIGE_CONFIG[categoryKey] || DEFAULT_PRESTIGE_RANGE;
}
