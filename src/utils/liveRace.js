/**
 * A "bridge" random walk: starts at 0, ends at 0, but wanders freely in
 * between — the standard technique for generating a believable path
 * between two fixed points without the path itself needing to be
 * decided in advance. Used here so a rider's gap-to-leader can wobble
 * realistically lap to lap while still landing exactly on the gap the
 * real result already decided.
 */
function buildBridge(steps) {
  const raw = [0];
  for (let i = 1; i <= steps; i++) raw.push(raw[i - 1] + (Math.random() * 2 - 1));
  const end = raw[steps];
  return raw.map((v, i) => v - (i / steps) * end);
}

/**
 * One rider's gap-to-leader (seconds) at every lap from 0 to `laps` —
 * linear progress from `startGap` to `finalGap`, plus bridge noise
 * scaled by `amplitude` so it never affects the two fixed endpoints.
 * Bigger amplitude = more back-and-forth battling along the way.
 */
function buildGapTrajectory(laps, startGap, finalGap, amplitude) {
  const bridge = buildBridge(laps);
  const maxAbs = Math.max(...bridge.map(Math.abs), 0.001);
  return bridge.map((noise, lap) => {
    const linear = startGap + (finalGap - startGap) * (lap / laps);
    return linear + (noise / maxAbs) * amplitude;
  });
}

function pickRiderFields(r) {
  return { id: r.id, name: r.name, teamName: r.teamName, teamColor: r.teamColor, number: r.number, photoId: r.photoId };
}

/**
 * Builds the full lap-by-lap show for one race/sprint from its already-
 * decided classification (buildClassificationDisplay's output) — every
 * rider's live position at every lap, plus the list of overtake and
 * retirement events that happen along the way. Nothing here can change
 * who wins or by how much; it only dramatizes how the field got there.
 *
 * Returns `{ laps, frames }`, where `frames[lap]` is
 * `{ order: [{id, name, teamName, teamColor, number, photoId, gap}], events: [text, ...] }`
 * for that lap (frame 0 is the grid/start, frame `laps` matches the
 * final classification exactly).
 */
export function buildLiveRaceSimulation(classification, laps, playerRiderIds = []) {
  const finishers = [...classification.filter((r) => !r.crashed)].sort((a, b) => a.position - b.position);
  const crashedRiders = classification.filter((r) => r.crashed);

  const trajectories = {};
  finishers.forEach((r, idx) => {
    const startGap = Math.min(idx * 0.35, 5);
    const finalGap = r.gapSeconds ?? 0;
    // Riders close together at the finish get more back-and-forth
    // wobble than ones separated by a huge gap — a few tenths apart
    // invites genuine swapping, half a minute apart mostly doesn't.
    const amplitude = Math.min(2.5, 0.4 + Math.abs(finalGap - startGap) * 0.15);
    trajectories[r.id] = buildGapTrajectory(laps, startGap, finalGap, amplitude);
  });
  // A crashed rider was still racing competitively up to the lap they
  // went down — a mild, mostly-flat trajectory around their grid-based
  // starting gap, just enough to feel alive before they vanish.
  crashedRiders.forEach((r) => {
    const idx = (r.gridPosition ?? r.position ?? finishers.length + 1) - 1;
    const startGap = Math.min(idx * 0.35, 5);
    trajectories[r.id] = buildGapTrajectory(Math.max(1, r.laps), startGap, startGap, 1.2);
  });

  const frames = [];
  let prevPos = null;
  for (let lap = 0; lap <= laps; lap++) {
    const rows = [];
    finishers.forEach((r) => {
      rows.push({ ...pickRiderFields(r), gap: trajectories[r.id][lap] });
    });
    crashedRiders.forEach((r) => {
      if (lap <= r.laps) rows.push({ ...pickRiderFields(r), gap: trajectories[r.id][Math.min(lap, r.laps)] });
    });
    rows.sort((a, b) => a.gap - b.gap);

    const events = [];
    if (prevPos) {
      rows.forEach((r, i) => {
        const before = prevPos[r.id];
        if (before == null || before <= i) return; // didn't move up, or is new to the field
        // r moved up from `before` to `i` — scan forward from their new
        // spot to find the first rider who was ahead of them last lap;
        // that's who they most directly just passed.
        for (let j = i + 1; j < rows.length; j++) {
          const other = rows[j];
          const otherBefore = prevPos[other.id];
          if (otherBefore != null && otherBefore < before) {
            const newPos = i + 1;
            const overtakerIsPlayer = playerRiderIds.includes(r.id);
            const passedIsPlayer = playerRiderIds.includes(other.id);
            // Only worth a line for a top-5 spot, or when it involves
            // the player's own rider(s) — otherwise the ticker would
            // drown in midfield noise every single lap.
            if (newPos <= 5 || overtakerIsPlayer || passedIsPlayer) {
              events.push(`Vuelta ${lap}: ${r.name} adelanta a ${other.name} por la ${newPos}ª posición.`);
            }
            break;
          }
        }
      });
    }
    crashedRiders.forEach((r) => {
      if (r.laps === lap) events.push(`Vuelta ${lap}: caída de ${r.name} — abandona la carrera.`);
    });

    const nextPos = {};
    rows.forEach((r, i) => { nextPos[r.id] = i; });
    frames.push({ order: rows, events });
    prevPos = nextPos;
  }

  return { laps, frames };
}
