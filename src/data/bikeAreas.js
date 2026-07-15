export const AREA_BASE = {
  motor: { label: "Motor", devCap: 35, resCap: 30, money: 30000 },
  chasis: { label: "Chasis", devCap: 25, resCap: 22, money: 26000 },
  aero: { label: "Aerodinámica", devCap: 20, resCap: 18, money: 24000 },
  electronica: { label: "Electrónica", devCap: 15, resCap: 14, money: 16000 },
  freno: { label: "Freno", devCap: 10, resCap: 9, money: 12000 },
};
export const BIKE_AREA_KEYS = Object.keys(AREA_BASE);
export const BIKE_LABELS = { aero: "Aerodinámica", chasis: "Chasis", motor: "Motor", freno: "Freno", electronica: "Electrónica" };

/**
 * Which area a development package is most likely to affect negatively
 * (utils/bikeDevelopment.js's rollPackageDownside) — 90% of the time it's
 * this "primary" pair (a real engineering coupling: more engine power
 * upsets chassis balance, a new aero package changes braking stability,
 * electronics touch everything but especially engine mapping), 10% of
 * the time it's any other area at random instead — nothing is ever
 * completely isolated from the rest of the bike.
 */
export const AREA_PRIMARY_PAIR = {
  motor: "chasis",
  chasis: "motor",
  aero: "freno",
  freno: "aero",
  electronica: "motor",
};

// Electrónica's coupling is the least clean-cut of the five (it genuinely
// touches everything), so alongside its usual 90/10 split, brake-by-wire
// gives it a real secondary chance at freno specifically.
export const AREA_SECONDARY_PAIR = {
  electronica: "freno",
};
