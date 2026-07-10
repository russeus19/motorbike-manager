import { useState } from "react";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { Panel } from "../components/UIPrimitives.jsx";
import { CATEGORY_DATA, CATEGORY_ORDER } from "../data/categories.js";
import { COLORS } from "../data/colors.js";
import { MARKET_LOG_ICON, MARKET_LOG_ORDER, MARKET_LOG_TITLES } from "../data/marketLogMeta.js";

export function MarketSummaryScreen({ summary, onContinue }) {
  const [tab, setTab] = useState("motogp");
  const entries = summary[tab] || [];
  const grouped = {};
  entries.forEach((e) => { (grouped[e.type] = grouped[e.type] || []).push(e); });

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <ArrowLeftRight size={20} style={{ color: COLORS.gold }} />
        <span className="text-xs tracking-[0.2em] uppercase" style={{ color: COLORS.muted }}>Resumen del mercado</span>
      </div>
      <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "Rajdhani, sans-serif" }}>Así queda la parrilla</h2>

      <div className="flex gap-2 mb-4">
        {CATEGORY_ORDER.map((ck) => (
          <button key={ck} onClick={() => setTab(ck)}
            className="text-xs px-3 py-1.5 rounded font-semibold"
            style={{
              background: tab === ck ? COLORS.gold : COLORS.panel2,
              color: tab === ck ? "#12151A" : COLORS.muted,
              border: `1px solid ${tab === ck ? COLORS.gold : COLORS.rule}`,
              fontFamily: "Rajdhani, sans-serif",
            }}>
            {CATEGORY_DATA[ck].label} ({(summary[ck] || []).length})
          </button>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="text-sm mb-6" style={{ color: COLORS.muted }}>No hubo movimientos de mercado reseñables en esta categoría.</p>
      )}

      <div className="space-y-4 mb-6">
        {MARKET_LOG_ORDER.filter((t) => grouped[t]?.length).map((t) => (
          <Panel key={t} title={`${MARKET_LOG_TITLES[t]} (${grouped[t].length})`} accent={COLORS.gold}>
            <ul className="text-sm space-y-1">
              {grouped[t].map((e, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span>{MARKET_LOG_ICON[t]}</span>
                  <span>{e.text}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <button onClick={onContinue}
        className="w-full py-3 rounded-md font-semibold flex items-center justify-center gap-2"
        style={{ background: COLORS.gold, color: "#12151A", fontFamily: "Rajdhani, sans-serif" }}>
        Empezar la nueva temporada <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Substitute rider selection                                             */
/* ---------------------------------------------------------------------- */

