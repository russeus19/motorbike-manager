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

import { teamDisplayName } from "./teamNaming.js";
export function buildSeasonArchiveEntry(seasonNumber, categoriesData, playerContext = null) {
  const categories = {};

  Object.entries(categoriesData).forEach(([catKey, data]) => {
    const teams = data.teams || [];
    const teamById = {};
    teams.forEach((t) => { teamById[t.id] = t; });

    const riders = Object.entries(data.riderStandings || {})
      .map(([id, v]) => ({ id, name: v.name, teamName: v.teamName, points: v.points }))
      .sort((a, b) => b.points - a.points);

    const teamRows = Object.entries(data.teamStandings || {})
      .map(([id, points]) => ({ id, name: teamById[id] ? teamDisplayName(teamById[id]) : id, manufacturer: teamById[id]?.manufacturer || null, points }))
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

  return { seasonNumber, categories, playerContext };
}

/** Your own managerial career, season by season — built entirely from
 * the archive's own already-recorded data (no separate tracking of
 * "what did I do" needed): for each season, look up the one category
 * `playerContext` says was yours, find your own team's row in it by
 * name, and pull out your final position/points plus the two riders
 * who raced under that same team name that season. */
export function buildPlayerCareerHistory(seasonArchive) {
  return (seasonArchive || [])
    .filter((entry) => entry.playerContext)
    .map((entry) => {
      const { category, teamName } = entry.playerContext;
      const catData = entry.categories[category];
      if (!catData) return null;
      const teamPosition = catData.teams.findIndex((t) => t.name === teamName) + 1;
      const teamRow = catData.teams.find((t) => t.name === teamName);
      const riders = catData.riders
        .map((r, i) => ({ ...r, position: i + 1 }))
        .filter((r) => r.teamName === teamName);
      return {
        seasonNumber: entry.seasonNumber,
        category,
        teamName,
        teamPosition: teamPosition || null,
        teamPoints: teamRow?.points ?? 0,
        riders,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
}

/** Follows one specific rider (by id, not name — names can repeat)
 * forward through every LATER season in the archive, across every
 * category, wherever they show up next. Lets the player click a rider
 * from their very first season's roster and see the whole rest of that
 * rider's career afterward, even long after they've left the team. */
export function findRiderLaterSeasons(seasonArchive, riderId, afterSeasonNumber) {
  const appearances = [];
  (seasonArchive || []).forEach((entry) => {
    if (entry.seasonNumber <= afterSeasonNumber) return;
    Object.entries(entry.categories).forEach(([catKey, catData]) => {
      const idx = catData.riders.findIndex((r) => r.id === riderId);
      if (idx < 0) return;
      appearances.push({
        seasonNumber: entry.seasonNumber,
        category: catKey,
        teamName: catData.riders[idx].teamName,
        position: idx + 1,
        points: catData.riders[idx].points,
      });
    });
  });
  return appearances.sort((a, b) => a.seasonNumber - b.seasonNumber);
}
