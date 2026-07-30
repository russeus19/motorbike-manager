import { MOTOGP_TEAMS_DATA } from "./teamsMotoGP.js";
import { MOTO2_TEAMS_DATA } from "./teamsMoto2.js";
import { MOTO3_TEAMS_DATA } from "./teamsMoto3.js";
import { SUPERBIKES_TEAMS_DATA } from "./teamsSuperbikes.js";
import { SUPERSPORT_TEAMS_DATA } from "./teamsSupersport.js";
import { SPORTBIKE_TEAMS_DATA } from "./teamsSportbike.js";
import { WORLDWCR_TEAMS_DATA } from "./teamsWorldWCR.js";

export const CATEGORY_DATA = {
  motogp: { key: "motogp", label: "MotoGP", lower: "moto2", scale: 1, teams: MOTOGP_TEAMS_DATA },
  moto2: { key: "moto2", label: "Moto2", lower: "moto3", scale: 0.55, teams: MOTO2_TEAMS_DATA },
  superbikes: { key: "superbikes", label: "WorldSBK", lower: "supersport", scale: 0.5, teams: SUPERBIKES_TEAMS_DATA },
  supersport: { key: "supersport", label: "WorldSSP", lower: "sportbike", scale: 0.38, teams: SUPERSPORT_TEAMS_DATA },
  moto3: { key: "moto3", label: "Moto3", lower: null, scale: 0.32, teams: MOTO3_TEAMS_DATA },
  // WorldSPB — el escalón de acceso por debajo de WorldSSP/WorldSBK,
  // equivalente a lo que Moto3 es para Moto2/MotoGP. Comparte fin de
  // semana y circuitos con Superbikes/Supersport (ver
  // data/superbikesCalendar.js) — de ahí que también cuente como
  // "categoría de calendario SBK" en todos los sitios que ya
  // distinguían superbikes/supersport de MotoGP/Moto2/Moto3.
  sportbike: { key: "sportbike", label: "WorldSPB", lower: null, scale: 0.25, teams: SPORTBIKE_TEAMS_DATA },
  // WorldWCR — campeonato monomarca exclusivamente femenino (Yamaha R7
  // única para todas), sin categoría "lower" que alimente pilotos hacia
  // arriba. Comparte fin de semana con Superbikes/Supersport/Sportbike,
  // pero solo en 6 de sus 12 rondas — ver data/wcrCalendar.js, que
  // mapea sobre el propio espacio de rondas de Superbikes, no
  // directamente sobre las 22 del calendario principal.
  worldwcr: { key: "worldwcr", label: "WorldWCR", lower: null, scale: 0.15, teams: WORLDWCR_TEAMS_DATA },
};
export const CATEGORY_ORDER = ["motogp", "moto2", "moto3", "superbikes", "supersport", "sportbike", "worldwcr"];
