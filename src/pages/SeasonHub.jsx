import { useState } from "react";
import { AlertTriangle, Bell, ChevronDown, ChevronRight, ChevronUp, Flag, LogOut, Save, Star, Wallet, Wrench } from "lucide-react";
import { clamp } from "../utils/random.js";
import { BottomNavBar } from "../components/BottomNavBar.jsx";
import { PlayerCareerPanel } from "../components/PlayerCareerPanel.jsx";
import { HallOfFamePanel } from "../components/HallOfFamePanel.jsx";
import { CalendarPanel, CircuitInfoPanel } from "../components/CircuitInfo.jsx";
import { BikeHero } from "../components/BikeHero.jsx";
import { ManufacturerLogo } from "../components/ManufacturerLogo.jsx";
import { isRestrictedMotoGpSatellite } from "../data/motogpBikeTiers.js";
import { MyRidersPanel } from "../components/MyRidersPanel.jsx";
import { RumorsPanel, OffersPanel } from "../components/MarketPanels.jsx";
import { FactoryPanel } from "../components/FactoryPanel.jsx";
import { teamDisplayName } from "../utils/teamNaming.js";
import { StaffPanel } from "../components/StaffPanel.jsx";
import { SportingDirectorPanel } from "../components/SportingDirectorPanel.jsx";
import { SponsorsPanel } from "../components/SponsorsPanel.jsx";
import { EconomyPanel } from "../components/EconomyPanel.jsx";
import { AdvancedFreeAgentSearch, FreeAgentsPanel } from "../components/RiderMarket.jsx";
import { DetailedStandingsPanel, SeasonArchivePanel, StandingsPanel } from "../components/Standings.jsx";
import { TeamLogo } from "../components/TeamLogo.jsx";
import { CircuitHero } from "../components/CircuitHero.jsx";
import { CheckerStrip, Panel, PriorityAlertBanner } from "../components/UIPrimitives.jsx";
import { WarehousePanel } from "../components/WarehousePanel.jsx";
import { CATEGORY_DATA } from "../data/categories.js";
import { PRESTIGE_SCALE_MAX } from "../data/categoryPrestigeConfig.js";
import { CIRCUITS, CIRCUIT_PROFILES, dateForRound } from "../data/circuits.js";
import { SUPERBIKES_CIRCUITS, SUPERBIKES_CIRCUIT_PROFILES } from "../data/circuitsSuperbikes.js";
import { SUPERBIKES_RACE_MAIN_ROUNDS, SUPERBIKES_ROUND_MAP, isSuperbikesRaceWeek } from "../data/superbikesCalendar.js";
import { isWorldWcrRaceWeek, WCR_RACE_MAIN_ROUNDS } from "../data/wcrCalendar.js";
import { COLORS } from "../data/colors.js";
import { WAREHOUSE_LABELS, WAREHOUSE_PARTS } from "../data/warehouseParts.js";
import { raceLineup } from "../utils/raceSimulation.js";
import { buildPriorityAlerts } from "../utils/priorityAlerts.js";
import { overallRating } from "../utils/riders.js";
import { initWarehouse } from "../utils/warehouseEngine.js";

export function SeasonScreen({ playerTeam, rivalTeams, otherCategories, category, round, seasonNumber, budget, riderStandings, teamStandings, riderWins, riderPodiums, startProject, runRace, onStartQualifying, saving, scale, openProfile, findRiderInCategory, notifCount, onOpenNotifications, freeAgents, onOpenSaveModal, onExitGame, onStartWarehouseProduction, onStartUrgentWarehouseProduction, onOpenTeamProfile, onStartFactoryUpgrade, onStartStaffUpgrade, onStartFactoryDowngrade, onStartStaffDowngrade, onStartSportingDirectorUpgrade, onCancelScout, onChooseSponsorOffer, onSearchSponsor, onCancelSearchSponsor, onCancelSponsorContract, lastEconomySummary, seasonEconomyTotals, economyLog, gpHistory, marketRumors, marketNegotiations, onRespondToIncomingOffer, onOpenNegotiation, onOpenRiderProfileById, onOpenTeamProfileById, onOpenManufacturerProfile, manufacturerPreviousBikes, motogpSeatTiers, onContactManufacturer, onOpenPackageReview, seasonArchive }) {
  const accent = playerTeam.color;
  // Lifted out of EconomyPanel itself so the "Presupuesto" tap target
  // in the Escudería summary card (below) can open it directly —
  // see EconomyPanel.jsx's own comment on why it now accepts this as
  // an optional controlled prop instead of managing it entirely
  // internally.
  const [economyExpanded, setEconomyExpanded] = useState(false);
  // Same lifted-state pattern, for "Patrocinadores" — this one also
  // needs a tab switch first, since (unlike Economía) it only exists
  // on the Escudería tab, while "Mi moto" itself renders on both
  // Inicio and Escudería.
  const [sponsorsExpanded, setSponsorsExpanded] = useState(false);
  const [warehouseExpanded, setWarehouseExpanded] = useState(false);
  const openSponsorsPanel = () => {
    setSeasonTab("escuderia");
    setSponsorsExpanded(true);
    // The Escudería tab's content (and the sponsors-panel element
    // itself) doesn't exist in the DOM until after this render commits
    // — queue the scroll for right after, rather than looking for an
    // element that isn't there yet.
    setTimeout(() => document.getElementById("sponsors-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const isSbkCalendarCategory = category === "superbikes" || category === "supersport" || category === "sportbike" || category === "worldwcr";
  // WorldWCR races on a narrower 6-round subset of Superbikes' own
  // 12-round calendar (see data/wcrCalendar.js) — everywhere below that
  // needs "is this category's race week" or "which main-calendar rounds
  // does it actually race on" picks the right check/array for whichever
  // of the four SBK-family categories is being played, instead of
  // assuming all four share Superbikes' own weeks exactly like
  // Supersport and Sportbike do.
  const isRaceWeekNow = category === "worldwcr" ? isWorldWcrRaceWeek(round) : isSuperbikesRaceWeek(round);
  const raceMainRounds = category === "worldwcr" ? WCR_RACE_MAIN_ROUNDS : SUPERBIKES_RACE_MAIN_ROUNDS;
  const isRestWeek = isSbkCalendarCategory && !isRaceWeekNow;
  // On a rest week there's no round of THIS category this exact week,
  // but the player still benefits from seeing where their NEXT round
  // actually is, rather than whatever GP happens to be running
  // elsewhere that week — that circuit has nothing to do with their
  // own calendar.
  const nextSuperbikesMainRound = isRestWeek ? raceMainRounds.find((r) => r > round) : null;
  const superbikesRoundForDisplay = isRestWeek ? nextSuperbikesMainRound : round;
  // "Today", for a turn-based game with no real-world clock, is simply
  // the date of the last round THIS category actually raced — for the
  // main ladder that's always round-1 (every one of its 22 rounds is a
  // real GP, no gaps of its own); for Superbikes/Supersport/Sportbike/
  // WorldWCR it's the largest of their own shared rounds still behind
  // the current one, since they skip weeks the main ladder doesn't.
  // Season opener (nothing raced yet) has no such reference, so the
  // countdown is simply omitted rather than measuring against a made-up
  // date.
  const lastRaceMainRound = isSbkCalendarCategory
    ? [...raceMainRounds].reverse().find((r) => r < round) ?? null
    : (round > 0 ? round - 1 : null);
  const daysUntilNextRace = lastRaceMainRound != null && superbikesRoundForDisplay != null
    ? Math.round((dateForRound(superbikesRoundForDisplay, seasonNumber) - dateForRound(lastRaceMainRound, seasonNumber)) / (1000 * 60 * 60 * 24))
    : null;
  const circuit = isSbkCalendarCategory
    ? (superbikesRoundForDisplay != null ? SUPERBIKES_CIRCUITS[SUPERBIKES_ROUND_MAP[superbikesRoundForDisplay]] : null)
    : CIRCUITS[round];
  const circuitProfile = isSbkCalendarCategory
    ? (superbikesRoundForDisplay != null ? SUPERBIKES_CIRCUIT_PROFILES[SUPERBIKES_ROUND_MAP[superbikesRoundForDisplay]] : CIRCUIT_PROFILES[round])
    : CIRCUIT_PROFILES[round];
  const [seasonTab, setSeasonTab] = useState("inicio");
  const ridersNeeded = raceLineup(playerTeam).length || 1;
  const warehouse = playerTeam.warehouse || initWarehouse();
  const lowStockParts = WAREHOUSE_PARTS.filter((p) => warehouse[p].stock <= 2);
  const missingParts = isRestWeek ? [] : WAREHOUSE_PARTS.filter((p) => warehouse[p].stock < ridersNeeded);
  const canRace = missingParts.length === 0;
  const priorityAlerts = buildPriorityAlerts({
    playerTeam, marketNegotiations,
    lowStockLabel: lowStockParts.length ? lowStockParts.map((p) => WAREHOUSE_LABELS[p].toLowerCase()).join(", ") : null,
  });
  // Same target → tab mapping handleAlertClick already uses below — the
  // bottom nav's "something needs attention here" dot is just that same
  // routing, read the other way around. Nothing new to track: it
  // disappears on its own the moment the underlying alert does (package
  // reviewed, contract renewed, offer decided...), same as the alerts
  // themselves already do.
  const navBadgeTabs = [...new Set(priorityAlerts.map((a) => (a.target === "warehouse" || a.target === "package" ? "escuderia" : "pilotos")))];
  // El aviso de "contrato por vencer" vive ahora en Pilotos, justo
  // encima de Mis pilotos — es la pantalla a la que ya te llevaba al
  // tocarlo, así que directamente se muestra ahí en vez de en Inicio.
  const rosterAlerts = priorityAlerts.filter((a) => a.target === "roster");
  const inicioAlerts = priorityAlerts.filter((a) => a.target !== "roster");

  function handleAlertClick(alert) {
    if (alert.target === "package") {
      onOpenPackageReview?.(alert.packageId);
      return;
    }
    const targetTab = alert.target === "warehouse" ? "escuderia" : "pilotos";
    setSeasonTab(targetTab);
    if (alert.target === "warehouse") setWarehouseExpanded(true);
    const scrollId = alert.target === "roster" ? "pilotos-mis-pilotos" : alert.target === "offers" ? "pilotos-ofertas" : alert.target === "warehouse" ? "warehouse-panel" : null;
    if (scrollId) {
      setTimeout(() => document.getElementById(scrollId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  // Small render helpers for the notification bell, budget display and
  // Simular GP button — defined once here and reused as-is in both the
  // desktop/tablet layout (unchanged) and the new mobile-only compact
  // row below, so there's a single source of truth for each rather than
  // two independently-maintained copies.
  const renderBell = () => (
    <button onClick={onOpenNotifications} className="relative flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
      <Bell size={18} style={{ color: COLORS.text }} />
      {notifCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold" style={{ minWidth: 16, height: 16, padding: "0 3px", background: COLORS.gold, color: "#12151A" }}>
          {notifCount > 99 ? "99+" : notifCount}
        </span>
      )}
    </button>
  );
  const renderBudget = (compact) => (
    <div className={compact ? "text-center" : "text-right"}>
      <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: COLORS.muted }}>Presupuesto</div>
      <div className={compact ? "text-base font-bold" : "text-2xl font-bold"} style={{ fontFamily: "Rajdhani, sans-serif", color: budget < 0 ? COLORS.danger : COLORS.text }}>€{Math.round(budget).toLocaleString()}</div>
    </div>
  );
  const renderSimularButton = (fullWidth) => (
    <button onClick={onStartQualifying} disabled={!canRace}
      className={`py-2.5 px-5 rounded-md font-bold flex items-center justify-center gap-2 disabled:opacity-40 flex-shrink-0 ${fullWidth ? "w-full" : ""}`}
      style={{ background: accent, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
      <Flag size={18} /> {isRestWeek ? "Semana sin GP — Continuar" : "Simular GP"}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 pt-6" style={{ paddingBottom: 96 }}>
      {seasonTab === "inicio" && <div className="mb-3"><CheckerStrip accent={accent} solid /></div>}
      {seasonTab === "inicio" ? (
        <>
          {/* Staggered entrance — same pattern as MainMenu/TeamPickCard
              (fade + slide up, each block a little later than the last).
              CircuitHero goes last on purpose: its background photo is
              the slowest thing on this screen to actually finish
              loading, so giving it the longest delay means it's already
              had time to load underneath by the time its own fade-in
              plays, instead of popping in abruptly mid-animation. */}
          <style>{`
            @keyframes seasonHubIn {
              from { opacity: 0; transform: translateY(14px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div className="text-xs uppercase tracking-[0.15em] mb-3" style={{ color: COLORS.muted, wordBreak: "break-word", animation: "seasonHubIn 0.45s ease-out both" }}>{CATEGORY_DATA[category].label} · Temporada {seasonNumber} · Ronda {round + 1} / {CIRCUITS.length}</div>
          <div className="flex items-center justify-between gap-3 mb-3" style={{ animation: "seasonHubIn 0.45s ease-out both", animationDelay: "50ms" }}>
            <div className="flex items-center gap-3 min-w-0">
              <TeamLogo team={playerTeam} sizeClassName="w-9 h-9 sm:w-[72px] sm:h-[72px]" className="rounded-lg flex-shrink-0" />
              <div className="text-[16.1px] sm:text-2xl font-bold leading-tight" style={{ color: accent, fontFamily: "Rajdhani, sans-serif", wordBreak: "break-word" }}>{teamDisplayName(playerTeam)}</div>
            </div>
            <div className="flex-shrink-0">{renderBudget(false)}</div>
          </div>

          <div className="flex items-center justify-between mb-3 gap-3" style={{ animation: "seasonHubIn 0.45s ease-out both", animationDelay: "100ms" }}>
            {renderBell()}
            {renderSimularButton(false)}
          </div>

          {!canRace && (
            <p className="text-xs mb-3" style={{ color: COLORS.danger }}>
              No podés disputar el Gran Premio: faltan {missingParts.map((p) => WAREHOUSE_LABELS[p].toLowerCase()).join(", ")}. Fabricá (o fabricá con urgencia) desde Escudería → Almacén.
            </p>
          )}

          {circuit && (
            <div style={{ animation: "seasonHubIn 0.55s ease-out both", animationDelay: "160ms" }}>
              <CircuitHero
                gpName={circuit.split("—")[0].trim()}
                circuitName={(circuit.split("—")[1] || "").trim()}
                circuitProfile={circuitProfile}
                ladder={isSbkCalendarCategory ? "superbikes" : "motogp"}
                assetIndex={isSbkCalendarCategory ? SUPERBIKES_ROUND_MAP[superbikesRoundForDisplay] : round}
                accent={accent}
                laps={circuitProfile?.records?.[category]?.laps}
                daysLabel={daysUntilNextRace != null ? (daysUntilNextRace <= 0 ? "Esta semana" : daysUntilNextRace === 1 ? "Mañana" : `Quedan ${daysUntilNextRace} días`) : null}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-wrap justify-between items-end gap-3 py-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em]" style={{ color: COLORS.muted }}>{CATEGORY_DATA[category].label} · Temporada {seasonNumber} · Ronda {round + 1} / {CIRCUITS.length} · <span style={{ color: accent }}>{teamDisplayName(playerTeam)}</span></div>
            </div>
          </div>
        </div>
      )}

      {seasonTab === "inicio" && (
        <>
          {inicioAlerts.length > 0 && (
            <div className="space-y-2 mb-4">
              {inicioAlerts.map((a) => (
                <PriorityAlertBanner key={a.id} iconKey={a.iconKey} text={a.text} onClick={() => handleAlertClick(a)} />
              ))}
            </div>
          )}

          <div className="mb-4">
            <MyRidersPanel playerTeam={playerTeam} riderStandings={riderStandings} riderWins={riderWins} riderPodiums={riderPodiums} gpHistory={gpHistory} category={category} seasonNumber={seasonNumber} accent={accent} openProfile={openProfile} motogpSeatTiers={motogpSeatTiers} />
          </div>

          <div className="mb-4">
            <BikeHero playerTeam={playerTeam} budget={budget} startProject={startProject} scale={scale} onOpenPackageReview={onOpenPackageReview} accent={accent} seasonNumber={seasonNumber} round={round} circuit={circuit} category={category} onOpenSponsors={openSponsorsPanel} onOpenManufacturerProfile={onOpenManufacturerProfile} manufacturerPreviousBikes={manufacturerPreviousBikes} motogpSeatTiers={motogpSeatTiers} />
          </div>

          <StandingsPanel
            category={category}
            riderStandings={riderStandings}
            teamStandings={teamStandings}
            otherCategories={otherCategories}
            playerTeam={playerTeam}
            rivalTeams={rivalTeams}
            accent={accent}
            findRiderInCategory={findRiderInCategory}
            openProfile={openProfile}
            onOpenTeamProfile={onOpenTeamProfile}
            onOpenManufacturerProfile={onOpenManufacturerProfile}
          />
          <div className="text-center text-xs mt-2" style={{ color: COLORS.muted }}>{saving ? "Guardando partida…" : " "}</div>
        </>
      )}

      {seasonTab === "pilotos" && (
        <div className="space-y-4">
          {rosterAlerts.length > 0 && (
            <div className="space-y-2">
              {rosterAlerts.map((a) => (
                <PriorityAlertBanner key={a.id} iconKey={a.iconKey} text={a.text} onClick={() => handleAlertClick(a)} />
              ))}
            </div>
          )}
          <div id="pilotos-mis-pilotos">
            <MyRidersPanel playerTeam={playerTeam} riderStandings={riderStandings} riderWins={riderWins} riderPodiums={riderPodiums} gpHistory={gpHistory} category={category} seasonNumber={seasonNumber} accent={accent} openProfile={openProfile} motogpSeatTiers={motogpSeatTiers} />
          </div>

          <RumorsPanel marketRumors={marketRumors} accent={accent} category={category} onOpenRiderProfileById={onOpenRiderProfileById} onOpenTeamProfileById={onOpenTeamProfileById} />
          <div id="pilotos-ofertas">
          <OffersPanel marketNegotiations={marketNegotiations.filter((n) => n.toTeamId === "player" || n.fromTeamId === "player")} accent={accent} onRespondToIncomingOffer={onRespondToIncomingOffer} onOpenNegotiation={onOpenNegotiation} playerTeam={playerTeam} rivalTeams={rivalTeams} otherCategories={otherCategories} freeAgents={freeAgents} budget={budget} />
          </div>

          <FreeAgentsPanel freeAgents={freeAgents} playerTeam={playerTeam} category={category} accent={accent} openProfile={openProfile} />
          <AdvancedFreeAgentSearch freeAgents={freeAgents} playerTeam={playerTeam} rivalTeams={rivalTeams} otherCategories={otherCategories} category={category} accent={accent} openProfile={openProfile} />
        </div>
      )}

      {seasonTab === "escuderia" && (
        <div className="space-y-4">
          <Panel title="Escudería" icon={Wrench} accent={accent}>
            <div className="flex items-start gap-4 mb-4">
              <TeamLogo team={playerTeam} size={72} className="rounded-lg flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold leading-tight mb-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>{teamDisplayName(playerTeam)}</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>{CATEGORY_DATA[category].label}</span>
                  {playerTeam.tier && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>{playerTeam.tier}</span>
                  )}
                  {playerTeam.manufacturer && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: `${accent}1F`, border: `1px solid ${accent}55`, color: accent }}>{playerTeam.manufacturer}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4" style={{ borderTop: `1px solid ${COLORS.rule}` }}>
              {playerTeam.expectation && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>Expectativa</div>
                  <div className="text-2xl font-bold mb-1.5" style={{ fontFamily: "Rajdhani, sans-serif", color: accent }}>{playerTeam.expectation.label}</div>
                  <div className="h-1.5 rounded-full w-full" style={{ background: COLORS.rule }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${clamp(1 - (playerTeam.expectation.min - 1) / Math.max(1, (rivalTeams?.length || 0)), 0, 1) * 100}%`, background: accent }} />
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>Prestigio</div>
                <div className="text-2xl font-bold mb-1.5" style={{ fontFamily: "Rajdhani, sans-serif", color: accent }}>
                  {Number.isFinite(playerTeam.prestige) ? playerTeam.prestige : "—"}
                  <span className="text-sm font-normal" style={{ color: COLORS.muted }}> / {PRESTIGE_SCALE_MAX}</span>
                </div>
                <div className="h-1.5 rounded-full w-full" style={{ background: COLORS.rule }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${clamp((playerTeam.prestige || 0) / PRESTIGE_SCALE_MAX, 0, 1) * 100}%`, background: accent }} />
                </div>
              </div>

              <button
                onClick={() => {
                  setEconomyExpanded(true);
                  document.getElementById("economy-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex items-center gap-3 text-left rounded-lg -m-1 p-1 transition-colors"
                style={{ background: "transparent" }}
              >
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: COLORS.muted }}>Presupuesto</div>
                  <div className="text-2xl font-bold" style={{ fontFamily: "Rajdhani, sans-serif", color: budget < 0 ? COLORS.danger : accent }}>€{Math.round(budget).toLocaleString()}</div>
                </div>
                <Wallet size={28} style={{ color: accent }} className="flex-shrink-0" />
              </button>
            </div>

            {isRestrictedMotoGpSatellite(playerTeam, category) && onContactManufacturer && (
              <button onClick={onContactManufacturer}
                className="w-full mt-4 flex items-center gap-3 rounded-lg px-3.5 py-3 text-left"
                style={{ background: `${accent}1F`, border: `1px solid ${accent}55` }}>
                <ManufacturerLogo name={playerTeam.manufacturer} accent={accent} size={36} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: COLORS.text }}>Contactar con {playerTeam.manufacturer}</div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>Renovar, presionar por mejoras, pedir la moto cliente-top o sondear otras marcas.</div>
                </div>
                <ChevronRight size={18} style={{ color: COLORS.muted }} className="flex-shrink-0" />
              </button>
            )}
          </Panel>
          <BikeHero playerTeam={playerTeam} budget={budget} startProject={startProject} scale={scale} onOpenPackageReview={onOpenPackageReview} accent={accent} seasonNumber={seasonNumber} round={round} circuit={circuit} category={category} onOpenSponsors={openSponsorsPanel} onOpenManufacturerProfile={onOpenManufacturerProfile} manufacturerPreviousBikes={manufacturerPreviousBikes} motogpSeatTiers={motogpSeatTiers} />
          <div id="economy-panel">
            <EconomyPanel lastEconomySummary={lastEconomySummary} seasonEconomyTotals={seasonEconomyTotals} economyLog={economyLog} budget={budget} accent={accent} playerTeam={playerTeam} round={round} seasonNumber={seasonNumber} expanded={economyExpanded} onToggleExpanded={setEconomyExpanded} />
          </div>
          <div id="sponsors-panel">
            <SponsorsPanel playerTeam={playerTeam} onChooseSponsorOffer={onChooseSponsorOffer} onSearchSponsor={onSearchSponsor} onCancelSearchSponsor={onCancelSearchSponsor} onCancelSponsorContract={onCancelSponsorContract} accent={accent} expanded={sponsorsExpanded} onToggleExpanded={setSponsorsExpanded} />
          </div>
          <FactoryPanel playerTeam={playerTeam} budget={budget} onStartUpgrade={onStartFactoryUpgrade} onStartDowngrade={onStartFactoryDowngrade} accent={accent} scale={scale} />
          <StaffPanel playerTeam={playerTeam} budget={budget} onStartUpgrade={onStartStaffUpgrade} onStartDowngrade={onStartStaffDowngrade} accent={accent} scale={scale} />
          <SportingDirectorPanel playerTeam={playerTeam} categoryKey={category} seasonNumber={seasonNumber} freeAgents={freeAgents} budget={budget} onStartUpgrade={onStartSportingDirectorUpgrade} onCancelScout={onCancelScout} onOpenRiderProfileById={onOpenRiderProfileById} accent={accent} scale={scale} />
          <WarehousePanel playerTeam={playerTeam} budget={budget} scale={scale} onProduce={onStartWarehouseProduction} onUrgentProduce={onStartUrgentWarehouseProduction} expanded={warehouseExpanded} onToggleExpanded={setWarehouseExpanded} />
        </div>
      )}

      {seasonTab === "info" && (
        <div className="space-y-4">
          <CircuitInfoPanel circuitProfile={circuitProfile} accent={accent} round={superbikesRoundForDisplay} seasonNumber={seasonNumber} daysUntilNextRace={daysUntilNextRace} />
          <CalendarPanel round={round} accent={accent} gpHistory={gpHistory} seasonNumber={seasonNumber} category={category} playerTeam={playerTeam} />
          <DetailedStandingsPanel
            category={category}
            riderStandings={riderStandings}
            teamStandings={teamStandings}
            riderWins={riderWins}
            riderPodiums={riderPodiums}
            otherCategories={otherCategories}
            playerTeam={playerTeam}
            rivalTeams={rivalTeams}
            accent={accent}
            findRiderInCategory={findRiderInCategory}
            openProfile={openProfile}
            onOpenTeamProfile={onOpenTeamProfile}
            onOpenManufacturerProfile={onOpenManufacturerProfile}
          />
          <SeasonArchivePanel seasonArchive={seasonArchive} accent={accent} category={category} onOpenRiderProfileById={onOpenRiderProfileById} />
          <HallOfFamePanel seasonArchive={seasonArchive} accent={accent} />
        </div>
      )}

      {seasonTab === "ajustes" && (
        <div className="space-y-3">
          <button onClick={onOpenSaveModal}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-md font-semibold"
            style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
            <Save size={18} /> Guardar partida
          </button>
          <button onClick={onExitGame}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-md font-semibold"
            style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
            <LogOut size={18} /> Salir de la partida
          </button>
          <PlayerCareerPanel seasonArchive={seasonArchive} accent={accent} onOpenRiderProfileById={onOpenRiderProfileById} />
        </div>
      )}

      <BottomNavBar
        active={seasonTab}
        onChange={(key) => {
          if (key === "inicio" && seasonTab === "inicio") {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
          setSeasonTab(key);
        }}
        accent={accent}
        badgeTabs={navBadgeTabs}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Result Screen                                                          */
/* ---------------------------------------------------------------------- */
/* The sim doesn't model lap-by-lap timing, so race time/gap are a
   plausible cosmetic reconstruction from each rider's final performance
   score and the circuit's own length — not a separate simulation. */

