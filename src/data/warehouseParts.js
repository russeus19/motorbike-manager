import { Shield, Box, Flame, Disc, Cpu } from "lucide-react";

// One warehouse part per development area (data/bikeAreas.js), so every
// area's package has somewhere physical to be built and stocked:
// motor -> motor, chasis -> chasis, aero -> carenado, electronica ->
// electronica ("Unidad Central"), freno -> freno.
export const WAREHOUSE_PARTS = ["carenado", "chasis", "motor", "freno", "electronica"];
export const WAREHOUSE_LABELS = { carenado: "Carenado", chasis: "Chasis", motor: "Motor", freno: "Freno", electronica: "Unidad Central" };
export const WAREHOUSE_ICONS = { carenado: Shield, chasis: Box, motor: Flame, freno: Disc, electronica: Cpu };
// Carenado is cheap, freno/electrónica mid-range, chasis expensive, motor very expensive.
export const WAREHOUSE_BASE_COST = { carenado: 15000, freno: 35000, electronica: 40000, chasis: 70000, motor: 120000 };
export const WAREHOUSE_MIN_TO_RACE = 2; // per part, for a full 2-rider team
