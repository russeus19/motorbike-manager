/**
 * Grand Prix history — a permanent, compact snapshot of what actually
 * happened at each Grand Prix, taken the moment it's simulated. This is
 * deliberately a "photograph": once written, an entry never changes, so
 * a rider who later switches teams, gets injured, or is substituted
 * still shows up exactly as they raced that weekend.
 *
 * Kept intentionally minimal per rider result (id, name, team, position,
 * points, whether they finished) to stay lightweight across many
 * seasons, while the entry shape itself is flexible enough to grow:
 * future fields like pole position, fastest lap, weather, incident
 * notes, penalties, or comparative stats can be added as new top-level
 * keys on an entry (or new per-rider fields) without touching how
 * existing entries are built, stored, or looked up.
 */

/** Formats one session's raw results (whatever shape the simulator that
 * ran it produced — race, sprint, superpole race, or a qualifying grid
 * with no points at all) into the same compact per-rider shape used
 * everywhere in a history entry, sorted by finishing/grid position.
 *
 * Bug fixed: qualifying results come out of simulateQualifying with
 * their order carried in `gridPosition`, not `position` like every
 * race session uses — reading `r.position` on a qualifying result was
 * always undefined, so every row rendered with no position at all. */
function formatSessionResults(rawResults) {
  return [...(rawResults || [])]
    .map((r) => ({ ...r, position: r.position ?? r.gridPosition }))
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((r) => ({
      riderId: r.id,
      name: r.name,
      teamName: r.teamName,
      position: r.position,
      points: r.points ?? null,
      crashed: !!r.crashed,
    }));
}

/** Turns a { categoryKey: [...rawResults] } map into the same shape,
 * one formatted array per category — dropping any category with no
 * actual results so an entry never carries an empty array around. */
function formatSessionByCategory(rawByCategory) {
  const out = {};
  Object.entries(rawByCategory || {}).forEach(([catKey, rawResults]) => {
    if (rawResults && rawResults.length) out[catKey] = formatSessionResults(rawResults);
  });
  return out;
}

/** Builds one GP history entry from that race's already-computed
 * results (no recalculation — this only repackages what the simulator
 * already produced into a compact, permanent record). `resultsByCategory`
 * is `{ motogp: [...], moto2: [...], moto3: [...] }`, exactly the shape
 * already assembled in App.jsx's runRace for `lastResult`.
 *
 * qualifyingResultsByCategory/sprintResultsByCategory/
 * race1ResultsByCategory/superpoleResultsByCategory are the same
 * per-category shape — qualifying always runs for the whole weekend at
 * once regardless of which category is played, and MotoGP's sprint /
 * the Superbikes-family Race 1 and Superpole Race are silently
 * simulated for every category that has them even when it's not the
 * one being played (see App.jsx's runQualifying/runRace), so every
 * category genuinely has this data available, not just the played
 * one. A category simply won't appear in a given map if it doesn't
 * run that kind of session at all (Moto2/Moto3 never has a sprint,
 * Supersport/Sportbike/WorldWCR never has a superpole race). */
export function buildGpHistoryEntry({ round, seasonNumber, circuitName, isWet, resultsByCategory, qualifyingResultsByCategory, sprintResultsByCategory, race1ResultsByCategory, superpoleResultsByCategory }) {
  const results = {};
  Object.entries(resultsByCategory || {}).forEach(([catKey, catResults]) => {
    results[catKey] = formatSessionResults(catResults);
  });
  const entry = { round, seasonNumber, circuitName, isWet: !!isWet, results };
  const qualifying = formatSessionByCategory(qualifyingResultsByCategory);
  const sprint = formatSessionByCategory(sprintResultsByCategory);
  const race1 = formatSessionByCategory(race1ResultsByCategory);
  const superpole = formatSessionByCategory(superpoleResultsByCategory);
  if (Object.keys(qualifying).length) entry.qualifying = qualifying;
  if (Object.keys(sprint).length) entry.sprint = sprint;
  if (Object.keys(race1).length) entry.race1 = race1;
  if (Object.keys(superpole).length) entry.superpole = superpole;
  return entry;
}

/** Finds the recorded entry for a specific season+round, or null if that
 * Grand Prix hasn't been simulated yet — or, for a save made before this
 * system existed, was simulated but never recorded. */
export function findGpHistoryEntry(gpHistory, seasonNumber, round) {
  return (gpHistory || []).find((e) => e.seasonNumber === seasonNumber && e.round === round) || null;
}
