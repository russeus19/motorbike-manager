import { CIRCUITS, CIRCUIT_PROFILES } from "./circuits.js";
import { SUPERBIKES_ONLY_PROFILES } from "./circuitsSuperbikesOnly.js";

// Index into the main 22-round CIRCUIT_PROFILES for the 7 rounds
// Superbikes shares with MotoGP — kept as named lookups (not raw
// numbers) so a future calendar reorder in data/circuits.js can't
// silently point this at the wrong circuit without an error.
const SHARED = {
  phillipIsland: CIRCUITS.findIndex((c) => c.includes("Phillip Island")),
  algarve: CIRCUITS.findIndex((c) => c.includes("Algarve")),
  assen: CIRCUITS.findIndex((c) => c.includes("Assen")),
  balatonPark: CIRCUITS.findIndex((c) => c.includes("Balaton Park")),
  aragon: CIRCUITS.findIndex((c) => c.includes("MotorLand Aragón")),
  misano: CIRCUITS.findIndex((c) => c.includes("Misano")),
  jerez: CIRCUITS.findIndex((c) => c.includes("Circuito de Jerez")),
};
Object.entries(SHARED).forEach(([name, idx]) => {
  if (idx === -1) throw new Error(`circuitsSuperbikes.js: no se encontró el circuito compartido "${name}" en data/circuits.js`);
});

/** The real 12-round Superbikes calendar, in order. */
export const SUPERBIKES_CIRCUITS = [
  "Ronda de Australia — Phillip Island Grand Prix Circuit",
  "Ronda de Portugal — Autódromo Internacional do Algarve",
  "Ronda de Países Bajos — TT Circuit Assen",
  "Ronda de Hungría — Balaton Park Circuit",
  "Ronda de Chequia — Autodrom Most",
  "Ronda de Aragón — MotorLand Aragón",
  "Ronda de Emilia-Romaña — Misano Circuit Sic58",
  "Ronda del Reino Unido — Donington Park Circuit",
  "Ronda de Francia — Circuit de Nevers Magny-Cours",
  "Ronda de Italia — Cremona Circuit",
  "Ronda de Portugal — Circuito Estoril",
  "Ronda de España — Circuito de Jerez — Ángel Nieto",
];

export const SUPERBIKES_CIRCUIT_PROFILES = [
  CIRCUIT_PROFILES[SHARED.phillipIsland],
  CIRCUIT_PROFILES[SHARED.algarve],
  CIRCUIT_PROFILES[SHARED.assen],
  CIRCUIT_PROFILES[SHARED.balatonPark],
  SUPERBIKES_ONLY_PROFILES.most,
  CIRCUIT_PROFILES[SHARED.aragon],
  CIRCUIT_PROFILES[SHARED.misano],
  SUPERBIKES_ONLY_PROFILES.donington,
  SUPERBIKES_ONLY_PROFILES.magnycours,
  SUPERBIKES_ONLY_PROFILES.cremona,
  SUPERBIKES_ONLY_PROFILES.estoril,
  CIRCUIT_PROFILES[SHARED.jerez],
];
