// Rookie name pools, one set of first/last names per nationality so a
// generated debutant's name actually matches their flag — no more
// "Kai Takeda" showing up with a Dutch flag. Each pool is sized well
// beyond the old shared 10x10 list to meaningfully cut down on repeats
// over a long career mode save.
export const ROOKIE_NAME_POOLS = {
  "🇪🇸": {
    firsts: ["Iker","Xavi","Marc","Álvaro","Pol","Aleix","Jorge","Rubén","Hugo","Mario","Adrián","Sergio","Diego","Pablo","Álex","Izan","Aarón","Bruno","Raúl","Nicolás","Iván","Marcos","Óscar","Víctor","Nacho","Pedro","Alberto","Andrés","Gonzalo","Emilio","Ramón","Roberto","Salvador","Vicente"],
    lasts: ["Serrano","Zuazo","Espargaró","Vázquez","Herrera","Cortés","Domínguez","Rivera","Aguilar","Molina","Iturbe","Gómez","Ramos","Ortega","Iglesias","Delgado","Vidal","Blanco","Cabrera","Prieto","Suárez","Pardo","Herrero","Nieto","Cano","Bravo","Reyes","Vega","Rubio","Soto","Aranda","Camacho","Lozano","Peña","Cid","Cuesta","Escudero","Guerrero","Montes","Robles","Valero","Zamora","Espinosa","Cabello","Serna","Cifuentes","Roldán","Segura","Pastor","Duarte","Menéndez","Guevara","Márquez","Rins","Torres","Navarro","Bautista"],
  },
  "🇮🇹": {
    firsts: ["Marco","Andrea","Franco","Luca","Enea","Dennis","Tony","Fabio","Nicolò","Michele","Lorenzo","Stefano","Alessandro","Matteo","Giovanni","Riccardo","Davide","Simone","Paolo","Tommaso","Federico","Nicola","Giulio","Enrico","Alberto","Claudio","Vincenzo","Salvatore","Fabrizio","Gabriele","Emanuele","Massimo","Roberto"],
    lasts: ["Pirro","Foggia","Antonelli","Migno","Fenati","Canepa","Costa","Rinaldi","Moretti","Greco","Barbieri","Colombo","Ricci","Marino","Bruno","Gallo","Conti","De Luca","Mancini","Giordano","Rizzo","Lombardi","Fontana","Santoro","Mariani","Caruso","Ferrara","Galli","Martini","Leone","Longo","Gentile","Martinelli","Vitale","Serra","Coppola","Bianco","De Santis","Rossetti","Villa","Pellegrini","Testa","Basile","Palumbo","Sartori","Rossi","Bagnaia","Bastianini","Morbidelli","Bezzecchi","Vietti","Marini","Ferrari"],
  },
  "🇫🇷": {
    firsts: ["Fabio","Johann","Jules","Loris","Hugo","Thomas","Alexis","Nicolas","Maxime","Lucas","Antoine","Julien","Mathieu","Thibault","Alexandre","Sébastien","Olivier","Damien","Benjamin","Théo","Loïc","Kevin","Bastien","Florian","Romain","Cédric","Yohann"],
    lasts: ["Danilo","Baz","Fernandez","Girard","Lefevre","Moreau","Bernard","Petit","Roux","Fontaine","Rousseau","Vincent","Muller","Faure","Blanc","Barbier","Guerin","Boyer","Fournier","Bonnet","Dupuis","Lambert","Chevalier","Robin","Masson","Sanchez","Gerard","Nguyen","Denis","Dumont","Marchand","Duval","Renard","Léger","Rey","Perrin","Morin","Mathieu","Clement","Quartararo","Zarco"],
  },
  "🇯🇵": {
    firsts: ["Takaaki","Ai","Kaito","Sho","Ryo","Hiroki","Yuki","Taiga","Haruki","Sora","Kenta","Ryusei","Shota","Hiroshi","Takuya","Naoki","Yuto","Ren","Haruto","Riku","Sota","Yuma","Kosei","Daiki","Ryota","Takumi","Shun","Kazuki"],
    lasts: ["Nakagami","Nagashima","Aoki","Okubo","Suzuki","Tanaka","Sato","Fujii","Kobayashi","Takahashi","Watanabe","Ito","Yamamoto","Nakamura","Saito","Kato","Yoshida","Yamada","Yamaguchi","Matsumoto","Inoue","Kimura","Shimizu","Hayashi","Yamazaki","Mori","Abe","Ikeda","Hashimoto","Ishikawa","Ogawa","Goto","Okada","Hasegawa","Murakami","Kondo","Ogura"],
  },
  "🇦🇺": {
    firsts: ["Jack","Remy","Casey","Mack","Troy","Jacob","Senna","Cooper","Harry","Liam","Lachlan","Riley","Harrison","Toby","Nathan","Blake","Zac","Xavier","Braith","Kade","Corey","Tyler","Aaron","Wyatt","Levi","Nate","Beau","Jayden"],
    lasts: ["Stoner","Bailey","Halliday","Roulstone","Walsh","Wilson","Turner","Kelly","Smith","Taylor","Brown","Nguyen","Anderson","White","Martin","Ryan","King","Baker","Harrison","Clarke","Wright","Evans","Carter","Phillips","Campbell","Parker","Edwards","Collins","Stewart","Morris","Rogers","Reid","Cooper","Murphy","Bennett","Miller","Gardner"],
  },
  "🇬🇧": {
    firsts: ["Cal","Bradley","Scott","Sam","Jake","Tarran","Ryan","Harry","George","Oliver","James","Jacob","Charlie","Freddie","Alfie","Archie","Leo","Noah","Ollie","Reece","Connor","Aaron","Kian","Jamie","Danny","Ben"],
    lasts: ["Crutchlow","Smith","Redding","Brown","Taylor","Clarke","Jones","Williams","Wilson","Evans","Thomas","Johnson","Walker","Robinson","Wright","White","Edwards","Hughes","Green","Hall","Wood","Baker","Turner","Hill","Cooper","Ward","Morris","Moore","Bell","Reid","Cook","Fisher","Lowes","Dixon","Mackenzie","Vickers"],
  },
  "🇩🇪": {
    firsts: ["Stefan","Jonas","Marcel","Lukas","Philipp","Max","Tim","Jan","Leon","Finn","Felix","Moritz","Niklas","Fabian","Erik","Paul","Sven","Torben","Robin","Kevin","Jannik","Nico","Dennis","Marius"],
    lasts: ["Bradl","Folger","Schrötter","Weber","Fischer","Becker","Wagner","Schulz","Hoffmann","Klein","Koch","Bauer","Richter","Wolf","Schröder","Neumann","Schwarz","Zimmermann","Braun","Krüger","Hartmann","Lange","Werner","Krause","Meier","Lehmann","Schmid","Schulze","Köhler","Herrmann","Walter"],
  },
  "🇧🇷": {
    firsts: ["Eric","Diogo","Gabriel","Rafael","Lucas","Pedro","João","Bruno","Felipe","Thiago","Mateus","Rodrigo","Vinícius","Diego","Leandro","Marcelo","André","Renato","Fábio","Igor","Caio","Otávio","Vitor","Murilo"],
    lasts: ["Granado","Silva","Santos","Costa","Souza","Pereira","Almeida","Ribeiro","Ferreira","Rodrigues","Carvalho","Gomes","Martins","Araújo","Melo","Barbosa","Alves","Monteiro","Cardoso","Teixeira","Correia","Nunes","Cavalcanti","Dias","Castro","Campos","Cunha","Pinto","Freitas","Moreira","Oliveira"],
  },
  "🇿🇦": {
    firsts: ["Darryn","Brad","Steven","Ryan","Shaun","Cameron","Dylan","Sean","Luke","Jordan","Sipho","Thabo","Lwazi","Bongani","Kagiso","Tshepo","Mandla","Sizwe","Andile","Lucas","Craig","Warren","Riaan","Dean","Jaco","Neil","Clint","Brandon"],
    lasts: ["Odendaal","Fourie","Botha","Van der Berg","Nel","Coetzee","Pretorius","Kruger","Naude","Van Wyk","Naidoo","Dlamini","Khumalo","Ndlovu","Mahlangu","Steyn","Van Zyl","Le Roux","Venter","Jacobs","Marais","Van Rensburg","Meyer","Malan","Bosman","Human","Erasmus","Snyman","Grobler","Prinsloo","Combrink","Binder"],
  },
  "🇳🇱": {
    firsts: ["Bo","Collin","Jasper","Sten","Luuk","Daan","Sem","Milan","Thijs","Ruben","Lars","Tim","Bram","Jesse","Stijn","Max","Niels","Rick","Wouter","Joris","Sander","Dries","Koen","Tom","Wesley","Danny"],
    lasts: ["Bendsneyder","De Vries","Bakker","Visser","Smit","Jansen","De Boer","Mulder","Dekker","De Jong","Meijer","De Groot","Bos","Vos","Peters","Hendriks","Van Leeuwen","Brouwer","De Wit","Dijkstra","Smits","De Graaf","Van der Berg","Postma","Kok","Vermeulen","Van Dijk","Kuipers","Jacobs","Hoekstra","Veneman"],
  },
  "🇦🇷": {
    firsts: ["Mauro","Santiago","Nicolás","Tomás","Facundo","Ignacio","Lautaro","Gonzalo","Matías","Agustín","Franco","Bruno","Alan","Alexis","Emanuel","Rodrigo","Federico","Cristian","Fernando","Diego","Leandro","Marcos","Pablo","Sergio","Damián","Maximiliano","Ezequiel","Bautista","Joaquín","Ramiro"],
    lasts: ["Chiodi","Rodríguez","Díaz","Martínez","Romero","Sosa","Pérez","Álvarez","Ruiz","Flores","Benítez","Medina","Herrera","Aguirre","Vega","Molina","Ojeda","Ortiz","Cabrera","Domínguez","Gutiérrez","Ledesma","Peralta","Guzmán","Villalba","Arias","Bustos","Cardozo","Fernández","González","López","Acosta"],
  },
  "🇹🇷": {
    firsts: ["Toprak","Kenan","Deniz","Mert","Can","Emre","Berkay","Oğuz","Kaan","Yaman","Furkan","Onur","Serkan","Yusuf","Hakan","Baran","Cem","Umut","Görkem","Tolga","Erdem","Barış","Efe","Alp","Sinan","Ali","Burak","Selim","Volkan"],
    lasts: ["Akyol","Yılmaz","Şahin","Demir","Kaya","Aydın","Çelik","Kaplan","Öztürk","Doğan","Kılıç","Arslan","Koç","Aksoy","Polat","Erdoğan","Çetin","Kara","Güneş","Yıldız","Tekin","Karataş","Bulut","Aslan","Işık","Türk","Bozkurt","Turan","Sarı","Yalçın","Coşkun","Duman","Uçar","Baran","Razgatlıoğlu","Sofuoğlu","Öncü"],
  },
  "🇨🇴": {
    firsts: ["Santiago","Juan","David","Andrés","Camilo","Sebastián","Julián","Esteban","Mateo","Nicolás","Alejandro","Miguel","Cristian","Felipe","Óscar","Fabián","Iván","Diego","Wilson","Jhon","Yeison","Duván","Brayan","Cristhian","Jefferson","Carlos","Edwin","Nelson","Harold"],
    lasts: ["Gómez","Ospina","Rojas","Vargas","Castro","Peña","Rincón","Martínez","Hernández","Díaz","Moreno","Álvarez","Suárez","Cárdenas","Valencia","Restrepo","Zapata","Bedoya","Vélez","Betancur","Arango","Salazar","Cadena","Mejía","Jaramillo","Escobar","Cifuentes","Guzmán","Villegas","Cortés","Bermúdez","Correa","Ramírez","Muñoz"],
  },
  "🇮🇩": {
    firsts: ["Galang","Rheza","Andi","Dimas","Fadli","Rizky","Bagas","Wahyu","Aldi","Yudha","Fajar","Rendi","Reza","Doni","Iqbal","Yoga","Adit","Arya","Reno","Wahyudi","Prima","Satria","Ilham","Farhan","Sandi","Teguh","Anggara","Bayu","Gilang","Rizal"],
    lasts: ["Danilo","Wardoyo","Firdaus","Setiawan","Kurniawan","Saputra","Susanto","Wijaya","Hidayat","Santoso","Wibowo","Halim","Suryadi","Utomo","Gunawan","Setiadi","Nugroho","Kusuma","Prasetyo","Iskandar","Suparman","Wahyudi","Handoko","Suherman","Winarno","Tanuwijaya","Sutrisno","Rahmawan","Salim","Kartawijaya","Suryana","Pratama"],
  },
  "🇨🇿": {
    firsts: ["Karel","Jakub","Filip","Tomáš","Matěj","David","Vojtěch","Ondřej","Lukáš","Adam","Petr","Pavel","Jan","Josef","Milan","Radek","Zdeněk","Václav","Roman","Aleš","Michal","Martin","Miroslav","Jiří","František","Vladimír","Rostislav","Bohumil","Antonín","Stanislav"],
    lasts: ["Novák","Svoboda","Dvořák","Černý","Procházka","Kučera","Veselý","Král","Marek","Horák","Pospíšil","Krejčí","Hájek","Beneš","Fiala","Sedláček","Doležal","Zeman","Kolář","Růžička","Bláha","Konopásek","Urban","Kadlec","Vaněk","Vávra","Kubík","Kovařík","Vlach","Kříž","Bártová","Novotný","Sovička"],
  },
  "🇺🇸": {
    firsts: ["Joe","Cameron","John","Garrett","Jayson","Anthony","Mason","Bradley","Cody","Kyle","Ryan","Justin","Tyler","Brandon","Dustin","Colton","Trevor","Chase","Zachary","Austin","Derek","Travis","Shane","Blake","Corey","Nolan","Grant","Wyatt","Tanner"],
    lasts: ["Beaubier","Hopkins","Gagne","Uribe","Yates","Wyman","Herrin","Petrali","Elias","Johnson","Williams","Brown","Jones","Davis","Wilson","Anderson","Thomas","Jackson","White","Martin","Young","Allen","King","Wright","Scott","Hill","Adams","Baker","Nelson","Carter","Mitchell","Perez","Turner","Phillips","Roberts"],
  },
  "🇫🇮": {
    firsts: ["Eetu","Sami","Mika","Aleksi","Otto","Niko","Väinö","Onni","Elias","Leo","Juho","Antti","Jussi","Tero","Petri","Timo","Ville","Janne","Jari","Marko","Toni","Teemu","Tapio","Kalle","Miika","Joel","Aleksanteri","Eemeli","Vesa","Pekka"],
    lasts: ["Pesonen","Karjalainen","Nieminen","Korhonen","Mäkinen","Virtanen","Laine","Salo","Koskinen","Heikkinen","Mäkelä","Hämäläinen","Järvinen","Lehtonen","Lehtinen","Saarinen","Salminen","Heinonen","Niemi","Heikkilä","Kinnunen","Turunen","Rantanen","Manninen","Tuominen"],
  },
  "🇳🇿": {
    firsts: ["Cameron","Josh","Liam","Reid","Ethan","Dylan","Hayden","Callum","Jaxon","Corey","Jack","Zane","Finn","Kobe","Nikau","Lachie","Ben","Sam","Tom","Jesse","Dane","Regan","Shane","Dion","Kane","Troy","Ricky","Jed","Cody","Bailey"],
    lasts: ["Petersen","Waters","Hardy","Fitzgerald","Mitchell","Anderson","Robertson","Bell","Grant","Douglas","Wilson","Taylor","Wong","Wright","Baker","Hall","King","Reid","Clark","Cook","Fraser","Sinclair","Ross","Hamilton","Cameron","Stewart","Graham","Kennedy","Marshall","Watson","Munro","Ferguson"],
  },
  "🇲🇾": {
    firsts: ["Adam","Azlan","Hakim","Zulfahmi","Amirul","Khairul","Faiz","Syafiq","Nazrin","Hafiz","Fikri","Naim","Danish","Aiman","Iskandar","Haziq","Firdaus","Amir","Syed","Zaim","Haikal","Farid","Irfan","Rais","Zafran","Hazim","Zack","Amin","Faris"],
    lasts: ["Khairuddin","Rahman","Ismail","Hassan","Yusof","Zulkifli","Aziz","Ibrahim","Rashid","Mahmud","Abdullah","Hussain","Kadir","Bakar","Salleh","Mansor","Halim","Osman","Hashim","Latif","Wahab","Rahim","Karim","Malik","Din","Yaacob","Talib","Shah"],
  },
  "🇦🇹": {
    firsts: ["Lukas","Florian","Sebastian","Maximilian","Thomas","Michael","Daniel","Julian","Fabian","Simon","Christoph","Andreas","Stefan","Georg","Wolfgang","Bernhard","Manuel","Alexander","Patrick","Markus","Rene","Dominik","Philipp","Benjamin","Constantin","Tobias","Clemens","Raphael","Matthias","Gregor"],
    lasts: ["Steiner","Gruber","Wolf","Huber","Bauer","Mayer","Pichler","Moser","Egger","Fuchs","Wagner","Berger","Eder","Winkler","Baumgartner","Lang","Lechner","Aigner","Reiter","Schwarz","Wimmer","Auer","Brunner","Wallner","Leitner","Hofer","Schneider","Wieser"],
  },
  "🇬🇷": {
    firsts: ["Ioannis","Nikos","Giorgos","Dimitris","Kostas","Panos","Alexandros","Stavros","Christos","Vasilis","Aris","Petros","Yannis","Manolis","Thanasis","Grigoris","Spyros","Apostolos","Konstantinos","Dionysis","Marios","Fotis","Leonidas","Achilleas","Orestis","Iraklis","Efstathios","Charalambos","Zisis","Kyriakos"],
    lasts: ["Papadopoulos","Nikolaou","Georgiou","Antoniou","Konstantinou","Dimitriou","Vasileiou","Ioannou","Christodoulou","Vlachos","Karagiannis","Papageorgiou","Angelopoulos","Economou","Nikolaidis","Michailidis","Pappas","Triantafyllou","Katsaros","Anastasiou","Makris","Sideris","Politis","Karamanlis","Fotiou","Peristeras"],
  },
  "🇵🇹": {
    firsts: ["Miguel","Tomás","Rui","André","Diogo","Gonçalo","Rafael","Bruno","Hugo","Ricardo","João","Pedro","Nuno","Filipe","Vasco","Duarte","Simão","Afonso","Luís","Manuel","Tiago","Fábio","Márcio","Renato","Ivo","Bernardo","Guilherme","Leandro","Sandro","Telmo"],
    lasts: ["Fernandes","Ferreira","Costa","Pereira","Rodrigues","Martins","Sousa","Alves","Carvalho","Silva","Santos","Marques","Nunes","Mendes","Ramos","Teixeira","Gonçalves","Lopes","Machado","Correia","Cardoso","Reis","Antunes","Vieira","Monteiro","Coelho","Pinheiro","Oliveira"],
  },
  "🇹🇭": {
    firsts: ["Somkiat","Ratthapark","Apiwat","Decha","Nakarin","Chalermpol","Kittipong","Panuwat","Thanawat","Wirote","Somchai","Anucha","Prasert","Sombat","Wichai","Kittisak","Narong","Suriya","Sakda","Anan","Pichit","Thawatchai","Weerasak","Amnat","Chaiwat","Somsak","Boonlert","Pravit","Chatchai","Sunthorn"],
    lasts: ["Wilairot","Chomchuen","Sriram","Sae-tang","Thongchai","Boonsong","Kaewsuk","Panthong","Prasert","Rattana","Chaiyasit","Rungrojwanich","Suksawat","Charoenkul","Pongsakorn","Wattana","Anuwat","Sukjai","Jaidee","Boonmee","Srisawat","Yodying","Wongsawat","Kaewkla","Phanthong","Rattanakosin"],
  },
  "🇪🇪": {
    firsts: ["Markus","Karl","Rasmus","Kristjan","Marten","Sander","Andres","Martin","Erik","Oskar","Priit","Toomas","Peeter","Ants","Jaan","Meelis","Tanel","Indrek","Margus","Aivar","Urmas","Raivo","Taavi","Siim","Madis","Kaido","Rain","Hendrik","Ott","Janar"],
    lasts: ["Tamm","Saar","Sepp","Mägi","Kask","Kukk","Kalda","Vaher","Org","Pärn","Ilves","Puusepp","Kuusk","Pärt","Rebane","Toom","Kadak","Laur","Metsis","Reinsalu","Vaht","Kruus","Aas","Karu","Randmaa","Simson"],
  },
  "🇨🇭": {
    firsts: ["Dominique","Thomas","Tom","Jonas","Luca","Fabian","Marco","Sandro","Basil","Noah","Michael","Stefan","Andreas","Beat","Urs","Reto","Christian","Patrick","Ivo","Yann","Loris","Jérôme","Kevin","Silvan","Timo","Livio","Nico","Elia","Simon","Gianluca"],
    lasts: ["Lüthi","Jerman","Steiner","Meier","Keller","Weber","Schmid","Zimmermann","Baumann","Müller","Huber","Schneider","Meyer","Fischer","Frei","Widmer","Brunner","Gerber","Studer","Moser","Roos","Wyss","Kaufmann","Aegerter"],
  },
  "🇩🇰": {
    firsts: ["Mikkel","Jonas","Anders","Nikolaj","Mads","Frederik","Emil","Christian","Kasper","Simon","Lasse","Rasmus","Magnus","Peter","Morten","Michael","Henrik","Søren","Thomas","Rene","Jesper","Brian","Allan","Bo","Claus","Flemming","Ole","Steen","Jan","Kurt"],
    lasts: ["Jensen","Nielsen","Hansen","Pedersen","Andersen","Christensen","Larsen","Sørensen","Rasmussen","Jørgensen","Petersen","Madsen","Kristensen","Olsen","Thomsen","Christiansen","Poulsen","Johansen","Møller","Mortensen"],
  },
  "🇦🇩": {
    firsts: ["Marc","Josep","Pol","Jordi","Oriol","Gerard","Xavi","Roger","Ivan","Nil","Albert","Genís","Toni","Enric","Ramon","Ferran","Sergi","Bernat","Martí","Guillem","Aleix","Adrià","Jan","Biel","Eloi","Pau","Ot","Arnau","Quim"],
    lasts: ["Vila","Puig","Riba","Font","Areny","Cases","Naudi","Rossell","Bonet","Cerqueda","Coma","Montané","Sansa","Iranzo","Callarisa","Pons","Boix","Baró","Farré","Sanmartí","Marsol","Espot","Gili","Casal","Torres"],
  },
};

// Weighted nationality draw for a new rookie: 11 nationalities get
// their own fixed share (reflecting how much real-world talent that
// country actually produces for the sport), and whatever's left over
// splits evenly across every other nationality in the pool — same
// generic pattern as before, still automatically adapts if a new
// nationality is ever added to ROOKIE_NAME_POOLS without one of these
// fixed shares.
const EXPLICIT_NAT_WEIGHTS = {
  "🇪🇸": 26, "🇮🇹": 15, "🇯🇵": 6.5, "🇬🇧": 6.5, "🇳🇱": 5, "🇫🇷": 4.5,
  "🇦🇺": 3.9, "🇩🇪": 3.4, "🇹🇷": 2.8, "🇺🇸": 2.8, "🇧🇷": 2.2,
};
const EXPLICIT_TOTAL = Object.values(EXPLICIT_NAT_WEIGHTS).reduce((s, w) => s + w, 0);
const OTHER_NATS = Object.keys(ROOKIE_NAME_POOLS).filter((nat) => !(nat in EXPLICIT_NAT_WEIGHTS));
const otherShare = (100 - EXPLICIT_TOTAL) / OTHER_NATS.length;
export const ROOKIE_NAT_WEIGHTS = [
  ...Object.entries(EXPLICIT_NAT_WEIGHTS).map(([nat, weight]) => ({ nat, weight })),
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

// Every full rookie name generated this session, so the same exact
// "first + last" combination doesn't turn up twice — with a few
// hundred combinations per nationality, an outright repeat is rare but
// not impossible over a long career with many rookies of the same
// country, which is exactly what got reported (two separate "Ryan
// Vickers"). Module-level on purpose: it only needs to survive for as
// long as the page stays loaded (one continuous play session), not be
// part of the saved game itself — a freshly reloaded save starting a
// brand new browser session is a fair, low-stakes reset.
const usedRookieFullNames = new Set();

export function pickRookieName(nat) {
  const pool = ROOKIE_NAME_POOLS[nat] || ROOKIE_NAME_POOLS["🇪🇸"];
  const maxAttempts = 20;
  let candidate;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const first = pool.firsts[Math.floor(Math.random() * pool.firsts.length)];
    const last = pool.lasts[Math.floor(Math.random() * pool.lasts.length)];
    candidate = `${first} ${last}`;
    if (!usedRookieFullNames.has(candidate)) break;
    // Every attempt exhausted this nationality's whole combination pool
    // (very small pool, very unlucky) — better to hand back a repeat
    // than to loop forever or crash rookie generation entirely.
  }
  usedRookieFullNames.add(candidate);
  return candidate;
}
