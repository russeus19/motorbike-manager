import { clamp } from "./random.js";
import { isRestrictedMotoGpSatellite } from "../data/motogpBikeTiers.js";
import { MANUFACTURERS } from "../data/manufacturers.js";

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
function teamMeritScore(team, riderStandings) {
  let score = 0;
  const riders = team.riders || [];
  const points = riders.reduce((s, r) => s + (riderStandings?.[r.id]?.points ?? 0), 0);
  const avgPrestige = riders.length ? riders.reduce((s, r) => s + (r.prestige ?? 0), 0) / riders.length : 0;

  score += clamp(points / 260, 0, 0.35);
  score += clamp((avgPrestige - 150) / 220, -0.15, 0.2);
  score += clamp(((team.prestige ?? 0) - 150) / 320, -0.1, 0.15);

  const ranked = Object.entries(riderStandings || {}).sort((a, b) => (b[1]?.points ?? 0) - (a[1]?.points ?? 0));
  riders.forEach((r) => {
    if (!r.expectation) return;
    const expectedRank = { "Luchar por el campeonato": 2, "Entrar en el Top 5": 5.5, "Luchar por el Top 10": 10.5, "Estar regularmente en los puntos": 16.5, "Intentar puntuar": 22 }[r.expectation];
    const actualRank = ranked.findIndex(([id]) => id === r.id) + 1;
    if (expectedRank && actualRank) score += clamp((expectedRank - actualRank) / 40, -0.1, 0.12);
  });

  return score;
}

/** The current manufacturer's own willingness to grant "renovar",
 * "presionar" or "pedir la moto cliente-top" — switchManufacturer is
 * NOT scored here anymore (bug fixed below explains why). */
export function computeManufacturerRequestScore(requestType, team, riderStandings, categoryKey) {
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
export function computeOtherManufacturerInterest(team, riderStandings) {
  return clamp(0.14 + teamMeritScore(team, riderStandings), 0.03, 0.95);
}

/** A manufacturer besides the team's own current one, currently the
 * works team of some OTHER MotoGP outfit — the pool switchManufacturer
 * actually draws its offer from. Doesn't include manufacturers with
 * no factory presence in the game at all (there's no "sleeping brand
 * returns" system yet — see the session's own earlier design notes —
 * so this only ever offers a switch to a manufacturer already racing). */
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
export function applyManufacturerRequestSuccess(requestType, team, motogpSeatTiers, categoryKey, targetManufacturer) {
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
    if (!targetManufacturer) return { team, motogpSeatTiers };
    return { team: { ...team, pendingManufacturerSwitch: targetManufacturer }, motogpSeatTiers };
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
    manufacturerContract: yearsLeft > 0
      ? { manufacturer: team.manufacturer, yearsLeft }
      : { manufacturer: team.manufacturer, yearsLeft: MANUFACTURER_CONTRACT_YEARS },
  };
}
