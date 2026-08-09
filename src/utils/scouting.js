import { clamp, randInt, pick } from "./random.js";
import { overallRating } from "./riders.js";

/**
 * The Sporting Director system: hides a rider's potential, morale, and
 * attribute spread from the player until scouted, exactly like a real
 * team wouldn't know a prospect's true ceiling without doing the work.
 * Mirrors Factory/Staff in every mechanical way (a 0-99 level the
 * player upgrades with money and time) so it costs nothing new to
 * learn — the only real addition is what the level actually unlocks:
 * scout slots, report speed, and how tightly a report narrows down
 * the truth.
 *
 * team.sportingDirector = { level, upgrading }             — same shape as factory/staff
 * team.scoutingMissions = [{ riderId, categoryKey, weeksRemaining, totalWeeks }]
 * team.scoutReports = { [riderId]: { potentialRange: [lo, hi], reportsCount,
 *                                     moraleValue, moraleSeason, assessment: [text] } }
 */

export const SPORTING_DIRECTOR_TIERS = [
  { name: "Muy bajo", min: 0, max: 19, slots: 1, weeksPerReport: 6, initialHalfWidth: 20 },
  { name: "Bajo", min: 20, max: 39, slots: 2, weeksPerReport: 5, initialHalfWidth: 15 },
  { name: "Normal", min: 40, max: 59, slots: 3, weeksPerReport: 4, initialHalfWidth: 11 },
  { name: "Alto", min: 60, max: 79, slots: 4, weeksPerReport: 3, initialHalfWidth: 7 },
  { name: "Muy alto", min: 80, max: 99, slots: 5, weeksPerReport: 2, initialHalfWidth: 4 },
];

export function sportingDirectorTierFor(level) {
  const lvl = clamp(level ?? 0, 0, 99);
  return SPORTING_DIRECTOR_TIERS.find((t) => lvl >= t.min && lvl <= t.max) || SPORTING_DIRECTOR_TIERS[0];
}

export function ensureSportingDirector(team) {
  if (team.sportingDirector) return team.sportingDirector;
  const isBig = team.tier === "Fábrica" || team.tier === "Puntero";
  return { level: initialSportingDirectorLevel(team.categoryKey, isBig), upgrading: null };
}

/** Category sets the baseline (a MotoGP scouting department has
 * nothing in common with a WorldWCR privateer's), and a big team
 * within that category steps one full tier above its category's own
 * baseline — the Ducati Lenovo Team ends up Muy alto, a small MotoGP
 * team lands on Alto, a big WorldWCR team reaches Bajo, and a small
 * Sportbike/WorldWCR team stays at Muy bajo, exactly matching how
 * these things actually shake out in the real sport. No ceiling by
 * category, though — upgrade cost is what keeps a small team's
 * department realistically expensive to grow, not a hard cap. */
export function initialSportingDirectorLevel(categoryKey, isBig) {
  const baseByCategory = {
    motogp: 70,
    superbikes: 50, moto2: 50,
    supersport: 30, moto3: 30,
    sportbike: 10, worldwcr: 10,
  };
  const base = baseByCategory[categoryKey] ?? 30;
  return clamp(base + (isBig ? 20 : 0), 0, 99);
}

function sportingDirectorUpgradeSpec(level, scale) {
  const t = clamp(level, 0, 99) / 99;
  const difficulty = Math.pow(t, 2.3); // steeper than factory/staff — each step should bite hard
  const money = Math.round(190000 * (1 + difficulty * 11) * (scale || 1));
  const gp = clamp(Math.round(4 + difficulty * 10), 4, 16);
  const gain = clamp(Math.round(9 * (1 - difficulty)) + 3, 4, 12);
  return { money, gp, gain };
}

export function sportingDirectorUpgradeSpecFor(team, scale) {
  const { level } = ensureSportingDirector(team);
  return sportingDirectorUpgradeSpec(level, scale);
}

export function canStartSportingDirectorUpgrade(team, budgetAvailable, scale) {
  const sd = ensureSportingDirector(team);
  if (sd.upgrading) return null;
  if (sd.level >= 99) return null;
  const spec = sportingDirectorUpgradeSpec(sd.level, scale);
  if (spec.money > budgetAvailable) return null;
  return spec;
}

export function startSportingDirectorUpgrade(team, spec) {
  const sd = ensureSportingDirector(team);
  return { ...team, sportingDirector: { ...sd, upgrading: { remaining: spec.gp, totalGp: spec.gp, gain: spec.gain } } };
}

/* Same weekly cadence as facility upgrades — ticks down by one, and any
   in-progress scouting missions immediately benefit from the new level
   the moment it completes (more slots, faster/tighter reports from then
   on), never retroactively changing a report already delivered. */
export function advanceSportingDirectorUpgrade(team) {
  const sd = ensureSportingDirector(team);
  if (!sd.upgrading) return { team: { ...team, sportingDirector: sd }, arrival: null };
  const rem = sd.upgrading.remaining - 1;
  if (rem > 0) return { team: { ...team, sportingDirector: { ...sd, upgrading: { ...sd.upgrading, remaining: rem } } }, arrival: null };
  const newLevel = clamp(sd.level + sd.upgrading.gain, 0, 99);
  return { team: { ...team, sportingDirector: { level: newLevel, upgrading: null } }, arrival: { newLevel } };
}

export const SCOUT_OUT_OF_CATEGORY_COST = 10000;

export function canAffordScoutMission(team, riderCategoryKey) {
  if (riderCategoryKey === team.categoryKey) return true;
  return (team.budget ?? 0) >= SCOUT_OUT_OF_CATEGORY_COST;
}

export function activeScoutSlotsUsed(team) {
  return (team.scoutingMissions || []).length;
}

export function canStartScoutMission(team, riderId, riderCategoryKey) {
  const tier = sportingDirectorTierFor(ensureSportingDirector(team).level);
  if (activeScoutSlotsUsed(team) >= tier.slots) return false;
  if ((team.scoutingMissions || []).some((m) => m.riderId === riderId)) return false;
  return canAffordScoutMission(team, riderCategoryKey);
}

export function startScoutMission(team, rider, riderCategoryKey) {
  const tier = sportingDirectorTierFor(ensureSportingDirector(team).level);
  const cost = riderCategoryKey === team.categoryKey ? 0 : SCOUT_OUT_OF_CATEGORY_COST;
  const mission = { riderId: rider.id, riderName: rider.name, categoryKey: riderCategoryKey, weeksRemaining: tier.weeksPerReport, totalWeeks: tier.weeksPerReport };
  return {
    ...team,
    budget: (team.budget ?? 0) - cost,
    scoutingMissions: [...(team.scoutingMissions || []), mission],
  };
}

export function cancelScoutMission(team, riderId) {
  return { ...team, scoutingMissions: (team.scoutingMissions || []).filter((m) => m.riderId !== riderId) };
}

/** Called once a week (race week or rest week alike — scouting doesn't
 * pause any more than the market does). Missions that reach zero
 * weeks remaining produce a finished report and drop off the active
 * list; everything else just ticks down. If the Sporting Director
 * levelled up mid-mission, weeksPerReport already reflects the new,
 * faster tier by the time this runs, since the tier is read fresh off
 * the team's CURRENT level every time a mission is started or
 * advances, never frozen at whatever it was when the mission began. */
export function advanceScoutMissions(team, findRiderByIdAndCategory) {
  const missions = team.scoutingMissions || [];
  if (!missions.length) return { team, completed: [] };
  const completed = [];
  const remaining = [];
  missions.forEach((m) => {
    const rem = m.weeksRemaining - 1;
    if (rem > 0) { remaining.push({ ...m, weeksRemaining: rem }); return; }
    const rider = findRiderByIdAndCategory(m.riderId, m.categoryKey);
    if (rider) completed.push({ mission: m, rider });
  });
  let scoutReports = { ...(team.scoutReports || {}) };
  completed.forEach(({ mission, rider }) => {
    scoutReports[rider.id] = generateScoutReport(rider, team, scoutReports[rider.id], mission.categoryKey);
  });
  return { team: { ...team, scoutingMissions: remaining, scoutReports }, completed };
}

/** A repeat report on the same rider tightens the existing range
 * instead of starting fresh — narrower each time, floor of ±2 so
 * there's always a sliver of doubt even at max investment, matching
 * "you basically know the number" rather than "you know it outright". */
export function generateScoutReport(rider, team, priorReport, categoryKey = null) {
  const tier = sportingDirectorTierFor(ensureSportingDirector(team).level);
  const truePotential = rider.pa ?? rider.potential ?? overallRating(rider);
  const priorReportsCount = priorReport?.reportsCount ?? 0;
  const halfWidth = Math.max(2, Math.round(tier.initialHalfWidth * Math.pow(0.62, priorReportsCount)));
  const lo = clamp(Math.round(truePotential - halfWidth), 1, 100);
  const hi = clamp(Math.round(truePotential + halfWidth), 1, 100);
  return {
    riderName: rider.name,
    categoryKey: categoryKey ?? priorReport?.categoryKey ?? null,
    potentialRange: [lo, hi],
    reportsCount: priorReportsCount + 1,
    moraleValue: rider.morale ?? 60,
    moraleSeason: team.seasonNumberForScouting ?? null,
    assessment: buildTeamFitAssessment(rider, team, tier),
  };
}

/** Bug fixed / redesigned: this used to describe attribute spread
 * (technique, pace...), which is interesting trivia but doesn't
 * actually help decide anything. What a real scout report should
 * answer is the practical question a manager actually has: does this
 * rider fit here, are they better than what I've got, will they keep
 * developing, is this worth pursuing at all, and would they even say
 * yes. Each verdict is checked against the rider's TRUE numbers, then
 * — same idea as before — has a chance of coming back wrong at low
 * Sporting Director tiers, and is essentially always right at Muy
 * alto. */
function buildTeamFitAssessment(rider, team, tier) {
  const tierIndex = SPORTING_DIRECTOR_TIERS.indexOf(tier);
  const accuracy = 0.55 + tierIndex * 0.11; // Muy bajo ~0.55, Muy alto ~0.99
  const hedge = tierIndex >= 3 ? "" : "hedge"; // low tiers hedge their wording, high tiers state it plainly

  const trueCA = overallRating(rider);
  const truePA = rider.pa ?? rider.potential ?? trueCA;
  const teamRiders = (team.riders || []).filter((r) => r.id !== rider.id);
  const teamCAs = teamRiders.map((r) => overallRating(r));
  const teamAvgCA = teamCAs.length ? teamCAs.reduce((a, b) => a + b, 0) / teamCAs.length : trueCA;
  const betterThanCount = teamCAs.filter((ca) => trueCA > ca).length;
  const hasGrowth = (truePA - trueCA) >= 8;
  const isYoung = (rider.age ?? 25) <= 24;
  const openness = clamp(1 - (rider.prestige ?? 60) / 100 + (teamAvgCA - trueCA) / 120, 0.05, 0.95);

  const verdicts = [
    pickVerdict(accuracy, hedge, [
      { test: trueCA >= teamAvgCA + 8, plain: "Está claramente por encima del nivel de tu equipo actual.", hedged: "Parece estar por encima del nivel de tu equipo, aunque conviene confirmarlo." },
      { test: trueCA <= teamAvgCA - 8, plain: "Está por debajo del nivel que necesita tu equipo ahora mismo.", hedged: "Podría quedarse corta para lo que necesita tu equipo." },
      { test: true, plain: "Encaja bien con el nivel actual de tu equipo.", hedged: "Parece encajar más o menos con el nivel de tu equipo." },
    ]),
    pickVerdict(accuracy, hedge, [
      { test: teamCAs.length > 0 && betterThanCount === teamCAs.length, plain: `Sería mejor que ${teamCAs.length === 1 ? "tu piloto actual" : "tus pilotos actuales"}.`, hedged: "Podría ser una mejora sobre lo que ya tienes." },
      { test: teamCAs.length > 0 && betterThanCount === 0, plain: "No superaría a ninguno de tus pilotos actuales.", hedged: "No parece que vaya a superar a tus pilotos actuales." },
      { test: true, plain: "Superaría a alguno de tus pilotos actuales, pero no a todos.", hedged: "Podría superar a alguno de tus pilotos, aunque no está claro a cuál." },
    ]),
    pickVerdict(accuracy, hedge, [
      { test: hasGrowth && isYoung, plain: "Todavía tiene mucho margen real para crecer.", hedged: "Da la impresión de tener margen para crecer." },
      { test: hasGrowth && !isYoung, plain: "Le queda algo de margen, aunque ya no es precisamente joven.", hedged: "Podría mejorar todavía un poco." },
      { test: true, plain: "Ya está cerca de su techo — no esperes mucho más desarrollo.", hedged: "No parece que le quede mucho margen de mejora." },
    ]),
    pickVerdict(accuracy, hedge, [
      { test: isYoung && hasGrowth, plain: "Es una apuesta a largo plazo, con proyección real.", hedged: "Podría ser una apuesta de futuro, aunque es pronto para saberlo." },
      { test: trueCA >= teamAvgCA - 4, plain: "Podría encajar ya mismo en tu equipo, sin más rodeos.", hedged: "Podría valer para el equipo ya, aunque conviene no confiarse." },
      { test: true, plain: "Mejor descártala — no aporta nada a tu proyecto ahora mismo.", hedged: "No parece que vaya a aportar demasiado a tu proyecto." },
    ]),
    pickVerdict(accuracy, hedge, [
      { test: openness >= 0.6, plain: "Se mostraría receptiva a una oferta tuya.", hedged: "Podría estar abierta a escuchar una oferta." },
      { test: openness <= 0.3, plain: "Muy improbable que acepte — está muy a gusto donde está o le queda grande tu proyecto.", hedged: "No parece muy probable que aceptase, aunque nunca se sabe." },
      { test: true, plain: "Costaría convencerla, pero no es una causa perdida.", hedged: "Podría costar convencerla, aunque no es descartable." },
    ]),
  ];
  return verdicts;
}

function pickVerdict(accuracy, hedge, options) {
  const correctOption = options.find((o) => o.test) || options[options.length - 1];
  const chosen = Math.random() < accuracy ? correctOption : pick(options.filter((o) => o !== correctOption));
  return hedge ? chosen.hedged : chosen.plain;
}


/** What the AI sees instead of a rider's real potential when
 * evaluating someone outside its own roster — never the true number,
 * always the same kind of noisy estimate the player would get with an
 * equivalent Sporting Director tier, so the AI can misjudge a
 * prospect exactly as easily as the player can. Deliberately NOT
 * persisted anywhere (no scouting missions, no reports to manage) —
 * recomputed fresh, cheaply, every time it's needed. */
export function aiPerceivedPotential(rider, scoutingTeam) {
  const truePotential = rider.pa ?? rider.potential ?? overallRating(rider);
  const tier = sportingDirectorTierFor(ensureSportingDirector(scoutingTeam).level);
  const noise = (Math.random() * 2 - 1) * tier.initialHalfWidth * 0.6;
  return clamp(Math.round(truePotential + noise), 1, 100);
}

/** Same idea as aiPerceivedPotential, for morale — a team sizing up
 * someone else's rider doesn't have a locker-room read on their mood
 * either, unless they've actually gone to the trouble of scouting
 * them (see generateScoutReport's own moraleValue, which — for the
 * player specifically — is exact once scouted). The AI never keeps
 * its own scout reports around, so this noisy estimate is all it ever
 * gets, every time, exactly like the player would see with an
 * equivalent tier and no completed report yet. */
export function aiPerceivedMorale(rider, scoutingTeam) {
  const trueMorale = rider.morale ?? 60;
  const tier = sportingDirectorTierFor(ensureSportingDirector(scoutingTeam).level);
  const noise = (Math.random() * 2 - 1) * tier.initialHalfWidth * 0.8;
  return clamp(Math.round(trueMorale + noise), 1, 100);
}

/** The single point every AI-vs-outside-candidate evaluation should go
 * through before scoring/gating a rider who ISN'T currently on the
 * evaluating team's own roster — scoreCandidateForTeam/wouldRiderJoin/
 * passesCrossoverGate all read rider.pa/rider.potential/rider.morale
 * directly with no idea whose team is asking, so the noise has to be
 * baked into the rider object itself beforehand. A rider already on
 * the evaluating team is passed through untouched — a team knows its
 * own riders completely, no scouting needed. */
export function perceivedRiderForAI(rider, evaluatingTeam) {
  if ((evaluatingTeam.riders || []).some((r) => r.id === rider.id)) return rider;
  const perceivedPotential = aiPerceivedPotential(rider, evaluatingTeam);
  return { ...rider, pa: perceivedPotential, potential: perceivedPotential, morale: aiPerceivedMorale(rider, evaluatingTeam) };
}

/** Called once per season transition, for every team: a morale reading
 * is only trustworthy for the season it was taken in — carrying it
 * forward would mean "she was happy 10 seasons ago" still showing up
 * as if it meant something today. The potential range and attribute
 * hints are NOT touched here; those don't go stale the way a mood
 * does. */
export function expireStaleScoutMorale(team) {
  const reports = team.scoutReports;
  if (!reports || !Object.keys(reports).length) return team;
  const next = {};
  Object.entries(reports).forEach(([riderId, report]) => {
    next[riderId] = { ...report, moraleValue: null };
  });
  return { ...team, scoutReports: next };
}

/** Single source of truth for "what does the player actually know
 * about this rider's potential" — reused by the rider profile, the
 * Sporting Director panel, and both rider-search screens, so a rider
 * never shows her real PA in one place and a "?" in another. Own
 * riders (or riders on the player's own roster) are always known in
 * full; anyone else is only known once genuinely scouted. */
export function knownPotential(rider, playerTeam, isOwnRider = false) {
  if (isOwnRider || (playerTeam?.riders || []).some((r) => r.id === rider.id)) {
    return { known: true, exact: true, value: rider.pa ?? rider.potential };
  }
  const report = playerTeam?.scoutReports?.[rider.id];
  if (report) return { known: true, exact: false, range: report.potentialRange };
  return { known: false };
}

export function knownPotentialLabel(rider, playerTeam, isOwnRider = false) {
  const kp = knownPotential(rider, playerTeam, isOwnRider);
  if (!kp.known) return "?";
  return kp.exact ? String(kp.value) : `${kp.range[0]}–${kp.range[1]}`;
}

/** Bug fixed: the free-agent search screens filtered by PA min/max
 * against the rider's REAL potential, exactly the number the whole
 * Sporting Director system exists to hide — narrowing min and max to
 * the same value and checking who's still in the results turns the
 * filter into a way to read off a rider's true potential without
 * ever sending a scout, defeating the entire point of the system. An
 * unscouted rider now always passes the filter regardless of where
 * it's set (their PA genuinely isn't known, so it can't meaningfully
 * be excluded one way or the other); a scouted rider passes if her
 * reported RANGE overlaps the filter at all, never her hidden exact
 * number. */
export function matchesPotentialFilter(rider, playerTeam, isOwnRider, minPA, maxPA) {
  const kp = knownPotential(rider, playerTeam, isOwnRider);
  if (!kp.known) return true;
  if (kp.exact) return kp.value >= minPA && kp.value <= maxPA;
  return kp.range[1] >= minPA && kp.range[0] <= maxPA;
}

/** How many of THIS category's rookie class (5 per category — see
 * generateRookieClass in utils/riderGeneration.js) a given Sporting
 * Director tier can currently see. A clean 1-per-tier progression,
 * since there are exactly 5 tiers and exactly 5 rookies per category
 * — Muy bajo catches only a glimpse, Muy alto sees the whole class. */
const ROOKIE_CLASS_VISIBLE_BY_TIER = [1, 2, 3, 4, 5];

/** The Sporting Director panel's own curated slice of this season's
 * rookie class for the team's own category — not a separate pool
 * (see generateRookieClass's own doc comment), just a partially-
 * revealed view onto the same free agents anyone could also find
 * through the ordinary search screens. Sorted by id for a stable,
 * consistent "which N are visible" across renders rather than
 * reshuffling every time the panel opens. Each visible entry's
 * potential is narrowed by the same tier-based half-width the scout
 * report system already uses (never the exact hidden number) — CA is
 * always shown in full, same as any other rider in the game. */
export function rookieClassVisibleSlice(freeAgents, categoryKey, seasonNumber, directorLevel) {
  const thisClass = (freeAgents || [])
    .filter((r) => r._rookieClassSeason === seasonNumber && r._rookieClassCategory === categoryKey)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const tierIndex = SPORTING_DIRECTOR_TIERS.indexOf(sportingDirectorTierFor(directorLevel));
  const visibleCount = ROOKIE_CLASS_VISIBLE_BY_TIER[tierIndex] ?? 1;
  const halfWidth = SPORTING_DIRECTOR_TIERS[tierIndex].initialHalfWidth;
  return thisClass.slice(0, visibleCount).map((r) => {
    const truePotential = r.pa ?? r.potential ?? overallRating(r);
    const lo = clamp(Math.round(truePotential - halfWidth), 1, 100);
    const hi = clamp(Math.round(truePotential + halfWidth), 1, 100);
    return { rider: r, ca: overallRating(r), potentialRange: [lo, hi] };
  });
}
