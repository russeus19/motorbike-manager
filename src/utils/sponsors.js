import { clamp, randInt } from "./random.js";
import { categoryPrestigeRange } from "../data/categoryPrestigeConfig.js";
import { INITIAL_SPONSORS_BY_TEAM_NAME } from "../data/initialSponsors.js";

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

export const SPONSOR_TIERS = ["Regional", "Nacional", "Internacional", "Élite"];

const TIER_PAYOUT_RANGE = {
  Regional: [12000, 25000],
  Nacional: [25000, 45000],
  Internacional: [45000, 75000],
  "Élite": [75000, 120000],
};

// A secondary sponsor is a smaller deal by nature — same tier ladder,
// capped below the top tier, and paying less than a main sponsor of the
// same tier would.
const SECONDARY_MAX_TIER_INDEX = 2; // "Internacional" — never "Élite"
const SECONDARY_PAYOUT_FACTOR = 0.55;

// Every sponsor also pays a small bonus per point scored that GP, on top
// of the flat fee — expressed as a fraction of that same flat fee, so it
// scales the same way across tiers and categories without a second
// separate table. 0.02 means a MotoGP win (25 points) roughly adds half
// of the flat fee on top; a single point in the lower half of the grid
// barely moves the needle, exactly like a real bonus clause would feel.
const POINTS_BONUS_RATE = 0.02;

// Fictional names, used as the baseline for every category.
const FICTIONAL_SPONSOR_NAMES = [
  "Titan Lubricantes", "NordTech Racing", "Velocity Energy", "Halcón Componentes",
  "Bravia Seguros", "Kinetic Neumáticos", "Solaris Combustibles", "Ferrox Acero",
  "Aurea Bank", "Vantage Telecom", "Rapton Motor Oil", "Cresta Aerospace",
  "Ignis Energía", "Meridian Finanzas", "Torque Industrial", "Zenit Bebidas",
  "Onyx Composites", "Praxis Logística", "Skyline Aviación", "Dynamo Textil",
];

// A sponsor already backing a real team in one category (MotoGP, Moto2,
// whichever gets added to data/initialSponsors.js next) is a real,
// paddock-active brand — plausible enough to also show up as a
// candidate offer for a team in any OTHER category, same as a real
// title sponsor might extend into a feeder class. Derived straight from
// that same seeding table instead of a second hand-kept list, so it
// grows automatically the moment Moto3/WorldSBK/WorldSSP get their own
// entries there — nothing else needs to change.
const REAL_SPONSOR_NAMES = [...new Set(
  Object.values(INITIAL_SPONSORS_BY_TEAM_NAME).flatMap((e) => [e.main, e.secondary]).filter(Boolean)
)];

const SPONSOR_NAME_POOL = [...FICTIONAL_SPONSOR_NAMES, ...REAL_SPONSOR_NAMES];

function randomSponsorName(usedNames) {
  const pool = SPONSOR_NAME_POOL.filter((n) => !usedNames.includes(n));
  const list = pool.length ? pool : SPONSOR_NAME_POOL;
  return list[randInt(0, list.length - 1)];
}

/** Fills in `sponsors`/`pendingSponsorOffers` for a team that doesn't
 * have them yet (old save, or a team seen for the first time) — never
 * overwrites anything that already exists. Mirrors ensureRD/ensureTeamPrestige's
 * "migrate, don't recompute" approach. */
export function ensureSponsors(team) {
  if (team.sponsors && team.pendingSponsorOffers !== undefined) return team;
  return {
    ...team,
    sponsors: team.sponsors || { main: null, secondary: null },
    pendingSponsorOffers: team.pendingSponsorOffers || { main: null, secondary: null },
  };
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

  const overallMin = TIER_PAYOUT_RANGE[SPONSOR_TIERS[0]][0];
  const cap = kind === "secondary" ? SECONDARY_MAX_TIER_INDEX : SPONSOR_TIERS.length - 1;
  const overallMax = TIER_PAYOUT_RANGE[SPONSOR_TIERS[cap]][1];
  const factor = kind === "secondary" ? SECONDARY_PAYOUT_FACTOR : 1;

  const rawPayout = overallMin + (overallMax - overallMin) * worthiness;
  const payoutPerGp = Math.round(rawPayout * factor * (scale || 1));
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
 * data/initialSponsors.js#INITIAL_SPONSORS_BY_TEAM_NAME and, for
 * whichever slot(s) have a real name there, signs it using
 * `estimateCurrentSponsorPayout` against the team's actual, current
 * prestige/expectation. A team not in that table, or with a slot
 * marked `null`, just starts with that slot empty — normal behavior,
 * filled the usual way at the next season-end transition. Contract
 * length is randomized (1-3 seasons) so every real team's deal doesn't
 * happen to run out in the very same season. */
export function seedInitialSponsors(team, categoryKey, scale) {
  if (team.sponsors) return team; // already has sponsors — not a fresh team, leave it alone
  const entry = INITIAL_SPONSORS_BY_TEAM_NAME[team.name];
  const sponsors = { main: null, secondary: null };
  if (entry) {
    ["main", "secondary"].forEach((kind) => {
      const name = entry[kind];
      if (!name) return;
      const { tier, payoutPerGp, bonusPerPoint } = estimateCurrentSponsorPayout(team, categoryKey, scale, kind);
      sponsors[kind] = { id: `${kind}_seed_${team.id}`, name, tier, payoutPerGp, bonusPerPoint, yearsLeft: randInt(1, 3), scorelessStreak: 0 };
    });
  }
  return { ...team, sponsors, pendingSponsorOffers: { main: null, secondary: null } };
}


function eligibleTierIndices(appeal, kind) {
  const centerIdx = clamp(Math.round(appeal * (SPONSOR_TIERS.length - 1)), 0, SPONSOR_TIERS.length - 1);
  const cap = kind === "secondary" ? SECONDARY_MAX_TIER_INDEX : SPONSOR_TIERS.length - 1;
  const set = new Set();
  [centerIdx - 1, centerIdx, centerIdx + 1].forEach((i) => {
    if (i >= 0 && i <= cap) set.add(i);
  });
  if (set.size === 0) set.add(0);
  return [...set].sort((a, b) => a - b);
}

/** 2-3 candidate offers for a slot, drawn from the tiers this team's
 * current appeal can realistically reach (plus, occasionally, one tier
 * above as a reach option and one below as a safe option). `scale`
 * keeps the euro amounts sensible per category, exactly like every
 * other cost/income figure in the game. */
export function generateSponsorOffers(team, categoryKey, scale, kind) {
  const appeal = teamSponsorAppeal(team, categoryKey);
  const tierIdxs = eligibleTierIndices(appeal, kind);
  const usedNames = [];
  const offers = tierIdxs.map((idx) => {
    const tier = SPONSOR_TIERS[idx];
    const [lo, hi] = TIER_PAYOUT_RANGE[tier];
    const factor = kind === "secondary" ? SECONDARY_PAYOUT_FACTOR : 1;
    const payoutPerGp = Math.round(randInt(lo, hi) * factor * (scale || 1));
    const bonusPerPoint = Math.round(payoutPerGp * POINTS_BONUS_RATE);
    const years = randInt(1, 3);
    const name = randomSponsorName(usedNames);
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

/** Season-end pass: age every active contract down a year. Anything
 * that just ran out — or was already empty — gets fresh candidate
 * offers queued in `pendingSponsorOffers`, ready for the player to pick
 * from (or for `resolveAiSponsorOffers` to auto-resolve for every other
 * team). Never touches a slot that still has years left on its deal. */
export function advanceSponsorContractsForSeasonEnd(team, categoryKey, scale) {
  const withSponsors = ensureSponsors(team);
  const sponsors = { ...withSponsors.sponsors };
  const pendingSponsorOffers = { ...withSponsors.pendingSponsorOffers };
  ["main", "secondary"].forEach((kind) => {
    const s = sponsors[kind];
    if (s) {
      const yearsLeft = s.yearsLeft - 1;
      if (yearsLeft > 0) {
        sponsors[kind] = { ...s, yearsLeft };
        return;
      }
      sponsors[kind] = null; // contract ran out
    }
    // Empty slot (just expired, or never filled) — queue fresh offers.
    pendingSponsorOffers[kind] = generateSponsorOffers({ ...withSponsors, sponsors }, categoryKey, scale, kind);
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
   to race: scoring nothing, race after race. A short cold streak is
   normal and risks nothing; several in a row starts to matter, and the
   risk climbs the longer it goes on. Resets the instant the team scores
   again, so one bad patch doesn't haunt a contract for the rest of the
   year. */
const BREAK_CLAUSE_GRACE_STREAK = 3; // no risk at all before this many scoreless races in a row
const BREAK_CLAUSE_CHANCE_PER_STREAK = 0.05;
const BREAK_CLAUSE_CHANCE_CAP = 0.35;

/* The mirror image, for an EMPTY slot: sponsors don't only watch for
   this from the outside once a year either. A team scoring race after
   race with no sponsor in a slot starts attracting real mid-season
   interest, not just a shot at renewal once the season's already over.
   Same shape as the break clause (grace streak, then a climbing
   chance), just measuring good races instead of bad ones, and
   producing fresh offers instead of tearing a contract up. Never piles
   offers on top of ones already waiting to be picked. */
const OPPORTUNITY_GRACE_STREAK = 3; // no chance at all before this many scoring races in a row
const OPPORTUNITY_CHANCE_PER_STREAK = 0.05;
const OPPORTUNITY_CHANCE_CAP = 0.3;

export function applySponsorRaceResult(team, teamScoredPointsThisRace, categoryKey, scale) {
  const withSponsors = ensureSponsors(team);
  const sponsors = { ...withSponsors.sponsors };
  const pendingSponsorOffers = { ...(withSponsors.pendingSponsorOffers || { main: null, secondary: null }) };
  const prospecting = { ...(withSponsors.sponsorProspecting || { main: 0, secondary: 0 }) };
  const brokenSlots = [];
  const newOfferSlots = [];

  ["main", "secondary"].forEach((kind) => {
    const s = sponsors[kind];
    if (s) {
      const streak = teamScoredPointsThisRace ? 0 : (s.scorelessStreak || 0) + 1;
      if (streak >= BREAK_CLAUSE_GRACE_STREAK) {
        const chance = clamp((streak - (BREAK_CLAUSE_GRACE_STREAK - 1)) * BREAK_CLAUSE_CHANCE_PER_STREAK, 0, BREAK_CLAUSE_CHANCE_CAP);
        if (Math.random() < chance) {
          sponsors[kind] = null;
          brokenSlots.push({ kind, name: s.name });
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

    const goodStreak = teamScoredPointsThisRace ? (prospecting[kind] || 0) + 1 : 0;
    prospecting[kind] = goodStreak;
    if (goodStreak >= OPPORTUNITY_GRACE_STREAK) {
      const chance = clamp((goodStreak - (OPPORTUNITY_GRACE_STREAK - 1)) * OPPORTUNITY_CHANCE_PER_STREAK, 0, OPPORTUNITY_CHANCE_CAP);
      if (categoryKey && Math.random() < chance) {
        pendingSponsorOffers[kind] = generateSponsorOffers(team, categoryKey, scale, kind);
        prospecting[kind] = 0;
        newOfferSlots.push(kind);
      }
    }
  });

  return { team: { ...withSponsors, sponsors, pendingSponsorOffers, sponsorProspecting: prospecting }, brokenSlots, newOfferSlots };
}
