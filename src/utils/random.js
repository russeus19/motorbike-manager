export function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }


export function pick(arr) { return arr[randInt(0, arr.length - 1)]; }


export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }


export function weightedPick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/* Hidden — never shown to the player. */

