export const MOTOGP_TEAMS_DATA = [
  {
    name: "Ducati Lenovo Team", nameTemplate: "Ducati {sponsor} Team", logoId: "ducati_lenovo", tier: "Fábrica", slots: 2, manufacturer: "Ducati", color: "#CC0000",
    bike: { aero: 90, chasis: 91, motor: 90, freno: 89, electronica: 90 }, budget: 5000000,
    riders: [
      { name: "Marc Márquez", photoId: 1, nat: "🇪🇸", age: 33, potential: 47, tecnica: 99, ritmo: 98, adelantamientos: 99, mental: 97, adaptabilidad: 97, fisico: 86, prestige: 195 , number: 93,
        tags: [
          { type: "favoriteCircuit", round: 10, circuitLabel: "Sachsenring", label: "Maestro de Sachsenring" },
          { type: "favoriteCircuit", round: 13, circuitLabel: "Misano", label: "Maestro de Misano" },
          { type: "favoriteCircuit", round: 12, circuitLabel: "MotorLand Aragón", label: "Maestro de MotorLand Aragón" },
          { type: "favoriteCircuit", round: 2, circuitLabel: "Circuito de las Américas", label: "Maestro del Circuito de las Américas" },
          { type: "mentalLimit" },
          { type: "glassBody" },
          { type: "sprintSpecialist" },
        ] },
      { name: "Francesco Bagnaia", photoId: 2, nat: "🇮🇹", age: 29, potential: 58, tecnica: 88, ritmo: 88, adelantamientos: 80, mental: 72, adaptabilidad: 84, fisico: 82, prestige: 170 , number: 63,
        tags: [
          { type: "favoriteCircuit", round: 6, circuitLabel: "Mugello", label: "Maestro de Mugello" },
          { type: "favoriteCircuit", round: 14, circuitLabel: "Red Bull Ring", label: "Especialista en el Red Bull Ring" },
          { type: "qualifyingSpecialist", label: "Clasificador nato" },
        ] },
    ],
  },
  {
    name: "BK8 Gresini Racing MotoGP", nameTemplate: "{sponsor} Gresini Racing MotoGP", logoId: "gresini", tier: "Satélite", slots: 1, manufacturer: "Ducati", color: "#9BAEE4",
    bike: { aero: 85, chasis: 85, motor: 86, freno: 84, electronica: 85 }, budget: 3000000,
    riders: [
      { name: "Álex Márquez", photoId: 3, nat: "🇪🇸", age: 30, potential: 57, tecnica: 92, ritmo: 90, adelantamientos: 87, mental: 86, adaptabilidad: 86, fisico: 81, prestige: 182 , number: 73 },
      { name: "Fermín Aldeguer", photoId: 4, nat: "🇪🇸", age: 21, potential: 92, tecnica: 87, ritmo: 86, adelantamientos: 85, mental: 70, adaptabilidad: 76, fisico: 76, prestige: 166 , number: 54 },
    ],
  },
  {
    name: "Pertamina Enduro VR46 Racing Team", nameTemplate: "{sponsor} VR46 Racing Team", logoId: "vr46", tier: "Satélite", slots: 1, manufacturer: "Ducati", color: "#e0f300",
    bike: { aero: 82, chasis: 82, motor: 83, freno: 81, electronica: 83 }, budget: 3000000,
    riders: [
      { name: "Fabio Di Giannantonio", photoId: 5, nat: "🇮🇹", age: 27, potential: 68, tecnica: 91, ritmo: 89, adelantamientos: 84, mental: 79, adaptabilidad: 81, fisico: 83, prestige: 169 , number: 49,
        tags: [{ type: "qualifyingSpecialist" }] },
      { name: "Franco Morbidelli", photoId: 6, nat: "🇮🇹", age: 31, potential: 40, tecnica: 84, ritmo: 78, adelantamientos: 73, mental: 75, adaptabilidad: 76, fisico: 73, prestige: 165 , number: 21,
        tags: [{ type: "favoriteCircuit", round: 13, circuitLabel: "Misano", label: "Especialista en Misano" }] },
    ],
  },
  {
    name: "Aprilia Racing", nameTemplate: "{sponsor} Aprilia Racing", logoId: "aprilia_racing", tier: "Fábrica", slots: 2, manufacturer: "Aprilia", color: "#5A2D82",
    bike: { aero: 96, chasis: 95, motor: 95, freno: 94, electronica: 95 }, budget: 5000000,
    riders: [
      { name: "Jorge Martín", photoId: 7, nat: "🇪🇸", age: 28, potential: 68, tecnica: 95, ritmo: 98, adelantamientos: 94, mental: 84, adaptabilidad: 92, fisico: 89, prestige: 175 , number: 89,
        tags: [{ type: "sprintSpecialist", label: "Especialista en Sprint" }, { type: "mentalLimit" }, { type: "glassBody" }] },
      { name: "Marco Bezzecchi", photoId: 8, nat: "🇮🇹", age: 28, potential: 71, tecnica: 95, ritmo: 96, adelantamientos: 93, mental: 82, adaptabilidad: 92, fisico: 88, prestige: 179 , number: 72,
        tags: [{ type: "favoriteCircuit", round: 9, circuitLabel: "Assen", label: "Maestro de Assen" }, { type: "mentalLimit" }] },
    ],
  },
  {
    name: "Trackhouse MotoGP Team", nameTemplate: "{sponsor} Trackhouse MotoGP Team", logoId: "trackhouse", tier: "Satélite", slots: 1, manufacturer: "Aprilia", color: "#0190f8",
    bike: { aero: 89, chasis: 89, motor: 89, freno: 88, electronica: 90 }, budget: 3000000,
    riders: [
      { name: "Raúl Fernández", photoId: 9, nat: "🇪🇸", age: 25, potential: 85, tecnica: 86, ritmo: 85, adelantamientos: 87, mental: 74, adaptabilidad: 80, fisico: 83, prestige: 152 , number: 25,
        tags: [{ type: "sprintSpecialist" }, { type: "regularidad" }, { type: "favoriteCircuit", round: 11, circuitLabel: "Silverstone", label: "Especialista en Silverstone" }, { type: "favoriteCircuit", round: 17, circuitLabel: "Phillip Island", label: "Especialista en Phillip Island" }] },
      { name: "Ai Ogura", photoId: 10, nat: "🇯🇵", age: 26, potential: 88, tecnica: 90, ritmo: 89, adelantamientos: 81, mental: 80, adaptabilidad: 84, fisico: 83, prestige: 160 , number: 79,
        tags: [{ type: "comeback" }] },
    ],
  },
  {
    name: "Monster Energy Yamaha MotoGP", nameTemplate: "{sponsor} Yamaha MotoGP", logoId: "monster_yamaha", tier: "Fábrica", slots: 2, manufacturer: "Yamaha", color: "#1E4DA1",
    bike: { aero: 69, chasis: 69, motor: 70, freno: 70, electronica: 72 }, budget: 5000000,
    riders: [
      { name: "Fabio Quartararo", photoId: 11, nat: "🇫🇷", age: 27, potential: 52, tecnica: 88, ritmo: 85, adelantamientos: 76, mental: 79, adaptabilidad: 83, fisico: 81, prestige: 170 , number: 20,
        tags: [{ type: "qualifyingSpecialist" }, { type: "favoriteCircuit", round: 3, circuitLabel: "Jerez", label: "Especialista en Jerez" }] },
      { name: "Álex Rins", photoId: 12, nat: "🇪🇸", age: 30, potential: 45, tecnica: 80, ritmo: 74, adelantamientos: 75, mental: 72, adaptabilidad: 74, fisico: 68, prestige: 148 , number: 42 },
    ],
  },
  {
    name: "Prima Pramac Yamaha MotoGP", nameTemplate: "{sponsor} Pramac Yamaha MotoGP", logoId: "pramac_yamaha", tier: "Satélite", slots: 1, manufacturer: "Yamaha", color: "#6C2EB5",
    bike: { aero: 64, chasis: 64, motor: 65, freno: 65, electronica: 67 }, budget: 3000000,
    riders: [
      { name: "Toprak Razgatlıoğlu", photoId: 13, nat: "🇹🇷", age: 29, potential: 72, tecnica: 82, ritmo: 70, adelantamientos: 80, mental: 66, adaptabilidad: 61, fisico: 79, prestige: 152 , number: 7 },
      { name: "Jack Miller", photoId: 14, nat: "🇦🇺", age: 31, potential: 40, tecnica: 72, ritmo: 70, adelantamientos: 77, mental: 69, adaptabilidad: 73, fisico: 71, prestige: 134 , number: 43,
        tags: [{ type: "wetSpecialist", label: "Maestro de lluvia" }] },
    ],
  },
  {
    name: "Red Bull KTM Factory Racing", nameTemplate: "{sponsor} KTM Factory Racing", logoId: "redbull_ktm_factory", tier: "Fábrica", slots: 2, manufacturer: "KTM", color: "#FF6600",
    bike: { aero: 77, chasis: 77, motor: 78, freno: 76, electronica: 79 }, budget: 5000000,
    riders: [
      { name: "Pedro Acosta", photoId: 15, nat: "🇪🇸", age: 22, potential: 89, tecnica: 89, ritmo: 89, adelantamientos: 90, mental: 75, adaptabilidad: 82, fisico: 85, prestige: 170 , number: 37,
        tags: [{ type: "mentalLimit" }] },
      { name: "Brad Binder", photoId: 16, nat: "🇿🇦", age: 30, potential: 52, tecnica: 77, ritmo: 75, adelantamientos: 80, mental: 71, adaptabilidad: 73, fisico: 80, prestige: 150 , number: 33,
        tags: [{ type: "wetSpecialist", label: "Maestro de lluvia" }] },
    ],
  },
  {
    name: "Red Bull KTM Tech3", nameTemplate: "{sponsor} KTM Tech3", logoId: "redbull_ktm_tech3", tier: "Satélite", slots: 1, manufacturer: "KTM", color: "#FF6600",
    bike: { aero: 73, chasis: 73, motor: 74, freno: 72, electronica: 75 }, budget: 3000000,
    riders: [
      { name: "Maverick Viñales", photoId: 17, nat: "🇪🇸", age: 30, potential: 48, tecnica: 83, ritmo: 82, adelantamientos: 76, mental: 69, adaptabilidad: 74, fisico: 78, prestige: 145 , number: 12 },
      { name: "Enea Bastianini", photoId: 18, nat: "🇮🇹", age: 28, potential: 55, tecnica: 82, ritmo: 81, adelantamientos: 86, mental: 75, adaptabilidad: 72, fisico: 74, prestige: 153 , number: 23 },
    ],
  },
  {
    name: "Honda HRC Castrol", nameTemplate: "Honda HRC {sponsor}", logoId: "honda_hrc", tier: "Fábrica", slots: 2, manufacturer: "Honda", color: "#CC1E2C",
    bike: { aero: 73, chasis: 72, motor: 73, freno: 72, electronica: 75 }, budget: 5000000,
    riders: [
      { name: "Joan Mir", photoId: 19, nat: "🇪🇸", age: 29, potential: 52, tecnica: 78, ritmo: 77, adelantamientos: 70, mental: 75, adaptabilidad: 76, fisico: 74, prestige: 145 , number: 36,
        tags: [
          { type: "mentalLimit" },
        ] },
      { name: "Luca Marini", photoId: 20, nat: "🇮🇹", age: 29, potential: 50, tecnica: 81, ritmo: 77, adelantamientos: 72, mental: 76, adaptabilidad: 79, fisico: 77, prestige: 141 , number: 10,
        tags: [{ type: "regularidad" }] },
    ],
  },
  {
    name: "Honda LCR", nameTemplate: "{sponsor} Honda LCR", logoId: "honda_lcr", tier: "Satélite", slots: 1, manufacturer: "Honda", color: "#808080",
    bike: { aero: 70, chasis: 69, motor: 70, freno: 69, electronica: 72 }, budget: 3000000,
    riders: [
      { name: "Johann Zarco", photoId: 21, nat: "🇫🇷", age: 36, potential: 32, tecnica: 81, ritmo: 77, adelantamientos: 76, mental: 78, adaptabilidad: 84, fisico: 66, prestige: 145 , number: 5,
        tags: [{ type: "wetSpecialist", label: "Maestro de lluvia" }, { type: "mentalLimit" }, { type: "favoriteCircuit", round: 4, circuitLabel: "Le Mans", label: "Especialista en Le Mans" }] },
      { name: "Diogo Moreira", photoId: 22, nat: "🇧🇷", age: 23, potential: 84, tecnica: 80, ritmo: 78, adelantamientos: 76, mental: 66, adaptabilidad: 70, fisico: 80, prestige: 136 , number: 11 },
    ],
  },
];
