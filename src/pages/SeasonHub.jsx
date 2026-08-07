import { useState } from "react";
import { AlertTriangle, ArrowLeftRight, Bell, ChevronDown, ChevronUp, Flag, Gauge, LogOut, Save, Star, Wrench } from "lucide-react";
import { BottomNavBar } from "../components/BottomNavBar.jsx";
import { PlayerCareerPanel } from "../components/PlayerCareerPanel.jsx";
import { HallOfFamePanel } from "../components/HallOfFamePanel.jsx";
import { CalendarPanel, CircuitInfoPanel } from "../components/CircuitInfo.jsx";
import { RumorsPanel, OffersPanel } from "../components/MarketPanels.jsx";
import { CountryFlag } from "../components/CountryFlag.jsx";
import { DevelopmentPanel } from "../components/Development.jsx";
import { FactoryPanel } from "../components/FactoryPanel.jsx";
import { teamDisplayName } from "../utils/teamNaming.js";
import { StaffPanel } from "../components/StaffPanel.jsx";
import { SportingDirectorPanel } from "../components/SportingDirectorPanel.jsx";
import { SponsorsPanel } from "../components/SponsorsPanel.jsx";
import { EconomyPanel } from "../components/EconomyPanel.jsx";
import { AdvancedFreeAgentSearch, FreeAgentsPanel } from "../components/RiderMarket.jsx";
import { DetailedStandingsPanel, SeasonArchivePanel, StandingsPanel } from "../components/Standings.jsx";
import { RiderPhoto } from "../components/RiderPhoto.jsx";
import { RiderNumber } from "../components/RiderNumber.jsx";
import { TeamLogo } from "../components/TeamLogo.jsx";
import { CircuitHero } from "../components/CircuitHero.jsx";
import { AttrGrid, CheckerStrip, OverallBadge, Panel, PriorityAlertBanner, RiderNameButton } from "../components/UIPrimitives.jsx";
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

export function SeasonScreen({ playerTeam, rivalTeams, otherCategories, category, round, seasonNumber, budget, riderStandings, teamStandings, riderWins, riderPodiums, startProject, runRace, onStartQualifying, saving, scale, openProfile, findRiderInCategory, notifCount, onOpenNotifications, freeAgents, onOpenSaveModal, onExitGame, onStartWarehouseProduction, onStartUrgentWarehouseProduction, onOpenTeamProfile, onStartFactoryUpgrade, onStartStaffUpgrade, onStartFactoryDowngrade, onStartStaffDowngrade, onStartSportingDirectorUpgrade, onCancelScout, onChooseSponsorOffer, onSearchSponsor, onCancelSearchSponsor, onCancelSponsorContract, lastEconomySummary, seasonEconomyTotals, economyLog, gpHistory, marketRumors, marketNegotiations, onRespondToIncomingOffer, onOpenNegotiation, onOpenRiderProfileById, onOpenTeamProfileById, onOpenPackageReview, seasonArchive }) {
  const accent = playerTeam.color;
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
  const [showRiderDetails, setShowRiderDetails] = useState(false);
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
    const scrollId = alert.target === "roster" ? "pilotos-mis-pilotos" : alert.target === "offers" ? "pilotos-ofertas" : null;
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
          <div className="text-xs uppercase tracking-[0.15em] mb-3" style={{ color: COLORS.muted, wordBreak: "break-word" }}>{CATEGORY_DATA[category].label} · Temporada {seasonNumber} · Ronda {round + 1} / {CIRCUITS.length}</div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <TeamLogo team={playerTeam} sizeClassName="w-9 h-9 sm:w-[72px] sm:h-[72px]" className="rounded-lg flex-shrink-0" />
              <div className="text-[16.1px] sm:text-2xl font-bold leading-tight" style={{ color: accent, fontFamily: "Rajdhani, sans-serif", wordBreak: "break-word" }}>{teamDisplayName(playerTeam)}</div>
            </div>
            <div className="flex-shrink-0">{renderBudget(false)}</div>
          </div>

          <div className="flex items-center justify-between mb-3 gap-3">
            {renderBell()}
            {renderSimularButton(false)}
          </div>

          {!canRace && (
            <p className="text-xs mb-3" style={{ color: COLORS.danger }}>
              No podés disputar el Gran Premio: faltan {missingParts.map((p) => WAREHOUSE_LABELS[p].toLowerCase()).join(", ")}. Fabricá (o fabricá con urgencia) desde Escudería → Almacén.
            </p>
          )}

          {circuit && (
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
            <Panel
              title="Mis pilotos"
              icon={Gauge}
              accent={accent}
              onHeaderClick={() => setShowRiderDetails((v) => !v)}
              headerRight={showRiderDetails ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
            >
              {playerTeam.riders.map((r) => (
                <div key={r.id} className="mb-3 pb-3 border-b last:border-0 last:mb-0 last:pb-0 flex gap-3" style={{ borderColor: COLORS.rule }}>
                  <RiderPhoto rider={r} size={40} className="rounded-lg" />
                  <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      <RiderNumber rider={r} size={26} categoryKey={category} plain alignStart />
                      <RiderNameButton rider={r} onClick={() => openProfile(r, teamDisplayName(playerTeam), category)} />
                      <OverallBadge value={overallRating(r)} accent={accent} />
                    </span>
                    <span className="text-xs font-mono" style={{ color: accent }}>{riderStandings[r.id]?.points ?? 0} pts</span>
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}><CountryFlag nat={r.nat} width={16} /> {r.age} años · Contrato: {r.contractYears ?? 0} año{(r.contractYears ?? 0) === 1 ? "" : "s"}</div>
                  {r.injury && r.injury.gpRemaining > 0 && (
                    <div className="text-xs mt-1 flex items-center gap-1" style={{ color: COLORS.danger }}>
                      <AlertTriangle size={11} />
                      {r.injury.sidelined
                        ? `Lesión ${r.injury.severityLabel} · vuelve en ${r.injury.gpRemaining} GP${r.injury.gpRemaining === 1 ? "" : "s"}${playerTeam.substitutes?.[r.id] ? ` · sustituto: ${playerTeam.substitutes[r.id].name}` : " · sin sustituto asignado"}`
                        : `Lesión leve (${r.injury.gpRemaining} GP restante${r.injury.gpRemaining === 1 ? "" : "s"}) · rendimiento algo mermado`}
                    </div>
                  )}
                  {showRiderDetails && (
                    <div className="mt-2">
                      <AttrGrid rider={r} accent={accent} />
                      <div className="text-xs flex items-center gap-1 mt-1" style={{ color: COLORS.muted }}>
                        <Star size={11} style={{ color: COLORS.gold }} /> PA {r.pa} · Valor €{(r.marketValue || 0).toLocaleString()}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              ))}
              {Object.entries(playerTeam.substitutes || {}).map(([ownerId, sub]) => {
                const owner = playerTeam.riders.find((r) => r.id === ownerId);
                return (
                  <div key={sub.id} className="mb-3 pb-3 border-b last:border-0 last:mb-0 last:pb-0 flex gap-3" style={{ borderColor: COLORS.rule, background: "rgba(227,164,39,0.06)" }}>
                    <RiderPhoto rider={sub} size={40} className="rounded-lg" />
                    <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold flex items-center gap-1.5">
                        <RiderNameButton rider={sub} onClick={() => openProfile(sub, teamDisplayName(playerTeam), category)} />
                        <OverallBadge value={overallRating(sub)} accent={accent} />
                      </span>
                      <span className="text-xs font-mono" style={{ color: accent }}>{riderStandings[sub.id]?.points ?? 0} pts</span>
                    </div>
                    <div className="text-xs mt-1 flex items-center gap-1" style={{ color: COLORS.gold }}>
                      <ArrowLeftRight size={11} /> Sustituto de {owner?.name || "piloto lesionado"}
                    </div>
                    {showRiderDetails && (
                      <div className="mt-2">
                        <AttrGrid rider={sub} accent={accent} />
                        <div className="text-xs flex items-center gap-1 mt-1" style={{ color: COLORS.muted }}>
                          <Star size={11} style={{ color: COLORS.gold }} /> PA {sub.pa} · {sub.age} años
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </Panel>
          </div>

          <div className="mb-4">
            <DevelopmentPanel playerTeam={playerTeam} budget={budget} startProject={startProject} accent={accent} scale={scale} onOpenPackageReview={onOpenPackageReview} />
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
          <Panel
            title="Mis pilotos"
            icon={Gauge}
            accent={accent}
            onHeaderClick={() => setShowRiderDetails((v) => !v)}
            headerRight={showRiderDetails ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
          >
            {playerTeam.riders.map((r) => (
              <div key={r.id} className="mb-3 pb-3 border-b last:border-0 last:mb-0 last:pb-0 flex gap-3" style={{ borderColor: COLORS.rule }}>
                <RiderPhoto rider={r} size={40} className="rounded-lg" />
                <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold flex items-center gap-1.5">
                    <RiderNumber rider={r} size={26} categoryKey={category} plain alignStart />
                    <RiderNameButton rider={r} onClick={() => openProfile(r, teamDisplayName(playerTeam), category)} />
                    <OverallBadge value={overallRating(r)} accent={accent} />
                  </span>
                  <span className="text-xs font-mono" style={{ color: accent }}>{riderStandings[r.id]?.points ?? 0} pts</span>
                </div>
                <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}><CountryFlag nat={r.nat} width={16} /> {r.age} años · Contrato: {r.contractYears ?? 0} año{(r.contractYears ?? 0) === 1 ? "" : "s"}</div>
                {r.injury && r.injury.gpRemaining > 0 && (
                  <div className="text-xs mt-1 flex items-center gap-1" style={{ color: COLORS.danger }}>
                    <AlertTriangle size={11} />
                    {r.injury.sidelined
                      ? `Lesión ${r.injury.severityLabel} · vuelve en ${r.injury.gpRemaining} GP${r.injury.gpRemaining === 1 ? "" : "s"}${playerTeam.substitutes?.[r.id] ? ` · sustituto: ${playerTeam.substitutes[r.id].name}` : " · sin sustituto asignado"}`
                      : `Lesión leve (${r.injury.gpRemaining} GP restante${r.injury.gpRemaining === 1 ? "" : "s"}) · rendimiento algo mermado`}
                  </div>
                )}
                {showRiderDetails && (
                  <div className="mt-2">
                    <AttrGrid rider={r} accent={accent} />
                    <div className="text-xs flex items-center gap-1 mt-1" style={{ color: COLORS.muted }}>
                      <Star size={11} style={{ color: COLORS.gold }} /> PA {r.pa} · Valor €{(r.marketValue || 0).toLocaleString()}
                    </div>
                  </div>
                )}
                </div>
              </div>
            ))}
            {Object.entries(playerTeam.substitutes || {}).map(([ownerId, sub]) => {
              const owner = playerTeam.riders.find((r) => r.id === ownerId);
              return (
                <div key={sub.id} className="mb-3 pb-3 border-b last:border-0 last:mb-0 last:pb-0 flex gap-3" style={{ borderColor: COLORS.rule, background: "rgba(227,164,39,0.06)" }}>
                  <RiderPhoto rider={sub} size={40} className="rounded-lg" />
                  <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      <RiderNameButton rider={sub} onClick={() => openProfile(sub, teamDisplayName(playerTeam), category)} />
                      <OverallBadge value={overallRating(sub)} accent={accent} />
                    </span>
                    <span className="text-xs font-mono" style={{ color: accent }}>{riderStandings[sub.id]?.points ?? 0} pts</span>
                  </div>
                  <div className="text-xs mt-1 flex items-center gap-1" style={{ color: COLORS.gold }}>
                    <ArrowLeftRight size={11} /> Sustituto de {owner?.name || "piloto lesionado"}
                  </div>
                  {showRiderDetails && (
                    <div className="mt-2">
                      <AttrGrid rider={sub} accent={accent} />
                      <div className="text-xs flex items-center gap-1 mt-1" style={{ color: COLORS.muted }}>
                        <Star size={11} style={{ color: COLORS.gold }} /> PA {sub.pa} · {sub.age} años
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </Panel>
          </div>

          <RumorsPanel marketRumors={marketRumors} accent={accent} playerTeam={playerTeam} rivalTeams={rivalTeams} otherCategories={otherCategories} freeAgents={freeAgents} category={category} onOpenRiderProfileById={onOpenRiderProfileById} onOpenTeamProfileById={onOpenTeamProfileById} />
          <div id="pilotos-ofertas">
          <OffersPanel marketNegotiations={marketNegotiations.filter((n) => n.toTeamId === "player" || n.fromTeamId === "player")} accent={accent} onRespondToIncomingOffer={onRespondToIncomingOffer} onOpenNegotiation={onOpenNegotiation} />
          </div>

          <FreeAgentsPanel freeAgents={freeAgents} playerTeam={playerTeam} category={category} accent={accent} openProfile={openProfile} />
          <AdvancedFreeAgentSearch freeAgents={freeAgents} playerTeam={playerTeam} rivalTeams={rivalTeams} otherCategories={otherCategories} category={category} accent={accent} openProfile={openProfile} />
        </div>
      )}

      {seasonTab === "escuderia" && (
        <div className="space-y-4">
          <Panel title="Escudería" icon={Wrench} accent={accent}>
            <div className="flex items-center gap-3">
              <TeamLogo team={playerTeam} size={64} className="rounded-lg" />
              <div className="flex-1">
                <div className="text-lg font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>{teamDisplayName(playerTeam)}</div>
                <div className="text-xs" style={{ color: COLORS.muted }}>{CATEGORY_DATA[category].label} · {playerTeam.tier}{playerTeam.manufacturer ? ` · ${playerTeam.manufacturer}` : ""}</div>
                {playerTeam.expectation && (
                  <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>Expectativa: <span className="font-mono font-bold" style={{ color: accent }}>{playerTeam.expectation.label}</span></div>
                )}
                <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>Prestigio: <span className="font-mono font-bold" style={{ color: accent }}>{Number.isFinite(playerTeam.prestige) ? `${playerTeam.prestige} / ${PRESTIGE_SCALE_MAX}` : "—"}</span></div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Presupuesto</div>
                <div className="text-xl font-mono" style={{ color: budget < 0 ? COLORS.danger : accent }}>€{Math.round(budget).toLocaleString()}</div>
              </div>
            </div>
          </Panel>
          <DevelopmentPanel playerTeam={playerTeam} budget={budget} startProject={startProject} accent={accent} scale={scale} onOpenPackageReview={onOpenPackageReview} />
          <EconomyPanel lastEconomySummary={lastEconomySummary} seasonEconomyTotals={seasonEconomyTotals} economyLog={economyLog} budget={budget} accent={accent} />
          <SponsorsPanel playerTeam={playerTeam} onChooseSponsorOffer={onChooseSponsorOffer} onSearchSponsor={onSearchSponsor} onCancelSearchSponsor={onCancelSearchSponsor} onCancelSponsorContract={onCancelSponsorContract} accent={accent} />
          <FactoryPanel playerTeam={playerTeam} budget={budget} onStartUpgrade={onStartFactoryUpgrade} onStartDowngrade={onStartFactoryDowngrade} accent={accent} scale={scale} />
          <StaffPanel playerTeam={playerTeam} budget={budget} onStartUpgrade={onStartStaffUpgrade} onStartDowngrade={onStartStaffDowngrade} accent={accent} scale={scale} />
          <SportingDirectorPanel playerTeam={playerTeam} budget={budget} onStartUpgrade={onStartSportingDirectorUpgrade} onCancelScout={onCancelScout} onOpenRiderProfileById={onOpenRiderProfileById} accent={accent} scale={scale} />
          <WarehousePanel playerTeam={playerTeam} budget={budget} scale={scale} onProduce={onStartWarehouseProduction} onUrgentProduce={onStartUrgentWarehouseProduction} />
        </div>
      )}

      {seasonTab === "info" && (
        <div className="space-y-4">
          <CircuitInfoPanel circuitProfile={circuitProfile} accent={accent} round={superbikesRoundForDisplay} seasonNumber={seasonNumber} daysUntilNextRace={daysUntilNextRace} />
          <CalendarPanel round={round} accent={accent} gpHistory={gpHistory} seasonNumber={seasonNumber} category={category} />
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

