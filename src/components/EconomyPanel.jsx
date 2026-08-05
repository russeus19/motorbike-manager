import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Panel } from "./UIPrimitives.jsx";
import { COLORS } from "../data/colors.js";

function Row({ label, value, accent, bold }) {
  const positive = value >= 0;
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span style={{ color: bold ? COLORS.text : COLORS.muted }}>{label}</span>
      <span className="font-mono" style={{ color: bold ? (positive ? COLORS.success : COLORS.danger) : COLORS.text, fontWeight: bold ? 700 : 400 }}>
        {positive ? "+" : ""}€{value.toLocaleString()}
      </span>
    </div>
  );
}

/**
 * Economía: desglose real de ingresos y gastos, no solo el número final
 * de presupuesto. Tres vistas: el último Gran Premio disputado, el
 * acumulado de la temporada en curso, y un registro cronológico de
 * TODOS los movimientos de dinero — incluidos los que no son
 * recurrentes (ampliar Fábrica, fabricar una pieza, fichar a un agente
 * libre, despedir a un piloto…), que antes no aparecían en ningún
 * sitio del panel aunque sí se descontaban del presupuesto real.
 */
export function EconomyPanel({ lastEconomySummary, seasonEconomyTotals, economyLog, budget, accent }) {
  const [expanded, setExpanded] = useState(false);
  const recentLog = [...(economyLog || [])].reverse().slice(0, 25);

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
        <>
          {lastEconomySummary ? (
            <div className="rounded-md p-2.5 mb-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
                Último GP — {lastEconomySummary.circuitName}
              </div>
              <Row label="Premio de carrera" value={lastEconomySummary.income.prize} accent={accent} />
              <Row label="Patrocinio (fijo)" value={lastEconomySummary.income.sponsorFlat} accent={accent} />
              {lastEconomySummary.income.sponsorBonus > 0 && <Row label="Patrocinio (prima por punto)" value={lastEconomySummary.income.sponsorBonus} accent={accent} />}
              <Row label="Coste de estructura" value={-lastEconomySummary.expenses.runningCost} accent={accent} />
              <Row label="Salarios de pilotos" value={-lastEconomySummary.expenses.salaries} accent={accent} />
              <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${COLORS.rule}` }}>
                <Row label="Neto de este GP" value={lastEconomySummary.net} accent={accent} bold />
              </div>
            </div>
          ) : (
            <p className="text-xs mb-2" style={{ color: COLORS.muted }}>Todavía no se ha disputado ningún Gran Premio esta temporada.</p>
          )}

          {seasonEconomyTotals && (
            <div className="rounded-md p-2.5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}>
                {seasonEconomyTotals.net >= 0 ? <TrendingUp size={12} style={{ color: COLORS.success }} /> : <TrendingDown size={12} style={{ color: COLORS.danger }} />}
                Acumulado de la temporada
              </div>
              <Row label="Premios de carrera" value={seasonEconomyTotals.prize} accent={accent} />
              <Row label="Patrocinio total" value={seasonEconomyTotals.sponsors} accent={accent} />
              <Row label="Coste de estructura" value={-seasonEconomyTotals.runningCost} accent={accent} />
              <Row label="Salarios de pilotos" value={-seasonEconomyTotals.salaries} accent={accent} />
              <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${COLORS.rule}` }}>
                <Row label="Neto acumulado" value={seasonEconomyTotals.net} accent={accent} bold />
              </div>
            </div>
          )}

          {recentLog.length > 0 && (
            <div className="rounded-md p-2.5 mt-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.rule}` }}>
              <div className="text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>
                Registro de movimientos (últimos {recentLog.length})
              </div>
              <div className="max-h-56 overflow-y-auto pr-1 space-y-0.5">
                {recentLog.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-0.5" style={{ borderBottom: i < recentLog.length - 1 ? `1px solid ${COLORS.rule}` : "none" }}>
                    <span className="truncate pr-2" style={{ color: COLORS.text }}>
                      {entry.label}
                      <span style={{ color: COLORS.muted }}> · T{entry.seasonNumber ?? "?"} R{(entry.round ?? 0) + 1}</span>
                    </span>
                    <span className="font-mono flex-shrink-0" style={{ color: entry.amount >= 0 ? COLORS.success : COLORS.danger }}>
                      {entry.amount >= 0 ? "+" : ""}€{entry.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
