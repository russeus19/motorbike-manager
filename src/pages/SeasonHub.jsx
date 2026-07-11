import { useState } from "react";
import { AlertTriangle, ArrowLeftRight, Bell, ChevronDown, ChevronUp, Flag, Gauge, LogOut, MapPin, Save, Star, Wrench } from "lucide-react";
import { BottomNavBar } from "../components/BottomNavBar.jsx";
import { CalendarPanel, CircuitInfoPanel } from "../components/CircuitInfo.jsx";
import { CountryFlag } from "../components/CountryFlag.jsx";
import { DevelopmentPanel } from "../components/Development.jsx";
import { FactoryPanel } from "../components/FactoryPanel.jsx";
import { StaffPanel } from "../components/StaffPanel.jsx";
import { AdvancedFreeAgentSearch, FreeAgentsPanel } from "../components/RiderMarket.jsx";
import { DetailedStandingsPanel, StandingsPanel } from "../components/Standings.jsx";
import { RiderPhoto } from "../components/RiderPhoto.jsx";
import { TeamLogo } from "../components/TeamLogo.jsx";
import { AttrGrid, CheckerStrip, OverallBadge, Panel, RiderNameButton } from "../components/UIPrimitives.jsx";
import { WarehousePanel } from "../components/WarehousePanel.jsx";
import { CATEGORY_DATA } from "../data/categories.js";
import { CIRCUITS, CIRCUIT_PROFILES } from "../data/circuits.js";
import { COLORS } from "../data/colors.js";
import { WAREHOUSE_LABELS, WAREHOUSE_PARTS } from "../data/warehouseParts.js";
import { raceLineup } from "../utils/raceSimulation.js";
import { overallRating } from "../utils/riders.js";
import { initWarehouse } from "../utils/warehouseEngine.js";

export function SeasonScreen({ playerTeam, rivalTeams, otherCategories, category, round, seasonNumber, budget, riderStandings, teamStandings, riderWins, riderPodiums, startProject, runRace, saving, scale, openProfile, findRiderInCategory, notifCount, onOpenNotifications, freeAgents, onOpenSaveModal, onExitGame, onStartWarehouseProduction, onStartUrgentWarehouseProduction, onOpenTeamProfile, onStartFactoryUpgrade, onStartStaffUpgrade }) {
  const accent = playerTeam.color;
  const circuit = CIRCUITS[round];
  const circuitProfile = CIRCUIT_PROFILES[round];
  const [showRiderDetails, setShowRiderDetails] = useState(false);
  const [seasonTab, setSeasonTab] = useState("inicio");
  const ridersNeeded = raceLineup(playerTeam).length || 1;
  const warehouse = playerTeam.warehouse || initWarehouse();
  const lowStockParts = WAREHOUSE_PARTS.filter((p) => warehouse[p].stock <= 2);
  const missingParts = WAREHOUSE_PARTS.filter((p) => warehouse[p].stock < ridersNeeded);
  const canRace = missingParts.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8" style={{ paddingBottom: 96 }}>
      <CheckerStrip accent={accent} solid />
      <div className="flex flex-wrap justify-between items-end gap-3 py-4">
        <div className="flex items-center gap-3">
          {seasonTab === "inicio" && <TeamLogo team={playerTeam} size={48} className="rounded-lg" />}
          <div>
            <div className="text-xs uppercase tracking-[0.2em]" style={{ color: COLORS.muted }}>{CATEGORY_DATA[category].label} · Temporada {seasonNumber} · Ronda {round + 1} / {CIRCUITS.length} · <span style={{ color: accent }}>{playerTeam.name}</span></div>
          </div>
        </div>
        {seasonTab === "inicio" && (
          <div className="flex items-start gap-3">
            <button onClick={onOpenNotifications} className="relative flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: COLORS.panel, border: `1px solid ${COLORS.rule}` }}>
              <Bell size={18} style={{ color: COLORS.text }} />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold" style={{ minWidth: 16, height: 16, padding: "0 3px", background: COLORS.gold, color: "#12151A" }}>
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </button>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Presupuesto</div>
              <div className="text-2xl font-mono" style={{ color: budget < 0 ? COLORS.danger : COLORS.text }}>€{Math.round(budget).toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {seasonTab === "inicio" && (
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="font-bold flex items-center gap-2" style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "1.4rem" }}>
            <MapPin size={17} style={{ color: accent }} /> {circuit}
          </h2>
          <button onClick={runRace} disabled={!canRace}
            className="py-2.5 px-5 rounded-md font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: accent, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
            <Flag size={18} /> Simular GP
          </button>
        </div>
      )}
      {seasonTab === "inicio" && !canRace && (
        <p className="text-xs mb-4" style={{ color: COLORS.danger }}>
          No podés disputar el Gran Premio: faltan {missingParts.map((p) => WAREHOUSE_LABELS[p].toLowerCase()).join(", ")}. Fabricá (o fabricá con urgencia) desde Escudería → Almacén.
        </p>
      )}

      {seasonTab === "inicio" && (
        <>
          {lowStockParts.length > 0 && (
            <button onClick={() => setSeasonTab("escuderia")}
              className="w-full text-left mb-4 rounded-md px-3 py-2.5 text-sm flex items-center gap-2"
              style={{ background: "rgba(227,164,39,0.12)", border: `1px solid ${COLORS.gold}`, color: COLORS.gold }}>
              <AlertTriangle size={16} />
              ⚠ Stock bajo de {lowStockParts.map((p) => WAREHOUSE_LABELS[p].toLowerCase()).join(", ")}. Toca para ir al Almacén.
            </button>
          )}

          <div className="mb-4">
            <CircuitInfoPanel circuitProfile={circuitProfile} accent={accent} />
          </div>

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
                      <RiderNameButton rider={r} onClick={() => openProfile(r, playerTeam.name, category)} />
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
                        <RiderNameButton rider={sub} onClick={() => openProfile(sub, playerTeam.name, category)} />
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
            <DevelopmentPanel playerTeam={playerTeam} budget={budget} startProject={startProject} accent={accent} scale={scale} />
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
                    <RiderNameButton rider={r} onClick={() => openProfile(r, playerTeam.name, category)} />
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
                      <RiderNameButton rider={sub} onClick={() => openProfile(sub, playerTeam.name, category)} />
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

          <FreeAgentsPanel freeAgents={freeAgents} category={category} accent={accent} openProfile={openProfile} />
          <AdvancedFreeAgentSearch freeAgents={freeAgents} playerTeam={playerTeam} rivalTeams={rivalTeams} category={category} accent={accent} openProfile={openProfile} />
        </div>
      )}

      {seasonTab === "escuderia" && (
        <div className="space-y-4">
          <Panel title="Escudería" icon={Wrench} accent={accent}>
            <div className="flex items-center gap-3">
              <TeamLogo team={playerTeam} size={64} className="rounded-lg" />
              <div className="flex-1">
                <div className="text-lg font-bold" style={{ fontFamily: "Rajdhani, sans-serif" }}>{playerTeam.name}</div>
                <div className="text-xs" style={{ color: COLORS.muted }}>{CATEGORY_DATA[category].label} · {playerTeam.tier}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Presupuesto</div>
                <div className="text-xl font-mono" style={{ color: budget < 0 ? COLORS.danger : accent }}>€{Math.round(budget).toLocaleString()}</div>
              </div>
            </div>
          </Panel>
          <DevelopmentPanel playerTeam={playerTeam} budget={budget} startProject={startProject} accent={accent} scale={scale} />
          <FactoryPanel playerTeam={playerTeam} budget={budget} onStartUpgrade={onStartFactoryUpgrade} accent={accent} scale={scale} />
          <StaffPanel playerTeam={playerTeam} budget={budget} onStartUpgrade={onStartStaffUpgrade} accent={accent} scale={scale} />
          <WarehousePanel playerTeam={playerTeam} budget={budget} scale={scale} onProduce={onStartWarehouseProduction} onUrgentProduce={onStartUrgentWarehouseProduction} />
        </div>
      )}

      {seasonTab === "info" && (
        <div className="space-y-4">
          <CircuitInfoPanel circuitProfile={circuitProfile} accent={accent} />
          <CalendarPanel round={round} accent={accent} />
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
        </div>
      )}

      <BottomNavBar active={seasonTab} onChange={setSeasonTab} accent={accent} />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Result Screen                                                          */
/* ---------------------------------------------------------------------- */
/* The sim doesn't model lap-by-lap timing, so race time/gap are a
   plausible cosmetic reconstruction from each rider's final performance
   score and the circuit's own length — not a separate simulation. */

