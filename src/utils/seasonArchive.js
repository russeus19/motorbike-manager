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

    const ridersById = {};
    teams.forEach((t) => (t.riders || []).forEach((r) => { ridersById[r.id] = r; }));

    const riders = Object.entries(data.riderStandings || {})
      .map(([id, v]) => ({
        id, name: v.name, teamName: v.teamName, points: v.points,
        age: ridersById[id]?.age ?? null,
        wins: data.riderWins?.[id] ?? 0,
        podiums: data.riderPodiums?.[id] ?? 0,
      }))
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

/** World-wide records across every rider and team the game has ever
 * simulated — not just the player's own history. Built entirely from
 * what buildSeasonArchiveEntry already records each season transition;
 * nothing here needs its own separate tracking. Real limitation worth
 * being upfront about: a genuine "longest win streak" needs to know
 * the exact sequence of race-by-race results, not just each season's
 * final tally, so that one isn't included here — everything below only
 * uses per-season aggregates (position that season, wins that season,
 * podiums that season, age that season), which the archive already has. */
export function computeHallOfFame(seasonArchive) {
  const riderTotals = {}; // id -> { name, wins, podiums, titles, categoryTitles: Set, bestAge: {min,max} on a title }
  const teamTitles = {}; // name -> count

  (seasonArchive || []).forEach((entry) => {
    Object.entries(entry.categories).forEach(([catKey, catData]) => {
      catData.riders.forEach((r, i) => {
        const t = (riderTotals[r.id] ||= { id: r.id, name: r.name, wins: 0, podiums: 0, titles: 0, categoryTitles: {}, titleAges: [] });
        t.wins += r.wins || 0;
        t.podiums += r.podiums || 0;
        if (i === 0) {
          t.titles += 1;
          t.categoryTitles[catKey] = (t.categoryTitles[catKey] || 0) + 1;
          if (r.age != null) t.titleAges.push({ age: r.age, seasonNumber: entry.seasonNumber, category: catKey });
        }
      });
      const champTeam = catData.teams[0];
      if (champTeam) teamTitles[champTeam.name] = (teamTitles[champTeam.name] || 0) + 1;
    });
  });

  const ridersList = Object.values(riderTotals);
  const topByTitles = [...ridersList].sort((a, b) => b.titles - a.titles).filter((r) => r.titles > 0)[0] || null;
  const topByWins = [...ridersList].sort((a, b) => b.wins - a.wins).filter((r) => r.wins > 0)[0] || null;
  const topByPodiums = [...ridersList].sort((a, b) => b.podiums - a.podiums).filter((r) => r.podiums > 0)[0] || null;

  const allTitleAges = ridersList.flatMap((r) => r.titleAges.map((a) => ({ ...a, name: r.name })));
  const youngestChampion = allTitleAges.length ? allTitleAges.reduce((min, a) => (a.age < min.age ? a : min)) : null;
  const oldestChampion = allTitleAges.length ? allTitleAges.reduce((max, a) => (a.age > max.age ? a : max)) : null;

  const topTeam = Object.entries(teamTitles).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    topByTitles, topByWins, topByPodiums, youngestChampion, oldestChampion,
    topTeam: topTeam ? { name: topTeam[0], titles: topTeam[1] } : null,
  };
}
