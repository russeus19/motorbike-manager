/**
 * Red Bull Rookies Cup — a single spec team, "Red Bull KTM Rookies Cup",
 * carrying all 26 riders instead of the usual 2. Every category's team
 * data file in this project follows the same shape (name, tier, color,
 * bike, budget, riders), so this reuses instantiateTeams/finalizeRiderEconomics
 * exactly as-is — no special-cased loading path.
 *
 * The bike object is completely flat (identical value in every area).
 * Since every rider in this category races for the same single team,
 * every entry gets the exact same bikeAvgVal in buildEntries
 * (utils/raceSimulation.js) — mechanical influence on the result is
 * therefore already reduced to zero by construction, with no change
 * needed to the simulation formula itself.
 *
 * All 26 riders are the real 2026 Red Bull Rookies Cup grid. Attributes,
 * potential, market value and salary are still generated to fit this
 * project's model — the real-world source data doesn't include those —
 * calibrated a notch below Moto3's average with a wide potential spread,
 * since a good number of these riders are expected to become future
 * Moto3/MotoGP stars.
 */
export const ROOKIESCUP_TEAM_DATA = [
  {
    name: "Red Bull KTM Rookies Cup",
    logoId: "redbull_ktm_rookiescup",
    tier: "Cantera",
    color: "#FF6600",
    // Perfectly flat — every area identical, so every rider's bikeAvgVal
    // ends up the same. Value chosen simply to sit in a plausible
    // mid-development range for a 250cc spec machine.
    bike: { aero: 60, chasis: 60, motor: 60, suspension: 60, electronica: 60 },
    budget: 0,
    riders: [
      // --- Confirmed real 2026 grid ---
      { name: "Beñat Fernández", photoId: 94, nat: "🇪🇸", age: 17, potential: 94, tecnica: 71, ritmo: 70, adelantamientos: 68, mental: 54, adaptabilidad: 52, fisico: 63 },
      { name: "Ryota Ogiwara", photoId: 95, nat: "🇯🇵", age: 16, potential: 90, tecnica: 70, ritmo: 69, adelantamientos: 66, mental: 52, adaptabilidad: 50, fisico: 61 },
      { name: "David González", photoId: 96, nat: "🇪🇸", age: 15, potential: 89, tecnica: 68, ritmo: 68, adelantamientos: 65, mental: 50, adaptabilidad: 50, fisico: 60 },
      { name: "Fynn Kratochwil", photoId: 97, nat: "🇩🇪", age: 16, potential: 78, tecnica: 60, ritmo: 60, adelantamientos: 58, mental: 44, adaptabilidad: 42, fisico: 58 },
      { name: "Carlos Cano", photoId: 98, nat: "🇪🇸", age: 16, potential: 75, tecnica: 58, ritmo: 59, adelantamientos: 56, mental: 42, adaptabilidad: 40, fisico: 56 },
      { name: "Kiattisak Singhapong", photoId: 99, nat: "🇹🇭", age: 17, potential: 72, tecnica: 56, ritmo: 55, adelantamientos: 54, mental: 40, adaptabilidad: 40, fisico: 56 },
      { name: "Kiandra Ramadhipa", photoId: 100, nat: "🇮🇩", age: 15, potential: 70, tecnica: 54, ritmo: 54, adelantamientos: 52, mental: 38, adaptabilidad: 38, fisico: 54 },
      { name: "David Da Costa", photoId: 101, nat: "🇫🇷", age: 16, potential: 68, tecnica: 53, ritmo: 52, adelantamientos: 51, mental: 38, adaptabilidad: 38, fisico: 53 },
      { name: "Yaroslav Karpushin", photoId: 102, nat: "🇰🇬", age: 17, potential: 64, tecnica: 50, ritmo: 50, adelantamientos: 48, mental: 36, adaptabilidad: 36, fisico: 52 },
      { name: "Archie Schmidt", photoId: 103, nat: "🇬🇧", age: 15, potential: 66, tecnica: 51, ritmo: 51, adelantamientos: 49, mental: 37, adaptabilidad: 36, fisico: 52 },
      { name: "Ethan Sparks", photoId: 104, nat: "🇬🇧", age: 16, potential: 60, tecnica: 47, ritmo: 47, adelantamientos: 46, mental: 34, adaptabilidad: 34, fisico: 50 },
      // --- Real 2026 riders filling out the remaining 15 grid slots ---
      { name: "Sullivan Mounsey", photoId: 105, nat: "🇬🇧", age: 19, potential: 74, tecnica: 57, ritmo: 60, adelantamientos: 58, mental: 43, adaptabilidad: 38, fisico: 59 },
      { name: "Luca Agostinelli", photoId: 106, nat: "🇻🇳", age: 18, potential: 62, tecnica: 50, ritmo: 48, adelantamientos: 47, mental: 39, adaptabilidad: 36, fisico: 53 },
      { name: "Afonso Almeida", photoId: 107, nat: "🇵🇹", age: 16, potential: 79, tecnica: 60, ritmo: 58, adelantamientos: 55, mental: 42, adaptabilidad: 41, fisico: 55 },
      { name: "Alejandra Fernández", photoId: 108, nat: "🇪🇸", age: 17, potential: 71, tecnica: 55, ritmo: 53, adelantamientos: 54, mental: 44, adaptabilidad: 40, fisico: 52 },
      { name: "Travis Borg", photoId: 109, nat: "🇲🇹", age: 16, potential: 49, tecnica: 41, ritmo: 40, adelantamientos: 39, mental: 31, adaptabilidad: 29, fisico: 47 },
      { name: "Guillem Planques", photoId: 110, nat: "🇫🇷", age: 18, potential: 66, tecnica: 52, ritmo: 54, adelantamientos: 50, mental: 40, adaptabilidad: 37, fisico: 56 },
      { name: "Mateo Marulanda", photoId: 111, nat: "🇨🇴", age: 15, potential: 85, tecnica: 63, ritmo: 60, adelantamientos: 57, mental: 41, adaptabilidad: 44, fisico: 54 },
      { name: "Giulio Pugliese", photoId: 112, nat: "🇮🇹", age: 17, potential: 58, tecnica: 46, ritmo: 47, adelantamientos: 45, mental: 35, adaptabilidad: 33, fisico: 50 },
      { name: "Jurrien van Crugten", photoId: 113, nat: "🇳🇱", age: 17, potential: 64, tecnica: 51, ritmo: 49, adelantamientos: 48, mental: 38, adaptabilidad: 39, fisico: 51 },
      { name: "Tibor Varga", photoId: 114, nat: "🇭🇺", age: 19, potential: 53, tecnica: 44, ritmo: 45, adelantamientos: 43, mental: 36, adaptabilidad: 32, fisico: 55 },
      { name: "Alfonsi Daquigan", photoId: 115, nat: "🇵🇭", age: 16, potential: 68, tecnica: 53, ritmo: 51, adelantamientos: 52, mental: 37, adaptabilidad: 38, fisico: 50 },
      { name: "Cristian Borrelli", photoId: 116, nat: "🇮🇹", age: 16, potential: 56, tecnica: 45, ritmo: 44, adelantamientos: 43, mental: 33, adaptabilidad: 31, fisico: 48 },
      { name: "Fernando Bujosa", photoId: 117, nat: "🇪🇸", age: 17, potential: 61, tecnica: 48, ritmo: 50, adelantamientos: 46, mental: 39, adaptabilidad: 35, fisico: 53 },
      { name: "Kristian Daniel Jr", photoId: 118, nat: "🇺🇸", age: 17, potential: 70, tecnica: 54, ritmo: 56, adelantamientos: 53, mental: 41, adaptabilidad: 37, fisico: 57 },
      { name: "Kerman Tinez", photoId: 119, nat: "🇻🇪", age: 16, potential: 45, tecnica: 39, ritmo: 38, adelantamientos: 37, mental: 30, adaptabilidad: 28, fisico: 46 },
    ],
  },
];
