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
  "🇹🇷": {
    firsts: ["Toprak", "Kenan", "Deniz", "Mert", "Can", "Emre", "Berkay", "Oğuz", "Kaan", "Yaman"],
    lasts: ["Razgatlıoğlu", "Sofuoğlu", "Öncü", "Akyol", "Yılmaz", "Şahin", "Demir", "Kaya", "Aydın", "Çelik"],
  },
  "🇨🇴": {
    firsts: ["Santiago", "Juan", "David", "Andrés", "Camilo", "Sebastián", "Julián", "Esteban", "Mateo", "Nicolás"],
    lasts: ["Correa", "Ramírez", "Gómez", "Ospina", "Rojas", "Vargas", "Muñoz", "Castro", "Peña", "Rincón"],
  },
  "🇮🇩": {
    firsts: ["Galang", "Rheza", "Andi", "Dimas", "Fadli", "Rizky", "Bagas", "Wahyu", "Aldi", "Yudha"],
    lasts: ["Danilo", "Wardoyo", "Firdaus", "Pratama", "Setiawan", "Kurniawan", "Saputra", "Susanto", "Wijaya", "Hidayat"],
  },
  "🇨🇿": {
    firsts: ["Karel", "Jakub", "Filip", "Tomáš", "Matěj", "David", "Vojtěch", "Ondřej", "Lukáš", "Adam"],
    lasts: ["Sovička", "Novák", "Svoboda", "Dvořák", "Černý", "Procházka", "Kučera", "Veselý", "Král", "Marek"],
  },
  "🇺🇸": {
    firsts: ["Joe", "Cameron", "John", "Garrett", "Jayson", "Anthony", "Mason", "Bradley", "Cody", "Kyle"],
    lasts: ["Roberts", "Beaubier", "Hopkins", "Gagne", "Uribe", "Yates", "Wyman", "Herrin", "Petrali", "Elias"],
  },
  "🇫🇮": {
    firsts: ["Eetu", "Sami", "Mika", "Aleksi", "Otto", "Niko", "Väinö", "Onni", "Elias", "Leo"],
    lasts: ["Pesonen", "Karjalainen", "Nieminen", "Korhonen", "Mäkinen", "Virtanen", "Laine", "Salo", "Koskinen", "Heikkinen"],
  },
  "🇳🇿": {
    firsts: ["Cameron", "Josh", "Liam", "Reid", "Ethan", "Dylan", "Hayden", "Callum", "Jaxon", "Corey"],
    lasts: ["Petersen", "Waters", "Hardy", "Fitzgerald", "Mitchell", "Anderson", "Robertson", "Bell", "Grant", "Douglas"],
  },
  "🇲🇾": {
    firsts: ["Adam", "Azlan", "Hakim", "Zulfahmi", "Amirul", "Khairul", "Faiz", "Syafiq", "Nazrin", "Hafiz"],
    lasts: ["Khairuddin", "Rahman", "Ismail", "Hassan", "Yusof", "Zulkifli", "Aziz", "Ibrahim", "Rashid", "Mahmud"],
  },
  "🇦🇹": {
    firsts: ["Lukas", "Florian", "Sebastian", "Maximilian", "Thomas", "Michael", "Daniel", "Julian", "Fabian", "Simon"],
    lasts: ["Steiner", "Gruber", "Wolf", "Huber", "Bauer", "Mayer", "Pichler", "Moser", "Egger", "Fuchs"],
  },
  "🇬🇷": {
    firsts: ["Ioannis", "Nikos", "Giorgos", "Dimitris", "Kostas", "Panos", "Alexandros", "Stavros", "Christos", "Vasilis"],
    lasts: ["Peristeras", "Papadopoulos", "Nikolaou", "Georgiou", "Antoniou", "Konstantinou", "Dimitriou", "Vasileiou", "Ioannou", "Christodoulou"],
  },
  "🇵🇹": {
    firsts: ["Miguel", "Tomás", "Rui", "André", "Diogo", "Gonçalo", "Rafael", "Bruno", "Hugo", "Ricardo"],
    lasts: ["Oliveira", "Fernandes", "Ferreira", "Costa", "Pereira", "Rodrigues", "Martins", "Sousa", "Alves", "Carvalho"],
  },
  "🇹🇭": {
    firsts: ["Somkiat", "Ratthapark", "Apiwat", "Decha", "Nakarin", "Chalermpol", "Kittipong", "Panuwat", "Thanawat", "Wirote"],
    lasts: ["Wilairot", "Chomchuen", "Sriram", "Sae-tang", "Thongchai", "Boonsong", "Kaewsuk", "Panthong", "Prasert", "Rattana"],
  },
  "🇪🇪": {
    firsts: ["Markus", "Karl", "Rasmus", "Kristjan", "Marten", "Sander", "Andres", "Martin", "Erik", "Oskar"],
    lasts: ["Tamm", "Saar", "Sepp", "Mägi", "Kask", "Kukk", "Kalda", "Vaher", "Org", "Pärn"],
  },
  "🇨🇭": {
    firsts: ["Dominique", "Thomas", "Tom", "Jonas", "Luca", "Fabian", "Marco", "Sandro", "Basil", "Noah"],
    lasts: ["Aegerter", "Lüthi", "Jerman", "Steiner", "Meier", "Keller", "Weber", "Schmid", "Zimmermann", "Baumann"],
  },
  "🇩🇰": {
    firsts: ["Mikkel", "Jonas", "Anders", "Nikolaj", "Mads", "Frederik", "Emil", "Christian", "Kasper", "Simon"],
    lasts: ["Jensen", "Nielsen", "Hansen", "Pedersen", "Andersen", "Christensen", "Larsen", "Sørensen", "Rasmussen", "Jørgensen"],
  },
  "🇦🇩": {
    firsts: ["Marc", "Josep", "Pol", "Jordi", "Oriol", "Gerard", "Xavi", "Roger", "Ivan", "Nil"],
    lasts: ["Vila", "Puig", "Riba", "Font", "Areny", "Cases", "Naudi", "Rossell", "Bonet", "Torres"],
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
