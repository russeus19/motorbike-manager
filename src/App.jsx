import { useState, useEffect, useCallback } from "react";
import { LogOut, Save } from "lucide-react";
import { SPRINT_POINTS } from "./data/pointsSystem.js";
import { useGoogleFonts } from "./hooks/useGoogleFonts.js";
import { NotificationCenterModal } from "./components/NotificationCenter.jsx";
import { RiderProfileModal } from "./components/RiderProfileModal.jsx";
import { SaveSlotsModal } from "./components/SaveSlotsModal.jsx";
import { TeamProfileModal } from "./components/TeamProfileModal.jsx";
import { CATEGORY_DATA, CATEGORY_ORDER } from "./data/categories.js";
import { CIRCUITS, CIRCUIT_PROFILES } from "./data/circuits.js";
import { COLORS } from "./data/colors.js";
import { CareerNameScreen, CareerOffersScreen, CareerPickerScreen } from "./pages/CareerSetup.jsx";
import { SubstituteScreen } from "./pages/InjurySubstitute.jsx";
import { SlotPickScreen } from "./pages/LoadGame.jsx";
import { HomeScreen } from "./pages/MainMenu.jsx";
import { SetupScreen } from "./pages/QuickSetup.jsx";
import { ResultScreen } from "./pages/RaceResult.jsx";
import { QualifyingScreen } from "./pages/QualifyingResult.jsx";
import { SeasonEndScreen } from "./pages/SeasonEnd.jsx";
import { RosterCompletionScreen } from "./pages/RosterCompletion.jsx";
import { SeasonScreen } from "./pages/SeasonHub.jsx";
import { MarketSummaryScreen } from "./pages/TransferSummary.jsx";
import { acceptPendingPackage, advanceFacilityUpgrades, advanceTeamProjects, bikeAvg, canStartFacilityUpgrade, canStartProject, discardPendingPackage, processApprovedPackages, rolloverBike, startFacilityUpgrade, startProjectOnTeam } from "./utils/bikeDevelopment.js";
import { BikePackageModal } from "./components/BikePackageModal.jsx";
import { validateAndRepairTeam, validateAndRepairTeams, validateGlobalRiderIntegrity } from "./utils/careerValidation.js";
import { mergeNotificationItems, markAllNotificationsRead, countUnread } from "./utils/notifications.js";
import { buildClassificationDisplay, buildEntries, bumpCareerStats, findInTeamRoster, simulateFullGridRound, simulateQualifying, simulateRound } from "./utils/raceSimulation.js";
import { buildGpHistoryEntry } from "./utils/raceHistory.js";
import { acceptCounterOffer, applyConfirmedNegotiations, applyReleasedAtSeasonEnd, applyRenewalsToTeam, buildMarketSummaryByCategory, createNegotiation, modifyOffer, needsTeamCompensation, nextSeasonCommittedRiderCount, resolvePendingNegotiations, tickMarket, withdrawOffer } from "./utils/marketNegotiations.js";
import { processTeamAfterRace } from "./utils/raceWeekend.js";
import { clamp } from "./utils/random.js";
import { evolveRider, evolveRoster } from "./utils/riderEvolution.js";
import { instantiateTeams, seedLegendFreeAgents } from "./utils/riderGeneration.js";
import { applyMoraleToCategoryTeams } from "./utils/riderMorale.js";
import { computeReleaseAtSeasonEndCost, fireRiderCost, isFreeAgentEligibleForCategory, overallRating, photoIdFor, substituteHireCost } from "./utils/riders.js";
import { SAVE_SLOT_IDS } from "./utils/saveSlotFormat.js";
import { applyTeamPrestigeEvolution, ensureRiderPrestige, ensureTeamPrestige } from "./utils/prestige.js";
import { buildSeasonHistoryEntry, recordSeasonHistory, shouldRetire } from "./utils/seasonHistory.js";
import { assignSeasonExpectations } from "./utils/teamExpectations.js";
import { releaseSubstitutesToPool, resolveSeasonMarketAcrossCategories } from "./utils/transferMarket.js";
import { consumeWarehouseForResult, initWarehouse, queueWarehouseProduction, urgentWarehouseProduction, warehouseCost } from "./utils/warehouseEngine.js";

/**
 * A player rider who leaves the roster via "designar para quedar libre"
 * or a successful promotion attempt is removed from playerTeam.riders
 * before applyConfirmedNegotiations/recordSeasonHistory ever run on the
 * played category — so without this, the season they just raced for
 * the player's team would never get recorded, and their profile would
 * wrongly show "aún no ha completado ninguna temporada".
 */
function finalizePlayerDepartureHistory(rider, teamName, standingsForCategory, categoryKey, seasonNum) {
  const entry = buildSeasonHistoryEntry(rider.id, teamName, standingsForCategory, categoryKey, seasonNum);
  if (!entry) return rider;
  return { ...rider, history: [...(rider.history || []), entry] };
}

export default function MotorbikeManager() {
  const [phase, setPhase] = useState("home"); // home | loadslots | setup | career-name | career-picker | season | result | seasonend | career-offers | market

  // Pre-game "draft" state — only used by the setup/career-name screens
  // before a game object exists.
  const [draftManagerName, setDraftManagerName] = useState("");
  const [draftCategory, setDraftCategory] = useState("motogp");
  const [teams, setTeams] = useState(() => instantiateTeams("motogp"));

  const [gameMode, setGameMode] = useState(null); // 'quick' | 'career'
  const [activeSlot, setActiveSlot] = useState(null);
  const [slotsMeta, setSlotsMeta] = useState(() => Object.fromEntries(SAVE_SLOT_IDS.map((n) => [n, null])));
  const [careerStarterOptions, setCareerStarterOptions] = useState(null); // { allTeams, choices }
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [saveModal, setSaveModal] = useState({ open: false, andExit: false, pendingOverwrite: null });

  // --- THE single source of truth for an in-progress game. Every field in
  // here is plain JSON-serializable data (no functions, no React elements,
  // no class instances), so `JSON.stringify(game)` always captures the
  // complete, exact game state — nothing saved separately, nothing that
  // can silently fall out of sync. ---
  const [game, setGame] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null);
  const [openPackageId, setOpenPackageId] = useState(null);
  const [teamProfileTarget, setTeamProfileTarget] = useState(null);

  const storageOk = typeof window !== "undefined" && window.storage;
  const inGame = phase === "season" || phase === "qualifying" || phase === "sprint" || phase === "result" || phase === "seasonend" || phase === "market" || phase === "career-offers" || phase === "market-summary" || phase === "substitute-select";

  // Derived reads from `game` (used by all the gameplay logic below,
  // exactly like the individual useState values they replace).
  const category = game?.category;
  const managerName = game?.managerName ?? "";
  const playerTeam = game?.playerTeam ?? null;
  const rivalTeams = game?.rivalTeams ?? [];
  const otherCategories = game?.otherCategories ?? {};
  const freeAgents = game?.freeAgents ?? [];
  const round = game?.round ?? 0;
  const seasonNumber = game?.seasonNumber ?? 1;
  const budget = game?.budget ?? 0;
  const riderStandings = game?.riderStandings ?? {};
  const riderWins = game?.riderWins ?? {};
  const riderPodiums = game?.riderPodiums ?? {};
  const sprintWins = game?.sprintWins ?? {};
  const sprintPodiums = game?.sprintPodiums ?? {};
  const teamStandings = game?.teamStandings ?? {};
  const lastResult = game?.lastResult ?? null;
  const gpHistory = game?.gpHistory ?? [];
  const marketRumors = game?.marketRumors ?? [];
  const marketNegotiations = game?.marketNegotiations ?? [];
  const seasonEvents = game?.seasonEvents ?? [];
  const careerOffers = game?.careerOffers ?? [];
  const marketSummary = game?.marketSummary ?? null;
  const notifications = game?.notifications ?? { motogp: [], moto2: [], moto3: [] };
  const pendingSubstitution = game?.pendingSubstitution ?? null;
  const pendingQualifying = game?.pendingQualifying ?? null;
  const pendingSprintResult = game?.pendingSprintResult ?? null;
  const pendingSprintForHistory = game?.pendingSprintForHistory ?? null;
  const scale = category ? CATEGORY_DATA[category].scale : 1;

  /* Thin "setter" wrappers so all the existing gameplay logic below can
     keep calling setPlayerTeam(...), setBudget(x => x - cost), etc. exactly
     as before — each one just patches a single field of `game` instead of
     its own independent useState. Using the functional setGame form means
     several of these can be called back-to-back in the same event handler
     (as runRace/runSeasonTransition do) without reading stale data. */
  function makeFieldSetter(key) {
    return (updater) => {
      setGame((g) => {
        if (!g) return g;
        const nextValue = typeof updater === "function" ? updater(g[key]) : updater;
        return { ...g, [key]: nextValue };
      });
    };
  }
  const setCategory = makeFieldSetter("category");
  const setPlayerTeam = makeFieldSetter("playerTeam");
  const setRivalTeams = makeFieldSetter("rivalTeams");
  const setOtherCategories = makeFieldSetter("otherCategories");
  const setFreeAgents = makeFieldSetter("freeAgents");
  const setRound = makeFieldSetter("round");
  const setSeasonNumber = makeFieldSetter("seasonNumber");
  const setBudget = makeFieldSetter("budget");
  const setRiderStandings = makeFieldSetter("riderStandings");
  const setRiderWins = makeFieldSetter("riderWins");
  const setRiderPodiums = makeFieldSetter("riderPodiums");
  const setSprintWins = makeFieldSetter("sprintWins");
  const setSprintPodiums = makeFieldSetter("sprintPodiums");
  const setTeamStandings = makeFieldSetter("teamStandings");
  const setLastResult = makeFieldSetter("lastResult");
  const setSeasonEvents = makeFieldSetter("seasonEvents");
  const setMarketNegotiations = makeFieldSetter("marketNegotiations");
  const setMarketRumors = makeFieldSetter("marketRumors");
  const setCareerOffers = makeFieldSetter("careerOffers");
  const setMarketSummary = makeFieldSetter("marketSummary");
  const setNotifications = makeFieldSetter("notifications");
  const setPendingSubstitution = makeFieldSetter("pendingSubstitution");

  /* Each of the three categories keeps its own independent, chronological
     history (newest first, capped at 50) — MotoGP news never mixes with
     Moto2 or Moto3 news, and switching tabs never touches the others'
     history. Events are only ever appended when something actually
     happens (a race, a market resolution), never recomputed on render. */
  function pushNotifications(items) {
    if (!items || !items.length) return;
    setNotifications((prev) => mergeNotificationItems(prev, items, category));
  }

  function openProfile(rider, teamName, categoryKey) {
    setProfileTarget({ rider, teamName, categoryKey });
  }

  /* profileTarget is a snapshot taken at the moment a name was clicked.
     Re-resolve it against the live game state every render so actions
     like renewing or firing a contract show up immediately instead of
     needing the profile to be closed and reopened. */
  function resolveLiveProfileTarget() {
    if (!profileTarget) return null;
    const id = profileTarget.rider.id;
    if (playerTeam) {
      const own = findInTeamRoster(playerTeam, id);
      if (own) return { rider: own, teamName: playerTeam.name, categoryKey: category };
    }
    for (const t of rivalTeams) {
      const found = findInTeamRoster(t, id);
      if (found) return { rider: found, teamName: t.name, categoryKey: category };
    }
    for (const [key, catState] of Object.entries(otherCategories)) {
      for (const t of catState.teams) {
        const found = findInTeamRoster(t, id);
        if (found) return { rider: found, teamName: t.name, categoryKey: key };
      }
    }
    const fa = freeAgents.find((r) => r.id === id);
    if (fa) return { rider: fa, teamName: "Agente libre", categoryKey: profileTarget.categoryKey };
    return profileTarget;
  }

  function openTeamProfile(team, categoryKey) {
    setTeamProfileTarget({ teamId: team.id, categoryKey });
  }

  /* Same idea as resolveLiveProfileTarget: re-resolve the team by id
     against live state every render so budget/development/roster changes
     show up immediately without needing to close and reopen the modal. */
  function resolveLiveTeamProfileTarget() {
    if (!teamProfileTarget) return null;
    const { teamId, categoryKey } = teamProfileTarget;
    if (categoryKey === category) {
      if (playerTeam && playerTeam.id === teamId) return { team: playerTeam, categoryKey };
      const rival = rivalTeams.find((t) => t.id === teamId);
      if (rival) return { team: rival, categoryKey };
    }
    const catState = otherCategories[categoryKey];
    if (catState) {
      const found = catState.teams.find((t) => t.id === teamId);
      if (found) return { team: found, categoryKey };
    }
    return null;
  }

  function getUpperCategory(catKey) {
    return CATEGORY_ORDER.find((k) => CATEGORY_DATA[k].lower === catKey) || null;
  }

  /* Look up a rider's live object anywhere in the currently loaded world,
     given the category they belong to (used from standings lists, which
     only keep id/name/points). */
  function findRiderInCategory(catKey, id) {
    if (catKey === category) {
      const own = playerTeam ? findInTeamRoster(playerTeam, id) : null;
      if (own) return { rider: own, teamName: playerTeam.name };
      for (const t of rivalTeams) {
        const found = findInTeamRoster(t, id);
        if (found) return { rider: found, teamName: t.name };
      }
      return null;
    }
    const catState = otherCategories[catKey];
    if (!catState) return null;
    for (const t of catState.teams) {
      const found = findInTeamRoster(t, id);
      if (found) return { rider: found, teamName: t.name };
    }
    return null;
  }

  /* Shared lookups for the market negotiation engine (utils/marketNegotiations.js):
     find a team or a rider by id within a given category, regardless of
     whether that category is the one currently being played. */
  function findTeamById(teamId, catKey) {
    if (!teamId) return null;
    if (catKey === category) {
      if (playerTeam && playerTeam.id === teamId) return playerTeam;
      return rivalTeams.find((t) => t.id === teamId) || null;
    }
    return (otherCategories[catKey]?.teams || []).find((t) => t.id === teamId) || null;
  }

  function findRiderById(riderId, catKey) {
    const found = findRiderInCategory(catKey, riderId);
    if (found) return found.rider;
    return freeAgents.find((r) => r.id === riderId) || null;
  }

  /* Opens a rider's profile purely from an id + category — shared by the
     negotiation-click handler below and by clickable names inside
     market rumors. */
  function openRiderProfileById(riderId, categoryKey) {
    const found = findRiderInCategory(categoryKey, riderId);
    if (found) { openProfile(found.rider, found.teamName, categoryKey); return; }
    const freeAgent = freeAgents.find((r) => r.id === riderId);
    if (freeAgent) openProfile(freeAgent, "Agente libre", null);
  }

  /* Opens a team's profile purely from an id + category — same idea for
     clickable team names inside rumors. */
  function openTeamProfileById(teamId, categoryKey) {
    const team = findTeamById(teamId, categoryKey);
    if (team) openTeamProfile(team, categoryKey);
  }

  /* Opens the same rider profile (and, when relevant, the same
     negotiation form) from a row in the "Ofertas" panel — a
     contraoferta is just another reason to look at that rider's
     profile, not a separate screen. */
  function openProfileFromNegotiation(neg) {
    openRiderProfileById(neg.riderId, neg.categoryKey);
  }

  async function loadAllSlots() {
    const next = Object.fromEntries(SAVE_SLOT_IDS.map((n) => [n, null]));
    if (!storageOk) { setSlotsMeta(next); return; }
    for (const n of SAVE_SLOT_IDS) {
      try {
        const res = await window.storage.get(`mbman-slot-${n}`, false);
        if (res && res.value) next[n] = JSON.parse(res.value);
      } catch (e) { /* empty slot — this is expected and not an error */ }
    }
    setSlotsMeta(next);
  }

  function goHome() {
    setPhase("home");
    setGame(null);
  }

  function goQuick() {
    setGameMode("quick");
    loadAllSlots();
    setPhase("slotpick-new");
  }

  function goCareer() {
    setGameMode("career");
    loadAllSlots();
    setPhase("slotpick-new");
  }

  function goLoadMenu() {
    loadAllSlots();
    setPhase("loadslots");
  }

  function pickSlotForNewGame(n) {
    setActiveSlot(n);
    if (gameMode === "quick") {
      setPhase("setup");
    } else {
      setPhase("career-name");
    }
  }

  const ONBOARDING_PHASES = ["home", "setup", "career-name", "career-picker", "slotpick-new", "loadslots"];

  function loadFromSlot(n, data) {
    setActiveSlot(n);
    const restoredGameMode = data.gameMode || "quick";
    setGameMode(restoredGameMode);

    // Compatibility: a save made before a feature existed (techBase,
    // factory, staff, warehouse fields added along the way...) still
    // needs to load into a fully valid team shape. This reuses the exact
    // same repair pass already trusted at season-end — no separate
    // "load-time" normalization logic to keep in sync with it.
    const category = data.category || "moto3";
    const backfillPrestige = (t, catKey) => {
      if (!t) return t;
      // A save from before "suspensión" was renamed to "freno" still has
      // bike.suspension instead of bike.freno — migrate it here so every
      // team's bike shape is current the moment it loads.
      let migratedBike = t.bike;
      if (migratedBike && migratedBike.freno == null && migratedBike.suspension != null) {
        const { suspension, ...rest } = migratedBike;
        migratedBike = { ...rest, freno: suspension };
      }
      const withBike = migratedBike === t.bike ? t : { ...t, bike: migratedBike };
      const withManufacturer = withBike.manufacturer
        ? withBike
        : { ...withBike, manufacturer: CATEGORY_DATA[catKey]?.teams?.find((td) => td.name === withBike.name)?.manufacturer };
      const withTeam = ensureTeamPrestige(withManufacturer, catKey);
      return { ...withTeam, riders: withTeam.riders.map((r) => ensureRiderPrestige(r, catKey)) };
    };
    const playerTeam = data.playerTeam
      ? backfillPrestige(validateAndRepairTeams([data.playerTeam], CATEGORY_DATA[category]?.scale ?? 1).teams[0], category)
      : null;
    const rivalTeams = validateAndRepairTeams(data.rivalTeams || [], CATEGORY_DATA[category]?.scale ?? 1).teams.map((t) => backfillPrestige(t, category));
    const otherCategories = {};
    Object.entries(data.otherCategories || {}).forEach(([key, catState]) => {
      const { teams } = validateAndRepairTeams(catState?.teams || [], CATEGORY_DATA[key]?.scale ?? 1);
      otherCategories[key] = { ...catState, teams: teams.map((t) => backfillPrestige(t, key)) };
    });

    setGame({
      notifications: { motogp: [], moto2: [], moto3: [] },
      pendingSubstitution: null,
      riderPodiums: {},
      sprintWins: {},
      sprintPodiums: {},
      ...data,
      gameMode: restoredGameMode,
      playerTeam,
      rivalTeams,
      otherCategories,
    });

    // Bulletproof phase restoration — this is the actual fix for "loading
    // a save shows the manager-creation screen again". A save that has a
    // valid playerTeam is unambiguously an in-progress game: whatever
    // `phase` was recorded as, it must never resolve to an onboarding
    // screen (those only make sense when there's no game yet at all).
    // This guarantees the bug can't recur even if some future change
    // reintroduces whatever originally caused phase to be wrong.
    let restoredPhase = data.phase;
    if (!playerTeam) {
      restoredPhase = "home";
    } else if (!restoredPhase || ONBOARDING_PHASES.includes(restoredPhase)) {
      restoredPhase = (data.round ?? 0) >= CIRCUITS.length ? "seasonend" : "season";
    }
    if (restoredPhase === "season") {
      const riderNeeding = findRiderNeedingSubstitute(playerTeam);
      if (riderNeeding) {
        setPendingSubstitution({ teamId: playerTeam.id, riderId: riderNeeding.id, riderName: riderNeeding.name });
        restoredPhase = "substitute-select";
      }
    }
    setPhase(restoredPhase);
  }

  async function deleteSlot(n) {
    if (!storageOk) return;
    await window.storage.delete(`mbman-slot-${n}`);
    await loadAllSlots();
  }

  function submitCareerName() {
    if (!draftManagerName.trim()) return;
    const moto3Teams = instantiateTeams("moto3");
    const ranked = [...moto3Teams].sort((a, b) => bikeAvg(a.bike) - bikeAvg(b.bike));
    const worst = ranked.slice(0, 6);
    const shuffled = [...worst].sort(() => Math.random() - 0.5).slice(0, 3);
    setCareerStarterOptions({ allTeams: moto3Teams, choices: shuffled });
    setPhase("career-picker");
  }

  function chooseCareerTeam(chosenTeamRaw) {
    const allTeams = careerStarterOptions.allTeams;
    const rivalsRaw = allTeams.filter((t) => t.id !== chosenTeamRaw.id);
    // Season 1 has no research history yet, so it's excluded from the
    // strength calculation here (see computeTeamStrengthScore).
    const [chosenTeam, ...rivals] = assignSeasonExpectations([chosenTeamRaw, ...rivalsRaw], false);
    const rsFixed = {};
    chosenTeam.riders.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: chosenTeam.name, points: 0 }; });
    rivals.forEach((t) => t.riders.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: t.name, points: 0 }; }));
    const ts = { player: 0 };
    rivals.forEach((t) => { ts[t.id] = 0; });

    const otherKeys = CATEGORY_ORDER.filter((k) => k !== "moto3");
    const initOther = {};
    otherKeys.forEach((k) => {
      const t = assignSeasonExpectations(instantiateTeams(k), false);
      const rs = {}; t.forEach((team) => team.riders.forEach((r) => { rs[r.id] = { name: r.name, teamName: team.name, points: 0 }; }));
      const tts = {}; t.forEach((team) => { tts[team.id] = 0; });
      initOther[k] = { teams: t, riderStandings: rs, teamStandings: tts, riderWins: {}, riderPodiums: {}, sprintWins: {}, sprintPodiums: {}, seasonNumber: 1 };
    });

    setGame({
      gameMode: "career",
      managerName: draftManagerName.trim(),
      category: "moto3",
      playerTeam: { ...chosenTeam, id: "player" },
      rivalTeams: rivals,
      otherCategories: initOther,
      freeAgents: seedLegendFreeAgents(),
      round: 0,
      seasonNumber: 1,
      budget: chosenTeam.budget,
      riderStandings: rsFixed,
      riderWins: {}, riderPodiums: {}, sprintWins: {}, sprintPodiums: {},
      teamStandings: ts,
      lastResult: null,
      gpHistory: [],
      marketRumors: [],
      marketNegotiations: [],
      seasonEvents: [],
      careerOffers: [],
      marketSummary: null,
      notifications: { motogp: [], moto2: [], moto3: [] },
      pendingSubstitution: null,
    });
    setCareerStarterOptions(null);
    setPhase("season");
  }

  /* Compute end-of-season career offers: better same-category teams that
     finished above the player, plus (on a strong season) one seat at the
     weakest team of the category above. */
  function computeCareerOffers() {
    const teamRows = [
      { id: "player", points: teamStandings.player || 0 },
      ...rivalTeams.map((t) => ({ id: t.id, points: teamStandings[t.id] || 0 })),
    ].sort((a, b) => b.points - a.points);
    const myPos = teamRows.findIndex((t) => t.id === "player") + 1;

    const betterTeams = rivalTeams.filter((t) => (teamStandings[t.id] || 0) > (teamStandings.player || 0));
    const shuffledBetter = [...betterTeams].sort(() => Math.random() - 0.5).slice(0, 2);
    const offers = shuffledBetter.map((t) => ({ kind: "lateral", team: t }));

    const upperKey = getUpperCategory(category);
    if (upperKey && myPos <= 3 && otherCategories[upperKey]) {
      const upperTeams = otherCategories[upperKey].teams;
      const weakest = [...upperTeams].sort((a, b) => bikeAvg(a.bike) - bikeAvg(b.bike))[0];
      if (weakest) offers.push({ kind: "promotion", team: weakest, categoryKey: upperKey });
    }
    return offers;
  }

  function declineCareerOffers() {
    setCareerOffers([]);
    runSeasonTransition();
  }

  function acceptCareerOffer(offer) {
    if (offer.kind === "lateral") {
      const newTeamId = offer.team.id;
      const oldPlayerAsRegular = { ...playerTeam, id: newTeamId };
      const newRivals = rivalTeams.map((t) => (t.id === newTeamId ? oldPlayerAsRegular : t));
      setPlayerTeam({ ...offer.team, id: "player" });
      setRivalTeams(newRivals);
      setCareerOffers([]);
      // Rebuild standings fresh for the new season with the swapped roster
      const rsFixed = {};
      offer.team.riders.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: offer.team.name, points: 0 }; });
      newRivals.forEach((t) => t.riders.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: t.name, points: 0 }; }));
      const ts = { player: 0 };
      newRivals.forEach((t) => { ts[t.id] = 0; });
      setRiderStandings(rsFixed);
      setRiderWins({});
    setRiderPodiums({});
    setSprintWins({});
    setSprintPodiums({});
      setTeamStandings(ts);
      goToMarketWith({ ...offer.team, id: "player" }, newRivals, ts, otherCategories, category);
      return;
    }

    // Promotion: move up to the category above, taking over an existing
    // team there. Your old team (with your old riders) stays behind as a
    // regular AI team in what becomes the new background category.
    const newCategory = offer.categoryKey;
    const newCatState = otherCategories[newCategory];
    const newPlayerTeamRaw = newCatState.teams.find((t) => t.id === offer.team.id);
    const newRivals = newCatState.teams.filter((t) => t.id !== offer.team.id);

    const oldCatTeams = [...rivalTeams, { ...playerTeam, id: playerTeam.id === "player" ? `${category}-former-player` : playerTeam.id }];
    const oldRs = {}; oldCatTeams.forEach((t) => t.riders.forEach((r) => { oldRs[r.id] = { name: r.name, teamName: t.name, points: 0 }; }));
    const oldTs = {}; oldCatTeams.forEach((t) => { oldTs[t.id] = 0; });

    const nextOtherCats = { ...otherCategories };
    delete nextOtherCats[newCategory];
    nextOtherCats[category] = { teams: oldCatTeams, riderStandings: oldRs, teamStandings: oldTs, riderWins: {}, riderPodiums: {}, sprintWins: {}, sprintPodiums: {}, seasonNumber: seasonNumber + 1 };

    const rsFixed = {};
    newPlayerTeamRaw.riders.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: newPlayerTeamRaw.name, points: 0 }; });
    newRivals.forEach((t) => t.riders.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: t.name, points: 0 }; }));
    const ts = { player: 0 };
    newRivals.forEach((t) => { ts[t.id] = 0; });

    const newPlayerTeam = { ...newPlayerTeamRaw, id: "player" };
    setCategory(newCategory);
    setPlayerTeam(newPlayerTeam);
    setRivalTeams(newRivals);
    setOtherCategories(nextOtherCats);
    setBudget(newPlayerTeamRaw.budget || 1500000);
    setRiderStandings(rsFixed);
    setRiderWins({});
    setRiderPodiums({});
    setSprintWins({});
    setSprintPodiums({});
    setTeamStandings(ts);
    setSeasonNumber(newCatState.seasonNumber);
    setCareerOffers([]);
    goToMarketWith(newPlayerTeam, newRivals, ts, nextOtherCats, newCategory);
  }

  /* Variant of runSeasonTransition that takes explicit context, used
     right after a career-mode team switch (state setters haven't
     flushed yet). */
  function goToMarketWith(pTeam, rTeams, tStandings, otherCats, cat) {
    runSeasonTransition({ playerTeam: pTeam, rivalTeams: rTeams, teamStandings: tStandings, otherCategories: otherCats, category: cat });
  }

  function openSaveModal(andExit) {
    loadAllSlots();
    setSaveModal({ open: true, andExit, pendingOverwrite: null });
    setShowExitConfirm(false);
  }

  function closeSaveModal() {
    setSaveModal({ open: false, andExit: false, pendingOverwrite: null });
  }

  async function performSaveToSlot(n) {
    setActiveSlot(n);
    const ok = await doSave(n);
    if (ok) {
      await loadAllSlots();
      const shouldExit = saveModal.andExit;
      setSaveModal({ open: false, andExit: false, pendingOverwrite: null });
      if (shouldExit) goHome();
    }
  }

  function pickSlotToSave(n) {
    if (slotsMeta[n]) {
      setSaveModal((m) => ({ ...m, pendingOverwrite: n }));
    } else {
      performSaveToSlot(n);
    }
  }

  function confirmExitNoSave() {
    setShowExitConfirm(false);
    goHome();
  }

  useGoogleFonts();

  function pickCategory(catKey) {
    setDraftCategory(catKey);
    setTeams(instantiateTeams(catKey));
  }

  function chooseTeam(idx) {
    if (!draftManagerName.trim() || !teams) return;
    const rivalsRaw = teams.filter((_, i) => i !== idx);
    // Season 1 has no research history yet, so it's excluded from the
    // strength calculation here (see computeTeamStrengthScore).
    const [chosen, ...rivals] = assignSeasonExpectations([teams[idx], ...rivalsRaw], false);
    const rsFixed = {};
    chosen.riders.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: chosen.name, points: 0 }; });
    rivals.forEach((t) => t.riders.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: t.name, points: 0 }; }));
    const ts = { player: 0 };
    rivals.forEach((t) => { ts[t.id] = 0; });

    const otherKeys = CATEGORY_ORDER.filter((k) => k !== draftCategory);
    const initOther = {};
    otherKeys.forEach((k) => {
      const t = assignSeasonExpectations(instantiateTeams(k), false);
      const rs = {}; t.forEach((team) => team.riders.forEach((r) => { rs[r.id] = { name: r.name, teamName: team.name, points: 0 }; }));
      const tts = {}; t.forEach((team) => { tts[team.id] = 0; });
      initOther[k] = { teams: t, riderStandings: rs, teamStandings: tts, riderWins: {}, riderPodiums: {}, sprintWins: {}, sprintPodiums: {}, seasonNumber: 1 };
    });

    setGame({
      gameMode: "quick",
      managerName: draftManagerName.trim(),
      category: draftCategory,
      playerTeam: { ...chosen, id: "player" },
      rivalTeams: rivals,
      otherCategories: initOther,
      freeAgents: seedLegendFreeAgents(),
      round: 0,
      seasonNumber: 1,
      budget: chosen.budget,
      riderStandings: rsFixed,
      riderWins: {}, riderPodiums: {}, sprintWins: {}, sprintPodiums: {},
      teamStandings: ts,
      lastResult: null,
      gpHistory: [],
      marketRumors: [],
      marketNegotiations: [],
      seasonEvents: [],
      careerOffers: [],
      marketSummary: null,
      notifications: { motogp: [], moto2: [], moto3: [] },
      pendingSubstitution: null,
    });
    setPhase("season");
  }

  const doSave = useCallback(async (slotOverride) => {
    const slot = slotOverride || activeSlot;
    if (!storageOk) { setSaveError("El almacenamiento persistente no está disponible en este momento."); return false; }
    if (!slot) { setSaveError("No hay un slot activo seleccionado."); return false; }
    if (!game) return false;
    try {
      setSaving(true);
      setSaveError(null);
      const payload = { ...game, phase, gameMode, savedAt: new Date().toISOString() };
      const result = await window.storage.set(`mbman-slot-${slot}`, JSON.stringify(payload), false);
      if (!result) throw new Error("La operación de guardado no devolvió confirmación.");
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
      setSaving(false);
      return true;
    } catch (e) {
      setSaveError("No se pudo guardar la partida. Probá de nuevo en unos segundos.");
      setSaving(false);
      return false;
    }
  }, [storageOk, activeSlot, game, phase, gameMode]);

  useEffect(() => {
    if (phase === "season" || phase === "result") doSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, budget]);

  function startProject(area, kind) {
    const spec = canStartProject(playerTeam, area, kind, budget, scale);
    if (!spec) return;
    setBudget((b) => b - spec.money);
    setPlayerTeam((t) => startProjectOnTeam(t, area, kind, spec));
  }

  function acceptPackage(packageId) {
    setPlayerTeam((t) => acceptPendingPackage(t, packageId, queueWarehouseProduction));
    setOpenPackageId(null);
  }

  function discardPackage(packageId) {
    setPlayerTeam((t) => discardPendingPackage(t, packageId));
    setOpenPackageId(null);
  }

  function startFactoryUpgrade() {
    const spec = canStartFacilityUpgrade(playerTeam, "factory", budget, scale);
    if (!spec) return;
    setBudget((b) => b - spec.money);
    setPlayerTeam((t) => startFacilityUpgrade(t, "factory", spec));
  }

  function startStaffUpgrade() {
    const spec = canStartFacilityUpgrade(playerTeam, "staff", budget, scale);
    if (!spec) return;
    setBudget((b) => b - spec.money);
    setPlayerTeam((t) => startFacilityUpgrade(t, "staff", spec));
  }

  function startWarehouseProduction(part) {
    if (!playerTeam) return;
    const cost = warehouseCost(part, scale, false, playerTeam.factory?.level);
    if (cost > budget) return;
    setBudget((b) => b - cost);
    setPlayerTeam((t) => ({ ...t, warehouse: queueWarehouseProduction(t.warehouse, part) }));
  }

  function startUrgentWarehouseProduction(part) {
    if (!playerTeam) return;
    const cost = warehouseCost(part, scale, true, playerTeam.factory?.level);
    if (cost > budget) return;
    setBudget((b) => b - cost);
    setPlayerTeam((t) => ({ ...t, warehouse: urgentWarehouseProduction(t.warehouse, part) }));
  }

  function fireRider(riderId) {
    const rider = playerTeam?.riders.find((r) => r.id === riderId);
    if (!rider) return;
    const cost = fireRiderCost(rider);
    if (cost > budget) return;
    setBudget((b) => b - cost);
    setPlayerTeam((t) => ({ ...t, riders: t.riders.filter((r) => r.id !== riderId) }));
    setFreeAgents((prev) => [...prev, { ...rider, contractYears: 0, isNewTeamThisSeason: false }]);
    setProfileTarget(null);
  }

  /* Signing a free agent mid-season (typically to fill a seat just
     vacated by a firing) — only ever a genuine free agent, never a
     contracted rider from another team, and never mid-season for a seat
     that isn't actually open. */
  function signFreeAgentNow(rider) {
    if (!playerTeam || playerTeam.riders.length >= 2) return;
    if (!isFreeAgentEligibleForCategory(rider, category)) return;
    const cost = Math.round(overallRating(rider) * 5000);
    if (cost > budget) return;
    setBudget((b) => b - cost);
    setPlayerTeam((t) => ({ ...t, riders: [...t.riders, { ...rider, contractYears: 2, isNewTeamThisSeason: true }] }));
    setFreeAgents((prev) => prev.filter((r) => r.id !== rider.id));
    setProfileTarget(null);
  }

  /* Where does this rider currently race, if anywhere? Used by the new
     negotiation engine (utils/marketNegotiations.js) to know who a
     compensation offer actually needs to go to. */
  function findTeamOwningRider(riderId, catKey) {
    if (catKey === category) {
      if (playerTeam && findInTeamRoster(playerTeam, riderId)) return playerTeam;
      for (const t of rivalTeams) { if (findInTeamRoster(t, riderId)) return t; }
      return null;
    }
    const catState = otherCategories[catKey];
    if (!catState) return null;
    for (const t of catState.teams) { if (findInTeamRoster(t, riderId)) return t; }
    return null;
  }

  /* How many riders are already contracted to the player's team for next
     season — currently-contracted riders not marked to be released,
     plus anyone already confirmed to join via a negotiation. A new
     offer can't be started once this reaches 2 (section 11: "cada
     equipo solo podrá tener dos pilotos con contrato para la siguiente
     temporada"). */
  function nextSeasonPlayerRiderCount() {
    return nextSeasonCommittedRiderCount(playerTeam, marketNegotiations, "player");
  }

  /* Starts a new negotiation for the player — "Hacer una oferta" (rider
     has more than a year left, so the current team's compensation is
     negotiated first) or "Intentar contratar" (one year left or a free
     agent, straight to the rider). Never resolves instantly — it's
     picked up the next time a Grand Prix is run (tickMarket, inside
     runRace). */
  function createPlayerOffer(rider, categoryKey, teamOfferAmount, riderTerms) {
    if (!playerTeam) return;
    const fromTeam = findTeamOwningRider(rider.id, categoryKey);
    const isRenewal = fromTeam?.id === "player";
    if (!isRenewal && nextSeasonPlayerRiderCount() >= 2) return;
    // A completed (or in-progress) renewal with their CURRENT team never
    // blocks a competing offer — the game already tells the player it
    // happened (see RiderProfileModal's "ya ha renovado" banner), but
    // the rider should still be free to weigh a genuinely better offer
    // from elsewhere against staying, exactly like in the real paddock.
    const alreadyNegotiating = marketNegotiations.some((n) => n.riderId === rider.id && n.kind !== "renewal" && !["failed", "withdrawn"].includes(n.status));
    if (alreadyNegotiating) return;
    const needsComp = needsTeamCompensation(rider, fromTeam?.id ?? null, "player");
    const negotiation = createNegotiation({
      kind: isRenewal ? "renewal" : "signing", rider, categoryKey, fromTeam,
      toTeamId: "player", toTeamName: playerTeam.name,
      teamOfferAmount: needsComp ? teamOfferAmount : null,
      riderTerms, round, seasonNumber,
    });
    setGame((g) => (g ? { ...g, marketNegotiations: [...(g.marketNegotiations || []), negotiation] } : g));
  }

  /* The player's response to an unsolicited offer a rival has made for
     one of their own riders (section 14). Accepting only moves on to
     asking the rider themselves whether they actually want to leave —
     it doesn't sell them outright. */
  function respondToIncomingOffer(negotiationId, action, counterAmount) {
    setGame((g) => {
      if (!g) return g;
      const marketNegotiations2 = (g.marketNegotiations || []).map((n) => {
        if (n.id !== negotiationId) return n;
        if (action === "accept") return { ...n, status: "pending_rider", history: [...(n.history || []), { round, actor: "player", type: "accept" }], log: [...n.log, { round, text: "Aceptáis la compensación ofrecida." }] };
        if (action === "counter") {
          return {
            ...n,
            status: "team_countered",
            teamOfferAmount: counterAmount,
            resolveAtRound: round + 1,
            history: [...(n.history || []), { round, actor: "player", type: "counter", teamOfferAmount: counterAmount }],
            log: [...n.log, { round, text: `Pedís €${Math.round(counterAmount).toLocaleString()} de compensación.` }],
          };
        }
        return { ...n, status: "failed", history: [...(n.history || []), { round, actor: "player", type: "reject" }], log: [...n.log, { round, text: "Rechazáis la oferta recibida." }] };
      });
      return { ...g, marketNegotiations: marketNegotiations2 };
    });
  }

  /* Gestión completa de las contraofertas — the player accepts the AI's
     own counter figure outright, moving the negotiation one step
     forward exactly as described in the design. */
  function acceptCounterOfferAction(negotiationId) {
    setMarketNegotiations((prev) => acceptCounterOffer(prev, negotiationId, round));
  }

  /* The player revises their numbers instead of accepting the counter —
     re-enters the pending state on whichever side is live and waits for
     the next Grand Prix, same as a brand new offer. No round limit; see
     negotiationLeverage in marketNegotiations.js for how the AI's own
     position naturally hardens instead. */
  function modifyPlayerOffer(negotiationId, newTeamOfferAmount, newRiderTerms) {
    setMarketNegotiations((prev) => modifyOffer(prev, negotiationId, { teamOfferAmount: newTeamOfferAmount, riderTerms: newRiderTerms }, round));
  }

  /* Cancels a negotiation for good — moves it to the "Retiradas" history
     bucket and the AI stops considering it entirely. */
  function withdrawPlayerOffer(negotiationId) {
    setMarketNegotiations((prev) => withdrawOffer(prev, negotiationId, round));
  }

  /* "Completar plantilla" (mandatory roster-completion gate): while this
     screen is open there is no season clock running — no Grand Prix is
     ever going to arrive to naturally resolve a pending negotiation.
     Rather than build a second negotiation system for this one screen,
     every negotiation the player touches here (create, accept a
     counter, revise an offer) is resolved immediately using the exact
     same scoring and state machine used everywhere else
     (resolvePendingNegotiations), just without the wait.

     Everything below reads and writes exclusively through the `g`
     parameter of a single setGame functional update per action —
     deliberately never through the outer closures (playerTeam,
     freeAgents, round, findTeamById, findRiderById...), which only
     reflect the last completed render. Two separate setGame calls
     issued back to back from the same handler both look correct in
     isolation, but the second one's helper functions were still
     reading last-render data, so the negotiation's resolveAtRound
     never actually got pulled back to the current round on the data
     resolvePendingNegotiations was scoring against — it kept waiting
     for a Grand Prix that was never coming. Doing the whole thing as
     one atomic update removes that entire class of staleness. */
  function findTeamInGame(g, teamId, catKey) {
    if (!teamId) return null;
    if (catKey === g.category) {
      if (g.playerTeam && g.playerTeam.id === teamId) return g.playerTeam;
      return (g.rivalTeams || []).find((t) => t.id === teamId) || null;
    }
    return (g.otherCategories?.[catKey]?.teams || []).find((t) => t.id === teamId) || null;
  }

  function findRiderInGame(g, riderId, catKey) {
    const teams = catKey === g.category ? [g.playerTeam, ...(g.rivalTeams || [])].filter(Boolean) : (g.otherCategories?.[catKey]?.teams || []);
    for (const t of teams) {
      const found = t.riders.find((r) => r.id === riderId);
      if (found) return found;
    }
    return (g.freeAgents || []).find((r) => r.id === riderId) || null;
  }

  function resolveRosterNegotiationsNow(g, negotiations) {
    const TERMINAL = ["confirmed", "failed", "withdrawn", "applied"];
    // Every negotiation touched from the "Completar plantilla" screen is
    // for the player's own team, in the player's own category — no
    // ambiguity to resolve, unlike the general-purpose market. A free
    // agent's own categoryKey is null (see FreeAgentsPanel's openProfile
    // call), so comparing it against g.category would never match and
    // silently skip forcing the negotiation forward — this is the exact
    // reason the previous fix still wasn't advancing anything.
    const forced = negotiations.map((n) => (
      TERMINAL.includes(n.status) || n.toTeamId !== "player"
        ? n
        : { ...n, categoryKey: g.category, resolveAtRound: g.round }
    ));
    const pass = resolvePendingNegotiations(forced, g.round, {
      findTeam: (teamId, catKey) => findTeamInGame(g, teamId, catKey),
      findRider: (riderId, catKey) => findRiderInGame(g, riderId, catKey),
      riderStandings: g.riderStandings, scale,
    });
    let nextPlayerTeam = g.playerTeam;
    let nextFreeAgents = g.freeAgents;
    const finalNegotiations = pass.negotiations.map((n) => {
      if (n.status === "confirmed" && n.toTeamId === "player" && !n.fromTeamId && nextPlayerTeam.riders.length < 2) {
        const rider = nextFreeAgents.find((r) => r.id === n.riderId);
        if (rider) {
          nextPlayerTeam = { ...nextPlayerTeam, riders: [...nextPlayerTeam.riders, { ...rider, contractYears: n.riderTerms.years, salary: n.riderTerms.salary, isNewTeamThisSeason: true }] };
          nextFreeAgents = nextFreeAgents.filter((r) => r.id !== rider.id);
          return { ...n, status: "applied" };
        }
      }
      return n;
    });
    return { ...g, playerTeam: nextPlayerTeam, freeAgents: nextFreeAgents, marketNegotiations: finalNegotiations };
  }

  function createRosterCompletionOffer(rider, _categoryKey, _teamOfferAmount, riderTerms) {
    setGame((g) => {
      if (!g || !g.playerTeam || g.playerTeam.riders.length >= 2) return g;
      const alreadyNegotiating = (g.marketNegotiations || []).some((n) => n.riderId === rider.id && !["failed", "withdrawn"].includes(n.status));
      if (alreadyNegotiating) return g;
      const negotiation = createNegotiation({
        kind: "signing", rider, categoryKey: g.category, fromTeam: null,
        toTeamId: "player", toTeamName: g.playerTeam.name,
        teamOfferAmount: null, riderTerms, round: g.round, seasonNumber: g.seasonNumber,
      });
      return resolveRosterNegotiationsNow(g, [...(g.marketNegotiations || []), negotiation]);
    });
  }

  function acceptRosterCompletionCounter(negotiationId) {
    setGame((g) => {
      if (!g) return g;
      const advanced = acceptCounterOffer(g.marketNegotiations || [], negotiationId, g.round);
      return resolveRosterNegotiationsNow(g, advanced);
    });
  }

  function modifyRosterCompletionOffer(negotiationId, _teamOfferAmount, newRiderTerms) {
    setGame((g) => {
      if (!g) return g;
      const advanced = modifyOffer(g.marketNegotiations || [], negotiationId, { teamOfferAmount: null, riderTerms: newRiderTerms }, g.round);
      return resolveRosterNegotiationsNow(g, advanced);
    });
  }

  /* "Despedir al finalizar la temporada" (section 12): the rider keeps
     racing normally all season, but their seat opens up for next season
     — letting the player line up a replacement (via createPlayerOffer)
     before the season is even over, without paying the immediate-
     rescission cost of the existing fireRider(). */
  function markReleaseAtSeasonEnd(riderId, released) {
    const rider = playerTeam?.riders.find((r) => r.id === riderId);
    if (!rider) return;
    // Once both of next season's seats are already committed through
    // firm contracts, this decision is closed — undoing a release here
    // would free up a seat that's already spoken for by someone else's
    // confirmed signing, over-committing the roster to 3 riders for 2
    // spots. The check reads the real contract/negotiation state
    // (nextSeasonPlayerRiderCount), never a UI flag, so it can't be
    // bypassed by reopening the screen or reloading a save.
    if (!released && nextSeasonPlayerRiderCount() >= 2) return;
    const cost = computeReleaseAtSeasonEndCost(rider, scale);
    if (released && cost > budget) return;
    setBudget((b) => (released ? b - cost : b + cost));
    setPlayerTeam((t) => {
      const nextRiders = t.riders.map((r) => (r.id === riderId ? { ...r, releasedAtSeasonEnd: released } : r));
      return { ...t, riders: nextRiders };
    });
    // Designating a rider to leave cancels any renewal attempt still in
    // progress for them — without this, a renewal negotiation that
    // resolves on a later Grand Prix would quietly flip
    // releasedAtSeasonEnd back to false (applyRenewalsToTeam) and
    // silently undo this decision, on top of over-committing the
    // roster to more riders than the two available seats.
    if (released) {
      setGame((g) => {
        if (!g) return g;
        const cancelled = (g.marketNegotiations || []).map((n) => (
          n.riderId === riderId && n.toTeamId === "player" && !["failed", "withdrawn", "confirmed", "applied"].includes(n.status)
            ? { ...n, status: "withdrawn" }
            : n
        ));
        return { ...g, marketNegotiations: cancelled };
      });
    }
  }

  function simulateSprintForTeams(teams, circuitProfile, isWet, gridPositionById, categoryKey, notifQueue) {
    const roundsLeft = CIRCUITS.length - round;
    const { results } = simulateFullGridRound(teams, circuitProfile, isWet, roundsLeft, gridPositionById, SPRINT_POINTS, 0.6);
    const resultsByTeam = {};
    results.forEach((r) => { (resultsByTeam[r.teamId] ||= []).push(r); });

    const newTeams = teams.map((t) => {
      const teamResults = resultsByTeam[t.id] || [];
      let warehouse = t.warehouse || initWarehouse();
      teamResults.forEach((r) => {
        if (!r.crashed || !r.dnfCause) return;
        warehouse = consumeWarehouseForResult(warehouse, r.dnfCause, r.injuryResult?.severity).warehouse;
      });

      const injuriesById = {};
      teamResults.forEach((r) => {
        if (r.injuryResult) injuriesById[r.id] = { ...r.injuryResult, sidelined: true, deferSubstituteDecision: true };
      });
      let riders = t.riders.map((r) => (injuriesById[r.id] ? { ...r, injury: injuriesById[r.id] } : r));
      const substitutes = { ...(t.substitutes || {}) };
      Object.entries(substitutes).forEach(([ownerId, sub]) => {
        if (injuriesById[sub.id]) substitutes[ownerId] = { ...sub, injury: injuriesById[sub.id] };
      });

      riders = riders.map((r) => {
        const res = teamResults.find((x) => x.id === r.id);
        return res ? bumpCareerStats(r, categoryKey, res.position, res.crashed, res.points, true) : r;
      });

      return { ...t, riders, substitutes, warehouse };
    });

    results.forEach((r) => {
      if (r.injuryResult) {
        notifQueue.push({
          type: "injury", category: categoryKey, riderId: photoIdFor(r),
          text: `${r.name} sufre una caída en el Sprint y se diagnostica ${r.injuryResult.name.toLowerCase()} (lesión ${r.injuryResult.severityLabel}). No podrá disputar la carrera.`,
        });
      }
    });

    return { teams: newTeams, results };
  }

  function runQualifying() {
    const circuitProfile = CIRCUIT_PROFILES[round];
    const isWet = Math.random() * 100 < circuitProfile.wetPct;
    const roundsLeft = CIRCUITS.length - round;
    const notifQueue = [];

    const applyQualifyingInjuries = (results) => {
      const injuriesById = {};
      results.forEach((r) => {
        if (!r.injuryResult) return;
        injuriesById[r.id] = { ...r.injuryResult, deferSubstituteDecision: true };
        notifQueue.push({
          type: "injury", category: r.categoryKeyForNotif || category, riderId: photoIdFor(r),
          text: `${r.name} sufre una caída en clasificación y se diagnostica ${r.injuryResult.name.toLowerCase()} (lesión ${r.injuryResult.severityLabel}). No podrá disputar la carrera.`,
        });
      });
      return injuriesById;
    };
    const applyInjuriesToTeam = (team, injuriesById) => {
      const ridersTouched = team.riders.some((r) => injuriesById[r.id]);
      const subsTouched = Object.values(team.substitutes || {}).some((s) => injuriesById[s.id]);
      if (!ridersTouched && !subsTouched) return team;
      const riders = team.riders.map((r) => (injuriesById[r.id] ? { ...r, injury: injuriesById[r.id] } : r));
      const substitutes = { ...(team.substitutes || {}) };
      Object.entries(substitutes).forEach(([ownerId, sub]) => {
        if (injuriesById[sub.id]) substitutes[ownerId] = { ...sub, injury: injuriesById[sub.id] };
      });
      return { ...team, riders, substitutes };
    };

    // --- Played category: player + rivals ---
    const playedEntries = buildEntries([playerTeam, ...rivalTeams]).map((r) => ({ ...r, categoryKeyForNotif: category }));
    const playedQuali = simulateQualifying(playedEntries, circuitProfile, isWet, roundsLeft, category);
    const playedInjuriesById = applyQualifyingInjuries(playedQuali.results);
    const newPlayerTeam = applyInjuriesToTeam(playerTeam, playedInjuriesById);
    const newRivalTeams = rivalTeams.map((t) => applyInjuriesToTeam(t, playedInjuriesById));

    // --- Background categories ---
    const gridByCategory = { [category]: playedQuali.gridPositionById };
    const resultByCategory = { [category]: playedQuali.results };
    const nextOtherCategories = { ...otherCategories };
    Object.entries(otherCategories).forEach(([key, catState]) => {
      const entries = buildEntries(catState.teams).map((r) => ({ ...r, categoryKeyForNotif: key }));
      const q = simulateQualifying(entries, circuitProfile, isWet, roundsLeft, key);
      const injuriesById = applyQualifyingInjuries(q.results);
      nextOtherCategories[key] = { ...catState, teams: catState.teams.map((t) => applyInjuriesToTeam(t, injuriesById)) };
      gridByCategory[key] = q.gridPositionById;
      resultByCategory[key] = q.results;
    });

    setGame((g) => (g ? {
      ...g,
      playerTeam: newPlayerTeam,
      rivalTeams: newRivalTeams,
      otherCategories: nextOtherCategories,
      notifications: mergeNotificationItems(g.notifications, notifQueue, category),
      pendingQualifying: { isWet, gridByCategory, resultByCategory, circuitName: CIRCUITS[round], circuitProfile },
    } : g));
    setPhase("qualifying");
  }

  function runSprint() {
    const circuitProfile = pendingQualifying?.circuitProfile ?? CIRCUIT_PROFILES[round];
    const isWet = pendingQualifying?.isWet ?? (Math.random() * 100 < circuitProfile.wetPct);
    const gridByCategory = pendingQualifying?.gridByCategory ?? {};
    const notifQueue = [];

    const { teams: sprintTeams, results: sprintResults } = simulateSprintForTeams(
      [playerTeam, ...rivalTeams], circuitProfile, isWet, gridByCategory[category], category, notifQueue
    );
    const [newPlayerTeam, ...newRivalTeams] = sprintTeams;

    const riderStandingsNext = { ...riderStandings };
    sprintResults.forEach((r) => { riderStandingsNext[r.id] = { name: r.name, teamName: r.teamName, points: (riderStandingsNext[r.id]?.points || 0) + r.points }; });
    const teamStandingsNext = { ...teamStandings };
    sprintResults.forEach((r) => { teamStandingsNext[r.teamId] = (teamStandingsNext[r.teamId] || 0) + r.points; });
    const sprintWinsNext = { ...sprintWins };
    sprintResults.forEach((r) => { if (r.position === 1 && !r.crashed) sprintWinsNext[r.id] = (sprintWinsNext[r.id] || 0) + 1; });
    const sprintPodiumsNext = { ...sprintPodiums };
    sprintResults.forEach((r) => { if (r.position <= 3 && !r.crashed) sprintPodiumsNext[r.id] = (sprintPodiumsNext[r.id] || 0) + 1; });

    const gpShortName = CIRCUITS[round].split("—")[0].trim();
    const playerSprintResults = sprintResults.filter((r) => r.teamId === "player");
    playerSprintResults.forEach((r) => {
      if (r.crashed || r.position > 3) return;
      const label = r.position === 1 ? `¡Victoria de ${r.name} en el Sprint del ${gpShortName}!` : `${r.name} sube al podio del Sprint (P${r.position}) en el ${gpShortName}.`;
      notifQueue.unshift({ type: "race", category, riderId: photoIdFor(r), text: label });
    });

    const classification = buildClassificationDisplay(sprintResults, circuitProfile, null, category, true);

    setGame((g) => (g ? {
      ...g,
      playerTeam: newPlayerTeam,
      rivalTeams: newRivalTeams,
      riderStandings: riderStandingsNext,
      teamStandings: teamStandingsNext,
      sprintWins: sprintWinsNext,
      sprintPodiums: sprintPodiumsNext,
      notifications: mergeNotificationItems(g.notifications, notifQueue, category),
      pendingSprintResult: {
        circuitName: CIRCUITS[round], circuitProfile, isWet, category,
        results: { [category]: sprintResults }, classificationByCategory: { [category]: classification }, arrivals: [],
      },
      pendingSprintForHistory: sprintResults,
    } : g));
    setPhase("sprint");
  }

  function runRace() {
    const circuitProfile = pendingQualifying?.circuitProfile ?? CIRCUIT_PROFILES[round];
    const isWet = pendingQualifying?.isWet ?? (Math.random() * 100 < circuitProfile.wetPct);
    const gridByCategory = pendingQualifying?.gridByCategory ?? {};
    const roundsLeft = CIRCUITS.length - round;
    const notifQueue = [];
    const poolRef = { pool: [...freeAgents] };

    // --- Played category: player + rivals ---
    const { results, poleRiderId, fastestLapRiderId } = simulateRound(playerTeam, rivalTeams, circuitProfile, isWet, roundsLeft, gridByCategory[category]);
    const { team: playerAfterProjects, arrivals } = advanceTeamProjects(playerTeam);
    const playerAfterPackages = processApprovedPackages(playerAfterProjects);
    const { team: playerAfterFacilities, arrivals: facilityArrivals } = advanceFacilityUpgrades(playerAfterPackages);

    let newPendingSub = pendingSubstitution;
    const playerCtx = { isPlayer: true, scale, setPendingSub: (info) => { newPendingSub = info; } };
    const playerProcessed = processTeamAfterRace(playerAfterFacilities, results, category, playerCtx, poolRef, notifQueue);
    facilityArrivals.forEach((a) => {
      const label = a.kind === "factory" ? "Fábrica" : "Staff técnico";
      notifQueue.push({ type: "dev", category, text: `Mejora de ${label} completada: nivel ${a.newLevel}.` });
    });

    const rows = [
      { id: "player", points: teamStandings.player || 0 },
      ...rivalTeams.map((t) => ({ id: t.id, points: teamStandings[t.id] || 0 })),
    ].sort((a, b) => b.points - a.points);
    const posMap = {};
    rows.forEach((r, i) => { posMap[r.id] = i + 1; });

    const rivalsProcessed = rivalTeams.map((t) => processTeamAfterRace(t, results, category, {
      isPlayer: false, position: posMap[t.id] || rivalTeams.length + 1, totalTeams: rivalTeams.length + 1, roundIndex: round, totalRounds: CIRCUITS.length, scale,
    }, poolRef, notifQueue));

    const riderStandingsNext = { ...riderStandings };
    results.forEach((r) => { riderStandingsNext[r.id] = { name: r.name, teamName: r.teamName, points: (riderStandingsNext[r.id]?.points || 0) + r.points }; });
    const riderWinsNext = { ...riderWins };
    results.forEach((r) => { if (r.position === 1 && !r.crashed) riderWinsNext[r.id] = (riderWinsNext[r.id] || 0) + 1; });
    const riderPodiumsNext = { ...riderPodiums };
    results.forEach((r) => { if (r.position <= 3 && !r.crashed) riderPodiumsNext[r.id] = (riderPodiumsNext[r.id] || 0) + 1; });
    const teamStandingsNext = { ...teamStandings };
    results.forEach((r) => { teamStandingsNext[r.teamId] = (teamStandingsNext[r.teamId] || 0) + r.points; });

    const [playerWithMorale, ...rivalsWithMorale] = applyMoraleToCategoryTeams(
      [playerProcessed, ...rivalsProcessed], riderStandingsNext, teamStandingsNext, riderWinsNext, riderPodiumsNext, scale
    );

    const playerResults = results.filter((r) => r.teamId === "player");
    const prizeUnit = Math.max(1, Math.round(28000 * scale));
    const prize = playerResults.reduce((s, r) => s + (r.crashed ? Math.round(20000 * scale) : Math.max(Math.round(20000 * scale), (16 - r.position) * prizeUnit)), 0);
    const runningCost = Math.round(130000 * scale);

    // Player-facing race recap + notable results
    const gpShortName = CIRCUITS[round].split("—")[0].trim();
    playerResults.forEach((r) => {
      if (r.crashed) return;
      if (r.position === 1) notifQueue.unshift({ type: "race", category, riderId: photoIdFor(r), text: `¡Victoria de ${r.name} en el ${gpShortName}!` });
      else if (r.position <= 3) notifQueue.unshift({ type: "race", category, riderId: photoIdFor(r), text: `${r.name} sube al podio (P${r.position}) en el ${gpShortName}.` });
    });
    if (poleRiderId && playerTeam.riders.some((r) => r.id === poleRiderId)) {
      const poleRider = playerTeam.riders.find((r) => r.id === poleRiderId);
      if (poleRider) notifQueue.unshift({ type: "race", category, riderId: photoIdFor(poleRider), text: `${poleRider.name} firma el mejor ritmo de la jornada en el ${gpShortName}.` });
    }
    notifQueue.unshift({ type: "race", category, text: `Resultado del ${gpShortName}: ${playerResults.map((r) => `${r.name} ${r.crashed ? "DNF" : `P${r.position}`}`).join(" · ")}.` });

    // --- Background categories (Moto2/Moto3 or MotoGP, whichever aren't played) ---
    const nextOtherCategories = {};
    const otherResultsByCat = {};
    const otherFastestLapByCat = {};
    let motogpSprintResultsForHistory = null;
    Object.entries(otherCategories).forEach(([key, catState]) => {
      let raceTeams = catState.teams;
      let rS = { ...catState.riderStandings };
      let tS = { ...catState.teamStandings };
      let sW = { ...(catState.sprintWins || {}) };
      let sP = { ...(catState.sprintPodiums || {}) };

      // MotoGP's sprint always runs on Saturday, whether or not it's the
      // category being played — simulated here, silently, right before
      // its own race, using the same qualifying grid.
      if (key === "motogp") {
        const sprintOutcome = simulateSprintForTeams(catState.teams, circuitProfile, isWet, gridByCategory[key], key, notifQueue);
        raceTeams = sprintOutcome.teams;
        motogpSprintResultsForHistory = sprintOutcome.results;
        sprintOutcome.results.forEach((r) => { rS[r.id] = { name: r.name, teamName: r.teamName, points: (rS[r.id]?.points || 0) + r.points }; });
        sprintOutcome.results.forEach((r) => { tS[r.teamId] = (tS[r.teamId] || 0) + r.points; });
        sprintOutcome.results.forEach((r) => { if (r.position === 1 && !r.crashed) sW[r.id] = (sW[r.id] || 0) + 1; });
        sprintOutcome.results.forEach((r) => { if (r.position <= 3 && !r.crashed) sP[r.id] = (sP[r.id] || 0) + 1; });
      }

      const preRaceStandingsSnapshot = { ...tS };

      const { results: catResults, fastestLapRiderId: catFastestLapRiderId } = simulateFullGridRound(raceTeams, circuitProfile, isWet, roundsLeft, gridByCategory[key]);
      otherResultsByCat[key] = catResults;
      otherFastestLapByCat[key] = catFastestLapRiderId;
      catResults.forEach((r) => { rS[r.id] = { name: r.name, teamName: r.teamName, points: (rS[r.id]?.points || 0) + r.points }; });
      catResults.forEach((r) => { tS[r.teamId] = (tS[r.teamId] || 0) + r.points; });
      const rW = { ...catState.riderWins };
      catResults.forEach((r) => { if (r.position === 1 && !r.crashed) rW[r.id] = (rW[r.id] || 0) + 1; });
      const rP = { ...catState.riderPodiums };
      catResults.forEach((r) => { if (r.position <= 3 && !r.crashed) rP[r.id] = (rP[r.id] || 0) + 1; });

      const catRows = raceTeams.map((t) => ({ id: t.id, points: preRaceStandingsSnapshot[t.id] || 0 })).sort((a, b) => b.points - a.points);
      const catPosMap = {};
      catRows.forEach((r, i) => { catPosMap[r.id] = i + 1; });
      const catScale = CATEGORY_DATA[key].scale;

      const teamsNext = raceTeams.map((t) => processTeamAfterRace(t, catResults, key, {
        isPlayer: false, position: catPosMap[t.id] || raceTeams.length, totalTeams: raceTeams.length, roundIndex: round, totalRounds: CIRCUITS.length, scale: catScale,
      }, poolRef, notifQueue));
      const teamsWithMorale = applyMoraleToCategoryTeams(teamsNext, rS, tS, rW, rP, catScale);

      nextOtherCategories[key] = { ...catState, teams: teamsWithMorale, riderStandings: rS, teamStandings: tS, riderWins: rW, riderPodiums: rP, sprintWins: sW, sprintPodiums: sP };
    });

    const gpResultsByCategory = { ...otherResultsByCat, [category]: results };
    const gpHistoryEntry = buildGpHistoryEntry({ round, seasonNumber, circuitName: CIRCUITS[round], isWet, resultsByCategory: gpResultsByCategory, sprintResults: pendingSprintForHistory ?? motogpSprintResultsForHistory });

    const fastestLapByCategory = { ...otherFastestLapByCat, [category]: fastestLapRiderId };
    const classificationByCategory = {};
    Object.entries(gpResultsByCategory).forEach(([key, catResults]) => {
      classificationByCategory[key] = buildClassificationDisplay(catResults, circuitProfile, fastestLapByCategory[key], key);
    });

    const marketTick = tickMarket(
      { marketRumors, marketNegotiations },
      {
        playerTeam: playerWithMorale, rivalTeams: rivalsWithMorale, otherCategories: nextOtherCategories,
        freeAgents: poolRef.pool, category, round, totalRounds: CIRCUITS.length, seasonNumber, scale,
        riderStandings: riderStandingsNext,
        findTeam: findTeamById, findRider: findRiderById,
      }
    );
    marketTick.notifications.forEach((text) => notifQueue.push({ type: "market", category, text }));

    // Renewals are effective the moment both sides agree — never
    // deferred like a signing. Group whatever just got confirmed this
    // tick by category and apply it directly to the roster about to be
    // committed below.
    const renewalsByCategory = {};
    marketTick.justConfirmedRenewals.forEach((r) => {
      (renewalsByCategory[r.categoryKey] ||= []).push(r);
    });
    const playerTeamAfterRenewals = applyRenewalsToTeam(playerWithMorale, renewalsByCategory[category] || []);
    const rivalsAfterRenewals = rivalsWithMorale.map((t) => applyRenewalsToTeam(t, renewalsByCategory[category] || []));
    const nextOtherCategoriesAfterRenewals = { ...nextOtherCategories };
    Object.keys(nextOtherCategoriesAfterRenewals).forEach((key) => {
      const catRenewals = renewalsByCategory[key] || [];
      if (!catRenewals.length) return;
      nextOtherCategoriesAfterRenewals[key] = {
        ...nextOtherCategoriesAfterRenewals[key],
        teams: nextOtherCategoriesAfterRenewals[key].teams.map((t) => applyRenewalsToTeam(t, catRenewals)),
      };
    });

    setGame((g) => (g ? {
      ...g,
      lastResult: { circuitName: CIRCUITS[round], circuitProfile, isWet, category, results: gpResultsByCategory, classificationByCategory, arrivals, fastestLapByCategory },
      riderStandings: riderStandingsNext,
      riderWins: riderWinsNext,
      riderPodiums: riderPodiumsNext,
      teamStandings: teamStandingsNext,
      budget: g.budget + prize - runningCost,
      playerTeam: playerTeamAfterRenewals,
      rivalTeams: rivalsAfterRenewals,
      otherCategories: nextOtherCategoriesAfterRenewals,
      freeAgents: poolRef.pool,
      notifications: mergeNotificationItems(g.notifications, notifQueue, category),
      pendingSubstitution: newPendingSub,
      pendingQualifying: null,
      pendingSprintResult: null,
      pendingSprintForHistory: null,
      gpHistory: [...(g.gpHistory || []), gpHistoryEntry],
      marketRumors: marketTick.marketRumors,
      marketNegotiations: marketTick.marketNegotiations,
    } : g));

    setPhase("result");
  }

  /* Opening the center marks every notification (all three categories) as
     read — this only flips a flag on each item, nothing is ever removed
     from the history. */
  function openNotificationCenter() {
    setNotifications((prev) => markAllNotificationsRead(prev));
    setShowNotifications(true);
  }

  /* Detects a rider who is still injured/sidelined for the next GP and has
     no substitute covering their seat yet — regardless of when or how
     that injury happened (mid-season, end of last season, signed while
     already hurt during the market...). The origin never matters; only
     whether they're still out and uncovered right now. */
  function findRiderNeedingSubstitute(team) {
    if (!team) return null;
    return team.riders.find((r) => r.injury && r.injury.sidelined && r.injury.gpRemaining > 0 && !(team.substitutes || {})[r.id]) || null;
  }

  function goToSeasonOrOfferSubstitute(team) {
    if (team.riders.length < 2) {
      setPhase("complete-roster");
      return;
    }
    const rider = findRiderNeedingSubstitute(team);
    if (rider) {
      setPendingSubstitution({ teamId: team.id, riderId: rider.id, riderName: rider.name });
      setPhase("substitute-select");
    } else {
      setPhase("season");
    }
  }

  async function continueAfterResult() {
    const nextRound = round + 1;
    setRound(nextRound);
    if (nextRound >= CIRCUITS.length) {
      setPhase("seasonend");
    } else if (pendingSubstitution) {
      setPhase("substitute-select");
    } else {
      goToSeasonOrOfferSubstitute(playerTeam);
    }
  }

  function confirmSubstitute(chosenRider) {
    if (!pendingSubstitution) return;
    if (!isFreeAgentEligibleForCategory(chosenRider, category)) return;
    const cost = substituteHireCost(chosenRider, scale);
    if (cost > budget) return;
    const { riderId } = pendingSubstitution;
    setPlayerTeam((t) => ({
      ...t,
      substitutes: { ...(t.substitutes || {}), [riderId]: { ...chosenRider, isNewTeamThisSeason: true } },
    }));
    setFreeAgents((prev) => prev.filter((r) => r.id !== chosenRider.id));
    setBudget((b) => b - cost);
    setPendingSubstitution(null);
    setPhase("season");
  }

  function skipSubstitute() {
    setPendingSubstitution(null);
    setPhase("season");
  }

  function proceedFromSeasonEnd() {
    if (gameMode === "career") {
      const offers = computeCareerOffers();
      setCareerOffers(offers);
      setPhase("career-offers");
    } else {
      runSeasonTransition();
    }
  }

  /* Runs the entire season-to-season transition automatically. This is
     now the ONLY place team rosters change between seasons — there is
     no manual pick screen anymore, and there is no other mechanism that
     assigns a rider to a team. Whether a rider races for a given team
     next season depends exclusively on contractYears > 0 (evolveRider
     already decrements it every season) or on a confirmed live-market
     negotiation moving them there — nothing else. Ends by opening the
     read-only chronological summary; nothing past this point can alter
     any roster, budget, or contract.

     `ctxOverride` lets this run right after a career-mode team switch
     (see acceptCareerOffer), where the closure's own state variables
     haven't re-rendered with the swap yet. */
  function runSeasonTransition(ctxOverride = {}) {
    const ctxPlayerTeam = ctxOverride.playerTeam ?? playerTeam;
    const ctxRivalTeams = ctxOverride.rivalTeams ?? rivalTeams;
    const ctxTeamStandings = ctxOverride.teamStandings ?? teamStandings;
    const ctxOtherCategories = ctxOverride.otherCategories ?? otherCategories;
    const ctxCategory = ctxOverride.category ?? category;

    // Root-cause fix: a full snapshot of every rider that exists right
    // now, taken before anything moves. Compared at the very end of this
    // function against everyone who's still somewhere afterwards — the
    // only reliable way to guarantee nobody can ever silently vanish
    // during a season transition, no matter what caused it.
    const riderSnapshotBefore = [
      ...ctxPlayerTeam.riders,
      ...ctxRivalTeams.flatMap((t) => t.riders),
      ...Object.values(ctxOtherCategories).flatMap((cs) => cs.teams.flatMap((t) => t.riders)),
      ...freeAgents,
    ];
    // Populated by resolveSeasonMarketAcrossCategories and the free-agent
    // unemployment pass below — the only two places a rider can
    // legitimately retire during a season transition. Real IDs, not photoIds, since that's
    // what the snapshot comparison needs.
    const retiredIds = new Set();

    const sorted = Object.entries(riderStandings).sort((a, b) => b[1].points - a[1].points);
    const posById = {};
    sorted.forEach(([id], i) => { posById[id] = i + 1; });
    const hasUpper = ctxCategory !== "motogp";
    const departures = {};

    let resolvedPlayerRiders = ctxPlayerTeam.riders;
    if (hasUpper) {
      ctxPlayerTeam.riders.forEach((r) => {
        const wins = riderWins[r.id] || 0;
        const pos = posById[r.id] || 99;
        const wantsUp = r.pa >= 78 && (wins >= 2 || pos <= 5);
        if (wantsUp) {
          const chance = r.pa >= 85 ? 0.75 : r.pa >= 78 ? 0.55 : 0.4;
          departures[r.id] = { success: Math.random() < chance };
        }
      });
      resolvedPlayerRiders = resolvedPlayerRiders.map((r) =>
        departures[r.id] && !departures[r.id].success ? { ...r, morale: clamp(r.morale - 15, 0, 100) } : r
      );
    }
    // A rider whose promotion attempt actually succeeds leaves the roster
    // outright, becoming a free agent eligible for the category above —
    // they've earned a seat elsewhere, not just a note on a selection
    // screen the player would otherwise have to remember not to re-pick.
    const promotedAwayIds = Object.entries(departures).filter(([, d]) => d.success).map(([id]) => id);
    const promotedAway = resolvedPlayerRiders.filter((r) => promotedAwayIds.includes(r.id));
    resolvedPlayerRiders = resolvedPlayerRiders.filter((r) => !promotedAwayIds.includes(r.id));

    // --- Live transfer market resolution (utils/marketNegotiations.js):
    // riders who agreed to join a new team, and riders the player marked
    // to be let go at season's end, actually change hands right here. ---
    const playerTeamBeforeMarket = { ...ctxPlayerTeam, riders: resolvedPlayerRiders };
    const { released: releasedAtEnd } = applyReleasedAtSeasonEnd(playerTeamBeforeMarket);
    const playerTeamAfterReleases = { ...playerTeamBeforeMarket, riders: playerTeamBeforeMarket.riders.filter((r) => !r.releasedAtSeasonEnd) };
    const standingsByCategory = { [ctxCategory]: riderStandings };
    Object.entries(ctxOtherCategories).forEach(([k, v]) => { standingsByCategory[k] = v.riderStandings; });
    const afterNegotiations = applyConfirmedNegotiations({
      playerTeam: playerTeamAfterReleases, rivalTeams: ctxRivalTeams, otherCategories: ctxOtherCategories, category: ctxCategory, marketNegotiations, standingsByCategory,
    });
    const playerTeamResolved = afterNegotiations.playerTeam;
    const evolvedRivalsSource = afterNegotiations.rivalTeams;
    const otherCategoriesResolved = afterNegotiations.otherCategories;
    let poolFreeAgents = [
      ...freeAgents,
      ...releasedAtEnd.map((r) => finalizePlayerDepartureHistory({ ...r, contractYears: 0, releasedAtSeasonEnd: false, isNewTeamThisSeason: false, _fromCategoryKey: ctxCategory, _fromBikeAvg: bikeAvg(playerTeamBeforeMarket.bike) }, playerTeamBeforeMarket.name, riderStandings, ctxCategory, seasonNumber)),
      ...promotedAway.map((r) => finalizePlayerDepartureHistory({ ...r, contractYears: 0, isNewTeamThisSeason: false, _fromCategoryKey: ctxCategory, _fromBikeAvg: bikeAvg(playerTeamBeforeMarket.bike) }, playerTeamBeforeMarket.name, riderStandings, ctxCategory, seasonNumber)),
      ...(afterNegotiations.strandedRiders || []).map((r) => ({ ...r, isNewTeamThisSeason: false })),
    ];

    // A confirmed negotiation's compensation to the selling team is the
    // only cost that used to come out of the old selection screen's
    // "spend" total — charge it here instead, once, at the moment it
    // actually takes effect.
    const playerSigningSpend = (marketNegotiations || [])
      .filter((n) => n.status === "confirmed" && n.toTeamId === "player" && n.teamOfferAmount != null)
      .reduce((s, n) => s + n.teamOfferAmount, 0);

    // --- Evolve + record history for the PLAYED category (player + rivals) ---
    const allStandingValues = Object.values(riderStandings).map((v) => v.points);
    const fieldAvg = allStandingValues.length ? allStandingValues.reduce((a, b) => a + b, 0) / allStandingValues.length : 0;
    const playerBikeAvgVal = bikeAvg(playerTeamResolved.bike);

    const ctxForOwn = {};
    playerTeamResolved.riders.forEach((r) => { ctxForOwn[r.id] = { seasonPoints: riderStandings[r.id]?.points ?? 0, wins: riderWins[r.id] ?? 0, fieldAvg, teamBikeAvgVal: playerBikeAvgVal, scale }; });
    const { riders: evolvedOwnRaw, notable: ownNotable } = evolveRoster(playerTeamResolved.riders, ctxForOwn);

    const evolvedRivalsRaw = evolvedRivalsSource.map((t) => {
      const bAvg = bikeAvg(t.bike);
      const ctx = {};
      t.riders.forEach((r) => { ctx[r.id] = { seasonPoints: riderStandings[r.id]?.points ?? 0, wins: riderWins[r.id] ?? 0, fieldAvg, teamBikeAvgVal: bAvg, scale }; });
      const { riders } = evolveRoster(t.riders, ctx);
      return { ...t, riders };
    });

    const combinedPlayedCategory = applyTeamPrestigeEvolution(
      recordSeasonHistory(
        [{ ...playerTeamResolved, riders: evolvedOwnRaw }, ...evolvedRivalsRaw],
        riderStandings, ctxCategory, seasonNumber
      ),
      ctxTeamStandings, ctxCategory
    );
    const evolvedOwn = combinedPlayedCategory[0].riders;
    let evolvedRivals = combinedPlayedCategory.slice(1);

    // --- Evolve + record history for BOTH background categories ---
    const nextOther = {};
    Object.entries(otherCategoriesResolved).forEach(([key, catState]) => {
      const catScale = CATEGORY_DATA[key].scale;
      const vals = Object.values(catState.riderStandings).map((v) => v.points);
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const evolvedTeams = catState.teams.map((t) => {
        const bAvg = bikeAvg(t.bike);
        const ctx = {};
        t.riders.forEach((r) => { ctx[r.id] = { seasonPoints: catState.riderStandings[r.id]?.points ?? 0, wins: catState.riderWins[r.id] ?? 0, fieldAvg: avg, teamBikeAvgVal: bAvg, scale: catScale }; });
        const { riders } = evolveRoster(t.riders, ctx);
        return { ...t, riders };
      });
      const historied = applyTeamPrestigeEvolution(
        recordSeasonHistory(evolvedTeams, catState.riderStandings, key, catState.seasonNumber),
        catState.teamStandings, key
      );
      nextOther[key] = { teams: historied, seasonNumber: catState.seasonNumber + 1 };
    });

    // --- Contract truth for the player's own team: contractYears > 0 is
    // the ONLY reason a rider stays. Anyone whose contract just ran out
    // (and wasn't already moved by a confirmed negotiation above)
    // becomes a free agent right here. ---
    let finalRoster = evolvedOwn.filter((r) => (r.contractYears ?? 0) > 0);
    const ownExpired = evolvedOwn.filter((r) => (r.contractYears ?? 0) <= 0);
    poolFreeAgents = [...poolFreeAgents, ...ownExpired];

    // Substitutes never carry a real contract into a new season either.
    const playerSubstitutes = Object.values(ctxPlayerTeam.substitutes || {});
    if (playerSubstitutes.length) {
      poolFreeAgents = [...poolFreeAgents, ...playerSubstitutes.map((sub) => ({ ...sub, contractYears: 0, isNewTeamThisSeason: false, seasonsUnsigned: 0 }))];
    }

    // No automatic fill of any kind for the player's own roster — not a
    // free agent, not a rookie. contractYears is the only source of
    // truth; if that leaves the player short of two riders, the
    // mandatory "Completar plantilla" screen (gated in
    // goToSeasonOrOfferSubstitute below) is what actually resolves it,
    // through the exact same negotiation system as everything else.

    // --- Every other team in MotoGP, Moto2 and Moto3 runs its own full
    // market: retire, renew or release out-of-contract riders, sign free
    // agents, then cascade promotions strictly top-down. This part of
    // the AI's logic was never driven by the old selection screen and
    // needs no change — it already guarantees no AI team is left short. ---
    const catTeams = {};
    CATEGORY_ORDER.forEach((ck) => { catTeams[ck] = ck === ctxCategory ? evolvedRivals : nextOther[ck].teams; });
    const catRiderStandings = {};
    CATEGORY_ORDER.forEach((ck) => { catRiderStandings[ck] = ck === ctxCategory ? riderStandings : ctxOtherCategories[ck].riderStandings; });
    const catTeamStandings = {};
    CATEGORY_ORDER.forEach((ck) => { catTeamStandings[ck] = ck === ctxCategory ? ctxTeamStandings : ctxOtherCategories[ck].teamStandings; });

    const marketLog = { motogp: [], moto2: [], moto3: [] };
    const excludeIds = { motogp: ctxCategory === "motogp" ? "player" : null, moto2: ctxCategory === "moto2" ? "player" : null, moto3: ctxCategory === "moto3" ? "player" : null };

    CATEGORY_ORDER.forEach((ck) => {
      const released = releaseSubstitutesToPool(catTeams[ck], poolFreeAgents, marketLog[ck], CATEGORY_DATA[ck].label);
      catTeams[ck] = released.teams;
      poolFreeAgents = released.pool;
    });

    // The whole season-end market — continuity/renewal, then every
    // vacancy across all three categories resolved together as one
    // cross-category pool with a domino effect, instead of a strict
    // top-down motogp→moto2→moto3 cascade.
    const categoriesForMarket = {};
    CATEGORY_ORDER.forEach((ck) => {
      categoriesForMarket[ck] = { teams: catTeams[ck], riderStandings: catRiderStandings[ck], teamStandings: catTeamStandings[ck], excludeTeamId: excludeIds[ck] };
    });
    const marketResult = resolveSeasonMarketAcrossCategories(categoriesForMarket, poolFreeAgents, retiredIds, marketLog);
    CATEGORY_ORDER.forEach((ck) => { catTeams[ck] = marketResult.teamsByCategory[ck]; });
    poolFreeAgents = marketResult.pool;

    // Anyone left unsigned in the shared pool ages a season of
    // unemployment (nudging them toward retirement) and keeps evolving —
    // much more slowly than an active racer, but never fully frozen.
    const freeAgentNotifs = [];
    const nextFreeAgents = [];
    poolFreeAgents.forEach((r) => {
      const bumped = { ...r, seasonsUnsigned: (r.seasonsUnsigned || 0) + 1 };
      const retireCtx = {
        lostSeat: bumped.seasonsUnsigned === 1,
        seasonsUnsigned: bumped.seasonsUnsigned,
        isOfficial: false,
        recentSevereInjury: !!(r.injury && (r.injury.severity === "grave" || r.injury.severity === "muyGrave")),
      };
      if (shouldRetire(bumped, retireCtx)) {
        retiredIds.add(bumped.id);
        const lastCat = (bumped.history || [])[(bumped.history || []).length - 1]?.category || ctxCategory;
        freeAgentNotifs.push({ type: "market", category: lastCat, riderId: photoIdFor(bumped), text: `${bumped.name} anuncia su retirada tras no encontrar equipo.` });
        return;
      }
      const { rider: evolved } = evolveRider(bumped, { idleMultiplier: 0.35, scale: 1 });
      nextFreeAgents.push(evolved);
    });

    if (ctxCategory === "motogp") evolvedRivals = catTeams.motogp;
    if (ctxCategory === "moto2") evolvedRivals = catTeams.moto2;
    if (ctxCategory === "moto3") evolvedRivals = catTeams.moto3;
    CATEGORY_ORDER.forEach((ck) => {
      if (ck !== ctxCategory) nextOther[ck] = { ...nextOther[ck], teams: catTeams[ck] };
    });

    // --- New-season bikes: rebuilt from each team's hidden Base
    // Tecnológica plus Fábrica/Staff quality and a small random variation. ---
    const rolledPlayerTeam = rolloverBike(playerTeamResolved);
    evolvedRivals = evolvedRivals.map(rolloverBike);
    Object.keys(nextOther).forEach((key) => {
      nextOther[key] = { ...nextOther[key], teams: nextOther[key].teams.map(rolloverBike) };
    });

    // --- Season-boundary validation: guarantees every team — the
    // player's included, now that its roster runs through the same
    // contract-truth pipeline as everyone else's — starts the new
    // season with a non-negative budget, exactly 2 valid riders and a
    // valid warehouse. ---
    ({ teams: evolvedRivals } = validateAndRepairTeams(evolvedRivals, scale));
    Object.keys(nextOther).forEach((key) => {
      const { teams: repairedTeams } = validateAndRepairTeams(nextOther[key].teams, CATEGORY_DATA[key].scale);
      nextOther[key] = { ...nextOther[key], teams: repairedTeams };
    });
    const { team: repairedPlayerTeam } = validateAndRepairTeam({ ...rolledPlayerTeam, riders: finalRoster }, scale, { padRosterTo2: false });
    const finalRosterValidated = repairedPlayerTeam.riders;

    // --- Fresh season expectations for every team and rider ---
    let finalPlayerTeamWithExpectation;
    [finalPlayerTeamWithExpectation, ...evolvedRivals] = assignSeasonExpectations([{ ...rolledPlayerTeam, riders: finalRosterValidated, substitutes: {} }, ...evolvedRivals], true);
    Object.keys(nextOther).forEach((key) => {
      nextOther[key] = { ...nextOther[key], teams: assignSeasonExpectations(nextOther[key].teams, true) };
    });

    // --- Global integrity safety net — the actual fix for the root
    // cause, not a patch for one rider. Two independent checks, run in
    // order, right before anything is committed to state:
    //  1) Cross-collection dedup: if the same rider ID somehow ended up
    //     in two places at once (e.g. two negotiations both confirmed
    //     for the same rider), only the first occurrence survives.
    //  2) Snapshot recovery: everyone who existed before this
    //     transition started must still exist somewhere afterwards,
    //     unless they legitimately retired (retiredIds) or were
    //     promoted away (promotedAwayIds). Anyone else missing is a bug
    //     by definition — restored straight into the free-agent pool
    //     with every piece of their data intact, never lost.
    const dedup = validateGlobalRiderIntegrity({
      playerTeam: finalPlayerTeamWithExpectation,
      rivalTeams: evolvedRivals,
      otherCategories: nextOther,
      freeAgents: nextFreeAgents,
    });
    finalPlayerTeamWithExpectation = dedup.playerTeam;
    evolvedRivals = dedup.rivalTeams;
    Object.keys(nextOther).forEach((key) => { nextOther[key] = dedup.otherCategories[key]; });
    let finalFreeAgents = dedup.freeAgents;

    const afterIds = new Set([
      ...finalPlayerTeamWithExpectation.riders.map((r) => r.id),
      ...evolvedRivals.flatMap((t) => t.riders.map((r) => r.id)),
      ...Object.values(nextOther).flatMap((cs) => cs.teams.flatMap((t) => t.riders.map((r) => r.id))),
      ...finalFreeAgents.map((r) => r.id),
    ]);
    const lostRiders = riderSnapshotBefore.filter((r) => !afterIds.has(r.id) && !retiredIds.has(r.id) && !promotedAwayIds.includes(r.id));
    if (dedup.issues.length) console.log("[market][integrity]", ...dedup.issues);
    if (lostRiders.length) {
      console.log("[market][integrity] pilotos recuperados tras desaparecer del registro:", lostRiders.map((r) => r.name));
      finalFreeAgents = [...finalFreeAgents, ...lostRiders.map((r) => ({ ...r, contractYears: 0, isNewTeamThisSeason: false }))];
    }

    const rsFixed = {};
    finalRosterValidated.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: ctxPlayerTeam.name, points: 0 }; });
    evolvedRivals.forEach((t) => t.riders.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: t.name, points: 0 }; }));
    const ts = { player: 0 };
    evolvedRivals.forEach((t) => { ts[t.id] = 0; });

    const finalOther = {};
    Object.entries(nextOther).forEach(([key, catState]) => {
      const rs = {}; catState.teams.forEach((t) => t.riders.forEach((r) => { rs[r.id] = { name: r.name, teamName: t.name, points: 0 }; }));
      const tts = {}; catState.teams.forEach((t) => { tts[t.id] = 0; });
      finalOther[key] = { ...catState, riderStandings: rs, teamStandings: tts, riderWins: {}, riderPodiums: {}, sprintWins: {}, sprintPodiums: {} };
    });

    // --- Notification Center: champion/podium badges + every market move ---
    const seasonNotifs = [...freeAgentNotifs];
    function scanChampionBadges(teams, catKey, seasonNum) {
      teams.forEach((t) => t.riders.forEach((r) => {
        const last = (r.history || [])[(r.history || []).length - 1];
        if (last && last.season === seasonNum && last.badge) {
          const label = last.badge === "campeon" ? "se proclama Campeón del Mundo"
            : last.badge === "subcampeon" ? "termina subcampeón del Mundo"
            : "termina tercero en el Mundial";
          seasonNotifs.push({ type: "race", category: catKey, riderId: photoIdFor(r), text: `${r.name} (${t.name}) ${label} de ${CATEGORY_DATA[catKey].label}, temporada ${seasonNum}.` });
        }
      }));
    }
    scanChampionBadges(combinedPlayedCategory, ctxCategory, seasonNumber);
    Object.entries(ctxOtherCategories).forEach(([key, catState]) => {
      scanChampionBadges(finalOther[key].teams, key, catState.seasonNumber);
    });
    CATEGORY_ORDER.forEach((ck) => {
      (marketLog[ck] || []).forEach((e) => { seasonNotifs.push({ type: "market", category: ck, riderId: e.riderId, text: e.text }); });
    });
    pushNotifications(seasonNotifs);

    setCategory(ctxCategory);
    setPlayerTeam(() => finalPlayerTeamWithExpectation);
    setRivalTeams(evolvedRivals);
    setOtherCategories(finalOther);
    setFreeAgents(finalFreeAgents);
    setBudget((b) => b - playerSigningSpend);
    setRiderStandings(rsFixed);
    setRiderWins({});
    setRiderPodiums({});
    setSprintWins({});
    setSprintPodiums({});
    setTeamStandings(ts);
    setSeasonEvents(ownNotable);
    setMarketSummary(buildMarketSummaryByCategory(marketLog, marketNegotiations, afterNegotiations.strandedNegotiationIds));
    setMarketNegotiations([]);
    setMarketRumors([]);
    setRound(0);
    setSeasonNumber((s) => s + 1);
    setPhase("market-summary");
  }

  return (
    <div className="min-h-screen w-full relative" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "Inter, sans-serif" }}>
      {inGame && phase !== "season" && phase !== "result" && phase !== "qualifying" && phase !== "sprint" && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
          {saveOk && <span className="text-xs" style={{ color: COLORS.gold }}>Guardado ✓</span>}
          <button onClick={() => openSaveModal(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
            style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
            <Save size={14} /> Guardar partida
          </button>
          <button onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
            style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
            <LogOut size={14} /> Salir de la partida
          </button>
        </div>
      )}

      {phase === "home" && (
        <HomeScreen onQuick={goQuick} onCareer={goCareer} onLoad={goLoadMenu} storageOk={storageOk} />
      )}

      {phase === "slotpick-new" && (
        <SlotPickScreen mode="new" slotsMeta={slotsMeta} onPick={pickSlotForNewGame} onDeleteSlot={deleteSlot} goHome={goHome} storageOk={storageOk} />
      )}

      {phase === "loadslots" && (
        <SlotPickScreen mode="load" slotsMeta={slotsMeta} onLoad={loadFromSlot} onDeleteSlot={deleteSlot} goHome={goHome} storageOk={storageOk} />
      )}

      {phase === "setup" && teams && (
        <SetupScreen
          managerName={draftManagerName} setManagerName={setDraftManagerName}
          category={draftCategory} pickCategory={pickCategory}
          teams={teams} chooseTeam={chooseTeam} goHome={goHome}
        />
      )}

      {phase === "career-name" && (
        <CareerNameScreen managerName={draftManagerName} setManagerName={setDraftManagerName} onSubmit={submitCareerName} goHome={goHome} />
      )}

      {phase === "career-picker" && careerStarterOptions && (
        <CareerPickerScreen choices={careerStarterOptions.choices} onChoose={chooseCareerTeam} />
      )}

      {phase === "season" && playerTeam && (
        <SeasonScreen
          {...{ playerTeam, rivalTeams, otherCategories, category, round, seasonNumber, budget, riderStandings, teamStandings, riderWins, riderPodiums, startProject, runRace, saving, scale, seasonEvents, setSeasonEvents, openProfile, findRiderInCategory, freeAgents, gpHistory, marketRumors, marketNegotiations, onRespondToIncomingOffer: respondToIncomingOffer, onOpenNegotiation: openProfileFromNegotiation, onOpenRiderProfileById: openRiderProfileById, onOpenTeamProfileById: openTeamProfileById, onOpenPackageReview: setOpenPackageId, onStartQualifying: runQualifying }}
          notifCount={countUnread(notifications.motogp) + countUnread(notifications.moto2) + countUnread(notifications.moto3)}
          onOpenNotifications={openNotificationCenter}
          onOpenSaveModal={() => openSaveModal(false)}
          onExitGame={() => setShowExitConfirm(true)}
          onStartWarehouseProduction={startWarehouseProduction}
          onStartUrgentWarehouseProduction={startUrgentWarehouseProduction}
          onOpenTeamProfile={openTeamProfile}
          onStartFactoryUpgrade={startFactoryUpgrade}
          onStartStaffUpgrade={startStaffUpgrade}
        />
      )}
      {phase === "qualifying" && pendingQualifying && playerTeam && (
        <QualifyingScreen pendingQualifying={pendingQualifying} accent={playerTeam.color} category={category} onContinue={category === "motogp" ? runSprint : runRace} />
      )}
      {phase === "sprint" && pendingSprintResult && playerTeam && (
        <ResultScreen lastResult={pendingSprintResult} accent={playerTeam.color} continueAfterResult={runRace} isLastRound={false} category={category} sprintMode />
      )}
      {phase === "result" && lastResult && playerTeam && (
        <ResultScreen lastResult={lastResult} accent={playerTeam.color} continueAfterResult={continueAfterResult} isLastRound={round >= CIRCUITS.length - 1} category={category} />
      )}
      {phase === "seasonend" && playerTeam && (
        <SeasonEndScreen
          {...{ riderStandings, teamStandings, playerTeam, rivalTeams, otherCategories, category, seasonNumber, openProfile, findRiderInCategory }}
          onOpenTeamProfile={openTeamProfile}
          goToMarket={proceedFromSeasonEnd}
          isCareer={gameMode === "career"}
        />
      )}
      {phase === "career-offers" && playerTeam && (
        <CareerOffersScreen offers={careerOffers} category={category} onAccept={acceptCareerOffer} onDecline={declineCareerOffers} />
      )}
      {phase === "market-summary" && marketSummary && (
        <MarketSummaryScreen summary={marketSummary} onContinue={() => goToSeasonOrOfferSubstitute(playerTeam)} />
      )}
      {phase === "complete-roster" && playerTeam && (
        <RosterCompletionScreen
          playerTeam={playerTeam} freeAgents={freeAgents} category={category} accent={playerTeam.color}
          openProfile={openProfile} onContinue={() => goToSeasonOrOfferSubstitute(playerTeam)}
        />
      )}
      {phase === "substitute-select" && playerTeam && pendingSubstitution && (
        <SubstituteScreen
          playerTeam={playerTeam}
          pendingSubstitution={pendingSubstitution}
          freeAgents={freeAgents}
          category={category}
          budget={budget}
          scale={scale}
          onConfirm={confirmSubstitute}
          onSkip={skipSubstitute}
          openProfile={openProfile}
        />
      )}
      <RiderProfileModal
        target={resolveLiveProfileTarget()}
        onClose={() => setProfileTarget(null)}
        isOwnRider={!!(playerTeam && profileTarget && playerTeam.riders.some((r) => r.id === profileTarget.rider.id) && (phase === "season" || phase === "complete-roster"))}
        budget={budget}
        onFireRider={fireRider}
        playerTeam={(phase === "season" || phase === "complete-roster") ? playerTeam : null}
        category={category}
        onSignFreeAgent={phase === "season" ? signFreeAgentNow : null}
        marketNegotiations={marketNegotiations}
        onCreateOffer={phase === "complete-roster" ? createRosterCompletionOffer : createPlayerOffer}
        canStartNewOffer={phase === "season" ? nextSeasonPlayerRiderCount() < 2 : phase === "complete-roster" && playerTeam && playerTeam.riders.length < 2}
        onMarkReleaseAtSeasonEnd={markReleaseAtSeasonEnd}
        onAcceptCounterOffer={phase === "complete-roster" ? acceptRosterCompletionCounter : acceptCounterOfferAction}
        onModifyOffer={phase === "complete-roster" ? modifyRosterCompletionOffer : modifyPlayerOffer}
        onWithdrawOffer={withdrawPlayerOffer}
        scale={scale}
      />
      <TeamProfileModal
        target={resolveLiveTeamProfileTarget()}
        onClose={() => setTeamProfileTarget(null)}
        onOpenRiderProfile={openProfile}
      />
      {openPackageId && playerTeam && (
        <BikePackageModal
          pkg={playerTeam.pendingPackages?.find((p) => p.id === openPackageId)}
          playerTeam={playerTeam}
          accent={playerTeam.color}
          onClose={() => setOpenPackageId(null)}
          onAccept={() => acceptPackage(openPackageId)}
          onDiscard={() => discardPackage(openPackageId)}
        />
      )}

      {showNotifications && (
        <NotificationCenterModal notifications={notifications} category={category} onClose={() => setShowNotifications(false)} />
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div className="w-full max-w-sm rounded-lg border p-5" style={{ background: COLORS.panel, borderColor: COLORS.rule }}>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>¿Salir de la partida?</h3>
            <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Podés guardar tu progreso antes de salir al menú principal.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => openSaveModal(true)} className="py-2 rounded-md font-semibold flex items-center justify-center gap-2" style={{ background: COLORS.gold, color: "#12151A" }}>
                <Save size={16} /> Guardar y salir
              </button>
              <button onClick={confirmExitNoSave} className="py-2 rounded-md font-semibold" style={{ background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.rule}` }}>
                Salir sin guardar
              </button>
              <button onClick={() => setShowExitConfirm(false)} className="py-2 rounded-md text-sm" style={{ color: COLORS.muted }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {saveModal.open && (
        <SaveSlotsModal
          slotsMeta={slotsMeta}
          pendingOverwrite={saveModal.pendingOverwrite}
          saving={saving}
          saveError={saveError}
          onPick={pickSlotToSave}
          onConfirmOverwrite={() => performSaveToSlot(saveModal.pendingOverwrite)}
          onCancelOverwrite={() => setSaveModal((m) => ({ ...m, pendingOverwrite: null }))}
          onDeleteSlot={deleteSlot}
          onClose={closeSaveModal}
        />
      )}
    </div>
  );
}
