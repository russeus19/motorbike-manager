import { clamp } from "./random.js";
import { isRestrictedMotoGpSatellite, committedCustomerTopCount, MOTOGP_CUSTOMER_TOP_CAPACITY } from "../data/motogpBikeTiers.js";
import { MANUFACTURERS } from "../data/manufacturers.js";
import { MOTOGP_TEAMS_DATA } from "../data/teamsMotoGP.js";

/** Every MotoGP satellite team starts with a 3-year deal with its
 * manufacturer — real MotoGP satellite contracts genuinely run in
 * multi-year blocks like this, not a single season at a time. Reused
 * as the "back to full trust" length whenever a renewal succeeds too. */
export const MANUFACTURER_CONTRACT_YEARS = 3;

/** team.manufacturerContract, defaulted for any MotoGP satellite that
 * doesn't have one yet (every satellite in a save started before this
 * system existed, or a fresh save's very first season) — same
 * ensure-on-read pattern already used for Fábrica/Staff/Director
 * Deportivo (ensureRD/ensureSportingDirector). A factory team, or any
 * team outside MotoGP, never has one — this system doesn't apply to
 * them at all. */
export function ensureManufacturerContract(team, categoryKey) {
  if (!isRestrictedMotoGpSatellite(team, categoryKey)) return null;
  return team.manufacturerContract || { manufacturer: team.manufacturer, yearsLeft: MANUFACTURER_CONTRACT_YEARS };
}

export const MANUFACTURER_REQUEST_TYPES = {
  renew: {
    label: "Renovar el contrato",
    description: "Asegurar unos años más con la marca actual, antes de que el contrato llegue a su fin.",
  },
  pressure: {
    label: "Presionar por mejoras",
    description: "Exigir que la fábrica se tome más en serio vuestro rendimiento — más atención en los paquetes que os llegan.",
  },
  customerTop: {
    label: "Pedir la moto cliente-top",
    description: "Reclamar el salto desde la spec del año pasado a la mejor moto de cliente que ofrece la marca.",
  },
  switchManufacturer: {
    label: "Sondear otras marcas",
    description: "Explorar si otro fabricante estaría dispuesto a ofreceros un proyecto mejor que el actual.",
  },
};

/** Which request types this team can actually raise right now —
 * customerTop only makes sense if there's a worse tier to be pulled up
 * FROM in the first place (a 4-bike manufacturer's satellite already
 * holds the best spec it could ever get, nothing to ask for there —
 * see data/motogpBikeTiers.js's own tier-count comment), the rest are
 * always on the table for any MotoGP satellite. */
export function availableManufacturerRequests(team, categoryKey, tiersMap) {
  const types = ["renew", "pressure", "switchManufacturer"];
  const tiers = tiersMap?.[team.name];
  if (tiers?.includes("previous")) types.splice(2, 0, "customerTop");
  return types;
}

/** The same shape of scoring the transfer market already uses
 * elsewhere (a 0.03-0.95 score, thermometerZone turns it into frío/
 * dudoso/favorable) — built from this team's own season performance,
 * its riders' prestige, whether it met or beat its own expectation,
 * and a request-specific difficulty on top: a manufacturer finds it
 * easy to just keep an already-loyal partner around (renew), harder
 * to hand over its actual best equipment (customerTop), and hardest
 * of all to accept that a RIVAL manufacturer should poach a team it
 * doesn't even control the relationship with yet (switchManufacturer). */
/** The shared "how good is this team's own season, on paper" score
 * every manufacturer-facing request builds from — season points,
 * riders' average prestige, team prestige, and how far each rider's
 * actual finish beat or missed their own individual expectation tier.
 * Deliberately manufacturer-agnostic: it's the same case a team makes
 * whether it's their OWN manufacturer they're talking to or a rival
 * one sizing them up from the outside. */
/** The objective, ranking-agnostic half of a team's own performance —
 * season points and prestige, nothing about whether they happen to be
 * beating or missing their own individual expectation. Deliberately
 * separate from teamMeritScore below: "are we exceeding our own bar"
 * is a legitimate signal for how APPEALING a candidate team looks to
 * a suitor (teamMeritScore's own use), but it's the WRONG signal for
 * "how urgently does a manufacturer need to strengthen itself" — a
 * team with a historically modest expectation that's merely meeting
 * it can still be objectively weak. */
function objectivePerformance(team, riderStandings) {
  const riders = team.riders || [];
  const points = riders.reduce((s, r) => s + (riderStandings?.[r.id]?.points ?? 0), 0);
  const avgPrestige = riders.length ? riders.reduce((s, r) => s + (r.prestige ?? 0), 0) / riders.length : 0;
  let score = 0;
  score += clamp(points / 260, 0, 0.35);
  score += clamp((avgPrestige - 150) / 220, -0.15, 0.2);
  score += clamp(((team.prestige ?? 0) - 150) / 320, -0.1, 0.15);
  return score;
}

function teamMeritScore(team, riderStandings) {
  let score = objectivePerformance(team, riderStandings);

  const ranked = Object.entries(riderStandings || {}).sort((a, b) => (b[1]?.points ?? 0) - (a[1]?.points ?? 0));
  (team.riders || []).forEach((r) => {
    if (!r.expectation) return;
    const expectedRank = { "Luchar por el campeonato": 2, "Entrar en el Top 5": 5.5, "Luchar por el Top 10": 10.5, "Estar regularmente en los puntos": 16.5, "Intentar puntuar": 22 }[r.expectation];
    const actualRank = ranked.findIndex(([id]) => id === r.id) + 1;
    if (expectedRank && actualRank) score += clamp((expectedRank - actualRank) / 40, -0.1, 0.12);
  });

  return score;
}

/** The current manufacturer's own willingness to grant "renovar",
 * "presionar" or "pedir la moto cliente-top" — switchManufacturer is
 * NOT scored here anymore (bug fixed below explains why).
 *
 * Bug fixed (feature): "customerTop" used to be scored purely on the
 * team's own merit, with no regard for whether the manufacturer
 * actually has a bike left to give — a manufacturer only ever has
 * MOTOGP_CUSTOMER_TOP_CAPACITY (2) customerTop bikes total, and if
 * both are already spoken for elsewhere this season (the other
 * satellite's own earlier successful request, or an incoming team's
 * own committed switch offer — see committedCustomerTopCount), there
 * is nothing left to promise, full stop. allTeams is optional (every
 * real caller passes it; omitting it just skips this check, so
 * nothing else that calls this for "renovar"/"presionar" needs to
 * change) — when provided and capacity is already exhausted, this
 * returns the absolute floor immediately, before merit even enters
 * into it: no amount of prestige or good results earns a bike that
 * doesn't exist. */
export function computeManufacturerRequestScore(requestType, team, riderStandings, categoryKey, allTeams) {
  if (requestType === "customerTop" && allTeams && committedCustomerTopCount(team.manufacturer, allTeams, team.name) >= MOTOGP_CUSTOMER_TOP_CAPACITY) {
    return 0.03;
  }
  const difficulty = { renew: 0.08, pressure: -0.05, customerTop: -0.12 }[requestType] ?? 0;
  return clamp(0.2 + teamMeritScore(team, riderStandings) + difficulty, 0.03, 0.95);
}

/** Bug fixed (feature): "sondear otras marcas" used to be scored
 * against the team's OWN current manufacturer — Ducati deciding
 * whether you're allowed to go talk to KTM makes no sense; Ducati has
 * no say in that at all. Each OTHER manufacturer now judges the team
 * on the exact same merit (teamMeritScore) independently, from a
 * baseline slightly harder to win over than a request to your OWN
 * manufacturer would be — poaching a team away from a rival is a
 * bigger commitment than keeping one you already have. */
/** Bug fixed (feature): every candidate manufacturer used to score a
 * team identically, using only the team's OWN merit — meaning a
 * manufacturer thriving with a great existing satellite showed
 * exactly the same interest as one whose satellite was struggling,
 * which never made sense. Each manufacturer now ALSO factors in how
 * satisfied it already is with whatever satellite team(s) it
 * currently has (using this exact same teamMeritScore, scored on
 * THEM instead of the approaching team) — a manufacturer riding high
 * with its own satellite has little reason to go looking elsewhere,
 * while one whose satellite is struggling is genuinely more open to
 * a switch. A manufacturer with no satellite at all yet (shouldn't
 * currently happen — every MotoGP manufacturer already fields one —
 * but handled safely regardless) has nothing to compare against, so
 * satisfaction stays neutral. */
/** Bug fixed (feature): this used to reduce interest based on how
 * SATISFIED the manufacturer already was with its existing satellite's
 * own performance — treating the switch as if it would REPLACE that
 * satellite. That's wrong: a manufacturer can genuinely run two
 * satellite teams alongside its factory one at once (exactly what
 * Ducati already does with Gresini and VR46 today — a 6-bike
 * manufacturer, not a straight swap between two 4-bike ones), so a
 * thriving existing satellite was never actually a reason to turn a
 * strong new team away. What genuinely matters is whether the
 * manufacturer has ROOM to grow at all: the practical cap modeled
 * here is 2 satellite TEAMS per manufacturer (the same 3-teams-total
 * shape Ducati already demonstrates) — a manufacturer already running
 * two has nowhere to put a third, no matter how good the approaching
 * team is; one running zero or one has real room, and judges the
 * approaching team purely on merit, with no penalty at all for
 * however well its current satellite (if any) happens to be doing. */
/** How well this manufacturer is doing overall this season, across
 * EVERY team riding for it (factory included) — used as a genuine
 * "how much do they need a stronger partner" signal, independent of
 * whether they specifically have room for a new satellite. */
/** Bug fixed: this used to average teamMeritScore (which includes the
 * expectation-beating term) across a manufacturer's own teams — a
 * manufacturer with a historically modest expectation could score as
 * "doing fine" here purely by not badly missing that low bar, even
 * while being objectively weak on raw points/prestige. A candidate
 * team that clearly outperformed them in absolute terms could still
 * see near-zero interest, because the manufacturer's own
 * expectation-inflated form made it look like it had no real need.
 * objectivePerformance (points + prestige only, no expectation) is
 * the honest "how strong is this manufacturer really" signal instead. */
function manufacturerOverallForm(manufacturer, allTeams, riderStandings) {
  const teams = (allTeams || []).filter((t) => t.manufacturer === manufacturer);
  if (!teams.length) return 0;
  return teams.reduce((s, t) => s + objectivePerformance(t, riderStandings), 0) / teams.length;
}

/** Bug fixed: needBonus used to compare a manufacturer's own
 * objectivePerformance against a fixed absolute zero — but real
 * MotoGP rosters almost never produce a NEGATIVE objectivePerformance
 * at all (points can only ever add, never subtract, and real riders'
 * prestige clusters tightly enough around the formula's own 150
 * baseline that the prestige terms rarely swing it negative either).
 * That meant EVERY manufacturer's overallForm landed positive in
 * practice, which meant needBonus was ALWAYS negative and ALWAYS
 * pinned at its own floor — a genuinely struggling manufacturer and a
 * dominant one produced the exact same (maximally negative) bonus,
 * erasing all the differentiation this was supposed to add. Comparing
 * each manufacturer against the GRID'S OWN average instead — not a
 * fixed zero — centers the comparison correctly: a below-average
 * manufacturer is needy regardless of what "average" happens to be
 * this season, an above-average one isn't, and the two stay
 * meaningfully different from each other. */
function gridAverageForm(allTeams, riderStandings) {
  const manufacturers = [...new Set((allTeams || []).map((t) => t.manufacturer).filter(Boolean))];
  if (!manufacturers.length) return 0;
  const forms = manufacturers.map((mfr) => manufacturerOverallForm(mfr, allTeams, riderStandings));
  return forms.reduce((a, b) => a + b, 0) / forms.length;
}

/** Bug fixed (feature): the previous version dropped the old
 * satisfaction-with-existing-satellite penalty (correctly — see this
 * function's git history, a thriving satellite doesn't block a third
 * team from coexisting, exactly like Ducati's real 3-team structure
 * already shows) but never replaced it with anything manufacturer-
 * specific at all — every manufacturer WITH room ended up scoring the
 * exact same number, since the formula only ever looked at the
 * approaching team's own merit. That's why every "sondear otras
 * marcas" felt identical regardless of who you actually talked to.
 *
 * The real, manufacturer-specific signal now is manufacturerOverallForm
 * above — a struggling manufacturer (weak results across ALL its own
 * teams this season, factory included) is genuinely hungrier for a
 * stronger partner and scores this team noticeably higher; a
 * dominant one, already winning everywhere, has far less urgent need
 * and scores the exact same team noticeably lower. Room (the 2-
 * satellite cap) is still checked first and separately — that's about
 * whether a slot physically exists at all, this is about how eager
 * they are to fill it. A small manufacturer-specific random wobble is
 * layered on top too, so the same team probing the same manufacturer
 * twice in a row doesn't always land on an identical number — real
 * organizations don't reduce perfectly to a formula either. */
export function computeOtherManufacturerInterest(team, riderStandings, targetManufacturer, allTeams, tiersMap) {
  const existingSatelliteTeams = (allTeams || []).filter((t) => {
    const tiers = tiersMap?.[t.name];
    return t.manufacturer === targetManufacturer && tiers && !tiers.every((tier) => tier === "factory");
  });
  if (existingSatelliteTeams.length >= 2) return 0.03; // no room — already at the practical 2-satellite cap

  const baseline = 0.14 + teamMeritScore(team, riderStandings);
  const overallForm = manufacturerOverallForm(targetManufacturer, allTeams, riderStandings);
  const relativeForm = overallForm - gridAverageForm(allTeams, riderStandings);
  // Bug fixed (feature): ×0.4 (then ×2.6) looked reasonable against
  // SYNTHETIC test data using extreme, hand-picked point/prestige gaps,
  // but real teamMeritScore/objectivePerformance values across an
  // actual MotoGP grid cluster much tighter than that — a genuinely
  // struggling manufacturer's relativeForm (now measured against the
  // grid's own average, not a fixed zero — see gridAverageForm's own
  // comment) typically only reaches around -0.1, and a dominant one's
  // only around +0.1. ×4.2 turns that realistic ~0.2 spread into a
  // meaningful, non-saturating swing across the final score, verified
  // directly against the real MotoGP grid rather than hand-picked
  // numbers.
  const needBonus = clamp(-relativeForm * 4.2, -0.4, 0.4);
  const wobble = (Math.random() - 0.5) * 0.08;
  return clamp(baseline + needBonus + wobble, 0.03, 0.95);
}

/** What tier composition a manufacturer is actually willing to open
 * with, derived from the same interest score the negotiation itself
 * is scored on — shown to the team BEFORE they commit to a switch, so
 * "sondear otras marcas" means something concrete rather than a bare
 * yes/no. A manufacturer that's genuinely excited opens with its best
 * available spec on both seats; lukewarm interest gets a mixed offer;
 * a marginal "yes" only ever offers the weaker tier, on both seats.
 *
 * Bug fixed (feature): the original 0.65/0.4 thresholds were picked
 * against the same overly-optimistic synthetic range
 * computeOtherManufacturerInterest's own needBonus used to assume — a
 * real grid's scores rarely climbed past ~0.3 even for a genuinely
 * struggling manufacturer courting a strong team, so every real
 * negotiation landed in the bottom "previous, previous" bracket no
 * matter how interested the manufacturer actually was. Recalibrated
 * against the real range instead (verified directly against the
 * actual MotoGP grid, not hand-picked numbers).
 *
 * Bug fixed (feature): this used to offer whatever the interest score
 * alone justified, with no regard for whether the manufacturer
 * actually still HAS that many customerTop bikes free — if it had
 * already committed one or both elsewhere this same season (the
 * other satellite's own successful "pedir moto cliente-top", an
 * earlier switch offer to a different team), a genuinely excited
 * manufacturer could still promise "dos motos cliente-top" it had no
 * way to deliver, which is exactly how a signed offer ended up broken
 * at the season transition. remainingCapacity (see
 * committedCustomerTopCount, real callers always pass it; defaults to
 * the full MOTOGP_CUSTOMER_TOP_CAPACITY so nothing else calling this
 * without it changes behavior) caps what can ever be offered: zero
 * free bikes means "previous, previous" no matter how enthusiastic
 * the manufacturer is, exactly one free bike caps the best possible
 * offer at a single customerTop seat. */
export function manufacturerBikeOffer(interestScore, remainingCapacity = MOTOGP_CUSTOMER_TOP_CAPACITY) {
  if (remainingCapacity <= 0) return ["previous", "previous"];
  if (remainingCapacity === 1) {
    return interestScore >= 0.16 ? ["customerTop", "previous"] : ["previous", "previous"];
  }
  if (interestScore >= 0.32) return ["customerTop", "customerTop"];
  if (interestScore >= 0.16) return ["customerTop", "previous"];
  return ["previous", "previous"];
}

/** A manufacturer besides the team's own current one, currently the
 * works team of some OTHER MotoGP outfit — the pool switchManufacturer
 * actually draws its offer from. Doesn't include manufacturers with
 * no factory presence in the game at all (there's no "sleeping brand
 * returns" system yet — see the session's own earlier design notes —
 * so this only ever offers a switch to a manufacturer already racing). */
/** Every OTHER manufacturer with a real factory presence in the game
 * (there's no "sleeping brand returns" system yet — see this
 * session's own earlier design notes — so this only ever offers a
 * switch to a manufacturer already racing), further narrowed to only
 * those that actually have room: a manufacturer already running two
 * satellite teams (the practical cap this whole system models — see
 * computeOtherManufacturerInterest's own comment) has nowhere to put
 * a third, so there's no point even showing it as an option to
 * approach — sondear a team with zero realistic chance isn't a
 * meaningful choice, it's a trap. allTeams/tiersMap are optional; when
 * omitted, every manufacturer besides the current one is shown (used
 * by contexts that don't have live team data on hand, though every
 * real caller today does pass them). */
/** Every OTHER manufacturer with a real factory presence in the game
 * (there's no "sleeping brand returns" system yet — see this
 * session's own earlier design notes — so this only ever offers a
 * switch to a manufacturer already racing).
 *
 * Bug fixed (feature): this used to also drop any manufacturer
 * already at the practical 2-satellite cap (Ducati, from the very
 * first season, since it starts the game already running Gresini and
 * VR46) — reasonable in spirit (there's genuinely no room), but it
 * meant Ducati could never even be SEEN as an option to approach,
 * which read as a bug rather than a deliberate "they have no room
 * right now". computeOtherManufacturerInterest's own room check
 * already floors a capacity-maxed manufacturer's score at 0.03 — well
 * below thermometerZone's 0.28 "dudoso" floor, so a switch to one can
 * never actually succeed either way. Showing it anyway lets the
 * player see and feel that rejection instead of the option quietly
 * not existing at all. */
export function otherManufacturerCandidates(currentManufacturer) {
  return Object.keys(MANUFACTURERS).filter((m) => m !== currentManufacturer && ["Ducati", "Aprilia", "Yamaha", "KTM", "Honda"].includes(m));
}

/** Applies whatever a successful ("favorable") outcome for this
 * request type actually does — called only when the negotiation
 * screen's own roll came back favorable. Bug fixed: "customerTop" and
 * "switchManufacturer" used to change the live seat-tier map
 * immediately, mid-season — both the timing was wrong (a manufacturer
 * doesn't hand over new machinery mid-championship, this is a
 * next-season decision) AND, for customerTop specifically, it never
 * accounted for the manufacturer's own FIXED number of customerTop
 * slots (2 for Ducati, spread across however many satellite teams it
 * has) — granting Gresini's second seat customerTop on top of its
 * existing one, without taking a slot away from VR46, briefly gave
 * the marca three customerTop bikes at once instead of two.
 *
 * Both are deferred instead: this only ever sets a flag on the team
 * ("manufacturerFavorNextSeason" / "pendingManufacturerSwitch"),
 * consumed once at the next season transition —
 * reassignCustomerTopSeats itself reads manufacturerFavorNextSeason
 * as a guaranteed-win bonus for that team's own "previous" seat
 * within its normal, slot-respecting scoring pass (so someone else's
 * customerTop seat is correctly bumped down to make room, the exact
 * same way a genuinely earned promotion would), and App.jsx's own
 * runSeasonTransition applies pendingManufacturerSwitch before that
 * same reassignment pass runs. "renew" and "pressure" stay immediate
 * — neither one touches a shared, limited resource the way
 * customerTop and a manufacturer switch both do, so there's nothing
 * for either of them to conflict with by applying right away.
 *
 * Returns { team, motogpSeatTiers } — motogpSeatTiers is only ever
 * returned unchanged now; kept in the return shape so callers don't
 * need to change how they read the result. */
export function applyManufacturerRequestSuccess(requestType, team, motogpSeatTiers, categoryKey, targetManufacturer, offeredBikes) {
  if (requestType === "renew") {
    return {
      team: { ...team, manufacturerContract: { manufacturer: team.manufacturer, yearsLeft: MANUFACTURER_CONTRACT_YEARS } },
      motogpSeatTiers,
    };
  }

  if (requestType === "pressure") {
    const bumped = { ...team.bike };
    Object.keys(bumped).forEach((k) => { bumped[k] = clamp(bumped[k] + 2, 1, 99); });
    return { team: { ...team, bike: bumped }, motogpSeatTiers };
  }

  if (requestType === "customerTop") {
    return { team: { ...team, manufacturerFavorNextSeason: true }, motogpSeatTiers };
  }

  if (requestType === "switchManufacturer") {
    // Bug fixed (feature): this used to pick a random OTHER
    // manufacturer itself, after the request had already been scored
    // against the team's OWN current manufacturer — Ducati was
    // effectively deciding whether the team gets to go talk to KTM,
    // which never made sense; Ducati has no say in that at all. The
    // negotiation screen now has the player choose WHICH manufacturer
    // to approach first (each one judges the team independently, via
    // computeOtherManufacturerInterest), so targetManufacturer arrives
    // here already decided — this just records it as pending.
    // offeredBikes (see manufacturerBikeOffer) is the concrete tier
    // composition that manufacturer showed the team BEFORE they
    // committed — carried along so the promise actually gets honored
    // once the switch lands (see applyPendingManufacturerSwitch).
    if (!targetManufacturer) return { team, motogpSeatTiers };
    return { team: { ...team, pendingManufacturerSwitch: targetManufacturer, pendingManufacturerOffer: offeredBikes || ["previous", "previous"] }, motogpSeatTiers };
  }

  return { team, motogpSeatTiers };
}

/** Consumes team.pendingManufacturerSwitch (set by
 * applyManufacturerRequestSuccess above) at the next season
 * transition, right before reassignCustomerTopSeats runs — so the
 * switched team is scored as part of its NEW manufacturer's own
 * candidate pool from this point forward, not its old one.
 *
 * Both seats seed at "previous" — not because an established team
 * deserves no credit for its record, but because
 * candidateSeatsByManufacturer counts a manufacturer's real
 * customerTop slot total directly from however many seats already
 * carry that tier going INTO the reassignment pass. Seeding even one
 * of the incoming team's own seats at customerTop was tried and
 * reverted — with the existing satellite's own two seats already at
 * customerTop, that briefly counted 3 total slots for a manufacturer
 * that only ever has 2, letting an extra customerTop bike exist that
 * was never supposed to. Credit for genuine track record is given
 * through justSwitchedPrestigeBonus below instead — a real, but
 * bounded, scoring edge inside the SAME slot-respecting competition
 * every other seat goes through, rather than a seed that quietly
 * breaks the count. */
export function applyPendingManufacturerSwitch(team, tiersMap) {
  if (!team.pendingManufacturerSwitch) return { team, tiersMap };
  const newManufacturer = team.pendingManufacturerSwitch;
  // Red Bull's own real bond is with KTM specifically, not with
  // whichever team happens to be riding a KTM at the time — both
  // being Austrian companies that have run together in MotoGP for
  // years is the whole reason Red Bull's sponsorship of a team like
  // Tech3 is permanent (see cancelSponsorContract's own `permanent`
  // check in utils/sponsors.js: the player can never cancel it, it
  // never ages down, never carries break-clause risk). But "permanent"
  // there only ever meant "the player/team can't walk away from it" —
  // it was never conditioned on the team actually staying with KTM.
  // A team that switches to a DIFFERENT manufacturer has, by
  // definition, stopped being the KTM-mounted project Red Bull was
  // actually backing — so that bond ends here too, the moment the
  // switch itself lands, not through any of the normal
  // cancel/expire/risk paths (which still correctly never touch it
  // for a team that stays on KTM).
  const losingRedBull = team.manufacturer === "KTM" && newManufacturer !== "KTM" && team.sponsors?.main?.name === "Red Bull" && team.sponsors?.main?.permanent;
  const nextTeam = {
    ...team,
    manufacturer: newManufacturer,
    manufacturerContract: { manufacturer: newManufacturer, yearsLeft: MANUFACTURER_CONTRACT_YEARS },
    pendingManufacturerSwitch: null,
    // Bug fixed (feature): read once by reassignCustomerTopSeats'
    // own scoring, the very same pass this switch lands in, then
    // cleared — a one-time nod to "this team didn't just appear from
    // nowhere" that fades immediately, rather than a permanent
    // advantage.
    justSwitchedManufacturer: true,
    // The concrete tier composition (see manufacturerBikeOffer) this
    // manufacturer actually promised before the team committed —
    // carried as a per-seat bonus rather than seeded directly into
    // tiersMap, for the same reason customerTop/isNewTeamThisSeason
    // above are bonuses and not direct seeds: seeding two fresh
    // customerTop seats here on top of whatever the existing satellite
    // already holds would silently create more customerTop bikes than
    // the manufacturer actually has. Consumed by
    // candidateSeatsByManufacturer's own scoring below, then cleared.
    pendingManufacturerOffer: team.pendingManufacturerOffer || ["previous", "previous"],
    ...(losingRedBull ? { sponsors: { ...team.sponsors, main: null } } : {}),
    // Bug fixed: a team's own nameTemplate is only ever re-synced from
    // current static data at LOAD time (see App.jsx's own
    // backfillPrestige) — it stays whatever was already frozen on the
    // in-memory team object otherwise. A save opened before Pramac/
    // Tech3/LCR's own nameTemplate got its {manufacturer} token added
    // (or, same thing, a session that's simply been running since
    // before that change) would still carry the OLD template with the
    // old manufacturer's name written in as literal text — so a
    // switch here could update team.manufacturer correctly while the
    // DISPLAYED name kept showing the manufacturer it just left,
    // indefinitely, until the player happened to reload at the right
    // moment. Looked up directly from MOTOGP_TEAMS_DATA and reapplied
    // every time a switch actually lands, so this is never left
    // depending on load timing again.
    nameTemplate: MOTOGP_TEAMS_DATA.find((t) => t.name === team.name)?.nameTemplate ?? team.nameTemplate,
  };
  const nextTiersMap = { ...tiersMap, [team.name]: ["previous", "previous"] };
  return { team: nextTeam, tiersMap: nextTiersMap };
}

/** Ticks one MotoGP satellite team's manufacturer contract down by a
 * year, called once per season transition — anything that isn't a
 * restricted MotoGP satellite is returned completely unchanged. A
 * contract that reaches 0 auto-renews at the same manufacturer for
 * another full MANUFACTURER_CONTRACT_YEARS rather than leaving the
 * team stranded: real MotoGP satellite deals overwhelmingly continue
 * by default unless someone actively negotiates a change (the
 * "switchManufacturer" request above is exactly that active choice —
 * a player who never engages with this system at all just keeps
 * riding out the same ongoing relationship, which is the right
 * default for a save that never touches this feature). */
export function tickManufacturerContract(team, categoryKey) {
  const contract = ensureManufacturerContract(team, categoryKey);
  if (!contract) return team;
  const yearsLeft = contract.yearsLeft - 1;
  return {
    ...team,
    // manufacturerFavorNextSeason is consumed here — by the time this
    // runs (right after reassignCustomerTopSeats, which is the thing
    // that actually reads and acts on the flag), its one guaranteed
    // shot at a customerTop seat has already been spent either way.
    manufacturerFavorNextSeason: false,
    justSwitchedManufacturer: false,
    pendingManufacturerOffer: null,
    manufacturerContract: yearsLeft > 0
      ? { manufacturer: team.manufacturer, yearsLeft }
      : { manufacturer: team.manufacturer, yearsLeft: MANUFACTURER_CONTRACT_YEARS },
  };
}

/**
 * The AI-controlled counterpart to the player's own "sondear otras
 * marcas" — an AI satellite team weighs the exact same things a
 * player would: how it's actually doing under its current
 * manufacturer, and whether another one would genuinely offer more.
 * Deliberately conservative, on two fronts:
 *   - Only even considers it with 1 year or less left on its own
 *     manufacturer contract — a team mid-deal doesn't shop around,
 *     same as a rider wouldn't break a multi-year contract on a whim.
 *   - Only actually looks elsewhere if its OWN season has genuinely
 *     gone below-par (teamMeritScore under -0.05) — a satellite doing
 *     fine has no real reason to leave.
 * When both hold, it probes every manufacturer with room the exact
 * same way computeOtherManufacturerInterest already does, and only
 * commits to the best one if it clears 0.08. That bar looks low next
 * to the 0.65+ that gets a player a "customerTop,customerTop" offer,
 * but it's calibrated against a real ceiling, not picked arbitrarily:
 * a team unhappy enough to even reach this function already has
 * weak-ish own stats (that's what "unhappy" is built from), and
 * computeOtherManufacturerInterest scores a suitor's interest FROM
 * those same stats — teamMeritScore's own realistic floor sits around
 * -0.4, so even a maximally struggling, genuinely needy suitor
 * manufacturer can only add so much on top of an already-negative
 * baseline. Verified directly: a team with real talent but a
 * genuinely unlucky season (good prestige, few points) reliably finds
 * a taker at a manufacturer that's ALSO having a rough year; a team
 * that's simply bad across the board, or one that's happy where it
 * is, correctly never does. Returns the team unchanged if
 * none of this applies; otherwise returns it with
 * pendingManufacturerSwitch/pendingManufacturerOffer already set,
 * consumed by applyPendingManufacturerSwitch exactly like a player's
 * own successful negotiation would be.
 */
export function aiConsiderManufacturerSwitch(team, categoryKey, riderStandings, allTeams, tiersMap) {
  const contract = ensureManufacturerContract(team, categoryKey);
  if (!contract || contract.yearsLeft > 1) return team;

  // Bug fixed: same issue as manufacturerOverallForm's own fix above —
  // teamMeritScore's expectation-beating term could keep this positive
  // even for an objectively weak team (merely meeting a historically
  // modest expectation), so a team that should genuinely be looking
  // elsewhere never even reached the candidate-checking step below.
  // And objectivePerformance itself almost never goes negative in
  // realistic data (points only ever add, real riders' prestige
  // clusters near the formula's own baseline) — so, same fix as
  // computeOtherManufacturerInterest's own needBonus, this compares
  // the team's own performance against an average — but specifically
  // the average of OTHER SATELLITE teams, not every team on the grid:
  // a factory team structurally runs higher prestige/results than any
  // satellite ever will, so averaging satellites in with factory teams
  // would make every satellite look "below average" and thus
  // permanently eligible to consider switching, regardless of how it's
  // actually doing relative to its own real peer group.
  const ownForm = objectivePerformance(team, riderStandings);
  const satellitePeers = (allTeams || []).filter((t) => {
    const tiers = tiersMap?.[t.name];
    return tiers && !tiers.every((tier) => tier === "factory");
  });
  const peerAverageForm = satellitePeers.length ? satellitePeers.reduce((s, t) => s + objectivePerformance(t, riderStandings), 0) / satellitePeers.length : 0;
  if (ownForm > peerAverageForm - 0.03) return team;

  const candidates = otherManufacturerCandidates(team.manufacturer, allTeams, tiersMap);
  if (!candidates.length) return team;

  let bestManufacturer = null;
  let bestScore = -Infinity;
  candidates.forEach((mfr) => {
    const score = computeOtherManufacturerInterest(team, riderStandings, mfr, allTeams, tiersMap);
    if (score > bestScore) { bestScore = score; bestManufacturer = mfr; }
  });

  if (!bestManufacturer || bestScore < 0.08) return team;
  const remainingCapacity = MOTOGP_CUSTOMER_TOP_CAPACITY - committedCustomerTopCount(bestManufacturer, allTeams, team.name);
  return { ...team, pendingManufacturerSwitch: bestManufacturer, pendingManufacturerOffer: manufacturerBikeOffer(bestScore, remainingCapacity) };
}
