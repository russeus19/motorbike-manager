// WorldWCR (FIM Women's Circuit Racing World Championship) — inspirado
// en la temporada real 2026 (tercera edición del campeonato). Categoría
// monomarca de verdad: todas corren con la misma Yamaha YZF-R7, así que
// TODOS los equipos arrancan con exactamente la misma media de moto
// (75), repartida con una pequeña variación entre los 5 atributos para
// que cada equipo tenga su propio perfil de puesta a punto sin que
// ninguno tenga ventaja real de fábrica — aquí gana la piloto, no la
// moto. El desarrollo entre temporadas también se frena al 20% de lo
// normal (ver utils/bikeDevelopment.js) para que esa igualdad se
// mantenga con el tiempo.
//
// EXIGE SER MUJER PARA FICHAR — ver isFreeAgentEligibleForCategory en
// utils/riders.js. Es la única categoría del juego con esa restricción;
// el campo `gender` existe en todos los pilotos del juego, pero solo
// aquí se comprueba.
//
// Roster: pilotos oficiales de la parrilla real 2026 + compañeras de
// equipo reales que corrieron con ellas en algún GP de 2025/2026
// (wildcards, sustitutas...) + 2 regens generadas con el mecanismo
// real de nombres femeninos para los dos huecos sin cubrir. Detalles
// de plantilla, nacionalidad exacta y edad son una estimación razonable
// donde la fuente no lo confirmaba con precisión.
//
// Calendario: comparte fin de semana con Superbikes/Supersport/Sportbike,
// pero solo en 6 de sus 12 rondas — ver data/wcrCalendar.js.
export const WORLDWCR_TEAMS_DATA = [
  { name: "Monster Energy Crescent Yamaha", nameTemplate: "{sponsor} Crescent Yamaha", logoId: "crescent_yamaha_wcr", tier: "Puntero", slots: 2, manufacturer: "Yamaha", color: "#00A650",
    bike: { aero: 76, chasis: 75, motor: 74, freno: 76, electronica: 74 }, budget: 220000,
    riders: [
      { name: "Beatriz Neila", photoId: 196, nat: "🇪🇸", age: 24, gender: "F", potential: 66, tecnica: 49, ritmo: 56, adelantamientos: 57, mental: 60, adaptabilidad: 59, fisico: 61, number: 36 },
      { name: "Chloe Jones", photoId: 197, nat: "🇬🇧", age: 23, gender: "F", potential: 62, tecnica: 49, ritmo: 54, adelantamientos: 54, mental: 56, adaptabilidad: 51, fisico: 54, number: 15 },
    ] },
  { name: "Terra & Vita GRT Yamaha WorldWCR", nameTemplate: "{sponsor} GRT Yamaha WorldWCR", logoId: "grt_yamaha_wcr", tier: "Puntero", slots: 2, manufacturer: "Yamaha", color: "#1C3F94",
    bike: { aero: 75, chasis: 77, motor: 74, freno: 75, electronica: 74 }, budget: 230000,
    riders: [
      { name: "María Herrera", photoId: 198, nat: "🇪🇸", age: 30, gender: "F", potential: 62, tecnica: 56, ritmo: 59, adelantamientos: 57, mental: 56, adaptabilidad: 73, fisico: 59, number: 6 },
      { name: "Natalia Rivera", photoId: 199, nat: "🇪🇸", age: 20, gender: "F", potential: 63, tecnica: 48, ritmo: 52, adelantamientos: 44, mental: 47, adaptabilidad: 52, fisico: 51, number: 20 },
    ] },
  { name: "Klint Racing Team", nameTemplate: "{sponsor} Klint Racing Team", logoId: "klint_racing_wcr", tier: "Puntero", slots: 2, manufacturer: "Yamaha", color: "#E30613",
    bike: { aero: 77, chasis: 74, motor: 75, freno: 74, electronica: 75 }, budget: 210000,
    riders: [
      { name: "Paola Ramos", photoId: 200, nat: "🇪🇸", age: 19, gender: "F", potential: 74, tecnica: 53, ritmo: 58, adelantamientos: 52, mental: 59, adaptabilidad: 57, fisico: 51, number: 58 },
      { name: "Roberta Ponziani", photoId: 201, nat: "🇮🇹", age: 30, gender: "F", potential: 57, tecnica: 52, ritmo: 63, adelantamientos: 54, mental: 56, adaptabilidad: 53, fisico: 52, number: 96 },
    ] },
  { name: "GMT94-Yamaha", nameTemplate: "{sponsor} GMT94 Yamaha", logoId: "gmt94_yamaha_wcr", tier: "Satélite", slots: 2, manufacturer: "Yamaha", color: "#F7A600",
    bike: { aero: 75, chasis: 76, motor: 74, freno: 75, electronica: 75 }, budget: 170000,
    riders: [
      { name: "Lucie Boudesseul", photoId: 202, nat: "🇫🇷", age: 23, gender: "F", potential: 54, tecnica: 45, ritmo: 44, adelantamientos: 41, mental: 43, adaptabilidad: 49, fisico: 48, number: 94 },
      { name: "Justine Pedemonte", photoId: 203, nat: "🇫🇷", age: 19, gender: "F", potential: 58, tecnica: 36, ritmo: 46, adelantamientos: 38, mental: 38, adaptabilidad: 40, fisico: 36, number: 37 },
    ] },
  { name: "MotosCerpa", nameTemplate: "{sponsor} MotosCerpa", logoId: "motoscerpa_wcr", tier: "Satélite", slots: 2, manufacturer: "Yamaha", color: "#2E2E2E",
    bike: { aero: 74, chasis: 77, motor: 74, freno: 76, electronica: 74 }, budget: 150000,
    riders: [
      { name: "Yvonne Cerpa", photoId: 204, nat: "🇪🇸", age: 19, gender: "F", potential: 69, tecnica: 52, ritmo: 51, adelantamientos: 56, mental: 49, adaptabilidad: 46, fisico: 46, number: 11 },
      { name: "Billee Fuller", photoId: 205, nat: "🇬🇧", age: 22, gender: "F", potential: 38, tecnica: 27, ritmo: 35, adelantamientos: 25, mental: 31, adaptabilidad: 30, fisico: 26, number: 29 },
    ] },
  { name: "Pons Italika Racing FIMLA", nameTemplate: "{sponsor} Italika Racing FIMLA", logoId: "italika_fimla_wcr", tier: "Satélite", slots: 2, manufacturer: "Yamaha", color: "#D71920",
    bike: { aero: 76, chasis: 76, motor: 74, freno: 74, electronica: 75 }, budget: 160000,
    riders: [
      { name: "Astrid Madrigal", photoId: 206, nat: "🇲🇽", age: 26, gender: "F", potential: 52, tecnica: 45, ritmo: 45, adelantamientos: 49, mental: 50, adaptabilidad: 49, fisico: 44, number: 83 },
      { name: "Isis Carreno", photoId: 207, nat: "🇨🇱", age: 27, gender: "F", potential: 45, tecnica: 41, ritmo: 40, adelantamientos: 37, mental: 43, adaptabilidad: 43, fisico: 36, number: 99 },
    ] },
  { name: "PR46+1 Racing Team", nameTemplate: "{sponsor} PR46+1 Racing Team", logoId: "pr46_racing_wcr", tier: "Satélite", slots: 2, manufacturer: "Yamaha", color: "#0072CE",
    bike: { aero: 74, chasis: 74, motor: 76, freno: 77, electronica: 74 }, budget: 150000,
    riders: [
      { name: "Pakita Ruiz", photoId: 208, nat: "🇪🇸", age: 29, gender: "F", potential: 53, tecnica: 55, ritmo: 54, adelantamientos: 45, mental: 50, adaptabilidad: 53, fisico: 49, number: 46 },
      { name: "Natalia Cabello", photoId: 209, nat: "🇪🇸", age: 17, gender: "F", potential: 46, tecnica: 30, ritmo: 30, adelantamientos: 28, mental: 16, adaptabilidad: 31, fisico: 27, number: 0 },
    ] },
  { name: "Hadden Racing Team", nameTemplate: "{sponsor} Hadden Racing Team", logoId: "hadden_racing_wcr", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#8B1E3F",
    bike: { aero: 74, chasis: 75, motor: 76, freno: 74, electronica: 76 }, budget: 120000,
    riders: [
      { name: "Sara Sánchez", photoId: 210, nat: "🇪🇸", age: 29, gender: "F", potential: 50, tecnica: 50, ritmo: 49, adelantamientos: 46, mental: 50, adaptabilidad: 47, fisico: 46, number: 64 },
      { name: "Arianna Barale", photoId: 211, nat: "🇮🇹", age: 19, gender: "F", potential: 56, tecnica: 34, ritmo: 36, adelantamientos: 34, mental: 52, adaptabilidad: 33, fisico: 33, number: 41 },
    ] },
  { name: "DafitMotoracing", nameTemplate: "{sponsor} Dafitmotoracing", logoId: "dafitmotoracing_wcr", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#F39200",
    bike: { aero: 74, chasis: 76, motor: 75, freno: 74, electronica: 76 }, budget: 110000,
    riders: [
      { name: "Adéla Ouředníčková", photoId: 212, nat: "🇨🇿", age: 21, gender: "F", potential: 44, tecnica: 29, ritmo: 26, adelantamientos: 28, mental: 30, adaptabilidad: 34, fisico: 33, number: 19 },
      { name: "Avalon Lewis", photoId: 213, nat: "🇬🇧", age: 34, gender: "F", potential: 40, tecnica: 36, ritmo: 42, adelantamientos: 42, mental: 39, adaptabilidad: 44, fisico: 37, number: 21 },
    ] },
  { name: "Pata AG Motorsport Italia", nameTemplate: "{sponsor} Motorsport Italia", logoId: "pata_ag_italia_wcr", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#009640",
    bike: { aero: 75, chasis: 75, motor: 77, freno: 74, electronica: 74 }, budget: 110000,
    riders: [
      { name: "Denise Dal Zotto", photoId: 214, nat: "🇮🇹", age: 22, gender: "F", potential: 45, tecnica: 35, ritmo: 39, adelantamientos: 36, mental: 40, adaptabilidad: 34, fisico: 32, number: 88 },
      { name: "Arianna Longo", photoId: 215, nat: "🇮🇹", age: 18, gender: "F", potential: 45, tecnica: 28, ritmo: 29, adelantamientos: 27, mental: 24, adaptabilidad: 24, fisico: 24, number: 0 },
    ] },
  { name: "Prata Motor Sport", nameTemplate: "{sponsor} Prata Motor Sport", logoId: "prata_motorsport_wcr", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#6A2C70",
    bike: { aero: 75, chasis: 74, motor: 74, freno: 76, electronica: 76 }, budget: 100000,
    riders: [
      { name: "Martina Guarino", photoId: 216, nat: "🇮🇹", age: 24, gender: "F", potential: 38, tecnica: 31, ritmo: 25, adelantamientos: 28, mental: 39, adaptabilidad: 26, fisico: 25, number: 22 },
      { name: "Julie Ritaine", photoId: 217, nat: "🇫🇷", age: 26, gender: "F", potential: 35, tecnica: 34, ritmo: 29, adelantamientos: 30, mental: 32, adaptabilidad: 28, fisico: 27, number: 0 },
    ] },
  { name: "Team Trasimeno", nameTemplate: "{sponsor} Team Trasimeno", logoId: "team_trasimeno_wcr", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#B08D57",
    bike: { aero: 74, chasis: 75, motor: 75, freno: 77, electronica: 74 }, budget: 100000,
    riders: [
      { name: "Katie Hand", photoId: 218, nat: "🇬🇧", age: 21, gender: "F", potential: 45, tecnica: 33, ritmo: 27, adelantamientos: 27, mental: 37, adaptabilidad: 29, fisico: 33, number: 26 },
      { name: "Patrycja Sowa", photoId: 219, nat: "🇵🇱", age: 20, gender: "F", potential: 46, tecnica: 28, ritmo: 28, adelantamientos: 40, mental: 31, adaptabilidad: 29, fisico: 36, number: 44 },
    ] },
  { name: "TSL-Racing", nameTemplate: "{sponsor} TSL-Racing", logoId: "tsl_racing_wcr", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#1B998B",
    bike: { aero: 76, chasis: 74, motor: 74, freno: 75, electronica: 76 }, budget: 95000,
    riders: [
      { name: "Lucy Michel", photoId: 220, nat: "🇫🇷", age: 22, gender: "F", potential: 43, tecnica: 31, ritmo: 35, adelantamientos: 36, mental: 31, adaptabilidad: 41, fisico: 30, number: 16 },
      { name: "Josephine Bruno", photoId: 221, nat: "🇮🇹", age: 18, gender: "F", potential: 56, tecnica: 40, ritmo: 39, adelantamientos: 36, mental: 39, adaptabilidad: 34, fisico: 34, number: 80 },
    ] },
  { name: "YVS Sabadell Diva Racing", nameTemplate: "{sponsor} Sabadell Diva Racing", logoId: "yvs_sabadell_wcr", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#C8102E",
    bike: { aero: 75, chasis: 76, motor: 76, freno: 74, electronica: 74 }, budget: 95000,
    riders: [
      { name: "Mallory Dobbs", photoId: 222, nat: "🇺🇸", age: 32, gender: "F", potential: 34, tecnica: 33, ritmo: 37, adelantamientos: 32, mental: 34, adaptabilidad: 32, fisico: 36, number: 14 },
      { name: "Gabrielly Lewis", photoId: 223, nat: "🇧🇷", age: 23, gender: "F", potential: 37, tecnica: 29, ritmo: 33, adelantamientos: 32, mental: 25, adaptabilidad: 25, fisico: 24, number: 0 },
    ] },
  { name: "Yamaha AD78 FIMLA", nameTemplate: "{sponsor} AD78 FIMLA", logoId: "ad78_fimla_wcr", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#003DA5",
    bike: { aero: 74, chasis: 74, motor: 75, freno: 76, electronica: 76 }, budget: 95000,
    riders: [
      { name: "Karolina Danak", photoId: 224, nat: "🇵🇱", age: 18, gender: "F", potential: 61, tecnica: 43, ritmo: 41, adelantamientos: 40, mental: 46, adaptabilidad: 42, fisico: 40, number: 66 },
      { name: "Muklada Sarapuech", photoId: 225, nat: "🇹🇭", age: 33, gender: "F", potential: 54, tecnica: 53, ritmo: 50, adelantamientos: 54, mental: 63, adaptabilidad: 51, fisico: 53, number: 12 },
    ] },
  { name: "FT Racing Academy", nameTemplate: "{sponsor} Racing Academy", logoId: "ft_racing_academy_wcr", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#7B2D26",
    bike: { aero: 75, chasis: 74, motor: 76, freno: 75, electronica: 75 }, budget: 90000,
    riders: [
      { name: "Emily Bondi", photoId: 226, nat: "🇫🇷", age: 26, gender: "F", potential: 44, tecnica: 38, ritmo: 43, adelantamientos: 41, mental: 39, adaptabilidad: 38, fisico: 35, number: 4 },
      { name: "Line Vieillard", photoId: 227, nat: "🇫🇷", age: 25, gender: "F", potential: 44, tecnica: 36, ritmo: 36, adelantamientos: 37, mental: 40, adaptabilidad: 43, fisico: 42, number: 37 },
    ] },
  { name: "Full Throttle Racing", nameTemplate: "{sponsor} Full Throttle Racing", logoId: "full_throttle_wcr", tier: "Independiente", slots: 2, manufacturer: "Yamaha", color: "#FF6B00",
    bike: { aero: 76, chasis: 75, motor: 74, freno: 74, electronica: 76 }, budget: 90000,
    riders: [
      { name: "Tayla Relph", photoId: 228, nat: "🇦🇺", age: 29, gender: "F", potential: 47, tecnica: 49, ritmo: 45, adelantamientos: 41, mental: 49, adaptabilidad: 42, fisico: 44, number: 8 },
      { name: "Birgit Scheffer", photoId: 229, nat: "🇳🇱", age: 30, gender: "F", potential: 31, tecnica: 32, ritmo: 30, adelantamientos: 30, mental: 29, adaptabilidad: 21, fisico: 32, number: 61 },
    ] },
];
