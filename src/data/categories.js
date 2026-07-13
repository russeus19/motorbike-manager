import { MOTOGP_TEAMS_DATA } from "./teamsMotoGP.js";
import { MOTO2_TEAMS_DATA } from "./teamsMoto2.js";
import { MOTO3_TEAMS_DATA } from "./teamsMoto3.js";
import { ROOKIESCUP_TEAM_DATA } from "./teamsRookiesCup.js";

export const CATEGORY_DATA = {
  motogp: { key: "motogp", label: "MotoGP", lower: "moto2", scale: 1, teams: MOTOGP_TEAMS_DATA, playable: true },
  moto2: { key: "moto2", label: "Moto2", lower: "moto3", scale: 0.55, teams: MOTO2_TEAMS_DATA, playable: true },
  // Moto3's feeder category is now the Rookies Cup instead of nothing —
  // fillFromLowerCategory (utils/transferMarket.js) already generically
  // pulls the best-rated rider from any team in the category below, so
  // this one data change is enough to make "Rookies Cup → Moto3" work
  // through the exact same promotion cascade Moto3 → Moto2 → MotoGP
  // already uses, with no new promotion code.
  moto3: { key: "moto3", label: "Moto3", lower: "rookiescup", scale: 0.32, teams: MOTO3_TEAMS_DATA, playable: true },
  // Red Bull Rookies Cup: full category (calendar, grid, standings,
  // market, injuries, substitutes, history) but never playable, never
  // has a category below it to promote from, and — since every rider
  // races for the exact same single team — never has a constructors'
  // table either.
  rookiescup: { key: "rookiescup", label: "Red Bull Rookies Cup", lower: null, scale: 0.15, teams: ROOKIESCUP_TEAM_DATA, playable: false, noConstructorStandings: true },
};
// Every category that exists in the game world and must be simulated,
// tracked in standings/history, and participate in the market — in
// promotion order from the very top of the pyramid down. Adding a new
// competition (e.g. a further feeder series) is meant to be exactly
// this: one more CATEGORY_DATA entry plus one more slot here, nothing
// structural to change elsewhere.
export const CATEGORY_ORDER = ["motogp", "moto2", "moto3", "rookiescup"];
// The subset of CATEGORY_ORDER the player can actually choose to run —
// used anywhere a team-selection screen builds its list of options
// (Quick Setup, career mode's category picker). Rookies Cup (and any
// future non-playable feeder category) is deliberately excluded here
// while still fully existing in CATEGORY_ORDER for everything else.
export const PLAYABLE_CATEGORY_ORDER = CATEGORY_ORDER.filter((k) => CATEGORY_DATA[k].playable);
