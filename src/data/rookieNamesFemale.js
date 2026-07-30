// Female rookie first-name pools, one per nationality — mirrors
// data/rookieNames.js exactly: same 27 nationalities, same
// ROOKIE_NAT_WEIGHTS (so a female regen's country distribution matches
// the male one exactly, as requested), and the same surname pools
// (family names aren't gendered, so re-using ROOKIE_NAME_POOLS[nat].lasts
// instead of duplicating them here keeps the two systems from ever
// drifting out of sync with each other).
import { ROOKIE_NAME_POOLS, pickRookieNat } from "./rookieNames.js";

export const FEMALE_FIRST_NAMES = {
  "🇪🇸": ["Lucía","Sofía","María","Paula","Martina","Julia","Valeria","Carla","Alba","Noa","Sara","Daniela","Claudia","Irene","Ainhoa","Marta","Elena","Laura","Andrea","Nerea","Cristina","Beatriz","Rocío","Patricia","Silvia","Natalia","Marina","Carmen","Lorena","Vera"],
  "🇮🇹": ["Giulia","Sofia","Aurora","Alice","Ginevra","Emma","Sara","Giorgia","Martina","Chiara","Francesca","Beatrice","Vittoria","Anna","Elena","Camilla","Greta","Ludovica","Alessia","Federica","Ilaria","Valentina","Silvia","Arianna","Elisa","Roberta","Denise"],
  "🇫🇷": ["Camille","Léa","Chloé","Manon","Emma","Sarah","Julie","Louise","Inès","Charlotte","Justine","Margaux","Clara","Éléonore","Océane","Lucie","Marine","Coralie","Amandine","Alizée","Pauline","Aurélie","Mathilde","Élodie","Line"],
  "🇯🇵": ["Ai","Yui","Sakura","Haruka","Mio","Rin","Nana","Aoi","Yuna","Hina","Mei","Sara","Kanon","Riko","Airi","Yuka","Miku","Yumi","Nozomi","Emi","Kaori","Erika","Momoka"],
  "🇦🇺": ["Chloe","Isla","Charlotte","Olivia","Mia","Ruby","Ava","Lily","Zoe","Grace","Ella","Amelia","Sienna","Willow","Matilda","Poppy","Georgia","Scarlett","Harper","Ivy","Frankie","Layla","Piper","Tayla"],
  "🇬🇧": ["Chloe","Charlotte","Sophie","Emily","Amelia","Katie","Lucy","Grace","Ella","Millie","Olivia","Ruby","Freya","Isla","Poppy","Daisy","Jessica","Holly","Rosie","Megan","Alice","Bethany","Danielle","Billee"],
  "🇩🇪": ["Anna","Lena","Emma","Mia","Lea","Sophie","Marie","Laura","Julia","Hannah","Lisa","Sarah","Nele","Frieda","Klara","Johanna","Paula","Antonia","Charlotte","Emilia","Birgit","Karin","Sabine","Ines"],
  "🇧🇷": ["Ana","Julia","Maria","Beatriz","Gabriela","Larissa","Camila","Fernanda","Amanda","Bruna","Letícia","Mariana","Rafaela","Isabela","Vitória","Carolina","Aline","Débora","Patrícia","Renata","Priscila","Gabrielly"],
  "🇿🇦": ["Amahle","Thandi","Zanele","Naledi","Lerato","Nomvula","Precious","Karabo","Boitumelo","Nomsa","Palesa","Bontle","Refilwe","Kagiso","Emma","Chloe","Zoe","Amy","Sarah","Jessica","Kate","Megan"],
  "🇳🇱": ["Emma","Julia","Sophie","Anna","Sara","Lotte","Eva","Tess","Noa","Fenna","Fleur","Roos","Lisa","Anne","Iris","Nienke","Femke","Marit","Suze","Birgit","Merel","Esmee"],
  "🇦🇷": ["Sofía","Valentina","Camila","Martina","Julieta","Agustina","Micaela","Florencia","Lucía","Emilia","María","Catalina","Delfina","Milagros","Guadalupe","Victoria","Antonella","Bianca","Renata","Abril"],
  "🇹🇷": ["Zeynep","Elif","Ayşe","Fatma","Emine","Hatice","Merve","Esra","Büşra","Gizem","Sude","Deniz","Ecrin","İrem","Yağmur","Selin","Beren","Ceren","Duru","Melis"],
  "🇨🇴": ["María","Valentina","Isabella","Camila","Sofía","Salomé","Luciana","Gabriela","Mariana","Daniela","Laura","Juliana","Manuela","Antonia","Emilia","Sara","Ana","Valeria","Alejandra","Natalia"],
  "🇮🇩": ["Putri","Ayu","Dewi","Sari","Wulan","Intan","Ratna","Citra","Kartika","Indah","Nadia","Rani","Diah","Melati","Anggi","Fitri","Lestari","Novita","Yuni","Rina"],
  "🇨🇿": ["Eliška","Tereza","Anna","Karolína","Adéla","Barbora","Kristýna","Natálie","Veronika","Julie","Nikola","Sára","Klára","Lucie","Michaela","Petra","Kateřina","Denisa","Simona","Aneta"],
  "🇺🇸": ["Emma","Olivia","Ava","Sophia","Isabella","Mia","Charlotte","Amelia","Harper","Evelyn","Abigail","Emily","Ella","Scarlett","Grace","Chloe","Victoria","Riley","Aria","Zoey","Mallory","Madison"],
  "🇫🇮": ["Aino","Helmi","Emilia","Sofia","Aada","Eevi","Ronja","Iida","Venla","Sara","Ella","Siiri","Nea","Vilma","Anni","Eeva","Elli","Kerttu","Tyra"],
  "🇳🇿": ["Charlotte","Amelia","Isla","Olivia","Ava","Mia","Ella","Chloe","Sophie","Grace","Zoe","Ruby","Emma","Lily","Harper","Georgia","Poppy","Lucy","Ivy","Willow"],
  "🇲🇾": ["Nur","Siti","Aisyah","Aina","Farah","Nadia","Alya","Batrisyia","Iman","Sofea","Qistina","Aleesha","Mia","Ain","Amira","Hana","Zara","Alisya","Dania","Iris"],
  "🇦🇹": ["Anna","Lena","Emma","Marie","Sophie","Laura","Johanna","Julia","Lisa","Hannah","Paula","Klara","Sarah","Magdalena","Theresa","Katharina","Nina","Vanessa","Melanie","Carina"],
  "🇬🇷": ["Maria","Eleni","Sofia","Anna","Ioanna","Katerina","Georgia","Dimitra","Alexandra","Vasiliki","Christina","Despina","Athina","Zoi","Konstantina","Foteini","Marina","Ariadni","Elisavet","Panagiota"],
  "🇵🇹": ["Beatriz","Matilde","Maria","Leonor","Mariana","Carolina","Inês","Francisca","Sofia","Rita","Ana","Madalena","Diana","Sara","Margarida","Joana","Catarina","Bruna","Marta","Vitória"],
  "🇹🇭": ["Nattaya","Ploy","Fah","Kanya","Suda","Malee","Waree","Nong","Ann","Chompoo","Mint","Pim","Namtan","Faii","Bua","Muklada","Suwanan","Kwang","Pang","Nok"],
  "🇪🇪": ["Maria","Kadri","Liisa","Eliise","Kristiina","Anna","Grete","Katarina","Marta","Laura","Karolin","Getter","Merit","Elisabeth","Sandra","Anette","Kertu","Piret","Kaisa","Triin"],
  "🇨🇭": ["Emma","Mia","Laura","Elena","Lea","Sina","Nina","Sara","Sophie","Julia","Sarah","Anna","Lara","Fabienne","Chiara","Melanie","Rebecca","Selina","Nadine","Michelle"],
  "🇩🇰": ["Ida","Emma","Freja","Alma","Clara","Sofia","Josefine","Anna","Karla","Ella","Laura","Mille","Sara","Nanna","Silje","Maja","Signe","Astrid","Andrea","Line"],
  "🇦🇩": ["Meritxell","Núria","Judith","Anna","Marta","Clara","Laura","Berta","Aina","Elena"],
};

// Re-exported so callers only ever need to import from one place per
// gender — pickFemaleRookieNat is pickRookieNat unchanged, since the
// nationality distribution is identical for both, only the first-name
// pool differs.
export const pickFemaleRookieNat = pickRookieNat;

const usedFemaleRookieFullNames = new Set();

export function pickFemaleRookieName(nat) {
  const firsts = FEMALE_FIRST_NAMES[nat] || FEMALE_FIRST_NAMES["🇪🇸"];
  const lasts = (ROOKIE_NAME_POOLS[nat] || ROOKIE_NAME_POOLS["🇪🇸"]).lasts;
  const maxAttempts = 20;
  let candidate;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const first = firsts[Math.floor(Math.random() * firsts.length)];
    const last = lasts[Math.floor(Math.random() * lasts.length)];
    candidate = `${first} ${last}`;
    if (!usedFemaleRookieFullNames.has(candidate)) break;
  }
  usedFemaleRookieFullNames.add(candidate);
  return candidate;
}
