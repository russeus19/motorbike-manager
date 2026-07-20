// Rookie name pools, one set of first/last names per nationality so a
// generated debutant's name actually matches their flag — no more
// "Kai Takeda" showing up with a Dutch flag. Each pool is sized well
// beyond the old shared 10x10 list to meaningfully cut down on repeats
// over a long career mode save.
export const ROOKIE_NAME_POOLS = {
  "🇪🇸": {
    firsts: ["Iker", "Xavi", "Marc", "Álvaro", "Pol", "Aleix", "Jorge", "Rubén", "Hugo", "Mario", "Adrián", "Sergio", "Diego", "Pablo", "Álex", "Izan", "Aarón", "Bruno", "Raúl", "Nicolás"],
    lasts: ["Serrano", "Guevara", "Zuazo", "Márquez", "Espargaró", "Rins", "Torres", "Navarro", "Vázquez", "Herrera", "Cortés", "Domínguez", "Rivera", "Aguilar", "Molina", "Iturbe", "Bautista", "Gómez", "Ramos", "Ortega"],
  },
  "🇮🇹": {
    firsts: ["Marco", "Andrea", "Franco", "Luca", "Enea", "Dennis", "Tony", "Fabio", "Nicolò", "Michele", "Lorenzo", "Stefano", "Alessandro", "Matteo", "Giovanni", "Riccardo", "Davide", "Simone", "Paolo", "Tommaso"],
    lasts: ["Rossi", "Bagnaia", "Bastianini", "Morbidelli", "Bezzecchi", "Pirro", "Vietti", "Foggia", "Antonelli", "Migno", "Fenati", "Marini", "Canepa", "Ferrari", "Costa", "Rinaldi", "Moretti", "Greco", "Barbieri", "Colombo"],
  },
  "🇫🇷": {
    firsts: ["Fabio", "Johann", "Jules", "Loris", "Hugo", "Thomas", "Alexis", "Nicolas", "Maxime", "Lucas"],
    lasts: ["Quartararo", "Zarco", "Danilo", "Baz", "Fernandez", "Girard", "Lefevre", "Moreau", "Bernard", "Petit"],
  },
  "🇯🇵": {
    firsts: ["Takaaki", "Ai", "Kaito", "Sho", "Ryo", "Hiroki", "Yuki", "Taiga", "Haruki", "Sora"],
    lasts: ["Nakagami", "Ogura", "Nagashima", "Aoki", "Okubo", "Suzuki", "Tanaka", "Sato", "Fujii", "Kobayashi"],
  },
  "🇦🇺": {
    firsts: ["Jack", "Remy", "Casey", "Mack", "Troy", "Jacob", "Senna", "Cooper", "Harry", "Liam"],
    lasts: ["Miller", "Gardner", "Stoner", "Bailey", "Halliday", "Roulstone", "Walsh", "Wilson", "Turner", "Kelly"],
  },
  "🇬🇧": {
    firsts: ["Cal", "Bradley", "Scott", "Sam", "Jake", "Tarran", "Ryan", "Harry", "George", "Oliver"],
    lasts: ["Crutchlow", "Smith", "Redding", "Lowes", "Dixon", "Mackenzie", "Vickers", "Brown", "Taylor", "Clarke"],
  },
  "🇩🇪": {
    firsts: ["Stefan", "Jonas", "Marcel", "Lukas", "Philipp", "Max", "Tim", "Jan", "Leon", "Finn"],
    lasts: ["Bradl", "Folger", "Schrötter", "Weber", "Fischer", "Becker", "Wagner", "Schulz", "Hoffmann", "Klein"],
  },
  "🇧🇷": {
    firsts: ["Eric", "Diogo", "Gabriel", "Rafael", "Lucas", "Pedro", "João", "Bruno", "Felipe", "Thiago"],
    lasts: ["Granado", "Moreira", "Silva", "Santos", "Oliveira", "Costa", "Souza", "Pereira", "Almeida", "Ribeiro"],
  },
  "🇿🇦": {
    firsts: ["Darryn", "Brad", "Steven", "Ryan", "Shaun", "Cameron", "Dylan", "Sean", "Luke", "Jordan"],
    lasts: ["Binder", "Odendaal", "Fourie", "Botha", "Van der Berg", "Nel", "Coetzee", "Pretorius", "Kruger", "Naude"],
  },
  "🇳🇱": {
    firsts: ["Bo", "Collin", "Jasper", "Sten", "Luuk", "Daan", "Sem", "Milan", "Thijs", "Ruben"],
    lasts: ["Bendsneyder", "Veneman", "De Vries", "Bakker", "Visser", "Smit", "Jansen", "De Boer", "Mulder", "Dekker"],
  },
  "🇦🇷": {
    firsts: ["Mauro", "Santiago", "Nicolás", "Tomás", "Facundo", "Ignacio", "Lautaro", "Gonzalo", "Matías", "Agustín"],
    lasts: ["Chiodi", "Rodríguez", "Fernández", "González", "López", "Díaz", "Martínez", "Romero", "Sosa", "Acosta"],
  },
};

// Weighted nationality draw for a new rookie: 30% Spain, 20% Italy, the
// remaining 50% split evenly across every other nationality in the pool.
const OTHER_NATS = Object.keys(ROOKIE_NAME_POOLS).filter((nat) => nat !== "🇪🇸" && nat !== "🇮🇹");
const otherShare = 50 / OTHER_NATS.length;
export const ROOKIE_NAT_WEIGHTS = [
  { nat: "🇪🇸", weight: 30 },
  { nat: "🇮🇹", weight: 20 },
  ...OTHER_NATS.map((nat) => ({ nat, weight: otherShare })),
];

export function pickRookieNat() {
  const total = ROOKIE_NAT_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * total;
  for (const { nat, weight } of ROOKIE_NAT_WEIGHTS) {
    if (roll < weight) return nat;
    roll -= weight;
  }
  return ROOKIE_NAT_WEIGHTS[0].nat;
}

export function pickRookieName(nat) {
  const pool = ROOKIE_NAME_POOLS[nat] || ROOKIE_NAME_POOLS["🇪🇸"];
  const first = pool.firsts[Math.floor(Math.random() * pool.firsts.length)];
  const last = pool.lasts[Math.floor(Math.random() * pool.lasts.length)];
  return `${first} ${last}`;
}
