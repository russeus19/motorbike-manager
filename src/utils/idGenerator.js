let idCounter = 0;
export const nextId = () => `r${idCounter++}`;

// Regens (procedurally generated rookies — see makeRookie) get their
// own id range entirely, starting way above any real rider this game
// will plausibly ever have (a few hundred at most, across every
// category combined). This isn't strictly needed for correctness —
// ensureIdCounterAbovePersistedIds below already guarantees no
// collision within any given save — but it buys two real things: a
// rider's id alone tells you at a glance whether they're a real,
// hand-authored rider or a generated one (handy for debugging), and it
// stays safe even if a future update adds hundreds more real riders
// directly into the static team data — they'd still never reach
// 5000, so the two ranges can never collide even years from now.
let regenIdCounter = 5000;
export const nextRegenId = () => `r${regenIdCounter++}`;

/** Bug fixed: idCounter is a plain in-memory variable, never part of
 * the saved game — so it always restarts at 0 the moment the app
 * reloads, whether that's a real page refresh or just loading a save.
 * Any rider created AFTER that point (a regen, most commonly) would
 * get ids like "r0", "r1", "r2"... which almost certainly already
 * belong to real riders seeded at the very start of the game, since
 * those were the very first ids ever handed out. Two riders quietly
 * sharing the same id meant "click on this regen's name" and "click on
 * that real rider's name" could resolve to whichever one a given
 * lookup happened to find first — exactly the "opens someone else's
 * profile" symptom reported, and it would only get worse the longer a
 * save went on (more save/reloads, more regens generated after each
 * one). Call this once, right after loading a save, with every rider
 * id currently in it — new ids from then on start safely past all of
 * them, guaranteed never to collide with anyone already in the save.
 * Advances BOTH counters independently, each past the highest id it
 * finds in its own range, so a save with regens already past 5000
 * doesn't get its next regen's id colliding with an earlier one either. */
export function ensureIdCounterAbovePersistedIds(existingIds) {
  let maxSeen = -1;
  let maxRegenSeen = 4999;
  (existingIds || []).forEach((id) => {
    const m = /^r(\d+)$/.exec(id || "");
    if (!m) return;
    const n = parseInt(m[1], 10);
    if (n >= 5000) {
      if (n > maxRegenSeen) maxRegenSeen = n;
    } else if (n > maxSeen) {
      maxSeen = n;
    }
  });
  if (maxSeen + 1 > idCounter) idCounter = maxSeen + 1;
  if (maxRegenSeen + 1 > regenIdCounter) regenIdCounter = maxRegenSeen + 1;
}
