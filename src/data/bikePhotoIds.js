/**
 * Four teams field an entry in BOTH Moto2 and Moto3 under the same
 * sponsor banner, and share a single `logoId` between the two (see
 * data/teamsMoto2.js / teamsMoto3.js) — that's correct for the team
 * LOGO, which really is the same badge either way, but the actual BIKE
 * is physically different between the two categories (different
 * chassis brand, different class entirely), so a single shared bike
 * photo can't serve both.
 *
 * This only overrides the photo lookup — logoId itself, and the team
 * logo it drives, are untouched.
 *
 * Each entry maps that shared logoId to a category-specific id instead,
 * for these four teams only:
 *   - redbull_ktm_ajo    → redbull_ktm_ajo_moto2.png / redbull_ktm_ajo_moto3.png
 *   - redbull_ktm_tech3  → redbull_ktm_tech3_moto2.png / redbull_ktm_tech3_moto3.png
 *   - intact_gp          → intact_gp_moto2.png / intact_gp_moto3.png
 *   - honda_team_asia    → honda_team_asia_moto2.png / honda_team_asia_moto3.png
 *
 * Every other team (whose logoId is only ever used in one category to
 * begin with) is untouched — bikePhotoIdFor just returns their logoId
 * straight through.
 */
const SHARED_LOGO_IDS_NEEDING_SPLIT = new Set([
  "redbull_ktm_ajo",
  "redbull_ktm_tech3",
  "intact_gp",
  "honda_team_asia",
]);

/** The id to actually look up under public/assets/bikes/ — logoId
 * unchanged for any team not in the small shared-logo list above;
 * logoId + "_" + categoryKey for the four that need splitting. */
export function bikePhotoIdFor(logoId, categoryKey) {
  if (!logoId) return null;
  if (SHARED_LOGO_IDS_NEEDING_SPLIT.has(logoId) && (categoryKey === "moto2" || categoryKey === "moto3")) {
    return `${logoId}_${categoryKey}`;
  }
  return logoId;
}
