/**
 * Real-world sponsor names, by category then team name, for whichever
 * contracts a team is assumed to already have when a new game starts —
 * as opposed to the fictional names (plus these same real ones, see
 * below) used for every future renewal offer generated during play.
 * Purely a lookup table: utils/sponsors.js#seedInitialSponsors reads
 * `main`/`secondary` here, and computes the actual payout itself
 * (estimateCurrentSponsorPayout) from that team's real, currently-
 * computed prestige and expectation — nothing here is a euro amount.
 *
 * Keyed by category first, not just by team name — several real teams
 * share the exact same name across categories (a satellite squad
 * fielding both a MotoGP and a Moto3 entry under the same banner, for
 * instance: "Red Bull KTM Tech3" and "Red Bull KTM Ajo" both do this).
 * A single flat name→sponsor table would silently let one category's
 * entry overwrite the other's.
 *
 * `null` means that slot has no real-world sponsor to seed — it starts
 * the game empty and gets filled the normal way, through a generated
 * offer at the next season-end transition, exactly like a sponsor that
 * left mid-season would be replaced.
 *
 * All 5 categories (MotoGP, Moto2, Moto3, WorldSBK, WorldSSP) are filled
 * in below. A team not listed here — or a category not listed at all —
 * simply falls through to that same normal empty-slot behavior.
 */
export const INITIAL_SPONSORS_BY_CATEGORY = {
  motogp: {
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
  },

  moto2: {
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
  },

  moto3: {
    "Red Bull KTM Ajo": { main: "Red Bull", secondary: null },
    "Red Bull KTM Tech3": { main: "Red Bull", secondary: null },
    "CFMoto Gaviota Aspar Team": { main: "CFMoto", secondary: "Gaviota" },
    "Liqui Moly Dynavolt Intact GP": { main: "Liqui Moly", secondary: "Dynavolt" },
    "Leopard Racing": { main: null, secondary: "Vulcain" },
    "CIP Green Power": { main: "Green Power", secondary: null },
    "Code Motorsports": { main: "Code", secondary: null },
    "LevelUp – MTA": { main: "LevelUp", secondary: null },
    "Gryd – MLav Racing": { main: "Gryd", secondary: "Lazu" },
    "Honda Team Asia": { main: "Idemitsu", secondary: null },
    "Aeon Credit – MT Helmets – MSi": { main: "Aeon Credit", secondary: "MT Helmets" },
    "Rivacold Snipers Team": { main: "Rivacold", secondary: null },
    "Sic58 Squadra Corse": { main: null, secondary: null },
  },

  superbikes: {
    "Aruba.it Racing – Ducati": { main: "Aruba.it", secondary: "Lenovo" },
    "ROKiT BMW Motorrad WorldSBK Team": { main: "ROKiT", secondary: null },
    "Pata Maxus Yamaha": { main: "Pata", secondary: "Maxus" },
    "bimota by Kawasaki Racing Team": { main: null, secondary: "Oakley" },
    "Honda HRC": { main: null, secondary: null },
    "Barni Spark Racing Team": { main: "Barni", secondary: "Bardahl" },
    "ELF Marc VDS Racing Team": { main: "Elf", secondary: null },
    "Team Goeleven": { main: "Edisol", secondary: "Nils" },
    "Motoxracing WorldSBK Team": { main: "Soradis", secondary: "Tulipano" },
    "GYTR GRT Yamaha WorldSBK Team": { main: "Pata", secondary: "Barracuda" },
    "MGM Optical Express Racing": { main: "MGM Optical", secondary: null },
    "Kawasaki WorldSBK Team": { main: null, secondary: null },
    "Motocorsa Racing": { main: null, secondary: null },
  },

  supersport: {
    "AS bLU cRU Racing Team": { main: null, secondary: null },
    "Orelac Racing Verdnatura": { main: "Verdnatura", secondary: null },
    "Zxmoto Factory Evan Bros Racing": { main: "Zxmoto", secondary: null },
    "GMT94 Yamaha": { main: null, secondary: null },
    "Pata Yamaha Ten Kate Racing": { main: "Pata", secondary: null },
    "PTR Triumph Factory Racing": { main: "Givi", secondary: null },
    "Feel Racing WorldSSP Team": { main: null, secondary: null },
    "Kawasaki WorldSSP Team": { main: null, secondary: null },
    "WRP Racing": { main: null, secondary: null },
    "Ecosantagata Althea Racing Team": { main: "Althea", secondary: null },
    "EAB Racing Team": { main: "EAB", secondary: null },
    "VFT Racing Yamaha": { main: null, secondary: "Menghi" },
    "D34G WorldSSP Racing Team": { main: "Biblion", secondary: "Organica" },
    "Compos Racing Team": { main: "Compos", secondary: null },
    "Honda Racing WorldSSP Team": { main: null, secondary: null },
    "Motozoo by Madforce Dubai": { main: "Motozoo", secondary: null },
    "Cerba Yamaha Racing Team": { main: "Cerba", secondary: "Pont Grup" },
    "QJMotor Factory Racing": { main: null, secondary: null },
    "Flembbo by Racing Development": { main: null, secondary: null },
    "Motorsport Kofler": { main: null, secondary: "Isolith" },
    "Renzi Corse": { main: null, secondary: null },
  },
};
