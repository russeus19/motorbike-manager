import { finalizeRiderEconomics } from "./riders.js";

/** Which real-world test rider belongs to which MotoGP factory team,
 * matched by the team's own static NAME (see data/teamsMotoGP.js) —
 * every one of these 5 already exists in data/freeAgentLegends.js as a
 * plain free agent, so this only ever needs to find them by name and
 * move them across, never invent new rider data. */
export const MOTOGP_TEST_RIDER_ASSIGNMENTS = {
  "Ducati Lenovo Team": "Michele Pirro",
  "Aprilia Racing": "Lorenzo Savadori",
  "Red Bull KTM Factory Racing": "Pol Espargaró",
  "Monster Energy Yamaha MotoGP": "Augusto Fernández",
  "Honda HRC Castrol": "Takaaki Nakagami",
};

/** Marks a rider as a test rider — the same shape a titular's own
 * contract carries (contractYears/salary/marketValue, via the exact
 * same finalizeRiderEconomics every other signing goes through), plus
 * `role: "probador"` so every other system (MyRidersPanel's own
 * section split, the season-history entry, the injury/substitute
 * mechanic) can tell the two apart with one flat check rather than
 * re-deriving it from context each time. */
export function markAsTestRider(rider, scale = 1, contractYears = 3) {
  const withRole = { ...rider, role: "probador" };
  return finalizeRiderEconomics(withRole, scale, contractYears);
}

/**
 * Bug fixed (feature): every MotoGP factory team's own real test
 * rider (Pirro, Savadori, both Espargarós — no wait, just Pol —,
 * Fernández, Nakagami) already existed in the free-agent legends pool
 * as an ordinary, contract-less rider, exactly like any other veteran
 * free agent — nothing ever placed them at their real team in their
 * real role. Idempotent and safe to call repeatedly (on a fresh new
 * game AND as part of the same load-time repair pass
 * backfillPrestige already runs in App.jsx — see that function's own
 * comment on why static-data-driven fixups live there): a team that
 * already has its own `testRider` set is left completely untouched,
 * and a named legend already signed away is only ever pulled from the
 * CURRENT free-agent pool, never conjured from nothing if they're not
 * there (already hired as a titular somewhere, say — vanishingly
 * unlikely for a 30-something legend but never assumed impossible).
 *
 * Returns { teams: updated MotoGP team list, freeAgents: the pool
 * with any newly-assigned test riders removed } — both always
 * returned even when nothing changed, so every caller can destructure
 * unconditionally.
 */
export function seedMotoGpTestRiders(motogpTeams, freeAgents, scale = 1) {
  let pool = freeAgents || [];
  const teams = (motogpTeams || []).map((team) => {
    if (team.testRider) return team;
    const legendName = MOTOGP_TEST_RIDER_ASSIGNMENTS[team.name];
    if (!legendName) return team;
    const found = pool.find((r) => r.name === legendName);
    if (!found) return team;
    pool = pool.filter((r) => r.id !== found.id);
    return { ...team, testRider: markAsTestRider(found, scale) };
  });
  return { teams, freeAgents: pool };
}
