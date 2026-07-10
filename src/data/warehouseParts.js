import { Shield, Box, Flame, Disc } from "lucide-react";

export const WAREHOUSE_PARTS = ["carenado", "chasis", "motor", "freno"];
export const WAREHOUSE_LABELS = { carenado: "Carenado", chasis: "Chasis", motor: "Motor", freno: "Freno" };
export const WAREHOUSE_ICONS = { carenado: Shield, chasis: Box, motor: Flame, freno: Disc };
// Carenado is cheap, freno mid-range, chasis expensive, motor very expensive.
export const WAREHOUSE_BASE_COST = { carenado: 15000, freno: 35000, chasis: 70000, motor: 120000 };
export const WAREHOUSE_MIN_TO_RACE = 2; // per part, for a full 2-rider team
