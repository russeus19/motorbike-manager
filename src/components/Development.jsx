import { useState } from "react";
import { ChevronDown, ChevronUp, Timer, Wrench, Zap } from "lucide-react";
import { Panel, StatBar } from "./UIPrimitives.jsx";
import { BIKE_AREA_KEYS, BIKE_LABELS } from "../data/bikeAreas.js";
import { COLORS } from "../data/colors.js";
import { bikeAvg, canStartProject, computeTechCapacity, ensureRD, projectSpec, usedCapacity } from "../utils/bikeDevelopment.js";

/* Shared capacity bar — Desarrollo e Investigación draw from exactly the
   same pool. Kept as its own small piece so nothing about it is
   duplicated inside the unified panel below. */
function CapacityBar({ playerTeam, budget, accent }) {
  const cap = computeTechCapacity(playerTeam, budget);
  const used = usedCapacity(playerTeam);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: COLORS.muted }}>
        <span>Capacidad técnica</span>
        <span className="font-mono" style={{ color: COLORS.text }}>{used} / {cap} pts</span>
      </div>
      <div className="h-1.5 rounded-full w-full" style={{ background: COLORS.rule }}>
        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (used / cap) * 100)}%`, background: used >= cap ? COLORS.danger : accent }} />
      </div>
      <p className="text-xs mt-1" style={{ color: COLORS.muted }}>Desarrollo e investigación comparten esta misma capacidad: cuanto más ocupes en uno, menos te queda para el otro.</p>
    </div>
  );
}

/* One project's row — a running project with its progress, or a button to
   start a new one. Exactly the same simulation calls as before
   (canStartProject/projectSpec/ensureRD); `label` lets a parent that's
   already showing the area name (like the unified panel below) swap in
   "Desarrollo"/"Investigación" instead of repeating it. */
export function ProjectRow({ area, kind, team, budget, scale, accent, onStart, label: labelOverride }) {
  const activeProject = (team.activeProjects || []).find((p) => p.area === area && p.kind === kind);
  const { techBase } = ensureRD(team);
  const currentLevel = kind === "dev" ? team.bike[area] : techBase[area];
  const spec = projectSpec(area, currentLevel, kind, scale, team);
  const canStart = !activeProject && !!canStartProject(team, area, kind, budget, scale);
  const label = labelOverride ?? BIKE_LABELS[area];

  if (activeProject) {
    return (
      <div className="rounded-md p-2 mb-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="flex items-center gap-1.5"><Timer size={13} style={{ color: accent }} /> {label}</span>
          <span className="font-mono text-xs" style={{ color: COLORS.muted }}>{activeProject.remaining}/{activeProject.totalGp} GP</span>
        </div>
        <div className="h-1.5 rounded-full w-full mb-1" style={{ background: COLORS.rule }}>
          <div className="h-1.5 rounded-full" style={{ width: `${((activeProject.totalGp - activeProject.remaining) / activeProject.totalGp) * 100}%`, background: accent }} />
        </div>
        <div className="text-xs" style={{ color: COLORS.muted }}>
          Al llegar: hasta +{activeProject.gain} · {activeProject.capacity} pts ocupados · riesgo de no completarlo del todo {Math.round(activeProject.failChance * 100)}%
        </div>
      </div>
    );
  }

  return (
    <button disabled={!canStart} onClick={() => onStart(area, kind)}
      className="w-full text-left text-xs px-2 py-1.5 rounded mb-1.5 disabled:opacity-30 flex items-center justify-between gap-2"
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
      <span className="flex items-center gap-1"><Zap size={11} style={{ color: accent }} /> {label}{kind === "dev" && !labelOverride ? ` (${currentLevel})` : ""}</span>
      <span className="font-mono text-right" style={{ color: COLORS.muted }}>
        €{spec.money.toLocaleString()} · {spec.gp} GP · {spec.capacity}pts · hasta +{spec.gain} · {Math.round(spec.failChance * 100)}% riesgo
      </span>
    </button>
  );
}

/* Desarrollo e Investigación — unified panel (this is the pre-existing
   split-panel design merged back into one block, per the earlier layout).
   Nothing about the simulation changed: Desarrollo still only improves
   this season's visible bike stat (banking ~20-25% of each gain into the
   hidden Base Tecnológica, see rolloverBike), and Investigación still only
   feeds that hidden Base Tecnológica directly, preparing next season's
   bike, without ever touching the current bike or exposing that hidden
   number. Both simply appear grouped by area now, sharing the same
   Capacidad Técnica pool shown once at the top. This single component is
   used identically from both the Inicio screen and the Escudería screen —
   no separate implementation to keep in sync. */
export function DevelopmentPanel({ playerTeam, budget, startProject, accent, scale }) {
  const [expanded, setExpanded] = useState(false);
  const avg = bikeAvg(playerTeam.bike);

  return (
    <Panel
      title="Desarrollo e Investigación"
      icon={Wrench}
      accent={accent}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: COLORS.text }}>Media: {Math.round(avg)}</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {expanded && (
        <>
          <div className="mb-3">
            {BIKE_AREA_KEYS.map((k) => (
              <StatBar key={k} label={BIKE_LABELS[k]} value={playerTeam.bike[k]} accent={accent} />
            ))}
          </div>

          <CapacityBar playerTeam={playerTeam} budget={budget} accent={accent} />

          <div className="space-y-2">
            {BIKE_AREA_KEYS.map((k) => (
              <div key={k} className="rounded-md p-2" style={{ border: `1px solid ${COLORS.rule}` }}>
                <div className="text-xs font-bold mb-1.5" style={{ color: accent, fontFamily: "Rajdhani, sans-serif" }}>{BIKE_LABELS[k]}</div>
                <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: COLORS.muted }}>Desarrollo · esta temporada</div>
                <ProjectRow area={k} kind="dev" team={playerTeam} budget={budget} scale={scale} accent={accent} onStart={startProject} label="Desarrollo" />
                <div className="text-[10px] uppercase tracking-wide mb-1 mt-1" style={{ color: COLORS.muted }}>Investigación · temporada siguiente</div>
                <ProjectRow area={k} kind="research" team={playerTeam} budget={budget} scale={scale} accent={accent} onStart={startProject} label="Investigación" />
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
