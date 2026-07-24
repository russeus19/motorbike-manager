/**
 * Real MotoGP-style team names are usually "{title sponsor} + {the
 * team's own identity}" (Ducati Lenovo Team, Monster Energy Yamaha
 * MotoGP…), and that sponsor slot changes hands between seasons just
 * like the real thing — Lenovo today, Castrol tomorrow, whatever the
 * next real deal is. Some teams stack BOTH sponsors into the name at
 * once (Liqui Moly Dynavolt Intact GP: Liqui Moly is main, Dynavolt is
 * secondary, "Intact GP" is the team) — `{sponsor}` and `{secondary}`
 * are independent placeholders, each filled in (or cleanly dropped,
 * along with its own adjacent space, if that slot is empty) on its
 * own. `team.name` itself is deliberately never touched for this: it's
 * the stable identity used everywhere internally (save data, standings
 * keys, the `data/initialSponsors.js` lookup table, `App.jsx`'s own
 * re-lookup of the static team data by name for things like
 * manufacturer). Only a handful of teams get a `nameTemplate` field at
 * all — the ones whose real name is genuinely built around a swappable
 * sponsor. Everyone else (an already sponsor-free name like most
 * WorldSSP/WorldSBK teams, or a real name too ambiguous to confidently
 * split into "sponsor" + "rest" for now) has no `nameTemplate` and this
 * function is a no-op for them: it just returns `team.name` unchanged.
 */
function fillOrDropToken(template, token, value) {
  if (value) return template.split(token).join(value);
  // That slot's sponsor is empty right now — drop the placeholder and
  // whichever single space sits next to it, rather than showing a
  // half-empty "{sponsor} Team" or a double space.
  return template
    .split(`${token} `).join("")
    .split(` ${token}`).join("")
    .split(token).join("");
}

export function teamDisplayName(team) {
  if (!team?.nameTemplate) return team?.name ?? "";
  let result = team.nameTemplate;
  result = fillOrDropToken(result, "{sponsor}", team.sponsors?.main?.name);
  result = fillOrDropToken(result, "{secondary}", team.sponsors?.secondary?.name);
  return result.trim();
}

/** A team's `id` encodes its fixed position in that category's static
 * roster (`${categoryKey}-team-${i}`, from riderGeneration.js#instantiateTeams)
 * — a far more reliable way to re-link a team back to its current
 * static definition (manufacturer, logoId, and crucially `nameTemplate`)
 * than matching by `.name`, which can (and did — "Reds Racing" used to
 * be stored as "Reds Fantic Racing") change between sessions as team
 * data gets corrected. Shared by App.jsx's own save-load repair pass
 * and by anything else (like the save-slot picker) that needs to
 * display a team's name from raw, unrepaired save data. */
export function staticTeamDataFor(categoryData, categoryKey, teamId) {
  const teams = categoryData?.[categoryKey]?.teams || [];
  const idxMatch = /-team-(\d+)$/.exec(teamId || "");
  if (idxMatch) {
    const idx = parseInt(idxMatch[1], 10);
    if (teams[idx]) return teams[idx];
  }
  return null;
}

/** For anywhere that needs to show a team's name straight from raw,
 * not-yet-repaired save data (the save-slot picker, for instance) —
 * re-attaches `nameTemplate` from the current static data on the fly,
 * without needing the full team-repair pass App.jsx runs on an actual
 * load, just to render a label. */
export function teamDisplayNameFromSave(categoryData, categoryKey, team) {
  if (!team) return "—";
  if (team.nameTemplate) return teamDisplayName(team);
  const staticData = staticTeamDataFor(categoryData, categoryKey, team.id);
  return teamDisplayName({ ...team, nameTemplate: staticData?.nameTemplate ?? null });
}
