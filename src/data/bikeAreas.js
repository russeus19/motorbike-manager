export const AREA_BASE = {
  motor: { label: "Motor", devCap: 35, resCap: 30, money: 30000 },
  chasis: { label: "Chasis", devCap: 25, resCap: 22, money: 26000 },
  aero: { label: "Aerodinámica", devCap: 20, resCap: 18, money: 24000 },
  electronica: { label: "Electrónica", devCap: 15, resCap: 14, money: 16000 },
  suspension: { label: "Suspensión", devCap: 10, resCap: 9, money: 12000 },
};
export const BIKE_AREA_KEYS = Object.keys(AREA_BASE);
export const BIKE_LABELS = { aero: "Aerodinámica", chasis: "Chasis", motor: "Motor", suspension: "Suspensión", electronica: "Electrónica" };
