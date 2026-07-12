import { useState, useEffect, useCallback } from "react";
import { LogOut, Save } from "lucide-react";
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
import { SeasonEndScreen } from "./pages/SeasonEnd.jsx";
import { SeasonScreen } from "./pages/SeasonHub.jsx";
import { MarketSummaryScreen } from "./pages/TransferSummary.jsx";
import { MarketScreen } from "./pages/Transfers.jsx";
import { advanceFacilityUpgrades, advanceTeamProjects, bikeAvg, canStartFacilityUpgrade, canStartProject, rolloverBike, startFacilityUpgrade, startProjectOnTeam } from "./utils/bikeDevelopment.js";
import { validateAndRepairTeams } from "./utils/careerValidation.js";
import { mergeNotificationItems, markAllNotificationsRead, countUnread } from "./utils/notifications.js";
import { findInTeamRoster, simulateFullGridRound, simulateRound } from "./utils/raceSimulation.js";
import { processTeamAfterRace } from "./utils/raceWeekend.js";
import { clamp } from "./utils/random.js";
import { evolveRider, evolveRoster } from "./utils/riderEvolution.js";
import { instantiateTeams, makeRookie, seedLegendFreeAgents } from "./utils/riderGeneration.js";
import { applyMoraleToCategoryTeams } from "./utils/riderMorale.js";
import { fireRiderCost, isFreeAgentEligibleForCategory, overallRating, photoIdFor, substituteHireCost } from "./utils/riders.js";
import { SAVE_SLOT_IDS } from "./utils/saveSlotFormat.js";
import { recordSeasonHistory, shouldRetire } from "./utils/seasonHistory.js";
import { assignSeasonExpectations } from "./utils/teamExpectations.js";
import { computeMarket, fillFromLowerCategory, fillWithRookies, findBestReplacement, getLowerTeamsFor, releaseSubstitutesToPool, runCategoryMarket } from "./utils/transferMarket.js";
import { queueWarehouseProduction, urgentWarehouseProduction, warehouseCost } from "./utils/warehouseEngine.js";

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
  const [teamProfileTarget, setTeamProfileTarget] = useState(null);

  const storageOk = typeof window !== "undefined" && window.storage;
  const inGame = phase === "season" || phase === "result" || phase === "seasonend" || phase === "market" || phase === "career-offers" || phase === "market-summary" || phase === "substitute-select";

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
  const teamStandings = game?.teamStandings ?? {};
  const lastResult = game?.lastResult ?? null;
  const seasonEvents = game?.seasonEvents ?? [];
  const marketData = game?.marketData ?? null;
  const careerOffers = game?.careerOffers ?? [];
  const marketSummary = game?.marketSummary ?? null;
  const notifications = game?.notifications ?? { motogp: [], moto2: [], moto3: [] };
  const pendingSubstitution = game?.pendingSubstitution ?? null;
  const scale = category ? CATEGORY_DATA[category].scale : 1;

  /* Thin "setter" wrappers so all the existing gameplay logic below can
     keep calling setPlayerTeam(...), setBudget(x => x - cost), etc. exactly
     as before — each one just patches a single field of `game` instead of
     its own independent useState. Using the functional setGame form means
     several of these can be called back-to-back in the same event handler
     (as runRace/confirmMarket do) without reading stale data. */
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
  const setTeamStandings = makeFieldSetter("teamStandings");
  const setLastResult = makeFieldSetter("lastResult");
  const setSeasonEvents = makeFieldSetter("seasonEvents");
  const setMarketData = makeFieldSetter("marketData");
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
    const playerTeam = data.playerTeam
      ? validateAndRepairTeams([data.playerTeam], CATEGORY_DATA[category]?.scale ?? 1).teams[0]
      : null;
    const rivalTeams = validateAndRepairTeams(data.rivalTeams || [], CATEGORY_DATA[category]?.scale ?? 1).teams;
    const otherCategories = {};
    Object.entries(data.otherCategories || {}).forEach(([key, catState]) => {
      const { teams } = validateAndRepairTeams(catState?.teams || [], CATEGORY_DATA[key]?.scale ?? 1);
      otherCategories[key] = { ...catState, teams };
    });

    setGame({
      notifications: { motogp: [], moto2: [], moto3: [] },
      pendingSubstitution: null,
      riderPodiums: {},
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
      initOther[k] = { teams: t, riderStandings: rs, teamStandings: tts, riderWins: {}, riderPodiums: {}, seasonNumber: 1 };
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
      riderWins: {}, riderPodiums: {},
      teamStandings: ts,
      lastResult: null,
      seasonEvents: [],
      marketData: null,
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
    goToMarket();
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
    nextOtherCats[category] = { teams: oldCatTeams, riderStandings: oldRs, teamStandings: oldTs, riderWins: {}, riderPodiums: {}, seasonNumber: seasonNumber + 1 };

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
    setTeamStandings(ts);
    setSeasonNumber(newCatState.seasonNumber);
    setCareerOffers([]);
    goToMarketWith(newPlayerTeam, newRivals, ts, nextOtherCats, newCategory);
  }

  /* Variant of goToMarket that takes explicit context, used right after a
     career-mode team switch (state setters haven't flushed yet). */
  function goToMarketWith(pTeam, rTeams, tStandings, otherCats, cat) {
    const data = computeMarket(pTeam, rTeams, tStandings, otherCats, cat, freeAgents, {});
    setMarketData(data);
    setPhase("market");
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
      initOther[k] = { teams: t, riderStandings: rs, teamStandings: tts, riderWins: {}, riderPodiums: {}, seasonNumber: 1 };
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
      riderWins: {}, riderPodiums: {},
      teamStandings: ts,
      lastResult: null,
      seasonEvents: [],
      marketData: null,
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

  function renewRiderContract(riderId) {
    const rider = playerTeam?.riders.find((r) => r.id === riderId);
    if (!rider) return;
    const cost = Math.round((rider.marketValue || 0) * 0.08);
    if (cost > budget) return;
    setBudget((b) => b - cost);
    setPlayerTeam((t) => ({ ...t, riders: t.riders.map((r) => (r.id === riderId ? { ...r, contractYears: (r.contractYears || 0) + 1 } : r)) }));
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

  function runRace() {
    const circuitProfile = CIRCUIT_PROFILES[round];
    const isWet = Math.random() * 100 < circuitProfile.wetPct;
    const roundsLeft = CIRCUITS.length - round;
    const notifQueue = [];
    const poolRef = { pool: [...freeAgents] };

    // --- Played category: player + rivals ---
    const { results, poleRiderId } = simulateRound(playerTeam, rivalTeams, circuitProfile, isWet, roundsLeft);
    const { team: playerAfterProjects, arrivals } = advanceTeamProjects(playerTeam);
    const { team: playerAfterFacilities, arrivals: facilityArrivals } = advanceFacilityUpgrades(playerAfterProjects);

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
    Object.entries(otherCategories).forEach(([key, catState]) => {
      const { results: catResults } = simulateFullGridRound(catState.teams, circuitProfile, isWet, roundsLeft);
      otherResultsByCat[key] = catResults;
      const rS = { ...catState.riderStandings };
      catResults.forEach((r) => { rS[r.id] = { name: r.name, teamName: r.teamName, points: (rS[r.id]?.points || 0) + r.points }; });
      const tS = { ...catState.teamStandings };
      catResults.forEach((r) => { tS[r.teamId] = (tS[r.teamId] || 0) + r.points; });
      const rW = { ...catState.riderWins };
      catResults.forEach((r) => { if (r.position === 1 && !r.crashed) rW[r.id] = (rW[r.id] || 0) + 1; });
      const rP = { ...catState.riderPodiums };
      catResults.forEach((r) => { if (r.position <= 3 && !r.crashed) rP[r.id] = (rP[r.id] || 0) + 1; });

      const catRows = catState.teams.map((t) => ({ id: t.id, points: catState.teamStandings[t.id] || 0 })).sort((a, b) => b.points - a.points);
      const catPosMap = {};
      catRows.forEach((r, i) => { catPosMap[r.id] = i + 1; });
      const catScale = CATEGORY_DATA[key].scale;

      const teamsNext = catState.teams.map((t) => processTeamAfterRace(t, catResults, key, {
        isPlayer: false, position: catPosMap[t.id] || catState.teams.length, totalTeams: catState.teams.length, roundIndex: round, totalRounds: CIRCUITS.length, scale: catScale,
      }, poolRef, notifQueue));
      const teamsWithMorale = applyMoraleToCategoryTeams(teamsNext, rS, tS, rW, rP, catScale);

      nextOtherCategories[key] = { ...catState, teams: teamsWithMorale, riderStandings: rS, teamStandings: tS, riderWins: rW, riderPodiums: rP };
    });

    setGame((g) => (g ? {
      ...g,
      lastResult: { circuitName: CIRCUITS[round], circuitProfile, isWet, category, results: { ...otherResultsByCat, [category]: results }, arrivals },
      riderStandings: riderStandingsNext,
      riderWins: riderWinsNext,
      riderPodiums: riderPodiumsNext,
      teamStandings: teamStandingsNext,
      budget: g.budget + prize - runningCost,
      playerTeam: playerWithMorale,
      rivalTeams: rivalsWithMorale,
      otherCategories: nextOtherCategories,
      freeAgents: poolRef.pool,
      notifications: mergeNotificationItems(g.notifications, notifQueue, category),
      pendingSubstitution: newPendingSub,
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
      goToMarket();
    }
  }

  function goToMarket() {
    const sorted = Object.entries(riderStandings).sort((a, b) => b[1].points - a[1].points);
    const posById = {};
    sorted.forEach(([id], i) => { posById[id] = i + 1; });
    const hasUpper = category !== "motogp";
    const departures = {};

    if (hasUpper) {
      playerTeam.riders.forEach((r) => {
        const wins = riderWins[r.id] || 0;
        const pos = posById[r.id] || 99;
        const wantsUp = r.pa >= 78 && (wins >= 2 || pos <= 5);
        if (wantsUp) {
          const chance = r.pa >= 85 ? 0.75 : r.pa >= 78 ? 0.55 : 0.4;
          departures[r.id] = { success: Math.random() < chance };
        }
      });
      const anyFailed = Object.values(departures).some((d) => !d.success);
      if (anyFailed) {
        setPlayerTeam((t) => ({
          ...t,
          riders: t.riders.map((r) => (departures[r.id] && !departures[r.id].success ? { ...r, morale: clamp(r.morale - 15, 0, 100) } : r)),
        }));
      }
    }

    const data = computeMarket(playerTeam, rivalTeams, teamStandings, otherCategories, category, freeAgents, departures);
    setMarketData(data);
    setPhase("market");
  }

  function confirmMarket(selections) {
    const spent = selections.reduce((s, sel) => s + (sel.origin === "own" ? 0 : sel.cost), 0);

    // --- Evolve + record history for the PLAYED category (player + rivals) ---
    const allStandingValues = Object.values(riderStandings).map((v) => v.points);
    const fieldAvg = allStandingValues.length ? allStandingValues.reduce((a, b) => a + b, 0) / allStandingValues.length : 0;
    const playerBikeAvgVal = bikeAvg(playerTeam.bike);

    const ctxForOwn = {};
    playerTeam.riders.forEach((r) => { ctxForOwn[r.id] = { seasonPoints: riderStandings[r.id]?.points ?? 0, wins: riderWins[r.id] ?? 0, fieldAvg, teamBikeAvgVal: playerBikeAvgVal, scale }; });
    const { riders: evolvedOwnRaw, notable: ownNotable } = evolveRoster(playerTeam.riders, ctxForOwn);

    const evolvedRivalsRaw = rivalTeams.map((t) => {
      const bAvg = bikeAvg(t.bike);
      const ctx = {};
      t.riders.forEach((r) => { ctx[r.id] = { seasonPoints: riderStandings[r.id]?.points ?? 0, wins: riderWins[r.id] ?? 0, fieldAvg, teamBikeAvgVal: bAvg, scale }; });
      const { riders } = evolveRoster(t.riders, ctx);
      return { ...t, riders };
    });

    const combinedPlayedCategory = recordSeasonHistory(
      [{ ...playerTeam, riders: evolvedOwnRaw }, ...evolvedRivalsRaw],
      riderStandings, category, seasonNumber
    );
    const evolvedOwn = combinedPlayedCategory[0].riders;
    let evolvedRivals = combinedPlayedCategory.slice(1);

    // --- Evolve + record history for BOTH background categories ---
    const nextOther = {};
    Object.entries(otherCategories).forEach(([key, catState]) => {
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
      const historied = recordSeasonHistory(evolvedTeams, catState.riderStandings, key, catState.seasonNumber);
      nextOther[key] = { teams: historied, seasonNumber: catState.seasonNumber + 1 };
    });

    // --- Resolve the PLAYER's own selections first (their own team is
    // never touched by the AI market pass below) ---
    const lowerKey = CATEGORY_DATA[category].lower;
    const findEvolved = (origin, id, fromTeamId) => {
      if (origin === "own") return evolvedOwn.find((r) => r.id === id);
      if (origin === "market") return evolvedRivals.find((t) => t.id === fromTeamId)?.riders.find((r) => r.id === id);
      if (origin === "lower" && lowerKey) return nextOther[lowerKey]?.teams.find((t) => t.id === fromTeamId)?.riders.find((r) => r.id === id);
      if (origin === "freeagent") return freeAgents.find((r) => r.id === id);
      return null;
    };

    const finalRoster = selections.map((sel) => {
      const evolved = findEvolved(sel.origin, sel.rider.id, sel.fromTeamId) || sel.rider;
      return sel.origin === "own" ? evolved : { ...evolved, isNewTeamThisSeason: true, contractYears: 2 };
    });

    const keptOwnIds = selections.filter((s) => s.origin === "own").map((s) => s.rider.id);
    const released = evolvedOwn.filter((r) => !keptOwnIds.includes(r.id));

    let poolFreeAgents = [...freeAgents];

    // Bug fix: a substitute only ever holds a temporary contract covering
    // an injured rider's seat — it must never survive into a new season
    // still attached to the team. Release the player's own substitute(s)
    // now, before anything else touches the free-agent pool, so a
    // substitute can still be signed to a real contract later in this
    // same market pass if some team wants them.
    const playerSubstitutes = Object.values(playerTeam.substitutes || {});
    if (playerSubstitutes.length) {
      poolFreeAgents = [...poolFreeAgents, ...playerSubstitutes.map((sub) => ({ ...sub, contractYears: 0, isNewTeamThisSeason: false, seasonsUnsigned: 0 }))];
    }

    selections.forEach((sel) => {
      if (sel.origin === "market") {
        const lowerTeamsForPlayed = getLowerTeamsFor(category, nextOther);
        const replacement = findBestReplacement(lowerTeamsForPlayed, poolFreeAgents);
        let replacementRider;
        if (replacement) {
          replacementRider = { ...replacement.rider, isNewTeamThisSeason: true };
          if (replacement.source === "lower") {
            const lk = CATEGORY_DATA[category].lower;
            nextOther[lk] = {
              ...nextOther[lk],
              teams: nextOther[lk].teams.map((t) => (
                t.id === replacement.fromTeamId
                  ? { ...t, riders: [...t.riders.filter((r) => r.id !== replacement.rider.id), makeRookie(CATEGORY_DATA[lk].scale)] }
                  : t
              )),
            };
          } else {
            poolFreeAgents = poolFreeAgents.filter((r) => r.id !== replacement.rider.id);
          }
        } else {
          replacementRider = makeRookie(scale);
        }
        evolvedRivals = evolvedRivals.map((t) => {
          if (t.id !== sel.fromTeamId) return t;
          const remaining = t.riders.filter((r) => r.id !== sel.rider.id);
          return { ...t, riders: [...remaining, replacementRider] };
        });
      } else if (sel.origin === "lower" && lowerKey && nextOther[lowerKey]) {
        const lowerOfLower = getLowerTeamsFor(lowerKey, nextOther);
        const replacement = findBestReplacement(lowerOfLower, poolFreeAgents);
        let replacementRider;
        if (replacement) {
          replacementRider = { ...replacement.rider, isNewTeamThisSeason: true };
          if (replacement.source === "lower") {
            const llk = CATEGORY_DATA[lowerKey].lower;
            nextOther[llk] = {
              ...nextOther[llk],
              teams: nextOther[llk].teams.map((t) => (
                t.id === replacement.fromTeamId
                  ? { ...t, riders: [...t.riders.filter((r) => r.id !== replacement.rider.id), makeRookie(CATEGORY_DATA[llk].scale)] }
                  : t
              )),
            };
          } else {
            poolFreeAgents = poolFreeAgents.filter((r) => r.id !== replacement.rider.id);
          }
        } else {
          replacementRider = makeRookie(CATEGORY_DATA[lowerKey].scale);
        }
        nextOther[lowerKey] = {
          ...nextOther[lowerKey],
          teams: nextOther[lowerKey].teams.map((t) => {
            if (t.id !== sel.fromTeamId) return t;
            const remaining = t.riders.filter((r) => r.id !== sel.rider.id);
            return { ...t, riders: [...remaining, replacementRider] };
          }),
        };
      }
    });

    poolFreeAgents = poolFreeAgents.filter((r) => !selections.some((s) => s.origin === "freeagent" && s.rider.id === r.id));
    poolFreeAgents = [...poolFreeAgents, ...released];

    // --- Every other team in MotoGP, Moto2 and Moto3 now runs its own
    // full market: retire, renew or release out-of-contract riders, sign
    // free agents, then cascade promotions strictly top-down (MotoGP pulls
    // from Moto2, Moto2 pulls from Moto3, Moto3 fills any remaining gaps
    // with brand-new prospects). One shared free-agent pool and market log
    // across all three categories, exactly like the player's own market. ---
    const catTeams = {};
    CATEGORY_ORDER.forEach((ck) => { catTeams[ck] = ck === category ? evolvedRivals : nextOther[ck].teams; });
    const catRiderStandings = {};
    CATEGORY_ORDER.forEach((ck) => { catRiderStandings[ck] = ck === category ? riderStandings : otherCategories[ck].riderStandings; });
    const catTeamStandings = {};
    CATEGORY_ORDER.forEach((ck) => { catTeamStandings[ck] = ck === category ? teamStandings : otherCategories[ck].teamStandings; });

    const marketLog = { motogp: [], moto2: [], moto3: [] };
    const excludeIds = { motogp: category === "motogp" ? "player" : null, moto2: category === "moto2" ? "player" : null, moto3: category === "moto3" ? "player" : null };

    // Same substitute-release fix as the player's own team above, applied
    // to every AI-controlled team across all three categories (including
    // the rivals in the played category) — no substitute contract should
    // ever survive a season boundary still attached to a team.
    CATEGORY_ORDER.forEach((ck) => {
      const released = releaseSubstitutesToPool(catTeams[ck], poolFreeAgents, marketLog[ck], CATEGORY_DATA[ck].label);
      catTeams[ck] = released.teams;
      poolFreeAgents = released.pool;
    });

    // Renew/release/free-agent pass for every category, in no particular
    // order (independent so far — promotions are what actually cascade).
    CATEGORY_ORDER.forEach((ck) => {
      catTeams[ck] = runCategoryMarket(catTeams[ck], catRiderStandings[ck], catTeamStandings[ck], poolFreeAgents, marketLog[ck], CATEGORY_DATA[ck].label, excludeIds[ck], ck);
    });

    // Promotion cascade: MotoGP first (pulls from Moto2), then Moto2
    // (pulls from whatever's left of Moto3), then Moto3 (fills any
    // remaining gaps — its own releases plus anyone just promoted out of
    // it — with freshly generated young prospects).
    catTeams.motogp = fillFromLowerCategory(catTeams.motogp, catTeams.moto2, marketLog.motogp, "MotoGP", "Moto2");
    catTeams.moto2 = fillFromLowerCategory(catTeams.moto2, catTeams.moto3, marketLog.moto2, "Moto2", "Moto3");
    catTeams.moto3 = fillWithRookies(catTeams.moto3, marketLog.moto3, "Moto3", CATEGORY_DATA.moto3.scale);

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
        const lastCat = (bumped.history || [])[(bumped.history || []).length - 1]?.category || category;
        freeAgentNotifs.push({ type: "market", category: lastCat, riderId: photoIdFor(bumped), text: `${bumped.name} anuncia su retirada tras no encontrar equipo.` });
        return;
      }
      const { rider: evolved } = evolveRider(bumped, { idleMultiplier: 0.35, scale: 1 });
      nextFreeAgents.push(evolved);
    });

    evolvedRivals = category === "motogp" ? catTeams.motogp : evolvedRivals;
    if (category === "moto2") evolvedRivals = catTeams.moto2;
    if (category === "moto3") evolvedRivals = catTeams.moto3;
    CATEGORY_ORDER.forEach((ck) => {
      if (ck !== category) nextOther[ck] = { ...nextOther[ck], teams: catTeams[ck] };
    });

    // --- New-season bikes: rebuilt from each team's hidden Base
    // Tecnológica plus Fábrica/Staff quality and a small random variation
    // (see rolloverBike in bikeDevelopment.js). Applies to every team in
    // the game, not just the player's. ---
    const rolledPlayerTeam = rolloverBike(playerTeam);
    evolvedRivals = evolvedRivals.map(rolloverBike);
    Object.keys(nextOther).forEach((key) => {
      nextOther[key] = { ...nextOther[key], teams: nextOther[key].teams.map(rolloverBike) };
    });

    // --- Season-boundary validation: guarantees every AI-controlled team
    // starts the new season with a non-negative budget, exactly 2 valid
    // riders and a valid warehouse. Root causes are fixed at their source
    // (raceWeekend.js, transferMarket.js); this is the safety net that
    // also rescues save files that had already drifted into a broken
    // state before those fixes existed. ---
    ({ teams: evolvedRivals } = validateAndRepairTeams(evolvedRivals, scale));
    Object.keys(nextOther).forEach((key) => {
      const { teams: repairedTeams } = validateAndRepairTeams(nextOther[key].teams, CATEGORY_DATA[key].scale);
      nextOther[key] = { ...nextOther[key], teams: repairedTeams };
    });

    // --- Fresh season expectations for every team and rider, recalculated
    // from scratch now that budgets, bikes, Fábrica, Staff and rosters are
    // all settled for the new season. Every season transition happens
    // after season 1, so research always counts here (see
    // computeTeamStrengthScore / the season-1-only exception at game
    // creation). ---
    let finalPlayerTeamWithExpectation;
    [finalPlayerTeamWithExpectation, ...evolvedRivals] = assignSeasonExpectations([{ ...rolledPlayerTeam, riders: finalRoster, substitutes: {} }, ...evolvedRivals], true);
    Object.keys(nextOther).forEach((key) => {
      nextOther[key] = { ...nextOther[key], teams: assignSeasonExpectations(nextOther[key].teams, true) };
    });

    const rsFixed = {};
    finalRoster.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: playerTeam.name, points: 0 }; });
    evolvedRivals.forEach((t) => t.riders.forEach((r) => { rsFixed[r.id] = { name: r.name, teamName: t.name, points: 0 }; }));
    const ts = { player: 0 };
    evolvedRivals.forEach((t) => { ts[t.id] = 0; });

    const finalOther = {};
    Object.entries(nextOther).forEach(([key, catState]) => {
      const rs = {}; catState.teams.forEach((t) => t.riders.forEach((r) => { rs[r.id] = { name: r.name, teamName: t.name, points: 0 }; }));
      const tts = {}; catState.teams.forEach((t) => { tts[t.id] = 0; });
      finalOther[key] = { ...catState, riderStandings: rs, teamStandings: tts, riderWins: {}, riderPodiums: {} };
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
    scanChampionBadges(combinedPlayedCategory, category, seasonNumber);
    Object.entries(otherCategories).forEach(([key, catState]) => {
      scanChampionBadges(finalOther[key].teams, key, catState.seasonNumber);
    });
    CATEGORY_ORDER.forEach((ck) => {
      (marketLog[ck] || []).forEach((e) => { seasonNotifs.push({ type: "market", category: ck, riderId: e.riderId, text: e.text }); });
    });
    pushNotifications(seasonNotifs);

    setPlayerTeam(() => finalPlayerTeamWithExpectation);
    setRivalTeams(evolvedRivals);
    setOtherCategories(finalOther);
    setFreeAgents(nextFreeAgents);
    setBudget((b) => b - spent);
    setRiderStandings(rsFixed);
    setRiderWins({});
    setRiderPodiums({});
    setTeamStandings(ts);
    setSeasonEvents(ownNotable);
    setMarketSummary(marketLog);
    setRound(0);
    setSeasonNumber((s) => s + 1);
    setMarketData(null);
    setPhase("market-summary");
  }

  return (
    <div className="min-h-screen w-full relative" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "Inter, sans-serif" }}>
      {inGame && phase !== "season" && (
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
          {...{ playerTeam, rivalTeams, otherCategories, category, round, seasonNumber, budget, riderStandings, teamStandings, riderWins, riderPodiums, startProject, runRace, saving, scale, seasonEvents, setSeasonEvents, openProfile, findRiderInCategory, freeAgents }}
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
      {phase === "result" && lastResult && playerTeam && (
        <ResultScreen lastResult={lastResult} accent={playerTeam.color} continueAfterResult={continueAfterResult} isLastRound={round >= CIRCUITS.length - 1} category={category} />
      )}
      {phase === "seasonend" && playerTeam && (
        <SeasonEndScreen
          {...{ riderStandings, teamStandings, playerTeam, rivalTeams, otherCategories, category, seasonNumber, openProfile, findRiderInCategory }}
          goToMarket={proceedFromSeasonEnd}
          isCareer={gameMode === "career"}
        />
      )}
      {phase === "career-offers" && playerTeam && (
        <CareerOffersScreen offers={careerOffers} category={category} onAccept={acceptCareerOffer} onDecline={declineCareerOffers} />
      )}
      {phase === "market" && playerTeam && marketData && (
        <MarketScreen playerTeam={playerTeam} marketData={marketData} budget={budget} category={category} onConfirm={confirmMarket} openProfile={openProfile} />
      )}
      {phase === "market-summary" && marketSummary && (
        <MarketSummaryScreen summary={marketSummary} onContinue={() => goToSeasonOrOfferSubstitute(playerTeam)} />
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
        isOwnRider={!!(playerTeam && profileTarget && playerTeam.riders.some((r) => r.id === profileTarget.rider.id) && phase === "season")}
        budget={budget}
        onRenewContract={renewRiderContract}
        onFireRider={fireRider}
        playerTeam={phase === "season" ? playerTeam : null}
        category={category}
        onSignFreeAgent={signFreeAgentNow}
      />
      <TeamProfileModal
        target={resolveLiveTeamProfileTarget()}
        onClose={() => setTeamProfileTarget(null)}
        onOpenRiderProfile={openProfile}
      />

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
