/**
 * A permanent, read-only snapshot of one completed season's final
 * standings across all three categories — riders, teams, and
 * constructors (teams aggregated by manufacturer). Meant to be called
 * once, right at the very start of the season transition, before any
 * roster/standings reset happens, so it captures exactly what the
 * player saw on the season-end screen.
 *
 * `categoriesData[key]` must provide `{ teams, riderStandings,
 * teamStandings }` for that category — the played category and each of
 * the two background ones all share this same shape.
 */
export function buildSeasonArchiveEntry(seasonNumber, categoriesData) {
  const categories = {};

  Object.entries(categoriesData).forEach(([catKey, data]) => {
    const teams = data.teams || [];
    const teamById = {};
    teams.forEach((t) => { teamById[t.id] = t; });

    const riders = Object.entries(data.riderStandings || {})
      .map(([id, v]) => ({ id, name: v.name, teamName: v.teamName, points: v.points }))
      .sort((a, b) => b.points - a.points);

    const teamRows = Object.entries(data.teamStandings || {})
      .map(([id, points]) => ({ id, name: teamById[id]?.name || id, manufacturer: teamById[id]?.manufacturer || null, points }))
      .sort((a, b) => b.points - a.points);

    const constructorMap = {};
    teamRows.forEach((t) => {
      const mfr = t.manufacturer || "—";
      constructorMap[mfr] = (constructorMap[mfr] || 0) + t.points;
    });
    const constructors = Object.entries(constructorMap)
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points);

    categories[catKey] = { riders, teams: teamRows, constructors };
  });

  return { seasonNumber, categories };
}
