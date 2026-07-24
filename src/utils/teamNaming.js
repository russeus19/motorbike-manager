/**
 * Real MotoGP-style team names are usually "{title sponsor} + {the
 * team's own identity}" (Ducati Lenovo Team, Monster Energy Yamaha
 * MotoGP…), and that sponsor slot changes hands between seasons just
 * like the real thing — Lenovo today, Castrol tomorrow, whatever the
 * next real deal is. `team.name` itself is deliberately never touched
 * for this: it's the stable identity used everywhere internally (save
 * data, standings keys, the `data/initialSponsors.js` lookup table,
 * `App.jsx`'s own re-lookup of the static team data by name for things
 * like manufacturer). Only a handful of teams get a `nameTemplate`
 * field at all — the ones whose real name is genuinely built around a
 * swappable title sponsor. Everyone else (an already sponsor-free name
 * like most WorldSSP/WorldSBK teams, or a real name too ambiguous to
 * confidently split into "sponsor" + "rest" for now) has no
 * `nameTemplate` and this function is a no-op for them: it just
 * returns `team.name` unchanged.
 */
export function teamDisplayName(team) {
  if (!team?.nameTemplate) return team?.name ?? "";
  const sponsorName = team.sponsors?.main?.name;
  if (sponsorName) return team.nameTemplate.replace("{sponsor}", sponsorName);
  // No main sponsor signed right now — drop the placeholder and
  // whichever single space sits next to it, rather than showing a
  // half-empty "{sponsor} Team" or a double space.
  return team.nameTemplate
    .replace("{sponsor} ", "")
    .replace(" {sponsor}", "")
    .replace("{sponsor}", "")
    .trim();
}
