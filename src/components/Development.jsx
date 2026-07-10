import { useState } from "react";
import { ChevronDown, ChevronUp, Timer, Wrench, Zap } from "lucide-react";
import { Panel, StatBar } from "./UIPrimitives.jsx";
import { BIKE_AREA_KEYS, BIKE_LABELS } from "../data/bikeAreas.js";
import { COLORS } from "../data/colors.js";
import { bikeAvg, canStartProject, computeTechCapacity, projectSpec, usedCapacity } from "../utils/bikeDevelopment.js";

export function ProjectRow({ area, kind, team, budget, scale, accent, onStart }) {
  const activeProject = (team.activeProjects || []).find((p) => p.area === area && p.kind === kind);
  const currentLevel = kind === "dev" ? team.bike[area] : team.research[area];
  const spec = projectSpec(area, currentLevel, kind, scale);
  const canStart = !activeProject && !!canStartProject(team, area, kind, budget, scale);
  const label = BIKE_LABELS[area];

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
          Al llegar: +{activeProject.gain} · {activeProject.capacity} pts ocupados · riesgo de fracaso {Math.round(activeProject.failChance * 100)}%
        </div>
      </div>
    );
  }

  return (
    <button disabled={!canStart} onClick={() => onStart(area, kind)}
      className="w-full text-left text-xs px-2 py-1.5 rounded mb-1.5 disabled:opacity-30 flex items-center justify-between gap-2"
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.rule}`, color: COLORS.text }}>
      <span className="flex items-center gap-1"><Zap size={11} style={{ color: accent }} /> {label} ({currentLevel})</span>
      <span className="font-mono text-right" style={{ color: COLORS.muted }}>
        €{spec.money.toLocaleString()} · {spec.gp} GP · {spec.capacity}pts · +{spec.gain} · {Math.round(spec.failChance * 100)}% riesgo
      </span>
    </button>
  );
}


export function DevelopmentPanel({ playerTeam, budget, startProject, accent, scale }) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState("dev");
  const avg = bikeAvg(playerTeam.bike);
  const cap = computeTechCapacity(playerTeam, budget);
  const used = usedCapacity(playerTeam);

  return (
    <Panel
      title="I+D de la moto"
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

          <div className="flex gap-2 mb-2">
            <button onClick={() => setTab("dev")} className="text-xs px-2 py-1 rounded font-semibold"
              style={{ background: tab === "dev" ? accent : COLORS.panel2, color: tab === "dev" ? "#12151A" : COLORS.muted, border: `1px solid ${tab === "dev" ? accent : COLORS.rule}` }}>
              Desarrollo (esta temporada)
            </button>
            <button onClick={() => setTab("research")} className="text-xs px-2 py-1 rounded font-semibold"
              style={{ background: tab === "research" ? accent : COLORS.panel2, color: tab === "research" ? "#12151A" : COLORS.muted, border: `1px solid ${tab === "research" ? accent : COLORS.rule}` }}>
              Investigación (año que viene)
            </button>
          </div>

          {tab === "research" && (
            <p className="text-xs mb-2" style={{ color: COLORS.muted }}>La investigación no mejora la moto de esta temporada: solo prepara la del año que viene (55% moto actual + 45% investigación al cerrar la temporada).</p>
          )}

          <div>
            {BIKE_AREA_KEYS.map((k) => (
              <ProjectRow key={k} area={k} kind={tab} team={playerTeam} budget={budget} scale={scale} accent={accent} onStart={startProject} />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------------- */
/* Cross-category standings panel                                         */
/* ---------------------------------------------------------------------- */

