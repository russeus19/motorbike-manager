import { MOTOGP_TEAMS_DATA } from "./teamsMotoGP.js";
import { MOTO2_TEAMS_DATA } from "./teamsMoto2.js";
import { MOTO3_TEAMS_DATA } from "./teamsMoto3.js";

export const CATEGORY_DATA = {
  motogp: { key: "motogp", label: "MotoGP", lower: "moto2", scale: 1, teams: MOTOGP_TEAMS_DATA },
  moto2: { key: "moto2", label: "Moto2", lower: "moto3", scale: 0.55, teams: MOTO2_TEAMS_DATA },
  moto3: { key: "moto3", label: "Moto3", lower: null, scale: 0.32, teams: MOTO3_TEAMS_DATA },
};
export const CATEGORY_ORDER = ["motogp", "moto2", "moto3"];
