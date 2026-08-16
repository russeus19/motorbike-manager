import { RIDER_TIER_EXPECTED_RANK } from "../utils/teamExpectations.js";
import { clamp } from "../utils/random.js";

/**
 * MotoGP-only: the 3-tier customer-bike system real MotoGP runs on.
 * A manufacturer with 2 bikes in the category has both at "factory"
 * spec (its one works team); with 4, the works team stays "factory"
 * and its satellite team(s) run "customerTop"; with 6 (only Ducati,
 * currently, spread across three teams), the third team's pair runs
 * the older, frozen "previous" spec instead.
 *
 * The tier belongs to the SEAT within a team, not to whichever rider
 * currently fills it — a rider who moves between MotoGP teams doesn't
 * drag their old bike tier along with them, they simply inherit
 * whatever tier is attached to their new seat. `bikeTiers` below is a
 * parallel array to that team's own `riders` array in
 * data/teamsMotoGP.js (same order, same length) — bikeTiers[i]
 * describes riders[i]'s seat.
 *
 * DEFAULT_MOTOGP_BIKE_TIERS is the starting layout for a brand-new
 * save, matching real MotoGP's current lineup. It is NOT the live
 * source of truth once a game is running, though — the end-of-season
 * reassignment (reassignCustomerTopSeats, below) can move a seat
 * between customerTop and previous from one season to the next, so
 * the actual live layout lives in game state (App.jsx's
 * motogpSeatTiers) and gets threaded into every function below as
 * their `tiersMap` argument. Every function defaults tiersMap to
 * DEFAULT_MOTOGP_BIKE_TIERS when it's omitted, so any call site that
 * hasn't been updated to pass the live one yet still behaves exactly
 * as it did before this file supported reassignment at all — nothing
 * breaks by omission.
 *
 * All three dynamic pieces from PIECE 1's own design are now wired
 * in: the frozen "previous" snapshot, the 2-GP customerTop package
 * delay, and (as of this update) the end-of-season reassignment of
 * who actually holds each manufacturer's customerTop seats.
 */

export const MOTOGP_BIKE_TIER_LABELS = {
  factory: "Fábrica",
  customerTop: "Cliente-top",
  previous: "Año pasado",
};

/** Team name → parallel array of tiers, one per rider in that team's
 * own `riders` array (same order). Only MotoGP teams are listed —
 * every other category simply has no entry here, and bikeForSeat
 * falls back to that team's own plain `.bike` for them, unaffected by
 * any of this. This is the STARTING layout only — see this file's own
 * header comment for why the live one during an actual game lives in
 * App.jsx's state instead. */
export const DEFAULT_MOTOGP_BIKE_TIERS = {
  "Ducati Lenovo Team": ["factory", "factory"],
  "BK8 Gresini Racing MotoGP": ["customerTop", "previous"],
  "Pertamina Enduro VR46 Racing Team": ["customerTop", "previous"],
  "Aprilia Racing": ["factory", "factory"],
  "Trackhouse MotoGP Team": ["customerTop", "customerTop"],
  "Monster Energy Yamaha MotoGP": ["factory", "factory"],
  "Prima Pramac Yamaha MotoGP": ["customerTop", "customerTop"],
  "Red Bull KTM Factory Racing": ["factory", "factory"],
  "Red Bull KTM Tech3": ["customerTop", "customerTop"],
  "Honda HRC Castrol": ["factory", "factory"],
  "Honda LCR": ["customerTop", "customerTop"],
};

/** Starting "previous"-tier bike average per manufacturer, for the
 * very first season only — before any real end-of-season snapshot
 * exists (see snapshotFactoryBikes below), this is what every
 * "previous"-tier seat of that manufacturer shows, uniformly across
 * all 5 areas. Bug fixed: this used to be computed as each TEAM's OWN
 * customerTop-tier bike minus a flat gap — since Gresini and VR46
 * never had identical bike values to begin with (a leftover from
 * before this whole tier system existed), Aldeguer and Morbidelli
 * ended up on two different "previous" bikes despite being on the
 * exact same tier of the exact same manufacturer. A fixed,
 * manufacturer-wide starting average fixes that at the source — only
 * manufacturers that actually have a "previous" tier in play need an
 * entry here. */
const STARTING_PREVIOUS_TIER_AVG = {
  Ducati: 84,
};

/** This rider's seat tier within their MotoGP team, or null for a
 * team/category this system doesn't apply to. riderIndex is the
 * rider's own position in team.riders (0 or 1) — pass it directly
 * rather than re-deriving it, since callers that already have the
 * rider object usually got it via team.riders[i] in the first place. */
export function bikeTierForSeat(team, riderIndex, categoryKey, tiersMap = DEFAULT_MOTOGP_BIKE_TIERS) {
  if (categoryKey !== "motogp") return null;
  const tiers = tiersMap[team?.name];
  return tiers?.[riderIndex] ?? null;
}

/** The effective bike attributes for one specific seat — factory
 * tier just returns the team's own `.bike` untouched (the works team
 * IS the manufacturer's real, live bike); customerTop also returns
 * the live bike (the 2-GP-delayed packages arrive as ordinary
 * pendingPackages on the customerTop team itself — see
 * advanceMotoGpCustomerQueue below — so by the time they're
 * installed, team.bike already reflects them, no separate resolution
 * needed here); previous returns the frozen snapshot taken at the
 * close of last season (previousBikes, keyed by manufacturer — see
 * snapshotFactoryBikes) if one exists yet, or — for the very first
 * season, when none can possibly exist — the fixed starting average
 * from STARTING_PREVIOUS_TIER_AVG, uniform across all 5 areas so
 * every "previous" seat of that manufacturer genuinely starts
 * identical, regardless of which team it's attached to. Any category
 * besides MotoGP, or a team with no tier entry, just gets its own
 * `.bike` back unchanged. */
export function bikeForSeat(team, riderIndex, categoryKey, previousBikes, tiersMap = DEFAULT_MOTOGP_BIKE_TIERS) {
  const tier = bikeTierForSeat(team, riderIndex, categoryKey, tiersMap);
  if (!tier || tier === "factory" || tier === "customerTop") return team.bike;
  const snapshot = previousBikes?.[team.manufacturer];
  if (snapshot) {
    // Bug fixed: a "previous"-tier bike used to inherit the factory
    // snapshot's exact value — meaning if factory had a great season
    // and grew to, say, 93, "previous" showed 93 too, sometimes
    // ending up HIGHER than the current customerTop bike. A bike a
    // full season out of date is meaningfully behind by definition —
    // it's already obsolete tech, not last year's peak frozen in
    // amber — so a flat 10% comes off every attribute here, every
    // season, not just at the very first one.
    const out = {};
    Object.entries(snapshot).forEach(([k, v]) => { out[k] = Math.max(1, Math.round(v * 0.9)); });
    return out;
  }
  const startingAvg = STARTING_PREVIOUS_TIER_AVG[team.manufacturer] ?? 70;
  const out = {};
  Object.keys(team.bike).forEach((k) => { out[k] = startingAvg; });
  return out;
}

/** Called once per season transition, right before the new season's
 * bikes replace the old ones — takes a fresh reading of every MotoGP
 * manufacturer's factory bike exactly as it stood at the close of the
 * season that just ended, for next season's "previous"-tier seats to
 * read from. `allTeams` should be every MotoGP team across player +
 * rivals (+ otherCategories.motogp if MotoGP isn't the played
 * category), post-rollover. */
export function snapshotFactoryBikes(allTeams, tiersMap = DEFAULT_MOTOGP_BIKE_TIERS) {
  const out = {};
  (allTeams || []).forEach((team) => {
    const tiers = tiersMap[team?.name];
    if (tiers?.every((t) => t === "factory") && team.manufacturer) out[team.manufacturer] = team.bike;
  });
  return out;
}

/** Whether this team's two seats actually differ in tier — the
 * signal BikeHero uses to decide between showing one shared bike or
 * two separate ones side by side (a satellite team split across
 * customerTop/previous, like Gresini or VR46). */
export function teamHasSplitBikeTiers(team, categoryKey, tiersMap = DEFAULT_MOTOGP_BIKE_TIERS) {
  if (categoryKey !== "motogp") return false;
  const tiers = tiersMap[team?.name];
  if (!tiers || tiers.length < 2) return false;
  return tiers[0] !== tiers[1];
}

/** The manufacturer's own works team in this category — the source
 * of truth for "the live factory bike" that customerTop/previous are
 * both computed from. */
export function factoryTeamFor(manufacturer, categoryKey, allTeams, tiersMap = DEFAULT_MOTOGP_BIKE_TIERS) {
  if (categoryKey !== "motogp") return null;
  return (allTeams || []).find((t) => t.manufacturer === manufacturer && tiersMap[t.name]?.every((tier) => tier === "factory")) || null;
}

/** True for a MotoGP team whose seats are ALL customerTop/previous —
 * a genuine satellite outfit with no factory seat at all (Gresini,
 * VR46, Trackhouse, Tech3, LCR, Pramac). Used to dampen that team's
 * own seasonal rolloverBike (see utils/bikeDevelopment.js's own
 * devScaleOverride) down to a small symbolic margin — its real
 * improvement is meant to come from the manufacturer's delayed
 * packages, not from running full independent R&D on infrastructure
 * a satellite team was never given to begin with. */
/** Every manufacturer only ever has exactly this many customerTop-spec
 * bikes to hand out — 2, full stop, whether that's split across two
 * separate 1-seat satellite teams (Ducati's Gresini/VR46) or held
 * entirely by one 2-seat satellite (everyone else's single satellite
 * team). Never more, never fewer, regardless of how many satellite
 * TEAMS a manufacturer happens to be running. */
export const MOTOGP_CUSTOMER_TOP_CAPACITY = 2;

/** How many customerTop seats a manufacturer has ALREADY committed to
 * delivering — via a still-standing "pedir moto cliente-top" success
 * (manufacturerFavorNextSeason) or a still-pending "sondear otras
 * marcas" switch offer (pendingManufacturerOffer) — counted across
 * every team of that manufacturer except the one optionally excluded
 * (the team currently asking for a NEW commitment of its own, so its
 * own not-yet-granted request never counts against itself).
 *
 * This is what lets a brand-new promise get correctly refused, or
 * capped, BEFORE it's ever made — a manufacturer that's already
 * committed both its customerTop bikes elsewhere this season simply
 * has nothing left to offer, and both computeManufacturerRequestScore
 * ("pedir moto cliente-top") and manufacturerBikeOffer ("sondear
 * otras marcas") check this before promising anything, rather than
 * creating a conflict a season transition would later have to resolve
 * by quietly breaking one of the two promises. reassignCustomerTopSeats
 * itself still keeps a hard, non-negotiable cap at
 * MOTOGP_CUSTOMER_TOP_CAPACITY as a last-resort safety net — but the
 * real fix is never letting the conflict arise in the first place. */
export function committedCustomerTopCount(manufacturer, allTeams, excludeTeamName) {
  let count = 0;
  (allTeams || []).forEach((team) => {
    if (team.manufacturer !== manufacturer || team.name === excludeTeamName) return;
    if (team.manufacturerFavorNextSeason) count += 1;
    if (team.pendingManufacturerOffer) count += team.pendingManufacturerOffer.filter((t) => t === "customerTop").length;
  });
  return Math.min(count, MOTOGP_CUSTOMER_TOP_CAPACITY);
}

export function isRestrictedMotoGpSatellite(team, categoryKey, tiersMap = DEFAULT_MOTOGP_BIKE_TIERS) {
  if (categoryKey !== "motogp") return false;
  const tiers = tiersMap[team?.name];
  if (!tiers || !tiers.length) return false;
  return !tiers.includes("factory");
}

/** How much of the normal rolloverBike formula a MotoGP team should
 * actually run at, based on isRestrictedMotoGpSatellite above — a
 * small symbolic fraction for a genuine satellite, undefined (meaning
 * "let rolloverBike apply its own normal default") for a factory team
 * or anything outside MotoGP. Exists so App.jsx's three rolloverBike
 * call sites (player, rivals, background categories) don't each need
 * to re-derive this same small piece of logic. */
/** Bug fixed (feature): 0.12 was still a REAL, if small, amount of
 * independent drift — meaning two teams on the exact same tier of the
 * exact same manufacturer, having accepted the exact same packages,
 * could still end up with visibly different bikes purely because
 * their own Factory/Staff levels (which every team keeps regardless
 * of MotoGP tier) differed. That's precisely backwards: a customerTop
 * or previous team's bike isn't supposed to depend on anything about
 * THEIR OWN infrastructure at all — the whole design is "the
 * manufacturer decides, you just adapt to what you're given". Scaled
 * all the way to 0 instead: rolloverBike's own target-chasing,
 * investment bonus, and bad-offseason risk all multiply out to
 * nothing, so these teams' bikes now change ONLY through installing
 * (or declining) an actual delivered/frozen-snapshot package —
 * nothing drifts on its own, up or down, ever. */
export function motoGpDevScaleFor(team, categoryKey, tiersMap = DEFAULT_MOTOGP_BIKE_TIERS) {
  return isRestrictedMotoGpSatellite(team, categoryKey, tiersMap) ? 0 : undefined;
}

function allMotoGpTeams(playerTeam, rivalTeams, otherCategories, category) {
  if (category === "motogp") return [playerTeam, ...rivalTeams];
  return otherCategories?.motogp?.teams || [];
}

function putMotoGpTeamsBack(updatedTeams, playerTeam, rivalTeams, otherCategories, category) {
  const byId = new Map(updatedTeams.map((t) => [t.id, t]));
  if (category === "motogp") {
    return {
      playerTeam: byId.get(playerTeam.id) || playerTeam,
      rivalTeams: rivalTeams.map((t) => byId.get(t.id) || t),
      otherCategories,
    };
  }
  if (!otherCategories?.motogp) return { playerTeam, rivalTeams, otherCategories };
  return {
    playerTeam, rivalTeams,
    otherCategories: { ...otherCategories, motogp: { ...otherCategories.motogp, teams: otherCategories.motogp.teams.map((t) => byId.get(t.id) || t) } },
  };
}

/**
 * The real 2-GP delay: called once per week (from both the active
 * race-week and the rest-week paths in App.jsx, right before their
 * own final setGame), this does two things in one pass over every
 * MotoGP team:
 *
 *   1. Looks at each FACTORY team's own pendingPackages for any whose
 *      id isn't already tracked in manufacturerCustomerQueue, and
 *      enqueues it there with dueRound = currentRound + 2.
 *   2. For every queued entry whose dueRound has now arrived, clones
 *      it directly onto EVERY customerTop team of that
 *      manufacturer's own pendingPackages array, in the exact same
 *      shape advanceTeamProjects itself produces, so the entire
 *      existing accept/discard/apply pipeline handles it unchanged.
 *
 * Pure and side-effect free — returns updated
 * { playerTeam, rivalTeams, otherCategories, manufacturerCustomerQueue }.
 */
export function advanceMotoGpCustomerQueue(playerTeam, rivalTeams, otherCategories, category, round, manufacturerCustomerQueue, tiersMap = DEFAULT_MOTOGP_BIKE_TIERS, notifQueue) {
  const teams = allMotoGpTeams(playerTeam, rivalTeams, otherCategories, category);
  if (!teams.length) return { playerTeam, rivalTeams, otherCategories, manufacturerCustomerQueue };

  const queue = {};
  Object.entries(manufacturerCustomerQueue || {}).forEach(([mfr, entries]) => { queue[mfr] = [...entries]; });

  const knownIds = new Set(Object.values(queue).flat().map((e) => e.sourceId));
  teams.forEach((team) => {
    const tiers = tiersMap[team.name];
    if (!tiers?.every((t) => t === "factory") || !team.manufacturer) return;
    (team.pendingPackages || []).forEach((pkg) => {
      if (knownIds.has(pkg.id)) return;
      queue[team.manufacturer] = [...(queue[team.manufacturer] || []), {
        sourceId: pkg.id, area: pkg.area, gain: pkg.gain, tier: pkg.tier,
        downsideArea: pkg.downsideArea, downsideAmount: pkg.downsideAmount,
        dueRound: round + 2,
      }];
    });
  });

  const deliveries = {};
  Object.entries(queue).forEach(([mfr, entries]) => {
    const due = entries.filter((e) => e.dueRound <= round);
    if (!due.length) return;
    queue[mfr] = entries.filter((e) => e.dueRound > round);
    teams.forEach((team) => {
      const tiers = tiersMap[team.name];
      if (team.manufacturer !== mfr || !tiers?.includes("customerTop")) return;
      due.forEach((e) => {
        (deliveries[team.id] ||= []).push({
          id: `pkg-${e.area}-${Date.now()}-${Math.round(Math.random() * 100000)}`,
          area: e.area, gain: e.gain, tier: e.tier,
          downsideArea: e.downsideArea, downsideAmount: e.downsideAmount,
        });
      });
    });
  });

  // Bug fixed: a delivered package used to land silently in
  // pendingPackages with no notification at all — nothing ever told
  // the player one had actually arrived. A customerTop team's bike
  // has no other real source of improvement (its own seasonal
  // rolloverBike is deliberately damped down to a small symbolic
  // margin — see utils/bikeDevelopment.js's own devScaleOverride
  // comment), so a package sitting unreviewed for season after season
  // meant the player's own bike just organically drifted down from
  // its own team's modest Factory/Staff while gaining nothing to
  // offset it, even though the AI on the OTHER customerTop team of
  // the same manufacturer was accepting its own packages the whole
  // time via aiDecidePendingPackages and pulling steadily ahead.
  if (notifQueue && deliveries[playerTeam.id]?.length) {
    deliveries[playerTeam.id].forEach((pkg) => {
      notifQueue.push({
        type: "dev", category,
        text: `${playerTeam.manufacturer} os ha hecho llegar un paquete de ${pkg.area} — revisadlo en Desarrollo e investigación antes de que se quede sin usar.`,
      });
    });
  }

  const updatedTeams = teams.map((team) => (
    deliveries[team.id] ? { ...team, pendingPackages: [...(team.pendingPackages || []), ...deliveries[team.id]] } : team
  ));
  const putBack = putMotoGpTeamsBack(updatedTeams, playerTeam, rivalTeams, otherCategories, category);
  return { ...putBack, manufacturerCustomerQueue: queue };
}

/**
 * End-of-season: within each manufacturer that actually has a
 * "previous" tier in play (only Ducati today, spread across 3 teams —
 * a manufacturer with just one satellite team's worth of customerTop
 * seats has no "previous" seat to contest FOR, so nothing to
 * reassign there), every non-factory seat's rider is scored on:
 *   - Season points (riderStandings) — raw performance.
 *   - How far they finished from their own individual pre-season
 *     expectation tier (rider.expectation, set by
 *     assignSeasonExpectations — see RIDER_TIER_EXPECTED_RANK)
 *     against where they actually ranked in the full standings —
 *     exceeding it scores positively, missing it negatively.
 *   - Prestige, at a smaller weight than the other two — a proven
 *     name gets some benefit of the doubt, but a strong season still
 *     matters more than reputation alone.
 * The top-scoring riders (as many as that manufacturer actually has
 * customerTop seats) take those seats next season; everyone else in
 * the pool gets "previous". Factory seats are never touched — they
 * aren't part of this competition at all.
 *
 * Called once, right after rolloverBike has produced next season's
 * bikes (order matters: reassignment decides who's ON the
 * customerTop/previous tier, but doesn't change what those tiers
 * actually contain — that's rolloverBike's job, already done by the
 * time this runs). Returns a new tiersMap (same shape as
 * DEFAULT_MOTOGP_BIKE_TIERS) — everything not touched by a
 * reassignment is carried over unchanged from the one passed in.
 */
/**
 * Bug fixed (feature): a seat freshly promoted to customerTop used to
 * just keep whatever bike it already had — if it came from "previous"
 * (a frozen, deliberately-behind spec) or from a totally different
 * manufacturer (a fresh switchManufacturer arrival, still carrying
 * its OLD marca's numbers), that stale bike stuck around indefinitely
 * instead of actually becoming "the current customerTop spec". Two
 * customerTop teams of the same manufacturer could end up on visibly
 * different bikes for no reason a player could see or influence.
 *
 * Returns { nextTiers, bikeUpdates } now — bikeUpdates is
 * { teamName: newBikeObject }, one entry per team whose seat(s) just
 * gained customerTop status for the first time this pass (never for
 * a team that already held it, so an established customerTop team's
 * OWN packages/history are never overwritten). The synced value is
 * the manufacturer's own factory team's current bike — the real
 * reference point customerTop is always meant to track. Callers
 * apply nextTiers via setMotogpSeatTiers as before, and additionally
 * write bikeUpdates onto the matching team objects.
 */
/**
 * Bug fixed (feature): the bike sync used to live entirely inside the
 * competitive-reassignment loop below, which itself only ever
 * processes manufacturers with a genuine "previous" tier in play
 * (only Ducati today — see candidateSeatsByManufacturer's own early
 * return for a manufacturer with none). That meant a 4-bike
 * manufacturer's own customerTop team (KTM Tech3, Trackhouse, Honda
 * LCR, Pramac) never went through this function AT ALL, ever — there
 * was no competition to resolve for them, so nothing ever synced
 * their bike back to their own factory's, season after season. Once
 * a customerTop team fell behind (packages arriving but sitting
 * unreviewed, or simply not enough of them completing that season),
 * the gap only ever widened, with no season boundary ever correcting
 * it — exactly the "quedó en 82 mientras la fábrica llegó a 93, sin
 * que ningún inicio de temporada los igualara" symptom this was
 * built to fix. Every customerTop seat, for every manufacturer,
 * regardless of whether that manufacturer has any real competition
 * for the tier at all, now gets synced to its own factory's CURRENT
 * bike at every season transition — the mid-season 2-GP delayed
 * package delivery still gives an early, decline-able preview of
 * upcoming changes, but the season boundary itself is the real
 * backstop that keeps a customerTop bike from ever drifting away
 * from what it's actually supposed to represent.
 */
function syncAllCustomerTopBikes(tiersMap, allTeams) {
  const bikeUpdates = {};
  (allTeams || []).forEach((team) => {
    const tiers = tiersMap[team.name];
    if (!tiers?.includes("customerTop") || !team.manufacturer) return;
    const factoryTeam = (allTeams || []).find((t) => t.manufacturer === team.manufacturer && tiersMap[t.name]?.every((tier) => tier === "factory"));
    if (factoryTeam) bikeUpdates[team.name] = factoryTeam.bike;
  });
  return bikeUpdates;
}

export function reassignCustomerTopSeats(tiersMap, allTeams, riderStandings) {
  const nextTiers = {};
  Object.entries(tiersMap).forEach(([name, tiers]) => { nextTiers[name] = [...tiers]; });

  const byManufacturer = candidateSeatsByManufacturer(tiersMap, allTeams, riderStandings);
  Object.entries(byManufacturer).forEach(([manufacturer, scored]) => {
    if (!scored.length) return;
    const customerTopSlots = scored[0].customerTopSlots;
    // Bug fixed: a manufacturer only ever has customerTopSlots real
    // customerTop bikes to hand out — that cap is never negotiable,
    // no matter how many separate "guaranteed" seats a season somehow
    // produced. The real fix for two genuine promises colliding lives
    // upstream now (committedCustomerTopCount gates both
    // computeManufacturerRequestScore's "pedir moto cliente-top" and
    // manufacturerBikeOffer's "sondear otras marcas" BEFORE either one
    // is ever granted, so a manufacturer that's already spoken for
    // both its bikes simply can't promise a third) — this stays a
    // last-resort safety net only: if a genuine conflict somehow still
    // reaches this point, guaranteed seats are still sorted ahead of
    // competitive ones (see candidateSeatsByManufacturer's own
    // comment), but the cutoff itself never moves past the real slot
    // count, so real merit decides between the two colliding
    // guarantees rather than both simply being honored at the expense
    // of the invariant.
    scored.forEach((s, i) => {
      const tier = i < customerTopSlots ? "customerTop" : "previous";
      nextTiers[s.teamName] = nextTiers[s.teamName].map((t, idx) => (idx === s.seatIndex ? tier : t));
    });
  });

  // Bike syncing is now entirely decoupled from the competitive
  // reassignment above — computed against nextTiers (the layout AFTER
  // this season's competition is resolved), so it correctly covers
  // every customerTop seat regardless of whether its manufacturer had
  // any "previous"-tier competition to resolve in the first place.
  const bikeUpdates = syncAllCustomerTopBikes(nextTiers, allTeams);

  return { nextTiers, bikeUpdates };
}

/**
 * The scoring reassignCustomerTopSeats itself runs, exposed as its
 * own reusable step — one manufacturer -> its own candidate seats
 * (every non-factory seat across its teams), sorted best-first,
 * already carrying customerTopSlots (how many of them actually win
 * customerTop) on every entry. Used both by reassignCustomerTopSeats
 * above (the always-on automatic default, mainly there for AI-run
 * factory teams) and by SeatSelectionScreen.jsx (letting a player who
 * controls the factory itself review or override that same
 * recommendation instead of it happening silently). Manufacturers
 * with no "previous" tier in play at all (nothing to contest — see
 * this file's own header comment on why 4-bike manufacturers never
 * have this) are simply absent from the result. */
export function candidateSeatsByManufacturer(tiersMap, allTeams, riderStandings) {
  const ranked = Object.entries(riderStandings || {}).sort((a, b) => (b[1]?.points ?? 0) - (a[1]?.points ?? 0));
  const actualRankById = {};
  ranked.forEach(([id], i) => { actualRankById[id] = i + 1; });

  const byManufacturer = {};
  (allTeams || []).forEach((team) => {
    if (!tiersMap[team.name] || !team.manufacturer) return;
    (byManufacturer[team.manufacturer] ||= []).push(team);
  });

  const result = {};
  Object.entries(byManufacturer).forEach(([manufacturer, teams]) => {
    const candidateSeats = [];
    teams.forEach((team) => {
      tiersMap[team.name].forEach((tier, i) => {
        if (tier !== "factory") candidateSeats.push({ teamName: team.name, seatIndex: i, rider: team.riders?.[i] || null, tier });
      });
    });
    if (!candidateSeats.some((s) => s.tier === "previous")) return;

    const customerTopSlots = candidateSeats.filter((s) => s.tier === "customerTop").length;
    const scored = candidateSeats.map((s) => {
      const r = s.rider;
      const teamObj = teams.find((t) => t.name === s.teamName);
      // Bug fixed (feature): a successful "pedir la moto cliente-top"
      // request, a new signing promised a specific seat tier, and a
      // manufacturer switch's own committed offer (see
      // applyManufacturerRequestSuccess / App.jsx's own
      // motogpSeatTierPromises / applyPendingManufacturerSwitch) each
      // used to just be a very large score bonus (+100000) — which
      // worked fine when only ONE such promise existed for a
      // manufacturer in a given transition, but if the OTHER
      // satellite ALSO had one active the same season (its own
      // successful "pedir moto cliente-top", say), the two ended up
      // competing against EACH OTHER on real merit as a tiebreaker —
      // a genuine, explicit promise could still lose to a different
      // genuine, explicit promise, which is exactly backwards: a
      // promise the player was shown and acted on should never be
      // something the game quietly walks back based on who happened
      // to score higher. `guaranteed` marks any of these three, and
      // the sort below puts every guaranteed seat strictly ahead of
      // every non-guaranteed one, no matter its score — ties between
      // two guarantees don't matter, since reassignCustomerTopSeats'
      // own cutoff (see its comment) now always makes room for all of
      // them.
      const guaranteed = Boolean(
        (r && s.tier === "previous" && teamObj?.manufacturerFavorNextSeason) ||
        (r && r.isNewTeamThisSeason && s.tier === "customerTop") ||
        (teamObj?.pendingManufacturerOffer?.[s.seatIndex] === "customerTop")
      );
      if (!r) return { ...s, score: -Infinity, customerTopSlots, guaranteed };
      const points = riderStandings?.[r.id]?.points ?? 0;
      const prestige = r.prestige ?? 0;
      let expectationScore = 0;
      const expectedRank = r.expectation ? RIDER_TIER_EXPECTED_RANK[r.expectation] : null;
      if (expectedRank && actualRankById[r.id]) expectationScore = (expectedRank - actualRankById[r.id]) * 2;
      let score = points + prestige * 0.3 + expectationScore;
      // A team arriving via a successful "sondear otras marcas" (see
      // utils/manufacturerNegotiation.js's own
      // applyPendingManufacturerSwitch) starts this same pass with
      // both seats seeded at "previous", same as anyone else — but
      // unlike a total newcomer, it's arriving with a real, already-
      // established team prestige earned elsewhere. That's worth a
      // genuine edge in THIS competition, not a guaranteed win — a
      // real but bounded nod to "this team didn't just appear from
      // nowhere", scaled by how much team prestige they actually
      // brought with them.
      if (teamObj?.justSwitchedManufacturer) score += clamp((teamObj.prestige ?? 0) * 0.4, 0, 90);
      return { ...s, score, customerTopSlots, guaranteed };
    });
    scored.sort((a, b) => {
      if (a.guaranteed !== b.guaranteed) return a.guaranteed ? -1 : 1;
      return b.score - a.score;
    });
    result[manufacturer] = scored;
  });
  return result;
}
