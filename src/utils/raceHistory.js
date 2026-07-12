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

/** Builds one GP history entry from that race's already-computed
 * results (no recalculation — this only repackages what the simulator
 * already produced into a compact, permanent record). `resultsByCategory`
 * is `{ motogp: [...], moto2: [...], moto3: [...] }`, exactly the shape
 * already assembled in App.jsx's runRace for `lastResult`. */
export function buildGpHistoryEntry({ round, seasonNumber, circuitName, isWet, resultsByCategory }) {
  const results = {};
  Object.entries(resultsByCategory || {}).forEach(([catKey, catResults]) => {
    results[catKey] = [...(catResults || [])]
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map((r) => ({
        riderId: r.id,
        name: r.name,
        teamName: r.teamName,
        position: r.position,
        points: r.points,
        crashed: !!r.crashed,
      }));
  });
  return { round, seasonNumber, circuitName, isWet: !!isWet, results };
}

/** Finds the recorded entry for a specific season+round, or null if that
 * Grand Prix hasn't been simulated yet — or, for a save made before this
 * system existed, was simulated but never recorded. */
export function findGpHistoryEntry(gpHistory, seasonNumber, round) {
  return (gpHistory || []).find((e) => e.seasonNumber === seasonNumber && e.round === round) || null;
}
