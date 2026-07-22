/**
 * Real-world sponsor names, by team name, for whichever contracts a
 * team is assumed to already have when a new game starts — as opposed
 * to the fictional names (data/sponsors.js's SPONSOR_NAME_POOL) used for
 * every future renewal offer generated during play. Purely a lookup
 * table: utils/sponsors.js#seedInitialSponsors reads `main`/`secondary`
 * here, and computes the actual payout itself (estimateCurrentSponsorPayout)
 * from that team's real, currently-computed prestige and expectation —
 * nothing here is a euro amount.
 *
 * `null` means that slot has no real-world sponsor to seed — it starts
 * the game empty and gets filled the normal way, through a generated
 * offer at the next season-end transition, exactly like a sponsor that
 * left mid-season would be replaced.
 *
 * Only MotoGP and Moto2 are filled in so far; any team not listed here
 * (or not yet added — Moto3, WorldSBK, WorldSSP) simply falls through
 * to that same normal empty-slot behavior, nothing breaks.
 */
export const INITIAL_SPONSORS_BY_TEAM_NAME = {
  // --- MotoGP ---
  "Aprilia Racing": { main: null, secondary: "Sterilgarda" },
  "BK8 Gresini Racing MotoGP": { main: "BK8", secondary: "Estrella Galicia" },
  "Ducati Lenovo Team": { main: "Lenovo", secondary: "NetApp" },
  "Pertamina Enduro VR46 Racing Team": { main: "Pertamina Enduro", secondary: "ebay" },
  "Trackhouse MotoGP Team": { main: "Superfile", secondary: null },
  "Red Bull KTM Factory Racing": { main: "Red Bull", secondary: null },
  "Red Bull KTM Tech3": { main: "Red Bull", secondary: null },
  "Honda HRC Castrol": { main: "Castrol", secondary: null },
  "Monster Energy Yamaha MotoGP": { main: "Monster Energy", secondary: "Eneos" },
  "Pro Honda LCR": { main: "Castrol", secondary: "God55 Sports" },
  "Prima Pramac Yamaha MotoGP": { main: "Prima", secondary: "Pramac" },

  // --- Moto2 ---
  "Elf Marc VDS Racing Team": { main: "Elf", secondary: "Beta" },
  "CFMoto Inde Aspar Team": { main: "CFMoto", secondary: "Inde" },
  "Liqui Moly Dynavolt Intact GP": { main: "Liqui Moly", secondary: "Dynavolt" },
  "Blu Cru Pramac Yamaha Moto2": { main: "Blu Cru", secondary: "Pramac" },
  "Red Bull KTM Ajo": { main: "Red Bull", secondary: null },
  "Italjet Gresini Moto2": { main: "Italjet", secondary: null },
  "QJMotor – Pont Grup – MSi": { main: "Pont Grup", secondary: "MSi" },
  "Italtrans Racing Team": { main: "Italtrans", secondary: null },
  "OnlyFans American Racing Team": { main: "OnlyFans", secondary: null },
  "Sync Group SpeedRS Team": { main: "Sync Group", secondary: "HDR" },
  "Reds Fantic Racing": { main: "Fantic", secondary: "Pallex" },
  "Idemitsu Honda Team Asia": { main: "Idemitsu", secondary: null },
  "Momoven Idrofoglia RW Racing Team": { main: "Momoven Idrofoglia", secondary: null },
  "Klint Racing Team": { main: null, secondary: null },
};
