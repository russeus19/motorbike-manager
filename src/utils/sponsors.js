import { clamp, randInt } from "./random.js";
import { categoryPrestigeRange } from "../data/categoryPrestigeConfig.js";
import { INITIAL_SPONSORS_BY_CATEGORY } from "../data/initialSponsors.js";

/**
 * Sponsorship — a second income stream alongside race prize money,
 * deliberately built on top of the prestige system that already exists
 * (utils/prestige.js) rather than as a parallel mechanic: how much a
 * sponsor pays, and whether they stick around, is driven by team
 * prestige + average rider prestige, exactly the two numbers the game
 * already tracks and evolves once per season.
 *
 * Two independent slots per team, `main` and `secondary` — same idea as
 * a title sponsor vs. a smaller backer. Either can be empty. Each
 * signed sponsor is a flat object:
 *   { id, name, tier, payoutPerGp, yearsLeft, scorelessStreak }
 *
 * Three moments touch a team's sponsors:
 *   1. Every GP: `sponsorGpIncome` feeds the existing prize/cost cash
 *      flow, and `applySponsorRaceResult` tracks a scoreless-race streak
 *      that can break a contract mid-season (see below) — no waiting
 *      for a full season to feel the effect of a slump.
 *   2. Season end: `advanceSponsorContractsForSeasonEnd` ages every
 *      contract down by a year and, for anything that just expired (or
 *      was never filled), produces 2-3 fresh candidate offers using the
 *      team's now-updated prestige.
 *   3. Choosing among those offers: `signSponsorOffer` for a human pick,
 *      `resolveAiSponsorOffers` for every AI-controlled team (best payout
 *      wins, no negotiation drama needed there).
 */

export const SPONSOR_TIERS = ["Local", "Regional", "Nacional", "Internacional", "Élite"];

const TIER_PAYOUT_RANGE = {
  Local: [5000, 12000],
  Regional: [12000, 25000],
  Nacional: [25000, 45000],
  Internacional: [45000, 75000],
  "Élite": [75000, 120000],
};

// How high each competition's OWN sponsor ceiling reaches, independent
// of how dominant a team is within it — the fix for a real problem:
// `teamSponsorAppeal` normalizes against each category's OWN prestige
// range, so a genuinely dominant Sportbike team could still land near
// 1.0 "appeal" on its own terms and, without this cap, reach an Élite
// offer exactly like a great MotoGP team would — unrealistic for a
// brand-new entry-level class. MotoGP/Moto2/Superbikes/Moto3 keep the
// full ladder (all four are full world championships with genuine
// top-tier sponsors in real life — Moto3 already has Red Bull-backed
// teams seeded in its own data, for instance). Supersport and
// especially Sportbike are capped lower, matching how much smaller
// their real-world sponsor rosters actually are.
const CATEGORY_SPONSOR_TIER_CEILING = {
  motogp: 4, superbikes: 4,
  moto2: 3, moto3: 3, // Internacional — Red Bull's own presence in both is handled separately as a `permanent` sponsor, so it no longer needs to hold the whole category's general ceiling up at Élite
  supersport: 3, // Internacional
  sportbike: 1,  // Regional
  worldwcr: 0,   // Local — campeonato aún más pequeño y reciente que Sportbike
};
function categoryTierCeiling(categoryKey) {
  return CATEGORY_SPONSOR_TIER_CEILING[categoryKey] ?? SPONSOR_TIERS.length - 1;
}
// The floor mirrors the ceiling for the same reason: without it, adding
// "Local" at index 0 would quietly drag every category's WORST-case
// payout down too (SPONSOR_TIERS[0] used to always mean "Regional" —
// now it means "Local" for everyone unless this says otherwise). Only
// Sportbike's own floor is actually "Local"; everything else keeps
// bottoming out at Regional exactly like before this tier was added.
const CATEGORY_SPONSOR_TIER_FLOOR = { sportbike: 0, worldwcr: 0 }; // Local
function categoryTierFloor(categoryKey) {
  return CATEGORY_SPONSOR_TIER_FLOOR[categoryKey] ?? 1; // Regional, the pre-existing default for everyone
}

// A secondary sponsor is a smaller deal by nature — always one full
// rung below whatever the MAIN sponsor's own ceiling is for this
// category (never a flat "Internacional, always" cap: that only ever
// mattered for the top categories anyway, and let a Supersport or
// Sportbike secondary sponsor reach exactly as high as that
// category's own main sponsor could, losing the "always somewhat
// smaller" distinction right where the ladder is already thin), plus
// paying less even at the same nominal tier label.
const SECONDARY_PAYOUT_FACTOR = 0.55;

// Every other euro figure in this file scales with the category's
// linear `scale` (same one used for prize money, salaries, running
// cost). Sponsor payouts bend that curve a little instead of using it
// straight — MotoGP (scale 1) is completely unaffected (1^x is always
// 1), but every category below it ends up with somewhat more sponsor
// money than a pure linear scale-down would give: Moto2 +16%,
// Superbikes +19%, Supersport +27%, Moto3 +33%. A modest, deliberate
// boost specifically for sponsors — not prize money or running cost —
// as one more lever for the categories that need it most, on top of
// (not instead of) the floor and running-cost fixes already in
// utils/economy.js.
const SPONSOR_SCALE_EXPONENT = 0.75;
function sponsorScale(scale) {
  return Math.pow(clamp(scale ?? 1, 0.01, 1), SPONSOR_SCALE_EXPONENT);
}

// Every sponsor also pays a small bonus per point scored that GP, on top
// of the flat fee — expressed as a fraction of that same flat fee, so it
// scales the same way across tiers and categories without a second
// separate table. 0.02 means a MotoGP win (25 points) roughly adds half
// of the flat fee on top; a single point in the lower half of the grid
// barely moves the needle, exactly like a real bonus clause would feel.
const POINTS_BONUS_RATE = 0.02;

// A sponsor already backing a real team in one category (MotoGP, Moto2,
// whichever gets added to data/initialSponsors.js next) is a real,
// paddock-active brand — plausible enough to also show up as a
// candidate offer for a team in any OTHER category, same as a real
// title sponsor might extend into a feeder class. Derived straight from
// that same seeding table instead of a second hand-kept list, so it
// grows automatically the moment Moto3/WorldSBK/WorldSSP get their own
// entries there — nothing else needs to change.
const REAL_SPONSOR_NAMES = [...new Set(
  Object.values(INITIAL_SPONSORS_BY_CATEGORY)
    .flatMap((byTeam) => Object.values(byTeam).flatMap((e) => [e.main, e.secondary]))
    .map((raw) => (typeof raw === "string" ? raw : raw?.name))
    .filter(Boolean)
)];

// A real company's own scale caps which tiers it can plausibly show up
// as a candidate for — a small regional workshop brand has no business
// appearing as an "Élite" offer next to Red Bull or Monster Energy.
// This is the ceiling each name can reach, not a fixed slot: a
// Élite-rated company can still show up in a Regional or Nacional offer
// (a big brand doing a small deal is normal), it just never appears
// ABOVE its own rating. Best-effort judgment calls for the less
// internationally-known names — worth double-checking and correcting.
const REAL_SPONSOR_TIER = {
  // Élite — genuinely global, top-of-market brands
  "Red Bull": "Élite", "Monster Energy": "Élite", "Lenovo": "Élite", "Castrol": "Élite",
  "NetApp": "Élite", "Elf": "Élite", "ebay": "Élite", "OnlyFans": "Élite",
  "Aruba.it": "Élite", "Pertamina Enduro": "Élite",
  "Samsung": "Élite", "Intel": "Élite", "AMD": "Élite", "Nvidia": "Élite", "Qualcomm": "Élite",
  "Sony": "Élite", "Pepsi": "Élite", "Shell": "Élite", "Repsol": "Élite", "Petronas": "Élite",
  "TotalEnergies": "Élite", "Mobil 1": "Élite", "DHL": "Élite", "Visa": "Élite",
  "Mastercard": "Élite", "PayPal": "Élite", "Santander": "Élite",

  // Internacional — large, multi-country brands, but a notch below the
  // very top
  "CFMoto": "Internacional", "Liqui Moly": "Internacional", "Idemitsu": "Internacional",
  "Eneos": "Internacional", "Givi": "Internacional", "Oakley": "Internacional",
  "BK8": "Internacional", "Bardahl": "Internacional", "Maxus": "Internacional",
  "MSi": "Internacional", "ROKiT": "Internacional", "Pramac": "Internacional",
  "Pata": "Internacional",
  "Motul": "Internacional", "Gulf": "Internacional", "ENI": "Internacional",
  "Valvoline": "Internacional", "Acer": "Internacional", "Asus": "Internacional",
  "Dell": "Internacional", "HP": "Internacional", "LG": "Internacional",
  "Logitech": "Internacional", "Vodafone": "Internacional", "Orange": "Internacional",
  "Movistar": "Internacional", "TIM": "Internacional", "T-Mobile": "Internacional",
  "Verizon": "Internacional", "AT&T": "Internacional", "Tata Communications": "Internacional",
  "Hyundai": "Internacional", "Kia": "Internacional", "Ford": "Internacional",
  "Brembo": "Internacional", "Bosch": "Internacional", "SKF": "Internacional",
  "Marelli": "Internacional", "Öhlins": "Internacional", "Akrapovič": "Internacional",
  "NGK": "Internacional", "DID": "Internacional", "RK Chain": "Internacional",
  "Showa": "Internacional", "Nissin": "Internacional", "HJC": "Internacional",
  "Tissot": "Internacional", "UPS": "Internacional", "FedEx": "Internacional",
  "Revolut": "Internacional", "Gatorade": "Internacional", "Nestlé": "Internacional",
  "Panattoni": "Internacional",

  // Nacional — solid, established brands, but mostly known within one
  // country or one industry
  "Fantic": "Nacional", "Italjet": "Nacional", "Zxmoto": "Nacional", "Sterilgarda": "Nacional",
  "Gaviota": "Nacional", "Dynavolt": "Nacional", "Vulcain": "Nacional", "Rivacold": "Nacional",
  "MT Helmets": "Nacional", "Pallex": "Nacional", "Barracuda": "Nacional", "Prima": "Nacional",
  "LevelUp": "Nacional", "Blu Cru": "Nacional", "Beta": "Nacional", "Estrella Galicia": "Nacional",
  "Prosecco DOC": "Nacional", "Lavazza": "Nacional", "Barilla": "Nacional", "Danone": "Nacional",
  "Ritter Sport": "Nacional", "Haribo": "Nacional", "Aquarius": "Nacional", "O2": "Nacional",
  "Subaru": "Nacional", "Iveco": "Nacional", "Arrow": "Nacional", "Gaerne": "Nacional",
  "TCX": "Nacional", "LS2": "Nacional", "Shad": "Nacional", "Ipone": "Nacional",
  "Track & Trades": "Nacional",
  "Silkolene": "Nacional",

  // Regional — small, local, or niche-within-racing names; the rest of
  // the pool defaults here (see REAL_SPONSOR_NAMES) if not listed above
  "Cerba": "Regional",

  // Local — fictional small/regional-scale sponsors, purpose-built for
  // the Local tier (Sportbike's own ceiling, and the worst-case floor
  // for every other category too) so a Local offer has real, plausible
  // candidates of its own instead of always borrowing from Regional.
  "IronPeak Bank": "Local", "Northline Finance": "Local", "Titan Mortgage Group": "Local",
  "Blackstone Realty": "Local", "PrimeLand Estates": "Local", "Atlas Property Solutions": "Local",
  "RapidTrack Logistics": "Local", "Arrow Freight Systems": "Local", "SteelRoute Express": "Local",
  "Velocity Cargo": "Local", "Apex Garage": "Local", "IronWorks Auto Service": "Local",
  "Redline Performance": "Local", "Torque Motors Garage": "Local", "Falcon Tyres": "Local",
  "GearMax Tools": "Local", "SteelCraft Equipment": "Local", "PowerBolt Hardware": "Local",
  "FuelCore Energy Drink": "Local", "Mountain Spring Water": "Local", "Glacier Ice Tea": "Local",
  "Frost Lemon Soda": "Local", "Grill Brothers": "Local", "Pit Stop Burgers": "Local",
  "Roadhouse Chicken": "Local", "Brick Oven Pizza": "Local", "LumberJack BBQ": "Local",
  "Forge Security": "Local", "Guardian Insurance": "Local", "Summit Telecom": "Local",
  "Thunder Ridge Motors": "Local", "Blue Harbor Bank": "Local", "Victory Express": "Local",
  "Iron Shield Insurance": "Local", "GoldStone Properties": "Local", "Titan Fuel Solutions": "Local",
  "CrossRoad Logistics": "Local", "WolfPack Auto Care": "Local", "Urban Forge Construction": "Local",
  "Pioneer Capital Group": "Local",
};

// The pool itself is now the union of every name seeded on a real team
// (data/initialSponsors.js) AND every name manually classified above —
// so a brand can be added straight into the tier table (as its own
// candidate for random renewal offers) without needing to first exist
// as some real team's current sponsor.
// Red Bull is deliberately excluded from the pool of names a NEW offer
// can draw from — it only ever exists as the permanent, pre-seeded
// sponsor of the specific teams it already backs (see `permanent` in
// seedInitialSponsors), never as something another team could win,
// negotiate for, or replace it with once lost.
const SPONSOR_POOL_NAMES = [...new Set([...REAL_SPONSOR_NAMES, ...Object.keys(REAL_SPONSOR_TIER)])].filter((n) => n !== "Red Bull");

const TIER_RANK = { Local: 0, Regional: 1, Nacional: 2, Internacional: 3, "Élite": 4 };

function tierOf(name) {
  return REAL_SPONSOR_TIER[name] || "Regional";
}

function randomSponsorName(usedNames, tier, excludeNames = []) {
  // Match the sponsor's own scale to the offer's tier as closely as
  // possible — not "this tier or bigger", which would let a giant like
  // Lenovo turn up as a Regional deal for a struggling backmarker.
  // Falls back to the tier(s) immediately below (nothing smaller makes
  // it more plausible to widen upward) only if that exact tier's pool
  // is empty once already-used names are excluded — except starting
  // from "Local" specifically, which climbs UP to Regional instead if
  // it's ever exhausted, since there's nothing smaller to fall to.
  // `excludeNames` additionally rules out any sponsor already actively
  // backing a DIFFERENT team in this same category (Aruba.it can't
  // sponsor two separate Superbikes teams at once) — checked at every
  // step, but never allowed to make an offer impossible: if honoring
  // it would leave nothing at all, it's dropped rather than handing
  // back a broken/empty offer.
  const notExcluded = (n) => !excludeNames.includes(n);
  const rank = TIER_RANK[tier] ?? 0;
  for (let r = rank; r >= 0; r--) {
    const tierName = Object.keys(TIER_RANK).find((t) => TIER_RANK[t] === r);
    const eligible = SPONSOR_POOL_NAMES.filter((n) => tierOf(n) === tierName);
    const poolStrict = eligible.filter((n) => !usedNames.includes(n) && notExcluded(n));
    if (poolStrict.length) return poolStrict[randInt(0, poolStrict.length - 1)];
    const poolNoExclude = eligible.filter((n) => !usedNames.includes(n));
    if (poolNoExclude.length) return poolNoExclude[randInt(0, poolNoExclude.length - 1)];
    if (eligible.length) return eligible[randInt(0, eligible.length - 1)];
  }
  if (rank === 0) {
    const eligible = SPONSOR_POOL_NAMES.filter((n) => tierOf(n) === "Regional");
    const poolStrict = eligible.filter((n) => !usedNames.includes(n) && notExcluded(n));
    if (poolStrict.length) return poolStrict[randInt(0, poolStrict.length - 1)];
    const poolNoExclude = eligible.filter((n) => !usedNames.includes(n));
    if (poolNoExclude.length) return poolNoExclude[randInt(0, poolNoExclude.length - 1)];
    if (eligible.length) return eligible[randInt(0, eligible.length - 1)];
  }
  const anyPool = SPONSOR_POOL_NAMES.filter((n) => !usedNames.includes(n));
  const list = anyPool.length ? anyPool : SPONSOR_POOL_NAMES;
  return list[randInt(0, list.length - 1)];
}

/** Fills in `sponsors`/`pendingSponsorOffers` for a team that doesn't
 * have them yet (old save, or a team seen for the first time) — never
 * overwrites anything that already exists. Mirrors ensureRD/ensureTeamPrestige's
 * "migrate, don't recompute" approach. */
export function ensureSponsors(team) {
  if (team.sponsors && team.pendingSponsorOffers !== undefined && team.sponsorSearching) return team;
  return {
    ...team,
    sponsors: team.sponsors || { main: null, secondary: null },
    pendingSponsorOffers: team.pendingSponsorOffers || { main: null, secondary: null },
    sponsorSearching: team.sponsorSearching || { main: false, secondary: false },
  };
}

/** Turns on active searching for an empty slot — a deliberate decision
 * the player makes (a button in the Sponsors panel), for a team whose
 * results just aren't good enough to attract organic interest
 * (applySponsorRaceResult's scoring-streak opportunity below). Only
 * takes effect on an actually-empty slot with nothing already pending;
 * a no-op otherwise. */
export function startSponsorSearch(team, kind) {
  const withSponsors = ensureSponsors(team);
  if (withSponsors.sponsors[kind] || withSponsors.pendingSponsorOffers[kind]?.length) return withSponsors;
  return { ...withSponsors, sponsorSearching: { ...withSponsors.sponsorSearching, [kind]: true } };
}

export function cancelSponsorSearch(team, kind) {
  const withSponsors = ensureSponsors(team);
  return { ...withSponsors, sponsorSearching: { ...withSponsors.sponsorSearching, [kind]: false } };
}

/** 0-1 how attractive this team is to sponsors right now: mostly team
 * prestige, with the riders' own average prestige pulling it up or down
 * a bit too — a team with two well-known riders is a better sponsorship
 * proposition than the same team with two unknowns, even at equal team
 * prestige. Normalized against the category's own prestige ceiling, so
 * a great Moto3 team and a great MotoGP team can both reach "Élite"
 * sponsors on their own terms. */
export function teamSponsorAppeal(team, categoryKey) {
  const { min, max } = categoryPrestigeRange(categoryKey);
  const avgRiderPrestige = team.riders?.length
    ? team.riders.reduce((s, r) => s + (r.prestige ?? 0), 0) / team.riders.length
    : 0;
  const combined = (team.prestige ?? 0) * 0.6 + avgRiderPrestige * 0.4;
  return clamp((combined - min) / Math.max(1, max - min), 0, 1);
}

/** Deterministic payout for a sponsor a team is assumed to ALREADY have
 * at game start — as opposed to `generateSponsorOffers`, which is for
 * choosing a NEW one at renewal and is deliberately random within a
 * tier band. Blends two things in equal parts:
 *   - `teamSponsorAppeal` (prestige of the team + its riders) — the
 *     team's standing reputation, independent of this exact season.
 *   - `expectation.score` (0-100, the same team-strength score
 *     assignSeasonExpectations already computes) — how competitive
 *     this team is expected to be RIGHT NOW, this season. A team with
 *     modest prestige but a stacked current line-up still commands a
 *     real sponsor; a prestigious team having a rebuilding year doesn't
 *     get paid as if nothing changed.
 * The result is a smooth position across the FULL Regional→Élite range
 * (not a random draw within a discrete tier), so two teams a few
 * prestige points apart don't get identical numbers — every team's
 * figure is its own point on the ladder. `tier` is still reported,
 * purely as a label for whichever band that number happens to fall in. */
export function estimateCurrentSponsorPayout(team, categoryKey, scale, kind = "main") {
  const appeal = teamSponsorAppeal(team, categoryKey);
  const expectationScore = clamp((team.expectation?.score ?? 50) / 100, 0, 1);
  const worthiness = clamp(appeal * 0.5 + expectationScore * 0.5, 0, 1);

  const categoryCap = categoryTierCeiling(categoryKey);
  const overallMin = TIER_PAYOUT_RANGE[SPONSOR_TIERS[categoryTierFloor(categoryKey)]][0];
  const cap = kind === "secondary" ? Math.max(0, categoryCap - 1) : categoryCap;
  const overallMax = TIER_PAYOUT_RANGE[SPONSOR_TIERS[cap]][1];
  const factor = kind === "secondary" ? SECONDARY_PAYOUT_FACTOR : 1;

  const rawPayout = overallMin + (overallMax - overallMin) * worthiness;
  const payoutPerGp = Math.round(rawPayout * factor * sponsorScale(scale));
  const bonusPerPoint = Math.round(payoutPerGp * POINTS_BONUS_RATE);

  const tierIdx = SPONSOR_TIERS.findIndex((t, i) => {
    const [lo, hi] = TIER_PAYOUT_RANGE[t];
    return i === cap || (rawPayout >= lo && rawPayout <= hi);
  });
  const tier = SPONSOR_TIERS[clamp(tierIdx, 0, cap)];

  return { tier, payoutPerGp, bonusPerPoint, worthiness };
}

/** Called once, only for a team that doesn't have `sponsors` yet (a
 * brand-new career/quick-play team, never a loaded save that already
 * has them) — looks the team up by name in
 * data/initialSponsors.js#INITIAL_SPONSORS_BY_CATEGORY and, for
 * whichever slot(s) have a real name there, signs it using
 * `estimateCurrentSponsorPayout` against the team's actual, current
 * prestige/expectation. A team not in that table, or with a slot
 * marked `null`, just starts with that slot empty — normal behavior,
 * filled the usual way at the next season-end transition. Contract
 * length is randomized (1-3 seasons) so every real team's deal doesn't
 * happen to run out in the very same season. */
export function seedInitialSponsors(team, categoryKey, scale) {
  if (team.sponsors) return team; // already has sponsors — not a fresh team, leave it alone
  const entry = INITIAL_SPONSORS_BY_CATEGORY[categoryKey]?.[team.name];
  const sponsors = { main: null, secondary: null };
  if (entry) {
    ["main", "secondary"].forEach((kind) => {
      // A slot can be a plain sponsor name, or `{ name, shortTerm: true }`
      // for a deal known to be a short/temporary one in real life —
      // seeded with a 1-season contract instead of the usual 1-3 spread,
      // so it comes up for renewal (with a fresh, normal-length offer)
      // right at next season's transition rather than lingering.
      const raw = entry[kind];
      if (!raw) return;
      const name = typeof raw === "string" ? raw : raw.name;
      const shortTerm = typeof raw === "object" && raw.shortTerm;
      // Red Bull's real relationship with a team it backs isn't a
      // swappable sponsorship deal — it's effectively a co-owner of the
      // project alongside KTM. `permanent: true` marks this slot as
      // never expiring, never breakable (by either side), and never up
      // for a fresh competing offer — see cancelSponsorContract,
      // advanceSponsorContractsForSeasonEnd, and applySponsorRaceResult's
      // break-clause check, which all respect this flag. `permanent`
      // only ever means "the team/player can't walk away from it" —
      // it's still conditional on the team staying with KTM (both
      // being Austrian companies is the whole reason this bond exists
      // in the first place): if a KTM satellite ever switches to a
      // different manufacturer, Red Bull's sponsorship ends right
      // there too — see utils/manufacturerNegotiation.js's own
      // applyPendingManufacturerSwitch for that half of the rule.
      const permanent = name === "Red Bull" && kind === "main";
      let tier, payoutPerGp, bonusPerPoint;
      if (permanent) {
        // Red Bull's own real tier (Élite) is ground truth, independent
        // of whatever this category's general ceiling is set to for
        // FUTURE/hypothetical new offers (which exists to keep those
        // realistic — Moto2/Moto3 cap new offers at Internacional, for
        // instance — not to retroactively downgrade a real-world
        // sponsorship that's already an established fact).
        tier = "Élite";
        const [lo, hi] = TIER_PAYOUT_RANGE[tier];
        const appeal = teamSponsorAppeal(team, categoryKey);
        payoutPerGp = Math.round((lo + (hi - lo) * appeal) * sponsorScale(scale));
        bonusPerPoint = Math.round(payoutPerGp * POINTS_BONUS_RATE);
      } else {
        ({ tier, payoutPerGp, bonusPerPoint } = estimateCurrentSponsorPayout(team, categoryKey, scale, kind));
      }
      // Every deal starts at 2 years by default — Red Bull specifically
      // runs 5, since in reality it tends to stick with a team far
      // longer than a typical sponsor does. A deal already flagged
      // `shortTerm` (a real-life sponsor known to be new/temporary,
      // like Trackhouse's Superfile) still overrides both of these
      // down to 1, so it comes up for renewal right away regardless.
      const initialYears = shortTerm ? 1 : name === "Red Bull" ? 5 : 2;
      sponsors[kind] = { id: `${kind}_seed_${team.id}`, name, tier, payoutPerGp, bonusPerPoint, yearsLeft: initialYears, scorelessStreak: 0, permanent };
    });
  }
  return { ...team, sponsors, pendingSponsorOffers: { main: null, secondary: null } };
}


function eligibleTierIndices(appeal, kind, categoryKey) {
  const categoryCap = categoryTierCeiling(categoryKey);
  const cap = kind === "secondary" ? Math.max(0, categoryCap - 1) : categoryCap;
  const categoryFloor = categoryTierFloor(categoryKey);
  const centerIdx = clamp(Math.round(categoryFloor + appeal * (cap - categoryFloor)), categoryFloor, cap);
  // The centered window (one tier below, at, and above) is meant to mix
  // a safe pick with a reach — but for a genuinely elite team, "one
  // tier below" can still land on something as low as Nacional just
  // because the window is centered a couple of tiers under the team's
  // real ceiling. A team's own appeal also sets a FLOOR nothing can go
  // under, regardless of where the centered window would otherwise
  // reach: a real top-tier team (Ducati Lenovo Team-level) should never
  // see a Regional or Nacional offer as its "safe" option. The window
  // can still stretch UP past its center as a reach goal — this only
  // clamps how far DOWN it's allowed to go. Both thresholds are relative
  // to THIS category's own cap now, not an absolute global index — a
  // dominant team's floor in a category capped at Regional (Sportbike)
  // should land near the bottom of ITS OWN available range, not at an
  // absolute "Internacional" that category can't even reach.
  const floorIdx = clamp(appeal >= 0.75 ? cap - 1 : appeal >= 0.45 ? cap - 2 : categoryFloor, categoryFloor, cap);
  const set = new Set();
  [centerIdx - 1, centerIdx, centerIdx + 1].forEach((i) => {
    if (i >= floorIdx && i <= cap) set.add(i);
  });
  if (set.size === 0) set.add(clamp(centerIdx, floorIdx, cap));
  return [...set].sort((a, b) => a - b);
}

/** 2-3 candidate offers for a slot, drawn from the tiers this team's
 * current appeal can realistically reach (plus, occasionally, one tier
 * above as a reach option and one below as a safe option). `scale`
 * keeps the euro amounts sensible per category, exactly like every
 * other cost/income figure in the game. */
export function generateSponsorOffers(team, categoryKey, scale, kind, excludeNames = []) {
  const appeal = teamSponsorAppeal(team, categoryKey);
  const tierIdxs = eligibleTierIndices(appeal, kind, categoryKey);
  const usedNames = [];
  const offers = tierIdxs.map((idx) => {
    const tier = SPONSOR_TIERS[idx];
    const [lo, hi] = TIER_PAYOUT_RANGE[tier];
    const factor = kind === "secondary" ? SECONDARY_PAYOUT_FACTOR : 1;
    const payoutPerGp = Math.round(randInt(lo, hi) * factor * sponsorScale(scale));
    const bonusPerPoint = Math.round(payoutPerGp * POINTS_BONUS_RATE);
    const years = randInt(1, 3);
    const name = randomSponsorName(usedNames, tier, excludeNames);
    usedNames.push(name);
    return { id: `${kind}_${Date.now()}_${idx}_${randInt(0, 99999)}`, name, tier, payoutPerGp, bonusPerPoint, years };
  });
  return offers.sort((a, b) => a.payoutPerGp - b.payoutPerGp);
}

/** Applies a chosen offer to a slot — used for both the player's own
 * pick and (indirectly, via resolveAiSponsorOffers) every AI team. */
export function signSponsorOffer(team, kind, offer) {
  const sponsors = { ...(team.sponsors || { main: null, secondary: null }) };
  sponsors[kind] = { id: offer.id, name: offer.name, tier: offer.tier, payoutPerGp: offer.payoutPerGp, bonusPerPoint: offer.bonusPerPoint || 0, yearsLeft: offer.years, scorelessStreak: 0 };
  const pendingSponsorOffers = { ...(team.pendingSponsorOffers || { main: null, secondary: null }) };
  pendingSponsorOffers[kind] = null;
  return { ...team, sponsors, pendingSponsorOffers };
}

/** Breaking a sponsor contract early is the player's own call — not
 * waiting for a break clause (bad results) or a season-end expiry, just
 * deciding a signed deal isn't worth keeping (a low tier locking up a
 * slot, wanting to try for something better). Real breach-of-contract
 * has a real cost, scaled by how much of the deal is still left to run
 * (yearsLeft) and how much it actually pays (payoutPerGp) — cancelling
 * a big Élite contract with two years left costs a lot more than
 * walking away from a Regional deal about to expire anyway. Returns
 * `null` if the slot is already empty — nothing to cancel. */
export function cancelSponsorContract(team, kind) {
  const withSponsors = ensureSponsors(team);
  const current = withSponsors.sponsors[kind];
  if (!current) return null;
  // Red Bull's bond with a team it backs isn't a deal either side can
  // walk away from — see the `permanent` flag set in seedInitialSponsors.
  if (current.permanent) return null;
  const cancellationFee = Math.round(current.payoutPerGp * current.yearsLeft * 1.5);
  const sponsors = { ...withSponsors.sponsors, [kind]: null };
  return { team: { ...withSponsors, sponsors }, cancellationFee };
}

/** Every sponsor name currently backing ANY team in this category
 * (main + secondary), used as the exclusion list that keeps the same
 * sponsor from ending up on two different teams at once — Aruba.it
 * can't sponsor two separate Superbikes teams simultaneously. */
export function collectActiveSponsorNames(teams) {
  const names = [];
  (teams || []).forEach((t) => {
    if (t.sponsors?.main?.name) names.push(t.sponsors.main.name);
    if (t.sponsors?.secondary?.name) names.push(t.sponsors.secondary.name);
  });
  return names;
}

/** Season-end pass: age every active contract down a year. Anything
 * that just ran out — or was already empty — gets fresh candidate
 * offers queued in `pendingSponsorOffers`, ready for the player to pick
 * from (or for `resolveAiSponsorOffers` to auto-resolve for every other
 * team). Never touches a slot that still has years left on its deal. */
export function advanceSponsorContractsForSeasonEnd(team, categoryKey, scale, metExpectation, excludeNames = []) {
  const withSponsors = ensureSponsors(team);
  const sponsors = { ...withSponsors.sponsors };
  const pendingSponsorOffers = { ...withSponsors.pendingSponsorOffers };
  ["main", "secondary"].forEach((kind) => {
    const s = sponsors[kind];
    let justExpired = null;
    if (s) {
      // A permanent sponsor (Red Bull) never ages down, never expires,
      // never comes up for renewal — the years-left counter stays
      // frozen forever, exactly like the relationship itself.
      if (s.permanent) return;
      const yearsLeft = s.yearsLeft - 1;
      if (yearsLeft > 0) {
        sponsors[kind] = { ...s, yearsLeft };
        return;
      }
      justExpired = s;
      sponsors[kind] = null; // contract ran out
    }
    // Empty slot (just expired, or never filled) — queue fresh offers.
    const freshOffers = generateSponsorOffers({ ...withSponsors, sponsors }, categoryKey, scale, kind, excludeNames);
    // A sponsor whose own deal just ran out doesn't necessarily walk
    // away — if the team met or beat its own expectation this season
    // (the sponsor got what it signed up for, or better), it puts in
    // its own renewal alongside every other candidate, same as a happy
    // real-world sponsor would rather continue a working relationship
    // than shop around. A small amount of variance on the payout
    // (±10%) keeps it from being a literal copy-paste of last deal.
    if (justExpired && metExpectation) {
      const renewalOffer = {
        id: `${kind}_renewal_${team.id}_${Date.now()}_${randInt(0, 99999)}`,
        name: justExpired.name,
        tier: justExpired.tier,
        payoutPerGp: Math.max(1, Math.round(justExpired.payoutPerGp * (0.9 + Math.random() * 0.2))),
        bonusPerPoint: justExpired.bonusPerPoint,
        years: randInt(1, 3),
      };
      pendingSponsorOffers[kind] = [renewalOffer, ...freshOffers];
    } else {
      pendingSponsorOffers[kind] = freshOffers;
    }
  });
  return { ...withSponsors, sponsors, pendingSponsorOffers };
}

/** AI never negotiates — it just takes whichever queued offer pays the
 * most per GP, for every slot that has pending offers. Leaves anything
 * without pending offers untouched. */
export function resolveAiSponsorOffers(team) {
  let next = ensureSponsors(team);
  ["main", "secondary"].forEach((kind) => {
    const offers = next.pendingSponsorOffers?.[kind];
    if (!offers || !offers.length) return;
    const best = [...offers].sort((a, b) => b.payoutPerGp - a.payoutPerGp)[0];
    next = signSponsorOffer(next, kind, best);
  });
  return next;
}

/** Combined per-GP payout from every signed sponsor — the flat fee plus
 * each sponsor's own bonus-per-point times however many points the team
 * actually scored this race. Feeds straight into the same
 * prize-minus-running-cost cash flow every team already has (App.jsx
 * for the player, utils/raceWeekend.js for AI teams). */
export function sponsorGpIncome(team, teamPointsThisRace = 0) {
  const sponsors = team.sponsors || {};
  return ["main", "secondary"].reduce((sum, kind) => {
    const s = sponsors[kind];
    if (!s) return sum;
    return sum + (s.payoutPerGp || 0) + (s.bonusPerPoint || 0) * teamPointsThisRace;
  }, 0);
}

/* Mid-season break clause: deliberately NOT tied to full-season
   standings (that's a once-a-year signal, already covered by season-end
   renewal) — this tracks something a sponsor would actually notice race
   to race: not "did they score a championship point", but "did they
   race to the level this team is realistically expected to race at".
   A backmarker team's own expectation might be P18-P21 — finishing 19th
   is a totally normal result for them and shouldn't read as a bad
   race just because it's outside real championship points. What
   actually worries (or excites) a sponsor is finishing WORSE than even
   the team's own worst-case expected range, race after race — or,
   the other direction, matching or beating the BEST-case end of that
   range. A short cold streak is normal and risks nothing; several in a
   row starts to matter, and the risk climbs the longer it goes on.
   Resets the instant the team races back up to its own standard, so
   one bad weekend doesn't haunt a contract for the rest of the year. */
const BREAK_CLAUSE_GRACE_STREAK = 10; // no risk at all before this many below-expectation races in a row
const BREAK_CLAUSE_CHANCE_PER_STREAK = 0.006;
const BREAK_CLAUSE_CHANCE_CAP = 0.04;
// A sponsor walking away from a signed deal mid-season doesn't leave
// empty-handed for the team — same idea as a real breach-of-contract
// settlement, just paid the other direction from when the PLAYER
// cancels one (utils/sponsors.js#cancelSponsorContract). Smaller than
// that one, since the sponsor is the one backing out, not the team.
const BREAK_CLAUSE_COMPENSATION_FACTOR = 0.5;

/* The mirror image, for an EMPTY slot: sponsors don't only watch for
   this from the outside once a year either. A team racing above its
   own expectation, race after race, starts attracting real mid-season
   interest, not just a shot at renewal once the season's already over.
   Same shape as the break clause (grace streak, then a climbing
   chance), just measuring the team beating its OWN best-case
   expectation instead of missing its worst-case one, and producing
   fresh offers instead of tearing a contract up. Never piles offers on
   top of ones already waiting to be picked. */
const OPPORTUNITY_GRACE_STREAK = 3; // no chance at all before this many above-expectation races in a row
const OPPORTUNITY_CHANCE_PER_STREAK = 0.05;
const OPPORTUNITY_CHANCE_CAP = 0.3;

/** An active search never lands anything better than the WORST tier
 * this team could realistically reach on its own merits — Ducati Team
 * going out and asking still isn't going to come back with a Regional
 * deal, it just comes back with the least generous end of what a team
 * of its own caliber could plausibly get, discounted and on a shorter
 * deal. This is a sponsor found out of the team going and asking, not
 * one that came looking on its own because the team was doing well —
 * meant as a real lifeline for a team that structurally can't attract
 * organic interest (no realistic shot at a streak), not a way to match
 * what a good season would have earned, and definitely not a way for
 * a top team to end up looking like a backmarker's sponsor roster. */
const ACTIVE_SEARCH_CHANCE_PER_GP = 0.22;
const ACTIVE_SEARCH_PAYOUT_FACTOR = 0.6;

function generateActiveSearchOffer(team, categoryKey, scale, kind, excludeNames = []) {
  const appeal = teamSponsorAppeal(team, categoryKey);
  const tierIdxs = eligibleTierIndices(appeal, kind, categoryKey);
  const tier = SPONSOR_TIERS[tierIdxs[0]]; // the worst tier THIS team's own appeal can reach
  const [lo, hi] = TIER_PAYOUT_RANGE[tier];
  const factor = (kind === "secondary" ? SECONDARY_PAYOUT_FACTOR : 1) * ACTIVE_SEARCH_PAYOUT_FACTOR;
  const payoutPerGp = Math.round(randInt(lo, hi) * factor * sponsorScale(scale));
  const bonusPerPoint = Math.round(payoutPerGp * POINTS_BONUS_RATE);
  const years = randInt(1, 2); // shorter, more cautious commitment than an organic deal
  const name = randomSponsorName([], tier, excludeNames);
  return { id: `${kind}_search_${Date.now()}_${randInt(0, 99999)}`, name, tier, payoutPerGp, bonusPerPoint, years };
}

/** Compares this race's actual best result against the team's own
 * expectation range (assignSeasonExpectations' `{min, max}`, already
 * used everywhere else in the game for exactly this kind of "how are
 * they doing relative to their own bar" question). Returns 1 if they
 * matched or beat the best-case end of their own range (a genuinely
 * good result for THEM specifically), -1 if they finished worse than
 * even the worst-case end (a genuinely bad one), 0 for anything in
 * between — squarely within their own expected range, which is a
 * normal result and shouldn't move either streak. `bestPosition` is
 * null when nobody finished (both riders crashed/retired), which
 * always counts as underperforming — a DNF is never "as expected".
 * Falls back to `null` (caller treats as neutral) if the team has no
 * expectation on record yet, rather than guessing. */
function expectationOutcome(team, bestPosition) {
  const exp = team.expectation;
  if (!exp) return null;
  if (bestPosition == null) return -1;
  if (bestPosition <= exp.min) return 1;
  if (bestPosition > exp.max) return -1;
  return 0;
}

export function applySponsorRaceResult(team, bestPosition, categoryKey, scale, excludeNames = []) {
  const withSponsors = ensureSponsors(team);
  const sponsors = { ...withSponsors.sponsors };
  const pendingSponsorOffers = { ...(withSponsors.pendingSponsorOffers || { main: null, secondary: null }) };
  const prospecting = { ...(withSponsors.sponsorProspecting || { main: 0, secondary: 0 }) };
  const searching = { ...(withSponsors.sponsorSearching || { main: false, secondary: false }) };
  const brokenSlots = [];
  const newOfferSlots = [];
  const searchOfferSlots = [];

  const outcome = expectationOutcome(team, bestPosition); // 1 = beat their own bar, -1 = missed it, 0/null = within it or unknown

  ["main", "secondary"].forEach((kind) => {
    const s = sponsors[kind];
    if (s) {
      // Red Bull never builds break-clause risk, no matter how bad the
      // results get — see the `permanent` flag set in seedInitialSponsors.
      if (s.permanent) return;
      const streak = outcome === -1 ? (s.scorelessStreak || 0) + 1 : (outcome === 1 ? 0 : (s.scorelessStreak || 0));
      if (streak >= BREAK_CLAUSE_GRACE_STREAK) {
        const chance = clamp((streak - (BREAK_CLAUSE_GRACE_STREAK - 1)) * BREAK_CLAUSE_CHANCE_PER_STREAK, 0, BREAK_CLAUSE_CHANCE_CAP);
        if (Math.random() < chance) {
          const compensation = Math.round(s.payoutPerGp * s.yearsLeft * BREAK_CLAUSE_COMPENSATION_FACTOR);
          sponsors[kind] = null;
          brokenSlots.push({ kind, name: s.name, compensation });
          prospecting[kind] = 0;
          return;
        }
      }
      sponsors[kind] = { ...s, scorelessStreak: streak };
      prospecting[kind] = 0; // slot is filled — nothing to prospect for
      return;
    }

    // Empty slot, and something's already waiting to be chosen — don't
    // pile a second batch of offers on top of the first.
    if (pendingSponsorOffers[kind] && pendingSponsorOffers[kind].length) return;

    // Actively searching (the player's own "Búsqueda activa de
    // patrocinador" button) takes priority over the organic streak —
    // if the team went looking, a hit here still ends the search,
    // whether or not this exact race also went well.
    if (searching[kind] && categoryKey && Math.random() < ACTIVE_SEARCH_CHANCE_PER_GP) {
      pendingSponsorOffers[kind] = [generateActiveSearchOffer(team, categoryKey, scale, kind, excludeNames)];
      searching[kind] = false;
      searchOfferSlots.push(kind);
      return;
    }

    const goodStreak = outcome === 1 ? (prospecting[kind] || 0) + 1 : (outcome === -1 ? 0 : (prospecting[kind] || 0));
    prospecting[kind] = goodStreak;
    if (goodStreak >= OPPORTUNITY_GRACE_STREAK) {
      const chance = clamp((goodStreak - (OPPORTUNITY_GRACE_STREAK - 1)) * OPPORTUNITY_CHANCE_PER_STREAK, 0, OPPORTUNITY_CHANCE_CAP);
      if (categoryKey && Math.random() < chance) {
        pendingSponsorOffers[kind] = generateSponsorOffers(team, categoryKey, scale, kind, excludeNames);
        prospecting[kind] = 0;
        newOfferSlots.push(kind);
      }
    }
  });

  return { team: { ...withSponsors, sponsors, pendingSponsorOffers, sponsorProspecting: prospecting, sponsorSearching: searching }, brokenSlots, newOfferSlots, searchOfferSlots };
}
