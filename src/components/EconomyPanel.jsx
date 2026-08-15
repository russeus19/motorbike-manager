import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";

const SEASON_ROUNDS = 22;

function money(v) {
  const n = Math.round(v || 0);
  return `${n < 0 ? "-" : ""}€${Math.abs(n).toLocaleString()}`;
}

/** Sorts every one-off economyLog entry (transfers, R&D, warehouse,
 * facility upgrades, scouting, sponsor cancellations) into the same
 * three spend areas Football Manager's own "budgets" screen tracks —
 * adapted to what this game actually has, since a fixed WAGE budget or
 * a TRANSFER budget the player allocates in advance don't exist here;
 * what we DO have is a real running total for each area, which is
 * arguably more useful anyway. Matched by label keyword since
 * economyLog entries are free-text, not pre-categorized — every label
 * that ever gets logged (see logMoneyMovement's call sites in App.jsx)
 * is accounted for here. */
function categorize(label) {
  if (/Fichaje|Despido|Compensaci[oó]n acordada|Cl[aá]usula de rescisi[oó]n|Rescisi[oó]n de contrato|Anulaci[oó]n de rescisi[oó]n|Ventas de mercado|Sustituto:/.test(label)) return "fichajes";
  if (/I\+D/.test(label)) return "investigacion";
  if (/Fabricaci[oó]n|Ampliaci[oó]n de F[aá]brica|Ampliaci[oó]n de Staff|Reducci[oó]n de F[aá]brica|Reducci[oó]n de Staff/.test(label)) return "desarrollo";
  if (/Ojeador enviado|Director Deportivo/.test(label)) return "ojeo";
  if (/patrocinio/.test(label)) return "patrocinio";
  return "otros";
}

/** A tiny inline sparkline — no charting library needed for something
 * this small. Values are plotted relative to their own min/max, not a
 * shared scale, since each card's own trend (not its comparison to
 * another card) is the point. */
function Sparkline({ values, color }) {
  if (!values || values.length < 2) return <div className="h-8" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const w = 100, h = 28;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * h;
    return `${x},${y}`;
  }).join(" ");
  const last = values[values.length - 1];
  const lastY = h - ((last - min) / span) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={w} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-lg p-3.5 ${className}`} style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
      <div className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: COLORS.gold }}>{title}</div>
      {children}
    </div>
  );
}

function StatRow({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between text-xs py-1" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
      <span style={{ color: COLORS.muted }}>{label}</span>
      <span className="font-mono" style={{ color: muted ? COLORS.muted : (value >= 0 ? COLORS.success : COLORS.danger), fontWeight: 600 }}>
        {value >= 0 ? "+" : ""}{money(value)}
      </span>
    </div>
  );
}

/**
 * Economía: un cuadro de mando en tarjetas, inspirado en el panel de
 * finanzas de Football Manager pero recortado a lo que este juego
 * realmente tiene — sin plantilla de 25 jugadoras por bloques de
 * importancia, sin préstamos (no existen aquí), sin presupuestos
 * pre-asignados por área (aquí no se reservan de antemano, así que se
 * muestra el gasto real acumulado en su lugar).
 */
export function EconomyPanel({ lastEconomySummary, seasonEconomyTotals, economyLog, budget, accent, playerTeam, round, seasonNumber, expanded: expandedProp, onToggleExpanded }) {
  // Bug fixed (feature): expanded state used to be entirely internal,
  // with no way for another panel (see the new "Presupuesto" tap
  // target in the Escudería summary card) to open this one directly.
  // Controlled from outside when expanded/onToggleExpanded are given;
  // falls back to its own internal state otherwise, so nothing else
  // that might render this panel elsewhere breaks.
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = expandedProp ?? internalExpanded;
  const setExpanded = onToggleExpanded ?? setInternalExpanded;
  const log = economyLog || [];
  const thisSeasonLog = log.filter((e) => e.seasonNumber === seasonNumber);
  const recentLog = [...log].reverse().slice(0, 8);

  // Reconstructed balance trend: the log only ever carries deltas, not
  // a running total, so this walks backward from the one absolute
  // number we do have (the current budget) to recover a relative
  // shape for however much history is still in the log.
  const trend = [];
  let running = budget || 0;
  trend.unshift(running);
  for (let i = log.length - 1; i >= 0 && trend.length < 20; i--) {
    running -= log[i].amount;
    trend.unshift(running);
  }

  const oneOffTotals = { fichajes: 0, desarrollo: 0, investigacion: 0, ojeo: 0, patrocinio: 0 };
  const oneOffSeries = { fichajes: [], desarrollo: [], investigacion: [], ojeo: [] };
  thisSeasonLog.forEach((e) => {
    const cat = categorize(e.label);
    if (oneOffTotals[cat] !== undefined) oneOffTotals[cat] += Math.abs(e.amount < 0 ? e.amount : 0);
    if (oneOffSeries[cat]) oneOffSeries[cat].push(e.amount);
  });
  const cumulative = (arr) => arr.reduce((acc, v, i) => { acc.push((acc[i - 1] || 0) - Math.min(0, v)); return acc; }, []);

  const totalIncome = (seasonEconomyTotals?.prize || 0) + (seasonEconomyTotals?.sponsors || 0);
  const totalRecurringExpense = (seasonEconomyTotals?.runningCost || 0) + (seasonEconomyTotals?.salaries || 0);
  const totalOneOffExpense = oneOffTotals.fichajes + oneOffTotals.desarrollo + oneOffTotals.investigacion + oneOffTotals.ojeo;

  const roster = [...(playerTeam?.riders || [])];
  const substitutes = Object.values(playerTeam?.substitutes || {});
  const totalSalary = roster.reduce((s, r) => s + (r.salary || 0), 0) + substitutes.reduce((s, r) => s + (r.salary || 0), 0);

  const sponsors = playerTeam?.sponsors || {};
  const mainIncome = sponsors.main ? (sponsors.main.payoutPerGp || 0) : 0;
  const secondaryIncome = sponsors.secondary ? (sponsors.secondary.payoutPerGp || 0) : 0;
  const sponsorGpTotal = mainIncome + secondaryIncome;

  const roundsLeft = Math.max(0, SEASON_ROUNDS - round);
  const netPerGp = round > 0 ? (seasonEconomyTotals?.net || 0) / round : 0;
  const projectedEndOfSeason = (budget || 0) + netPerGp * roundsLeft;

  return (
    <Panel
      title="Economía"
      icon={Wallet}
      accent={accent}
      onHeaderClick={() => setExpanded((v) => !v)}
      headerRight={
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: COLORS.text }}>€{(budget || 0).toLocaleString()}</span>
          {expanded ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
        </span>
      }
    >
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Resumen */}
          <Card title="Resumen" className="md:row-span-2">
            <div className="text-2xl font-bold mb-0.5" style={{ fontFamily: "Rajdhani, sans-serif", color: budget < 0 ? COLORS.danger : COLORS.text }}>
              {money(budget)}
            </div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Balance actual</div>
            {trend.length > 1 && <Sparkline values={trend} color={trend[trend.length - 1] >= trend[0] ? COLORS.success : COLORS.danger} />}
            {recentLog.length > 0 && (
              <div className="mt-3 space-y-0.5 max-h-64 overflow-y-auto pr-1">
                {recentLog.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-0.5">
                    <span className="truncate pr-2" style={{ color: COLORS.text }}>
                      {entry.label}
                      <span style={{ color: COLORS.muted }}> · T{entry.seasonNumber ?? "?"} R{(entry.round ?? 0) + 1}</span>
                    </span>
                    <span className="font-mono flex-shrink-0" style={{ color: entry.amount >= 0 ? COLORS.success : COLORS.danger }}>
                      {entry.amount >= 0 ? "+" : ""}{money(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Ingresos */}
          <Card title="Ingresos (temporada)">
            <div className="text-xl font-bold mb-2" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.success }}>
              +{money(totalIncome)}
            </div>
            <StatRow label="Premios de carrera" value={seasonEconomyTotals?.prize || 0} />
            <StatRow label="Patrocinios" value={seasonEconomyTotals?.sponsors || 0} />
          </Card>

          {/* Gasto por área */}
          <Card title="Gasto por área (temporada)" className="md:row-span-2">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: COLORS.text }}>Fichajes</span>
                  <span className="font-mono" style={{ color: COLORS.danger }}>{money(-oneOffTotals.fichajes)}</span>
                </div>
                <Sparkline values={cumulative(oneOffSeries.fichajes)} color={COLORS.danger} />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: COLORS.text }}>Desarrollo</span>
                  <span className="font-mono" style={{ color: COLORS.danger }}>{money(-oneOffTotals.desarrollo)}</span>
                </div>
                <Sparkline values={cumulative(oneOffSeries.desarrollo)} color={COLORS.danger} />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: COLORS.text }}>Investigación</span>
                  <span className="font-mono" style={{ color: COLORS.danger }}>{money(-oneOffTotals.investigacion)}</span>
                </div>
                <Sparkline values={cumulative(oneOffSeries.investigacion)} color={COLORS.danger} />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: COLORS.text }}>Ojeo</span>
                  <span className="font-mono" style={{ color: COLORS.danger }}>{money(-oneOffTotals.ojeo)}</span>
                </div>
                <Sparkline values={cumulative(oneOffSeries.ojeo)} color={COLORS.danger} />
              </div>
            </div>
          </Card>

          {/* Gastos */}
          <Card title="Gastos (temporada)">
            <div className="text-xl font-bold mb-2" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.danger }}>
              {money(-(totalRecurringExpense + totalOneOffExpense))}
            </div>
            <StatRow label="Coste de estructura" value={-(seasonEconomyTotals?.runningCost || 0)} />
            <StatRow label="Salarios de pilotos" value={-(seasonEconomyTotals?.salaries || 0)} />
            <StatRow label="Gastos puntuales" value={-totalOneOffExpense} />
          </Card>

          {/* Sueldos */}
          <Card title="Sueldos" className="md:row-span-2">
            <div className="text-xl font-bold mb-2" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>
              {money(totalSalary)}<span className="text-xs font-normal" style={{ color: COLORS.muted }}> /año</span>
            </div>
            <div className="space-y-1.5">
              {roster.map((r) => (
                <StatRow key={r.id} label={`Titular · ${r.name}`} value={-(r.salary || 0)} muted />
              ))}
              {substitutes.map((r) => (
                <StatRow key={r.id} label={`Sustituta · ${r.name}`} value={-(r.salary || 0)} muted />
              ))}
              {roster.length === 0 && substitutes.length === 0 && (
                <p className="text-xs" style={{ color: COLORS.muted }}>Sin pilotos contratados todavía.</p>
              )}
            </div>
          </Card>

          {/* Patrocinadores */}
          <Card title="Patrocinadores" className="md:row-span-2">
            <div className="text-xl font-bold mb-1" style={{ fontFamily: "Rajdhani, sans-serif", color: COLORS.text }}>
              {money(sponsorGpTotal)}<span className="text-xs font-normal" style={{ color: COLORS.muted }}> /GP</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Ingreso fijo combinado</div>
            {sponsorGpTotal > 0 && (
              <div className="h-2.5 rounded-full overflow-hidden flex mb-3" style={{ background: COLORS.panel }}>
                {mainIncome > 0 && <div style={{ width: `${(mainIncome / sponsorGpTotal) * 100}%`, background: COLORS.gold }} />}
                {secondaryIncome > 0 && <div style={{ width: `${(secondaryIncome / sponsorGpTotal) * 100}%`, background: COLORS.ice }} />}
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs py-1" style={{ borderBottom: `1px solid ${COLORS.rule}` }}>
                <span className="flex items-center gap-1.5" style={{ color: COLORS.text }}><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS.gold }} />Principal{sponsors.main ? ` · ${sponsors.main.name}` : ""}</span>
                <span className="font-mono" style={{ color: COLORS.muted }}>{sponsors.main ? money(mainIncome) : "—"}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="flex items-center gap-1.5" style={{ color: COLORS.text }}><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS.ice }} />Secundario{sponsors.secondary ? ` · ${sponsors.secondary.name}` : ""}</span>
                <span className="font-mono" style={{ color: COLORS.muted }}>{sponsors.secondary ? money(secondaryIncome) : "—"}</span>
              </div>
            </div>
          </Card>

          {/* Previsión */}
          <Card title="Previsión de cierre de temporada">
            <div className="flex items-center gap-1.5 mb-1">
              {projectedEndOfSeason >= (budget || 0) ? <TrendingUp size={14} style={{ color: COLORS.success }} /> : <TrendingDown size={14} style={{ color: COLORS.danger }} />}
              <span className="text-lg font-bold" style={{ fontFamily: "Rajdhani, sans-serif", color: projectedEndOfSeason >= 0 ? COLORS.text : COLORS.danger }}>
                {money(projectedEndOfSeason)}
              </span>
            </div>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              {round > 0
                ? `A ritmo de ${money(netPerGp)} por GP, quedando ${roundsLeft} por disputar.`
                : "Se estimará en cuanto se dispute el primer Gran Premio."}
            </p>
          </Card>
        </div>
      )}
    </Panel>
  );
}
