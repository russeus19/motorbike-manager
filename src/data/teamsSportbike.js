// WorldSPB (FIM Sportbike World Championship) — temporada inaugural 2026,
// sustituye a la WorldSSP300 como escalón de acceso por debajo de WorldSSP
// y WorldSBK. Comparte fin de semana y circuitos con Superbikes/Supersport
// (ver data/superbikesCalendar.js), aunque el calendario real de WorldSPB
// 2026 tiene menos rondas (8) que el compartido por WorldSBK/WorldSSP (12);
// se reutiliza igualmente el calendario común por decisión de diseño.
//
// Nivel (tier) calculado a partir de la clasificación real de equipos tras
// esta primera temporada 2026 (no hay temporadas anteriores de las que
// partir, al ser una categoría nueva): Puntero = top 3, Satélite = los 6
// siguientes, Independiente = el resto.
//
// Nacionalidades: la mayoría confirmadas por fuentes reales (prensa
// especializada, equipos oficiales); las marcadas "estimada" son una
// inferencia razonable a partir del nombre, no una confirmación oficial.
export const SPORTBIKE_TEAMS_DATA = [
  // --- Puntero (top 3 de la clasificación de equipos 2026) ---
  { name: "Team Prodina Kawasaki XCI", nameTemplate: "{sponsor} Team Prodina Kawasaki XCI", logoId: "prodina_kawasaki_spb", tier: "Puntero", slots: 2, manufacturer: "Kawasaki", color: "#4CAF50",
    bike: { aero: 64, chasis: 65, motor: 64, freno: 63, electronica: 65 }, budget: 380000,
    riders: [
      { name: "David Salvador", nat: "🇪🇸", age: 22, potential: 74, tecnica: 66, ritmo: 65, adelantamientos: 64, mental: 60, adaptabilidad: 58, fisico: 62, number: 38 },
      { name: "Antonio Torres", nat: "🇪🇸", age: 21, potential: 68, tecnica: 63, ritmo: 62, adelantamientos: 61, mental: 57, adaptabilidad: 55, fisico: 60, number: 47 },
    ] },
  { name: "Track & Trades Wixx Racing", nameTemplate: "{sponsor} Wixx Racing", logoId: "trackandtrades_wixx_spb", tier: "Puntero", slots: 2, manufacturer: "Suzuki", color: "#0033A0",
    bike: { aero: 62, chasis: 63, motor: 62, freno: 61, electronica: 62 }, budget: 360000,
    riders: [
      { name: "Jeffrey Buis", nat: "🇳🇱", age: 23, potential: 70, tecnica: 65, ritmo: 63, adelantamientos: 63, mental: 61, adaptabilidad: 59, fisico: 60, number: 6 },
      { name: "Ferre Fleerackers", nat: "🇧🇪", age: 19, potential: 78, tecnica: 61, ritmo: 60, adelantamientos: 62, mental: 55, adaptabilidad: 54, fisico: 58, number: 65 },
    ] },
  { name: "MTM Kawasaki", nameTemplate: "{sponsor} MTM Kawasaki", logoId: "mtm_kawasaki_spb", tier: "Puntero", slots: 2, manufacturer: "Kawasaki", color: "#4CAF50",
    bike: { aero: 60, chasis: 61, motor: 60, freno: 60, electronica: 61 }, budget: 340000,
    riders: [
      { name: "Xavier Artigas", nat: "🇪🇸", age: 20, potential: 73, tecnica: 62, ritmo: 61, adelantamientos: 61, mental: 56, adaptabilidad: 54, fisico: 58, number: 34 },
      { name: "Loris Veneman", nat: "🇳🇱", age: 19, potential: 76, tecnica: 60, ritmo: 62, adelantamientos: 59, mental: 54, adaptabilidad: 53, fisico: 57, number: 71 },
    ] },

  // --- Satélite (siguientes 6) ---
  { name: "Revo–M2", nameTemplate: "{sponsor} Revo–M2", logoId: "revo_m2_spb", tier: "Satélite", slots: 2, manufacturer: "Aprilia", color: "#000000",
    bike: { aero: 55, chasis: 56, motor: 55, freno: 54, electronica: 55 }, budget: 280000,
    riders: [
      { name: "Matteo Vannucci", nat: "🇮🇹", age: 20, potential: 66, tecnica: 58, ritmo: 57, adelantamientos: 57, mental: 53, adaptabilidad: 51, fisico: 55, number: 91 },
      { name: "Mattia Sorrenti", nat: "🇮🇹", age: 18, potential: 62, tecnica: 54, ritmo: 53, adelantamientos: 53, mental: 49, adaptabilidad: 48, fisico: 52, number: 11 },
    ] },
  { name: "CM Triumph Factory Racing", nameTemplate: "{sponsor} CM Triumph Factory Racing", logoId: "cm_triumph_spb", tier: "Satélite", slots: 2, manufacturer: "Triumph", color: "#001A2C",
    bike: { aero: 56, chasis: 55, motor: 56, freno: 55, electronica: 56 }, budget: 280000,
    riders: [
      { name: "Bruno Ieraci", nat: "🇮🇹", age: 24, potential: 60, tecnica: 57, ritmo: 56, adelantamientos: 56, mental: 55, adaptabilidad: 52, fisico: 54, number: 18 },
      { name: "Elia Bartolini", nat: "🇮🇹", age: 20, potential: 63, tecnica: 55, ritmo: 54, adelantamientos: 54, mental: 50, adaptabilidad: 49, fisico: 53, number: 23 },
    ] },
  { name: "Team BrCorse", nameTemplate: "{sponsor} Team BrCorse", logoId: "brcorse_spb", tier: "Satélite", slots: 2, manufacturer: "Yamaha", color: "#003DA5",
    bike: { aero: 53, chasis: 54, motor: 53, freno: 52, electronica: 54 }, budget: 260000,
    riders: [
      { name: "Carter Thompson", nat: "🇦🇺", age: 18, potential: 65, tecnica: 54, ritmo: 55, adelantamientos: 53, mental: 49, adaptabilidad: 48, fisico: 52, number: 50 },
      { name: "Marco Gaggi", nat: "🇮🇹", age: 22, potential: 55, tecnica: 51, ritmo: 50, adelantamientos: 51, mental: 48, adaptabilidad: 46, fisico: 50, number: 43 },
    ] },
  { name: "PHR Performance Triumph", nameTemplate: "{sponsor} PHR Performance Triumph", logoId: "phr_triumph_spb", tier: "Satélite", slots: 2, manufacturer: "Triumph", color: "#001A2C",
    bike: { aero: 52, chasis: 53, motor: 52, freno: 52, electronica: 53 }, budget: 250000,
    riders: [
      { name: "Harrison Dessoy", nat: "🇬🇧", age: 20, potential: 58, tecnica: 52, ritmo: 51, adelantamientos: 51, mental: 47, adaptabilidad: 46, fisico: 50, number: 55 },
      { name: "Fenton Seabright", nat: "🇬🇧", age: 19, potential: 56, tecnica: 50, ritmo: 49, adelantamientos: 50, mental: 46, adaptabilidad: 45, fisico: 49, number: 73 },
    ] },
  { name: "Deza–Box 77 Racing Team", nameTemplate: "{sponsor} Deza–Box 77 Racing Team", logoId: "deza_box77_spb", tier: "Satélite", slots: 2, manufacturer: "Kawasaki", color: "#4CAF50",
    bike: { aero: 51, chasis: 52, motor: 51, freno: 51, electronica: 52 }, budget: 240000,
    riders: [
      { name: "Álvaro Fuertes", nat: "🇪🇸", age: 18, potential: 57, tecnica: 51, ritmo: 50, adelantamientos: 50, mental: 46, adaptabilidad: 45, fisico: 49, number: 16 },
      { name: "José Osuna", nat: "🇪🇸", age: 19, potential: 53, tecnica: 48, ritmo: 47, adelantamientos: 48, mental: 44, adaptabilidad: 43, fisico: 47, number: 77 },
    ] },
  { name: "VLR Racing Team Suzuki", nameTemplate: "{sponsor} VLR Racing Team Suzuki", logoId: "vlr_suzuki_spb", tier: "Satélite", slots: 2, manufacturer: "Suzuki", color: "#0033A0",
    bike: { aero: 50, chasis: 51, motor: 50, freno: 50, electronica: 51 }, budget: 230000,
    riders: [
      { name: "Kas Beekmans", nat: "🇳🇱", age: 19, potential: 54, tecnica: 49, ritmo: 48, adelantamientos: 48, mental: 45, adaptabilidad: 44, fisico: 48, number: 68 },
      { name: "Filippo Bianchi", nat: "🇮🇹", age: 18, potential: 50, tecnica: 45, ritmo: 44, adelantamientos: 45, mental: 42, adaptabilidad: 41, fisico: 45, number: 25 },
    ] },

  // --- Independiente (resto) ---
  { name: "Kove Racing Team 109", nameTemplate: "{sponsor} Kove Racing Team 109", logoId: "kove_racing109_spb", tier: "Independiente", slots: 2, manufacturer: "Kove", color: "#FF7A00",
    bike: { aero: 47, chasis: 48, motor: 47, freno: 47, electronica: 48 }, budget: 190000,
    riders: [
      { name: "Beñat Fernández", nat: "🇪🇸", age: 20, potential: 88, tecnica: 68, ritmo: 69, adelantamientos: 67, mental: 65, adaptabilidad: 64, fisico: 68, number: 7 },
      { name: "Phillip Tonn", nat: "🇩🇪", age: 21, potential: 46, tecnica: 43, ritmo: 42, adelantamientos: 43, mental: 41, adaptabilidad: 40, fisico: 44, number: 66 },
    ] },
  { name: "ProGP NitiRacing", nameTemplate: "{sponsor} ProGP NitiRacing", logoId: "progp_nitiracing_spb", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#DA291C",
    bike: { aero: 46, chasis: 47, motor: 46, freno: 46, electronica: 47 }, budget: 180000,
    riders: [
      { name: "Felix Mulya", nat: "🇮🇩", age: 19, potential: 48, tecnica: 44, ritmo: 43, adelantamientos: 44, mental: 41, adaptabilidad: 40, fisico: 44, number: 27 },
      { name: "Arai Agaska", nat: "🇮🇩", age: 18, potential: 44, tecnica: 41, ritmo: 40, adelantamientos: 41, mental: 39, adaptabilidad: 38, fisico: 42, number: 93 },
    ] },
  { name: "ARCO Yamaha MotoR University Team", nameTemplate: "{sponsor} Yamaha MotoR University Team", logoId: "arco_yamaha_spb", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#003DA5",
    bike: { aero: 45, chasis: 46, motor: 45, freno: 45, electronica: 46 }, budget: 175000,
    riders: [
      { name: "Alessandro Di Persio", nat: "🇮🇹", age: 20, potential: 47, tecnica: 43, ritmo: 42, adelantamientos: 42, mental: 40, adaptabilidad: 39, fisico: 43, number: 69 },
      { name: "Gonzalo Sánchez", nat: "🇪🇸", age: 18, potential: 42, tecnica: 39, ritmo: 38, adelantamientos: 39, mental: 37, adaptabilidad: 36, fisico: 41, number: 33 },
    ] },
  { name: "Panattoni BGR Smrz Racing", nameTemplate: "{sponsor} BGR Smrz Racing", logoId: "panattoni_bgr_smrz_spb", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#7A7A7A",
    bike: { aero: 44, chasis: 45, motor: 44, freno: 44, electronica: 45 }, budget: 170000,
    riders: [
      { name: "Mirko Gennai", nat: "🇮🇹", age: 21, potential: 45, tecnica: 42, ritmo: 41, adelantamientos: 41, mental: 39, adaptabilidad: 38, fisico: 42, number: 26 },
      { name: "Troy Sovička", nat: "🇨🇿", age: 19, potential: 40, tecnica: 37, ritmo: 36, adelantamientos: 37, mental: 35, adaptabilidad: 34, fisico: 39, number: 21 },
    ] },
  { name: "Pons Motosport Italika Racing", nameTemplate: "{sponsor} Pons Motosport Italika Racing", logoId: "pons_italika_spb", tier: "Independiente", slots: 2, manufacturer: "Kawasaki", color: "#4CAF50",
    bike: { aero: 43, chasis: 44, motor: 43, freno: 43, electronica: 44 }, budget: 165000,
    riders: [
      { name: "Juan Risueño", nat: "🇪🇸", age: 18, potential: 41, tecnica: 38, ritmo: 37, adelantamientos: 38, mental: 36, adaptabilidad: 35, fisico: 40, number: 39 },
      { name: "Julian Correa", nat: "🇺🇸", age: 19, potential: 38, tecnica: 35, ritmo: 34, adelantamientos: 35, mental: 34, adaptabilidad: 33, fisico: 38, number: 40 },
    ] },
  { name: "MMR", nameTemplate: "{sponsor} MMR", logoId: "mmr_spb", tier: "Independiente", slots: 2, manufacturer: "Aprilia", color: "#000000",
    bike: { aero: 42, chasis: 43, motor: 42, freno: 42, electronica: 43 }, budget: 160000,
    riders: [
      { name: "Thomas Benetti", nat: "🇮🇹", age: 19, potential: 39, tecnica: 36, ritmo: 35, adelantamientos: 36, mental: 35, adaptabilidad: 34, fisico: 39, number: 98 },
      { name: "Ioannis Peristeras", nat: "🇬🇷", age: 20, potential: 36, tecnica: 34, ritmo: 33, adelantamientos: 34, mental: 33, adaptabilidad: 32, fisico: 37, number: 41 },
    ] },
  { name: "Yamaha AD78 FIMLA by MS Racing", nameTemplate: "{sponsor} Yamaha AD78 FIMLA by MS Racing", logoId: "yamaha_ad78_fimla_spb", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#003DA5",
    bike: { aero: 41, chasis: 42, motor: 41, freno: 41, electronica: 42 }, budget: 155000,
    riders: [
      { name: "Gabin Cazard", nat: "🇫🇷", age: 18, potential: 37, tecnica: 34, ritmo: 33, adelantamientos: 34, mental: 33, adaptabilidad: 32, fisico: 37, number: 92 },
      { name: "Humberto Maier", nat: "🇧🇷", age: 20, potential: 34, tecnica: 32, ritmo: 31, adelantamientos: 32, mental: 31, adaptabilidad: 30, fisico: 35, number: 12 },
    ] },
  { name: "PATA AG Motorsport Italia", nameTemplate: "{sponsor} AG Motorsport Italia", logoId: "pata_ag_motorsport_spb", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#003DA5",
    bike: { aero: 40, chasis: 41, motor: 40, freno: 40, electronica: 41 }, budget: 150000,
    riders: [
      { name: "Taiyo Aksu", nat: "🇦🇺", age: 17, potential: 40, tecnica: 33, ritmo: 32, adelantamientos: 33, mental: 32, adaptabilidad: 31, fisico: 36, number: 89 },
      { name: "Diego Poncet", nat: "🇫🇷", age: 18, potential: 32, tecnica: 30, ritmo: 29, adelantamientos: 30, mental: 30, adaptabilidad: 29, fisico: 34, number: 36 },
    ] },
  { name: "Miguel Oliveira Team", nameTemplate: "{sponsor} Miguel Oliveira Team", logoId: "miguel_oliveira_team_spb", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#003DA5",
    bike: { aero: 40, chasis: 40, motor: 40, freno: 40, electronica: 40 }, budget: 150000,
    riders: [
      { name: "Tomás Alonso", nat: "🇵🇹", age: 18, potential: 38, tecnica: 32, ritmo: 31, adelantamientos: 32, mental: 31, adaptabilidad: 30, fisico: 35, number: 79 },
      { name: "Carl Harris", nat: "🇬🇧", age: 17, potential: 30, tecnica: 28, ritmo: 27, adelantamientos: 28, mental: 28, adaptabilidad: 27, fisico: 32, number: 9 },
    ] },
];
