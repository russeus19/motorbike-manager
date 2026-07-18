// Real-world circuits used by Superbikes but not by MotoGP/Moto2/Moto3 —
// same profile shape as data/circuits.js's CIRCUIT_PROFILES, so every
// existing utility (lap-time estimation, circuit fit, tags) works on
// them unchanged.
export const SUPERBIKES_ONLY_PROFILES = {
  most: { // Autodrom Most — Czech Republic
    country: "Chequia", flag: "🇨🇿", built: 1983, lengthKm: 4.212, cornersLeft: 6, cornersRight: 5,
    mainStraightM: 850, direction: "horario",
    blurb: "Trazado ondulado excavado entre colinas cerca de la frontera con Alemania, con fuertes desniveles y una recta principal generosa.",
    style: "Circuito técnico y ondulado: exige buena tracción en salida de curva y estabilidad en los cambios de rasante.",
    dryPct: 68, wetPct: 32,
    tech: { motor: 68, aero: 62, chasis: 78, freno: 72, electronica: 70 },
    riderWeight: { tecnica: 68, ritmo: 55, adelantamientos: 55, mental: 55, adaptabilidad: 65, fisico: 55 },
    tags: ["Ondulado", "Exigente en tracción", "Cambios de rasante"],
  },
  donington: { // Donington Park — Great Britain
    country: "Gran Bretaña", flag: "🇬🇧", built: 1931, lengthKm: 4.023, cornersLeft: 6, cornersRight: 6,
    mainStraightM: 700, direction: "horario",
    blurb: "Trazado histórico y fluido, cuna del motociclismo británico, con curvas rápidas encadenadas y poco respiro entre ellas.",
    style: "Circuito fluido de ritmo alto: premia la confianza en curva rápida y una moto estable a media inclinación.",
    dryPct: 60, wetPct: 40,
    tech: { motor: 65, aero: 72, chasis: 75, freno: 60, electronica: 65 },
    riderWeight: { tecnica: 72, ritmo: 62, adelantamientos: 50, mental: 55, adaptabilidad: 62, fisico: 52 },
    tags: ["Fluido", "Curvas rápidas encadenadas", "Alta humedad frecuente"],
  },
  magnycours: { // Circuit de Nevers Magny-Cours — France
    country: "Francia", flag: "🇫🇷", built: 1960, lengthKm: 4.411, cornersLeft: 9, cornersRight: 8,
    mainStraightM: 700, direction: "horario",
    blurb: "Trazado técnico y sinuoso en el centro de Francia, con un enlace de curvas medias que pone a prueba el equilibrio del chasis.",
    style: "Circuito técnico de curvas enlazadas: exige un chasis muy equilibrado más que potencia bruta.",
    dryPct: 72, wetPct: 28,
    tech: { motor: 58, aero: 65, chasis: 80, freno: 68, electronica: 62 },
    riderWeight: { tecnica: 75, ritmo: 52, adelantamientos: 48, mental: 58, adaptabilidad: 60, fisico: 50 },
    tags: ["Muy técnico", "Curvas enlazadas", "Exigente en chasis"],
  },
  cremona: { // Cremona Circuit — Italy
    country: "Italia", flag: "🇮🇹", built: 2017, lengthKm: 2.594, cornersLeft: 5, cornersRight: 5,
    mainStraightM: 550, direction: "horario",
    blurb: "El circuito más corto y moderno del calendario, estrecho y técnico, donde el más mínimo error se paga muy caro.",
    style: "Circuito corto y técnico: prioriza la precisión de frenada y la agilidad de cambio de dirección sobre la velocidad punta.",
    dryPct: 75, wetPct: 25,
    tech: { motor: 50, aero: 55, chasis: 75, freno: 78, electronica: 60 },
    riderWeight: { tecnica: 78, ritmo: 45, adelantamientos: 40, mental: 60, adaptabilidad: 58, fisico: 45 },
    tags: ["Muy corto", "Muy técnico", "Exigente en frenada"],
  },
  estoril: { // Circuito Estoril — Portugal
    country: "Portugal", flag: "🇵🇹", built: 1972, lengthKm: 4.182, cornersLeft: 7, cornersRight: 6,
    mainStraightM: 990, direction: "horario",
    blurb: "Trazado clásico cerca de Lisboa, con una larga recta principal y un sector final de curvas rápidas de radio amplio.",
    style: "Circuito rápido con una recta larga: recompensa la potencia punta y una buena aerodinámica en el sector final.",
    dryPct: 82, wetPct: 18,
    tech: { motor: 72, aero: 74, chasis: 62, freno: 65, electronica: 64 },
    riderWeight: { tecnica: 58, ritmo: 65, adelantamientos: 62, mental: 55, adaptabilidad: 55, fisico: 60 },
    tags: ["Recta larga", "Favorable para adelantamientos", "Sector final rápido"],
  },
};
