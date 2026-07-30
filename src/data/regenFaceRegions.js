// Maps a rookie's nationality flag to the regen-face region folder its
// randomly-assigned photo gets drawn from (see makeRookie in
// utils/riderGeneration.js). Kept as its own file, separate from
// ROOKIE_NAME_POOLS, since it's a purely visual grouping (facial
// resemblance) rather than a naming one — Portugal and Andorra share a
// naming style with Spain, for instance, but all three belong together
// here too, so in this particular case the two groupings happen to
// agree. Every nationality a rookie can currently be generated with
// (see ROOKIE_NAME_POOLS) has an entry here; if a new nationality is
// ever added there without a matching region, getRegenFaceRegion below
// falls back to "europa_occidental" rather than crashing.
export const REGEN_FACE_REGION_BY_NAT = {
  "🇪🇸": "europa_occidental",
  "🇵🇹": "europa_occidental",
  "🇮🇹": "europa_occidental",
  "🇫🇷": "europa_occidental",
  "🇦🇩": "europa_occidental",

  "🇩🇪": "europa_central",
  "🇳🇱": "europa_central",
  "🇬🇧": "europa_central",
  "🇦🇹": "europa_central",
  "🇨🇭": "europa_central",

  "🇫🇮": "europa_nordica",
  "🇪🇪": "europa_nordica",
  "🇩🇰": "europa_nordica",

  "🇨🇿": "europa_este_balcanes",
  "🇬🇷": "europa_este_balcanes",

  "🇹🇷": "turquia",

  "🇯🇵": "asia_oriental",

  "🇮🇩": "sudeste_asiatico",
  "🇲🇾": "sudeste_asiatico",
  "🇹🇭": "sudeste_asiatico",

  "🇦🇺": "oceania",
  "🇳🇿": "oceania",

  "🇧🇷": "latinoamerica",
  "🇦🇷": "latinoamerica",
  "🇨🇴": "latinoamerica",

  "🇺🇸": "norteamerica",

  "🇿🇦": "sudafrica",
};

// How many numbered photos (1.png, 2.png, ...) live in each region
// folder under public/assets/riders/regen/<region>/ — update this if
// more get added later, so every region draws from the full set.
export const REGEN_FACES_PER_REGION = 20;

// Same idea, but for the SEPARATE female regen face folders under
// public/assets/riders/regen/female/<region>/ — a distinct path from
// the male one above (see getRegenFacePath in utils/riderGeneration.js),
// since a rookie's photo folder now depends on both nationality AND
// gender. Starts at the same count as the male pools; adjust here if
// you end up uploading a different number of female photos per region.
export const REGEN_FEMALE_FACES_PER_REGION = 20;

export function getRegenFaceRegion(nat) {
  return REGEN_FACE_REGION_BY_NAT[nat] || "europa_occidental";
}
