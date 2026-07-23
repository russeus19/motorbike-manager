/**
 * WorldSSP (Supersport) 2026 — 21 equipos oficiales, grid real confirmado
 * (FIM/Dorna entry list + cambio de piloto en Renzi Corse de junio 2026).
 *
 * photoId: se reutilizan los ya existentes para pilotos que ya estaban en
 * el juego como agentes libres (Marcos Ramírez → 91, Héctor Garzó → 125).
 * El resto usa el siguiente rango libre del proyecto: 128–159.
 *
 * Los valores de bike/atributos son un punto de partida (escalados según
 * la clasificación real de equipos 2026: AS bLU cRU campeón, Orelac y
 * Zxmoto detrás, Renzi Corse/Motorsport Kofler/Honda Racing/QJMotor en
 * el fondo de la tabla) — pendientes de que los ajustes tú, igual que
 * hicimos con Superbikes.
 */
export const SUPERSPORT_TEAMS_DATA = [
  { name: "AS bLU cRU Racing Team", logoId: "as_blucru_wssp", tier: "Fábrica", slots: 2, manufacturer: "Yamaha", color: "#2d3faa",
    bike: { aero: 85, chasis: 84, motor: 85, freno: 83, electronica: 84 }, budget: 950000,
    riders: [
      { name: "Albert Arenas", photoId: 150, nat: "🇪🇸", age: 27, potential: 55, tecnica: 79, ritmo: 77, adelantamientos: 76, mental: 75, adaptabilidad: 72, fisico: 71, number: 75 },
      { name: "Aldi Satya Mahendra", photoId: 149, nat: "🇮🇩", age: 24, potential: 62, tecnica: 71, ritmo: 70, adelantamientos: 71, mental: 62, adaptabilidad: 65, fisico: 69, number: 57 },
    ] },
  { name: "Orelac Racing Verdnatura", logoId: "orelac_wssp", tier: "Fábrica", slots: 2, manufacturer: "Ducati", color: "#67696d",
    bike: { aero: 84, chasis: 83, motor: 83, freno: 82, electronica: 83 }, budget: 900000,
    riders: [
      { name: "Jaume Masià", photoId: 133, nat: "🇪🇸", age: 24, potential: 60, tecnica: 78, ritmo: 77, adelantamientos: 76, mental: 71, adaptabilidad: 69, fisico: 67, number: 5 },
      { name: "Joshua Whatley", photoId: 134, nat: "🇬🇧", age: 21, potential: 68, tecnica: 64, ritmo: 63, adelantamientos: 63, mental: 56, adaptabilidad: 59, fisico: 67, number: 70 },
    ] },
  { name: "Zxmoto Factory Evan Bros Racing", logoId: "zxmoto_evanbros_wssp", tier: "Fábrica", slots: 2, manufacturer: "Zxmoto", color: "#bf0f00",
    bike: { aero: 82, chasis: 81, motor: 80, freno: 80, electronica: 81 }, budget: 880000,
    riders: [
      { name: "Valentin Debise", photoId: 158, nat: "🇫🇷", age: 30, potential: 45, tecnica: 77, ritmo: 76, adelantamientos: 75, mental: 73, adaptabilidad: 70, fisico: 67, number: 53 },
      { name: "Federico Caricasulo", photoId: 159, nat: "🇮🇹", age: 30, potential: 40, tecnica: 67, ritmo: 63, adelantamientos: 62, mental: 60, adaptabilidad: 60, fisico: 60, number: 64 },
    ] },
  { name: "GMT94 Yamaha", logoId: "gmt94_yamaha_wssp", tier: "Satélite", slots: 2, manufacturer: "Yamaha", color: "#2d3faa",
    bike: { aero: 79, chasis: 78, motor: 78, freno: 77, electronica: 78 }, budget: 780000,
    riders: [
      { name: "Roberto García", photoId: 152, nat: "🇪🇸", age: 29, potential: 42, tecnica: 74, ritmo: 71, adelantamientos: 70, mental: 67, adaptabilidad: 65, fisico: 67, number: 37 },
      { name: "Lucas Mahias", photoId: 153, nat: "🇫🇷", age: 35, potential: 25, tecnica: 72, ritmo: 67, adelantamientos: 66, mental: 69, adaptabilidad: 65, fisico: 57, number: 94 },
    ] },
  { name: "Pata Yamaha Ten Kate Racing", logoId: "pata_tenkate_wssp", tier: "Satélite", slots: 2, manufacturer: "Yamaha", color: "#2d3faa",
    bike: { aero: 78, chasis: 77, motor: 77, freno: 76, electronica: 77 }, budget: 760000,
    riders: [
      { name: "Can Öncü", photoId: 156, nat: "🇹🇷", age: 21, potential: 66, tecnica: 72, ritmo: 75, adelantamientos: 76, mental: 64, adaptabilidad: 68, fisico: 71, number: 61 },
      { name: "Yuki Okamoto", photoId: 155, nat: "🇯🇵", age: 24, potential: 48, tecnica: 61, ritmo: 59, adelantamientos: 59, mental: 55, adaptabilidad: 57, fisico: 63, number: 31 },
    ] },
  { name: "PTR Triumph Factory Racing", logoId: "ptr_triumph_wssp", tier: "Fábrica", slots: 2, manufacturer: "Triumph", color: "#faff26",
    bike: { aero: 80, chasis: 79, motor: 79, freno: 78, electronica: 79 }, budget: 820000,
    riders: [
      { name: "Oli Bayliss", photoId: 147, nat: "🇦🇺", age: 21, potential: 65, tecnica: 67, ritmo: 71, adelantamientos: 68, mental: 58, adaptabilidad: 60, fisico: 66, number: 32 },
      { name: "Tom Booth-Amos", photoId: 148, nat: "🇬🇧", age: 24, potential: 58, tecnica: 74, ritmo: 75, adelantamientos: 74, mental: 64, adaptabilidad: 66, fisico: 73, number: 69 },
    ] },
  { name: "Feel Racing WorldSSP Team", logoId: "feel_racing_wssp", tier: "Satélite", slots: 2, manufacturer: "Ducati", color: "#960a0e",
    bike: { aero: 77, chasis: 76, motor: 76, freno: 75, electronica: 76 }, budget: 720000,
    riders: [
      { name: "Philipp Öttl", photoId: 132, nat: "🇩🇪", age: 30, potential: 40, tecnica: 75, ritmo: 73, adelantamientos: 71, mental: 70, adaptabilidad: 67, fisico: 64, number: 65 },
    ] },
  { name: "Kawasaki WorldSSP Team", logoId: "kawasaki_wssp_indep", tier: "Independiente", slots: 2, manufacturer: "Kawasaki", color: "#57ce3c",
    bike: { aero: 76, chasis: 75, motor: 75, freno: 74, electronica: 75 }, budget: 700000,
    riders: [
      { name: "Jeremy Alcoba", photoId: 140, nat: "🇪🇸", age: 25, potential: 55, tecnica: 74, ritmo: 72, adelantamientos: 71, mental: 66, adaptabilidad: 67, fisico: 70, number: 52 },
      { name: "Dominique Aegerter", photoId: 141, nat: "🇨🇭", age: 35, potential: 20, tecnica: 69, ritmo: 64, adelantamientos: 61, mental: 71, adaptabilidad: 64, fisico: 55, number: 77 },
    ] },
  { name: "WRP Racing", logoId: "wrp_racing_wssp", tier: "Independiente", slots: 2, manufacturer: "Ducati", color: "#960a0e",
    bike: { aero: 75, chasis: 74, motor: 74, freno: 73, electronica: 74 }, budget: 680000,
    riders: [
      { name: "Matteo Ferrari", photoId: 136, nat: "🇮🇹", age: 28, potential: 44, tecnica: 72, ritmo: 71, adelantamientos: 68, mental: 65, adaptabilidad: 65, fisico: 67, number: 11 },
      { name: "Borja Jiménez", photoId: 137, nat: "🇪🇸", age: 24, potential: 46, tecnica: 62, ritmo: 60, adelantamientos: 60, mental: 55, adaptabilidad: 57, fisico: 63, number: 91 },
    ] },
  { name: "Ecosantagata Althea Racing Team", logoId: "ecosantagata_althea_wssp", tier: "Independiente", slots: 2, manufacturer: "Ducati", color: "#960a0e",
    bike: { aero: 74, chasis: 73, motor: 73, freno: 72, electronica: 73 }, budget: 660000,
    riders: [
      { name: "Alessandro Zaccone", photoId: 131, nat: "🇮🇹", age: 29, potential: 42, tecnica: 73, ritmo: 70, adelantamientos: 70, mental: 68, adaptabilidad: 66, fisico: 67, number: 16 },
      { name: "Leonardo Taccini", photoId: 130, nat: "🇮🇹", age: 20, potential: 60, tecnica: 55, ritmo: 54, adelantamientos: 54, mental: 48, adaptabilidad: 52, fisico: 60, number: 10 },
    ] },
  { name: "EAB Racing Team", logoId: "eab_racing_wssp", tier: "Independiente", slots: 2, manufacturer: "Ducati", color: "#960a0e",
    bike: { aero: 71, chasis: 70, motor: 70, freno: 69, electronica: 70 }, budget: 600000,
    riders: [
      { name: "Simon Jespersen", photoId: 129, nat: "🇩🇰", age: 21, potential: 58, tecnica: 67, ritmo: 66, adelantamientos: 66, mental: 58, adaptabilidad: 62, fisico: 71, number: 43 },
    ] },
  { name: "VFT Racing Yamaha", logoId: "vft_racing_wssp", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#2d3faa",
    bike: { aero: 70, chasis: 69, motor: 69, freno: 68, electronica: 69 }, budget: 580000,
    riders: [
      { name: "Filippo Farioli", photoId: 157, nat: "🇮🇹", age: 24, potential: 46, tecnica: 67, ritmo: 65, adelantamientos: 64, mental: 59, adaptabilidad: 61, fisico: 68, number: 7 },
    ] },
  { name: "D34G WorldSSP Racing Team", logoId: "d34g_wssp", tier: "Independiente", slots: 2, manufacturer: "Ducati", color: "#960a0e",
    bike: { aero: 69, chasis: 68, motor: 68, freno: 67, electronica: 68 }, budget: 560000,
    riders: [
      { name: "Mattia Casadei", photoId: 128, nat: "🇮🇹", age: 32, potential: 30, tecnica: 68, ritmo: 64, adelantamientos: 62, mental: 67, adaptabilidad: 63, fisico: 60, number: 40 },
    ] },
  { name: "Compos Racing Team", logoId: "compos_racing_wssp", tier: "Independiente", slots: 2, manufacturer: "Triumph", color: "#ff4b6b",
    bike: { aero: 68, chasis: 67, motor: 67, freno: 66, electronica: 67 }, budget: 540000,
    riders: [
      { name: "Oliver König", photoId: 145, nat: "🇩🇪", age: 24, potential: 40, tecnica: 57, ritmo: 55, adelantamientos: 55, mental: 51, adaptabilidad: 53, fisico: 60, number: 25 },
      { name: "Ondřej Vostatek", photoId: 146, nat: "🇨🇿", age: 27, potential: 34, tecnica: 64, ritmo: 62, adelantamientos: 60, mental: 59, adaptabilidad: 58, fisico: 63, number: 50 },
    ] },
  { name: "Honda Racing WorldSSP Team", logoId: "honda_racing_wssp", tier: "Independiente", slots: 2, manufacturer: "Honda", color: "#de2929",
    bike: { aero: 67, chasis: 66, motor: 66, freno: 65, electronica: 66 }, budget: 520000,
    riders: [
      { name: "Ana Carrasco", photoId: 139, nat: "🇪🇸", age: 29, potential: 22, tecnica: 60, ritmo: 57, adelantamientos: 55, mental: 64, adaptabilidad: 59, fisico: 53, number: 22 },
      { name: "Corentin Perolari", photoId: 138, nat: "🇫🇷", age: 29, potential: 30, tecnica: 66, ritmo: 62, adelantamientos: 61, mental: 62, adaptabilidad: 60, fisico: 61, number: 6 },
    ] },
  { name: "Motozoo by Madforce Dubai", logoId: "motozoo_madforce_wssp", tier: "Independiente", slots: 2, manufacturer: "MV Agusta", color: "#b5121b",
    bike: { aero: 65, chasis: 64, motor: 64, freno: 63, electronica: 64 }, budget: 480000,
    riders: [
      { name: "Andrea Giombini", photoId: 143, nat: "🇮🇹", age: 24, potential: 32, tecnica: 62, ritmo: 59, adelantamientos: 58, mental: 57, adaptabilidad: 58, fisico: 66, number: 88 },
    ] },
  { name: "Cerba Yamaha Racing Team", logoId: "cerba_yamaha_wssp", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#2d3faa",
    bike: { aero: 64, chasis: 63, motor: 63, freno: 62, electronica: 63 }, budget: 460000,
    riders: [
      { name: "Xavier Cardelús", photoId: 151, nat: "🇦🇩", age: 24, potential: 30, tecnica: 61, ritmo: 58, adelantamientos: 57, mental: 56, adaptabilidad: 57, fisico: 65, number: 20 },
    ] },
  { name: "QJMotor Factory Racing", logoId: "qjmotor_factory_wssp", tier: "Independiente", slots: 2, manufacturer: "QJ Motor", color: "#9d180e",
    bike: { aero: 63, chasis: 62, motor: 62, freno: 61, electronica: 62 }, budget: 440000,
    riders: [
      { name: "Marcos Ramírez", photoId: 91, nat: "🇪🇸", age: 27, potential: 52, tecnica: 65, ritmo: 65, adelantamientos: 63, mental: 61, adaptabilidad: 63, fisico: 61, number: 24 },
      { name: "Raffaele De Rosa", photoId: 144, nat: "🇮🇹", age: 38, potential: 15, tecnica: 62, ritmo: 58, adelantamientos: 55, mental: 66, adaptabilidad: 60, fisico: 50, number: 3 },
    ] },
  { name: "Flembbo by Racing Development", logoId: "flembbo_racingdev_wssp", tier: "Independiente", slots: 2, manufacturer: "MV Agusta", color: "#b5121b",
    bike: { aero: 61, chasis: 60, motor: 60, freno: 59, electronica: 60 }, budget: 400000,
    riders: [
      { name: "Jacopo Cretaro", photoId: 142, nat: "🇮🇹", age: 24, potential: 28, tecnica: 51, ritmo: 49, adelantamientos: 48, mental: 47, adaptabilidad: 48, fisico: 55, number: 73 },
    ] },
  { name: "Motorsport Kofler", logoId: "motorsport_kofler_wssp", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#2d3faa",
    bike: { aero: 60, chasis: 59, motor: 59, freno: 58, electronica: 59 }, budget: 380000,
    riders: [
      { name: "Andreas Kofler", photoId: 154, nat: "🇦🇹", age: 30, potential: 18, tecnica: 50, ritmo: 48, adelantamientos: 47, mental: 52, adaptabilidad: 49, fisico: 52, number: 19 },
    ] },
  { name: "Renzi Corse", logoId: "renzi_corse_wssp", tier: "Independiente", slots: 2, manufacturer: "Ducati", color: "#960a0e",
    bike: { aero: 62, chasis: 61, motor: 61, freno: 60, electronica: 61 }, budget: 420000,
    riders: [
      { name: "Riccardo Rossi", photoId: 135, nat: "🇮🇹", age: 20, potential: 50, tecnica: 54, ritmo: 55, adelantamientos: 54, mental: 47, adaptabilidad: 50, fisico: 56, number: 54 },
      { name: "Héctor Garzó", photoId: 125, nat: "🇪🇸", age: 26, potential: 50, tecnica: 64, ritmo: 64, adelantamientos: 62, mental: 58, adaptabilidad: 60, fisico: 64, number: 44 },
    ] },
];
